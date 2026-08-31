// Addis AI API helper
// Every call reports whether it actually reached the API, so the UI can be
// honest about it rather than silently showing canned text as if it were real.
const ADDIS_AI_BASE = "https://api.addisassistant.com";

export interface AiResult {
  text: string;
  live: boolean;
}

const FALLBACK_TRANSCRIPT =
  "ሰላም፣ ስሜ ዳዊት አሊሙ እባላለሁ። በአዲስ አበባ የልብስ ስፌት አውደ ጥናት አለኝ። በቅርቡ በነበረን ድጋፍ ስራችንን አስፋፍተን አሁን 9 ሰራተኞች አሉን።";

const FALLBACK_TRANSLATION =
  "Hello, my name is Dawit Alemu. I have a garment workshop in Addis Ababa. With the recent support, we expanded our work and now have 9 employees.";

const FALLBACK_STORY =
  "My name is Dawit Alemu. I run a garment workshop in Addis Ababa, Ethiopia. Thanks to the support of our donors, we have grown our workshop and reached our milestone of employing 9 local garment workers. This provides decent wages and stability to 9 families in our community.";

export async function translateWithChatGPT(text: string, targetLanguage: string = "English"): Promise<AiResult> {
  const rapidApiKey = process.env.RAPIDAPI_CHATGPT_KEY;
  try {
    console.log(`Calling ChatGPT API (RapidAPI) for translation to ${targetLanguage}...`);
    const prompt = `Translate the following text into ${targetLanguage}. Return ONLY the translation, no commentary or intro.\n\nText: "${text}"`;
    const res = await fetch("https://chatgpt-42.p.rapidapi.com/conversationgpt4-2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
        "x-rapidapi-key": rapidApiKey,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        system_prompt: "",
        temperature: 0.3,
        top_k: 5,
        top_p: 0.9,
        max_tokens: 512,
        web_access: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`ChatGPT RapidAPI returned status ${res.status}`);
    }

    const json = await res.json();
    const resultText = json.result || json.response_text || "";

    if (!resultText) throw new Error("Empty response from ChatGPT API");
    console.log(`ChatGPT Translation OK (${targetLanguage}):`, resultText.trim());
    return { text: resultText.trim(), live: true };
  } catch (error) {
    console.error("ChatGPT translation failed:", error);
    return { text: "", live: false };
  }
}

