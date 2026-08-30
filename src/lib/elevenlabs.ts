// ElevenLabs text-to-speech helper.
//
// Two rules govern this file:
//   1. We use a GENERIC STOCK VOICE. We never clone the founder's voice. A
//      cloned voice saying words he never said is a synthetic-identity problem.
//   2. It never throws. Like src/lib/addisai.ts, every call reports whether it
//      really ran, so the UI can be honest instead of silently pretending.

// Verify these against your own account before the demo:
//   curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices \
//     | python3 -c "import json,sys; [print(v['voice_id'], v['name']) for v in json.load(sys.stdin)['voices']]"
export const VOICE_EN = process.env.ELEVENLABS_VOICE_EN || "21m00Tcm4TlvDq8ikWAM"; // Rachel (stock)
export const VOICE_DE = process.env.ELEVENLABS_VOICE_DE || "AZnzlk1XvdvUeBnXmlld"; // Domi (stock)

const ELEVEN_BASE = "https://api.elevenlabs.io";

// mp3_44100_64 keeps a 40-second narration around 320 KB. This matters on
// Ethiopian mobile data and on venue wifi.
const OUTPUT_FORMAT = "mp3_44100_64";

// Keep requests inside the Vercel function budget.
export const MAX_TTS_CHARS = 600;

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface Alignment {
  characters?: string[];
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
}

export interface TtsResult {
  audio: Buffer | null;
  captions: Caption[];
  duration: number | null;
  voiceId: string;
  live: boolean;
}

export function voiceIdFor(lang: "en" | "de" | "om" | "ti"): string {
  return lang === "de" ? VOICE_DE : VOICE_EN;
}


const round1 = (n: number) => parseFloat(n.toFixed(1));

/**
 * Walk the character-level alignment into subtitle cues.
 * Breaks on sentence-ending punctuation, or at a word boundary past ~40 chars.
 * Exported so it can be checked without calling the API.
 */
export function alignmentToCaptions(alignment: Alignment | null | undefined): Caption[] {
  const chars = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;

  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) return [];
  if (chars.length === 0) return [];

  const cues: Caption[] = [];
  let buffer = "";
  let cueStart: number | null = null;
  let lastEnd = 0;

  const flush = () => {
    const text = buffer.trim();
    if (text) {
      cues.push({ start: round1(cueStart ?? 0), end: round1(lastEnd), text });
    }
    buffer = "";
    cueStart = null;
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // Skip leading whitespace so a cue never starts on a blank
    if (cueStart === null) {
      if (!ch || ch.trim() === "") continue;
      cueStart = typeof starts[i] === "number" ? starts[i] : lastEnd;
    }

    buffer += ch;
    if (typeof ends[i] === "number") lastEnd = ends[i];

    const endsSentence = /[.!?…:;]/.test(ch);
    const longEnoughAtBoundary = buffer.length >= 40 && /\s/.test(ch);

    if (endsSentence || longEnoughAtBoundary) flush();
  }

  flush();
  return cues;
}

/**
 * Synthesize one language. Returns { audio: null, live: false } rather than
 * throwing when the key is missing or the call fails, so the caller never
 * needs a try/catch. The failure reason is always logged, never swallowed.
 */
export async function synthesize(text: string, lang: "en" | "de" | "om" | "ti"): Promise<TtsResult> {

  const voiceId = voiceIdFor(lang);
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY is not set. Narration will be text-only (device voice).");
    return { audio: null, captions: [], duration: null, voiceId, live: false };
  }

  const trimmed = text.length > MAX_TTS_CHARS ? text.slice(0, MAX_TTS_CHARS) : text;

  try {
    console.log(`Calling ElevenLabs TTS (${lang}, voice ${voiceId}, ${trimmed.length} chars)...`);

    const res = await fetch(
      `${ELEVEN_BASE}/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`ElevenLabs returned ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const b64: string | undefined = json.audio_base64;
    if (!b64) throw new Error("ElevenLabs response contained no audio_base64");

    const audio = Buffer.from(b64, "base64");
    const alignment: Alignment | undefined = json.alignment || json.normalized_alignment;
    const captions = alignmentToCaptions(alignment);

    const endTimes = alignment?.character_end_times_seconds;
    const duration =
      Array.isArray(endTimes) && endTimes.length > 0
        ? round1(endTimes[endTimes.length - 1])
        : captions.length > 0
        ? captions[captions.length - 1].end
        : null;

    console.log(`ElevenLabs OK: ${audio.length} bytes, ${captions.length} cues, ${duration}s`);
    return { audio, captions, duration, voiceId, live: true };
  } catch (error) {
    console.error("ElevenLabs TTS failed:", error);
    return { audio: null, captions: [], duration: null, voiceId, live: false };
  }
}
