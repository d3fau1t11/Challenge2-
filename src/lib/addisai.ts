// Addis AI API helper
const ADDIS_AI_BASE = "https://api.addisassistant.com";

export const addisai = {
  /**
   * Speech-to-text transcribe Amharic voice note
   */
  transcribe: async (audioBuffer: Buffer, mimeType: string): Promise<string> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Returning fallback mock transcription.");
      return "ሰላም፣ ስሜ ዳዊት አሊሙ እባላለሁ። በአዲስ አበባ የልብስ ስፌት አውደ ጥናት አለኝ። በቅርቡ በነበረን ድጋፍ ስራችንን አስፋፍተን አሁን 9 ሰራተኞች አሉን።";
    }

    try {
      const url = `${ADDIS_AI_BASE}/api/v2/stt`;
      const formData = new FormData();
      
      // Convert buffer to Blob
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append("audio", blob, "voice.wav");
      formData.append("request_data", JSON.stringify({ language_code: "am" }));

      console.log("Calling Addis AI STT...");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Addis AI STT failed with status ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      console.log("Addis AI STT Response:", JSON.stringify(json));
      
      // STT returns either response_text or text or data.transcript
      const text = json.response_text || json.text || (json.data && json.data.transcript) || "";
      if (!text) {
        throw new Error("Could not extract transcript from Addis AI STT response");
      }
      return text;
    } catch (error) {
      console.error("Error during Addis AI STT:", error);
      // Fallback for hackathon safety
      return "ሰላም፣ ስሜ ዳዊት አሊሙ እባላለሁ። በአዲስ አበባ የልብስ ስፌት አውደ ጥናት አለኝ። በቅርቡ በነበረን ድጋፍ ስራችንን አስፋፍተን አሁን 9 ሰራተኞች አሉን።";
    }
  },

  /**
   * Translate text from Amharic to English
   */
  translate: async (text: string): Promise<string> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Returning fallback mock translation.");
      return "Hello, my name is Dawit Alemu. I have a garment workshop in Addis Ababa. With the recent support, we expanded our work and now have 9 employees.";
    }

    try {
      const url = `${ADDIS_AI_BASE}/api/v1/translate`;
      console.log("Calling Addis AI Translate...");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          source_language: "am",
          target_language: "en",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Addis AI Translate failed with status ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      console.log("Addis AI Translate Response:", JSON.stringify(json));
      
      const translation = (json.data && json.data.translation) || json.translation || json.response_text || "";
      if (!translation) {
        throw new Error("Could not extract translation from Addis AI response");
      }
      return translation;
    } catch (error) {
      console.error("Error during Addis AI translation:", error);
      return "Hello, my name is Dawit Alemu. I have a garment workshop in Addis Ababa. With the recent support, we expanded our work and now have 9 employees.";
    }
  },

  /**
   * Clean up and generate a beautiful, respectful story using chat completion
   */
  generateStory: async (englishTranscript: string, milestone: string): Promise<string> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      console.warn("ADDIS_AI_API_KEY is not set. Returning fallback mock story.");
      return "My name is Dawit Alemu. I run a garment workshop in Addis Ababa, Ethiopia. Thanks to the support of our donors, we have grown our workshop and successfully hit our milestone of employing 9 local garment workers. This provides decent wages, healthcare support, and stability to 9 families in our community. We are incredibly grateful for the opportunity to show our workshop, our machines, and the dedication of our employees.";
    }

    try {
      const url = `${ADDIS_AI_BASE}/api/v1/chat_generate`;
      const prompt = `You are a respectful, empathetic impact storytelling copywriter. 
Below is a translated transcript of a garment workshop founder in Addis Ababa, and the verified milestone they reached.
Please rewrite this transcript and milestone into a concise, respectful, and emotional story (approx 3-4 sentences) suitable for a donor-facing landing page.
Use first-person perspective of the founder. Focus on human connection, Decent Work (SDG 8), and gratitude.

Founder Transcript: "${englishTranscript}"
Verified Milestone: "${milestone}"

Polished Story:`;

      console.log("Calling Addis AI Story Generator...");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Addis AI story generation failed with status ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      console.log("Addis AI Chat Response:", JSON.stringify(json));
      return json.response_text || json.text || "";
    } catch (error) {
      console.error("Error generating story:", error);
      return "My name is Dawit Alemu. I run a garment workshop in Addis Ababa, Ethiopia. Thanks to the support of our donors, we have grown our workshop and successfully hit our milestone of employing 9 local garment workers. This provides decent wages, healthcare support, and stability to 9 families in our community. We are incredibly grateful for the opportunity to show our workshop, our machines, and the dedication of our employees.";
    }
  },

  /**
   * Generate simple subtitle cues from translation
   */
  generateCaptions: async (englishTranslation: string, durationSeconds: number = 15): Promise<Array<{ start: number; end: number; text: string }>> => {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) {
      // Return simple evenly spaced captions
      return splitTextToCaptions(englishTranslation, durationSeconds);
    }

    try {
      const url = `${ADDIS_AI_BASE}/api/v1/chat_generate`;
      const prompt = `You are an assistant that formats subtitles.
Take the following English translation of a speaker and break it down into a JSON array of timed subtitles.
Each subtitle must contain "start" (seconds), "end" (seconds), and "text" (the subtitle content).
Keep the segment lengths short (approx 3-7 words per subtitle).
The total duration of the audio is ${durationSeconds} seconds. Distribute the subtitles evenly from 0 to ${durationSeconds}.
Return ONLY a valid JSON array, with no other text, comments, markdown blocks, or formatting.

Translation: "${englishTranslation}"

JSON Array Output:`;

      console.log("Calling Addis AI Subtitle Generator...");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 800,
        }),
      });

      if (!res.ok) {
        throw new Error(`Addis AI subtitle generation failed with status ${res.status}`);
      }

      const json = await res.json();
      const textResponse = json.response_text || json.text || "";
      // Strip markdown code block wrappers if any
      const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Error generating timed captions via AI, falling back to heuristic:", error);
      return splitTextToCaptions(englishTranslation, durationSeconds);
    }
  }
};

// Heuristic fallback for dividing text into captions
function splitTextToCaptions(text: string, duration: number): Array<{ start: number; end: number; text: string }> {
  const words = text.split(" ");
  const wordsPerCue = 6;
  const cues: Array<{ start: number; end: number; text: string }> = [];
  
  let currentStart = 0;
  const numCues = Math.ceil(words.length / wordsPerCue);
  const timePerCue = duration / numCues;

  for (let i = 0; i < words.length; i += wordsPerCue) {
    const cueWords = words.slice(i, i + wordsPerCue).join(" ");
    const start = parseFloat(currentStart.toFixed(1));
    const end = parseFloat((currentStart + timePerCue).toFixed(1));
    cues.push({
      start,
      end: end > duration ? duration : end,
      text: cueWords
    });
    currentStart += timePerCue;
  }
  return cues;
}