export const addisai = {
  /**
   * Speech-to-text: Amharic or Afaan Oromo voice note to text
   */
  transcribe: async (
    audioBuffer: Buffer,
    mimeType: string,
    languageCode: string = "am"
  ): Promise<AiResult> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Using fallback transcript.");
      return { text: FALLBACK_TRANSCRIPT, live: false };
    }

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/wav" });
      formData.append("audio", blob, "voice.wav");
      formData.append("request_data", JSON.stringify({ language_code: languageCode }));

      console.log("Calling Addis AI STT...");
      const res = await fetch(`${ADDIS_AI_BASE}/api/v2/stt`, {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Addis AI STT failed with status ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      console.log("Addis AI STT Response:", JSON.stringify(json));

      const text =
        json.response_text ||
        json.text ||
        (json.data && (json.data.transcription || json.data.transcript || json.data.response_text)) ||
        "";

      if (!text) throw new Error("Could not extract transcript from Addis AI STT response");
      return { text, live: true };
    } catch (error) {
      console.error("Error during Addis AI STT:", error);
      return { text: FALLBACK_TRANSCRIPT, live: false };
    }
  },

  /**
   * Translate Amharic text to English
   */
  translate: async (text: string, sourceLanguage: string = "am"): Promise<AiResult> => {
    // Primary: ChatGPT API via RapidAPI
    const chatGptRes = await translateWithChatGPT(text, "English");
    if (chatGptRes.live && chatGptRes.text) {
      return chatGptRes;
    }

    // Secondary fallback: Addis AI Translate
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Using fallback translation.");
      return { text: FALLBACK_TRANSLATION, live: false };
    }

    try {
      console.log("Calling Addis AI Translate...");
      const res = await fetch(`${ADDIS_AI_BASE}/api/v1/translate`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_language: sourceLanguage,
          target_language: "en",
        }),
      });

      if (!res.ok) {
        throw new Error(`Addis AI Translate failed with status ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      console.log("Addis AI Translate Response:", JSON.stringify(json));

      const translation =
        (json.data && (json.data.translation || json.data.response_text)) ||
        json.translation ||
        json.response_text ||
        "";

      if (!translation) throw new Error("Could not extract translation from Addis AI response");
      return { text: translation, live: true };
    } catch (error) {
      console.error("Error during Addis AI translation:", error);
      return { text: FALLBACK_TRANSLATION, live: false };
    }
  },

  /**
   * Translate to an arbitrary target language (used by the narration pipeline).
   */
  translateTo: async (
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AiResult> => {
    const targetLanguageName =
      targetLanguage === "de" ? "German" : targetLanguage === "en" ? "English" : targetLanguage;

    // Primary: ChatGPT API via RapidAPI
    const chatGptRes = await translateWithChatGPT(text, targetLanguageName);
    if (chatGptRes.live && chatGptRes.text) {
      return chatGptRes;
    }

    // Secondary fallback: Addis AI Translate
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Skipping translateTo tier.");
      return { text: "", live: false };
    }

    try {
      console.log(`Calling Addis AI Translate (${sourceLanguage} → ${targetLanguage})...`);
      const res = await fetch(`${ADDIS_AI_BASE}/api/v1/translate`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Addis AI Translate failed with status ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const translation =
        (json.data && (json.data.translation || json.data.response_text)) ||
        json.translation ||
        json.response_text ||
        "";

      if (!translation) throw new Error("Empty translation response");
      return { text: translation, live: true };
    } catch (error) {
      console.error(`Addis AI translateTo(${targetLanguage}) failed:`, error);
      return { text: "", live: false };
    }
  },

  /**
   * Fallback translation via chat model
   */
  translateViaChat: async (text: string, targetLanguageName: string): Promise<AiResult> => {
    // Primary: ChatGPT API via RapidAPI
    const chatGptRes = await translateWithChatGPT(text, targetLanguageName);
    if (chatGptRes.live && chatGptRes.text) {
      return chatGptRes;
    }

    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Skipping translateViaChat tier.");
      return { text: "", live: false };
    }

    try {
      const prompt = `Translate the following text into ${targetLanguageName}.
Preserve the first-person voice and the respectful tone.
Do not add, remove, or invent any facts. Do not add commentary.
Return only the translated text.

Text: "${text}"

Translation:`;

      console.log(`Calling Addis AI chat_generate for ${targetLanguageName} translation...`);
      const res = await fetch(`${ADDIS_AI_BASE}/api/v1/chat_generate`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!res.ok) throw new Error(`chat_generate failed with status ${res.status}`);

      const json = await res.json();
      const out =
        (json.data && json.data.response_text) || json.response_text || json.text || "";

      if (!out) throw new Error("Empty chat translation response");
      return { text: out.trim(), live: true };
    } catch (error) {
      console.error(`Addis AI translateViaChat(${targetLanguageName}) failed:`, error);
      return { text: "", live: false };
    }
  },

  /**
   * Turn the raw transcript into a short, respectful donor-facing story
   */
  generateStory: async (englishTranscript: string, milestone: string): Promise<AiResult> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Using fallback story.");
      return { text: FALLBACK_STORY, live: false };
    }

    try {
      const prompt = `You are a respectful, empathetic impact storytelling copywriter.
Below is a translated transcript from a workshop founder in Ethiopia, and the verified milestone they reached.
Rewrite this into a concise, respectful, emotional story of about 3-4 sentences suitable for a donor-facing page.
Use the first-person perspective of the founder. Focus on human connection, Decent Work (SDG 8), and gratitude.
Write strictly in English. Do not invent facts that are not in the transcript or the milestone.

Founder transcript: "${englishTranscript}"
Verified milestone: "${milestone}"

Polished story:`;

      console.log("Calling Addis AI Story Generator...");
      const res = await fetch(`${ADDIS_AI_BASE}/api/v1/chat_generate`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        throw new Error(`Addis AI story generation failed with status ${res.status}`);
      }

      const json = await res.json();
      console.log("Addis AI Chat Response:", JSON.stringify(json));

      const text =
        (json.data && json.data.response_text) || json.response_text || json.text || "";

      if (!text) throw new Error("Empty story response");
      return { text, live: true };
    } catch (error) {
      console.error("Error generating story:", error);
      return { text: FALLBACK_STORY, live: false };
    }
  },

  /**
   * Break the translation into timed subtitle cues across the real clip length
   */
  generateCaptions: async (
    englishTranslation: string,
    durationSeconds: number = 15
  ): Promise<Array<{ start: number; end: number; text: string }>> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) return splitTextToCaptions(englishTranslation, durationSeconds);

    try {
      const prompt = `You format subtitles.
Break the following English text into a JSON array of timed subtitles.
Each item must have "start" (seconds), "end" (seconds), and "text".
Keep each cue to roughly 3-7 words.
The audio is ${Math.round(durationSeconds)} seconds long. Distribute cues evenly from 0 to ${Math.round(durationSeconds)}.
Return ONLY a valid JSON array — no markdown, no commentary.

Text: "${englishTranslation}"

JSON array:`;

      console.log("Calling Addis AI Subtitle Generator...");
      const res = await fetch(`${ADDIS_AI_BASE}/api/v1/chat_generate`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 800,
        }),
      });

      if (!res.ok) throw new Error(`Subtitle generation failed with status ${res.status}`);

      const json = await res.json();
      const textResponse =
        (json.data && json.data.response_text) || json.response_text || json.text || "";

      const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Bad caption shape");
      return parsed;
    } catch (error) {
      console.error("Caption generation failed, using heuristic split:", error);
      return splitTextToCaptions(englishTranslation, durationSeconds);
    }
  },
};

// Exported so the narration pipeline can reuse it rather than duplicating it.
export function splitTextToCaptions(
  text: string,
  duration: number
): Array<{ start: number; end: number; text: string }> {
  const words = text.split(" ").filter(Boolean);
  const wordsPerCue = 6;
  const cues: Array<{ start: number; end: number; text: string }> = [];

  const numCues = Math.max(1, Math.ceil(words.length / wordsPerCue));
  const timePerCue = duration / numCues;

  let currentStart = 0;
  for (let i = 0; i < words.length; i += wordsPerCue) {
    const cueWords = words.slice(i, i + wordsPerCue).join(" ");
    const start = parseFloat(currentStart.toFixed(1));
    const end = parseFloat(Math.min(currentStart + timePerCue, duration).toFixed(1));
    cues.push({ start, end, text: cueWords });
    currentStart += timePerCue;
  }

  return cues;
}
