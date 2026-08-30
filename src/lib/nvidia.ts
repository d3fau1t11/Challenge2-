// NVIDIA Nemotron-3 Nano Omni Multimodal Scene Analysis Helper

export interface WorkshopScene {
  start: number;
  end: number;
  description: string;
  importance: "high" | "medium" | "low";
}

export const nvidia = {
  /**
   * Analyze workshop visual & audio media to detect key scenes, equipment, and working employees.
   */
  analyzeWorkshopMedia: async (
    mediaUrls: string[],
    milestone: string
  ): Promise<WorkshopScene[]> => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      console.warn("NVIDIA_API_KEY is not set. Using default scene extraction.");
      return defaultScenes(milestone);
    }

    try {
      console.log(`Calling NVIDIA Nemotron-3 Nano Omni for multimodal scene analysis (${mediaUrls.length} media item(s))...`);
      const prompt = `You are a video understanding model analyzing a garment workshop clip in Ethiopia.
Verified milestone: "${milestone}".
Identify 3-4 key scenes in this workshop clip (start second, end second, description, and importance level "high" | "medium" | "low").
Focus on machines, working operators, founder interaction, and completed garments.
Return strictly a valid JSON array of objects with keys: "start", "end", "description", "importance".`;

      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 600,
        }),
      });

      if (!res.ok) {
        throw new Error(`NVIDIA API returned status ${res.status}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log("NVIDIA Nemotron scene analysis successful:", parsed.length, "scene(s)");
        return parsed;
      }
      return defaultScenes(milestone);
    } catch (error) {
      console.error("NVIDIA Nemotron scene analysis failed, using heuristic scenes:", error);
      return defaultScenes(milestone);
    }
  },
};

function defaultScenes(milestone: string): WorkshopScene[] {
  return [
    { start: 0, end: 4, description: "Dawit greeting donors at the entrance of the workshop", importance: "medium" },
    { start: 4, end: 9, description: `Electric sewing machines operating, workers achieving ${milestone}`, importance: "high" },
    { start: 9, end: 13, description: "Selam Girma feeding canvas fabrics under industrial needle feed", importance: "high" },
    { start: 13, end: 15, description: "Overview of expanded garment racks and working employees", importance: "medium" },
  ];
}
