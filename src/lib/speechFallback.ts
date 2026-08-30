// Browser SpeechSynthesis wrapper. CLIENT ONLY.
//
// This is the degradation path when the generated MP3 will not load — venue
// wifi, blocked CDN, cold cache. The page still speaks when the network does
// not, and it says plainly that this is the device's voice.
//
// NOTE: this is never used for the Amharic track. That is a real recording of
// a real person. If it fails to load we show an error, not a robot pretending
// to be him.

export type SpeechLang = "en" | "de";

const BCP47: Record<SpeechLang, string> = {
  en: "en-US",
  de: "de-DE",
};

export function speechSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

/**
 * Chrome loads voices asynchronously, so getVoices() is often empty on first
 * call. Subscribe once on mount and re-read when the list arrives.
 */
export function onVoicesReady(cb: () => void): () => void {
  if (!speechSupported()) return () => {};

  // Prime the list; some browsers only populate after the first read.
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", cb);

  return () => window.speechSynthesis.removeEventListener("voiceschanged", cb);
}

function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const target = BCP47[lang].toLowerCase();
  const short = lang.toLowerCase();
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find((v) => v.lang?.toLowerCase() === target) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(short)) ||
    null
  );
}

export function cancelSpeech() {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * Speak the narration text. Always cancels first — otherwise a language switch
 * queues two voices on top of each other, live, on stage.
 *
 * iOS requires this to be called inside a user gesture, so call it from the
 * play button's handler chain, never from a bare effect.
 */
export function speak(
  text: string,
  lang: SpeechLang,
  handlers: { onEnd?: () => void; onError?: () => void } = {}
): boolean {
  if (!speechSupported() || !text) return false;

  cancelSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = BCP47[lang];

  // If no matching voice exists we still speak — most devices substitute a
  // default, which is better than silence.
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;

  utterance.rate = 0.95;
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onError?.();

  window.speechSynthesis.speak(utterance);
  return true;
}
