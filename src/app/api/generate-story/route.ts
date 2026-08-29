import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addisai } from "@/lib/addisai";
import { nvidia } from "@/lib/nvidia";

export async function POST(req: NextRequest) {
  try {
    // Ensure DB (or local fallback file structure) is initialized
    await db.init();

    const formData = await req.formData();
    const voiceFile = formData.get("voice") as File | null;
    const videoFile = formData.get("video") as File | null;
    const milestone = (formData.get("milestone") as string) || "9 employees";
    const founderName = (formData.get("founderName") as string) || "Dawit Alemu";
    const consentDawit = formData.get("consentDawit") === "true";
    const consentSelam = formData.get("consentSelam") === "true";

    // 1. Validation
    if (!voiceFile) {
      return NextResponse.json({ error: "Voice note is required" }, { status: 400 });
    }
    if (!videoFile) {
      return NextResponse.json({ error: "Video file is required" }, { status: 400 });
    }

    // Security: size limits (max 10MB for audio, 50MB for video)
    if (voiceFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file is too large (limit 10MB)" }, { status: 400 });
    }
    if (videoFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Video file is too large (limit 50MB)" }, { status: 400 });
    }

    // Security: MIME type validation
    if (!voiceFile.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Invalid voice file format (audio only)" }, { status: 400 });
    }
    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid video file format (video only)" }, { status: 400 });
    }

    console.log("Files validated. Uploading media files to storage...");

    // Convert Files to Buffers
    const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    // 2. Upload media
    const voiceUrl = await db.uploadMedia(voiceFile.name, voiceBuffer, voiceFile.type);
    const videoUrl = await db.uploadMedia(videoFile.name, videoBuffer, videoFile.type);

    console.log(`Media uploaded. Voice: ${voiceUrl}, Video: ${videoUrl}`);
    console.log("Triggering Addis AI Speech-to-Text translation...");

    // 3. Speech-to-text (Amharic)
    const amharicTranscript = await addisai.transcribe(voiceBuffer, voiceFile.type);
    console.log("Transcript completed.");

    // 4. Translate transcript to English
    const englishTranslation = await addisai.translate(amharicTranscript);
    console.log("Translation completed.");

    // 5. Generate concise storyteller text
    const generatedStory = await addisai.generateStory(englishTranslation, milestone);
    console.log("Story generation completed.");

    // 6. Generate timed subtitles (default duration is approx 15 seconds)
    const captions = await addisai.generateCaptions(englishTranslation, 15);
    console.log("Captions generated.");

    // 7. Video analysis using NVIDIA Nemotron 3 Nano Omni
    const scenes = await nvidia.analyzeVideo(videoUrl);
    console.log("NVIDIA video scene analysis completed.");

    // 8. Create mock on-chain certificate
    // Representing Layer 1 (Only anonymized details)
    const mockHash = "0x" + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

    const cert = await db.createCertificate({
      region: "Addis Ababa",
      date: new Date().toISOString().split("T")[0],
      sdg: "SDG 8 — Decent Work and Economic Growth",
      milestone: milestone,
      coverage: "Garment workshop equipment",
      hash: mockHash,
    });

    console.log(`Anonymous certificate generated. ID: ${cert.id}`);

    // 9. Save storytelling data off-chain
    const story = await db.createStory({
      certificate_id: cert.id,
      founder_name: founderName,
      voice_url: voiceUrl,
      video_url: videoUrl,
      amharic_transcript: amharicTranscript,
      english_translation: englishTranslation,
      generated_story: generatedStory,
      captions: captions,
      scenes: scenes,
    });

    console.log(`Story record created. ID: ${story.id}`);

    // 10. Record consent settings for Dawit and Selam Girma
    // Consent is stored per person + per purpose + revocable
    await db.createConsent({
      story_id: story.id,
      person_name: founderName,
      permissions: {
        funder_page: true,
        public_page: consentDawit,
        social_media: consentDawit,
        sharing: consentDawit,
      },
      revoked: !consentDawit,
    });

    await db.createConsent({
      story_id: story.id,
      person_name: "Selam Girma",
      permissions: {
        funder_page: true,
        public_page: consentSelam,
        social_media: consentSelam,
        sharing: consentSelam,
      },
      revoked: !consentSelam,
    });

    console.log("Consent records registered.");

    return NextResponse.json({
      success: true,
      storyId: story.id,
      certificateId: cert.id,
    });
  } catch (error: any) {
    console.error("Critical error in AI story generator pipeline:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred in the story generation pipeline." },
      { status: 500 }
    );
  }
}
