// Narration orchestration. SERVER ONLY — do not import from a client component.
//
// Resolves the narration text, calls TTS, uploads the audio, and returns the
// row shape. Nothing in here touches the certificate or the chain.

import { db, Consent, Narration, Story } from "@/lib/db";
import { addisai, splitTextToCaptions } from "@/lib/addisai";
import { synthesize, voiceIdFor, MAX_TTS_CHARS, Caption } from "@/lib/elevenlabs";

export type NarrationLang = "en" | "de";

// Tier 3. Guarantees the demo runs even with both APIs down. Stored with
// source: 'fallback' so the page can say so out loud.
const CANNED: Record<NarrationLang, string> = {
  en: "My name is Dawit Alemu. I run a garment workshop in Addis Ababa, Ethiopia. With the support of our donors we have grown the workshop and now employ nine local garment workers. That means steady wages and stability for nine families in our community.",
  de: "Mein Name ist Dawit Alemu. Ich führe eine Textilwerkstatt in Addis Abeba, Äthiopien. Mit der Unterstützung unserer Spender konnten wir die Werkstatt vergrößern und beschäftigen heute neun Näherinnen und Näher aus der Umgebung. Das bedeutet ein verlässliches Einkommen und Sicherheit für neun Familien in unserer Gemeinschaft.",
};

/**
 * Is translated narration permitted for this story?
 *
 * The purpose belongs to the person whose WORDS are being re-voiced — the
 * founder. Selam's consent governs her appearance in the media, which is a
 * different question on a different person, so her row does not decide this.
 *
 * Read defensively (`!== false`) so rows written before the migration keep
 * working during the demo.
 */
export function narrationAllowed(consents: Consent[], founderName: string): boolean {
  if (!consents || consents.length === 0) return true;

  const founder = consents.find((c) => c.person_name === founderName) ?? consents[0];
  if (!founder) return true;
  if (founder.revoked) return false;

  return founder.permissions?.translated_narration !== false;
}

/**
 * Where the text comes from, in tiers, each reporting honestly whether it ran.
 *
 *  en          — story.generated_story. Already in the row, zero extra calls.
 *  de tier 1   — Addis AI translate am → de, from Dawit's ACTUAL words.
 *  de tier 2   — Addis AI chat_generate translating the polished English.
 *  de tier 3   — canned paragraph, marked as a fallback.
 */
async function resolveText(
  story: Story,
  lang: NarrationLang
): Promise<{ text: string; source: "live" | "fallback" }> {
  if (lang === "en") {
    const text = (story.generated_story || story.english_translation || "").trim();
    if (text) {
      // Mirror the pipeline's own honesty flag: if the AI never ran, the
      // English text is canned too, and the narration should say so.
      return { text, source: story.ai_source === "live" ? "live" : "fallback" };
    }
    return { text: CANNED.en, source: "fallback" };
  }

  // German, tier 1: straight from the Amharic transcript.
  if (story.amharic_transcript) {
    const t1 = await addisai.translateTo(story.amharic_transcript, "am", "de");
    if (t1.live && t1.text.trim()) {
      return { text: t1.text.trim(), source: "live" };
    }
  }

  // German, tier 2: translate the polished English via the chat endpoint.
  const english = (story.generated_story || story.english_translation || "").trim();
  if (english) {
    const t2 = await addisai.translateViaChat(english, "German");
    if (t2.live && t2.text.trim()) {
      return { text: t2.text.trim(), source: "live" };
    }
  }

  // German, tier 3.
  console.warn("German translation fell through to the canned paragraph.");
  return { text: CANNED.de, source: "fallback" };
}

/**
 * Build one narration row for one story in one language.
 * Never throws for an API failure: if TTS fails we still return the text and
 * heuristic captions with audio_url null, because text-without-audio is a
 * genuinely useful state — the device voice can read it.
 */
export async function buildNarration(
  story: Story,
  lang: NarrationLang
): Promise<Omit<Narration, "id" | "created_at">> {
  const { text: rawText, source } = await resolveText(story, lang);
  const text = rawText.length > MAX_TTS_CHARS ? rawText.slice(0, MAX_TTS_CHARS) : rawText;

  const tts = await synthesize(text, lang);

  let audioUrl: string | null = null;
  if (tts.audio) {
    try {
      audioUrl = await db.uploadMedia(
        `narration-${story.id}-${lang}.mp3`,
        tts.audio,
        "audio/mpeg"
      );
    } catch (e) {
      console.error("Failed to upload narration audio, keeping text only:", e);
      audioUrl = null;
    }
  }

  // Captions are timed against THIS track, never the Amharic one.
  let captions: Caption[] = tts.captions;
  let duration: number | null = tts.duration;

  if (captions.length === 0) {
    // No alignment (no audio). There is no real duration, so estimate from
    // the word count rather than inventing precise-looking timings.
    const estimated = Math.max(1, text.split(/\s+/).filter(Boolean).length / 2.5);
    captions = splitTextToCaptions(text, estimated);
    duration = audioUrl ? duration : null;
  }

  return {
    story_id: story.id,
    lang,
    text,
    audio_url: audioUrl,
    captions,
    duration,
    voice_id: tts.live ? tts.voiceId : voiceIdFor(lang),
    source,
  };
}
