import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addisai } from "@/lib/addisai";
import { nvidia } from "@/lib/nvidia";


export interface MediaItem {
  url: string;
  type: "video" | "image";
}

export async function POST(req: NextRequest) {
  try {
    await db.init();

    const formData = await req.formData();
    const voiceFile = formData.get("voice") as File | null;
    const videoFile = formData.get("video") as File | null;
    const photoFiles = formData.getAll("photos") as File[];

    const durationRaw = parseFloat((formData.get("duration") as string) || "15");
    const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : 15;

    const milestone = (formData.get("milestone") as string) || "9 employees";
    const founderName = (formData.get("founderName") as string) || "Dawit Alemu";
    const founderId = (formData.get("founderId") as string) || "";
    const visibility = ((formData.get("visibility") as string) || "donor_only") as "public" | "donor_only" | "private";
    const donorName = (formData.get("donorName") as string) || "";
    const donorEmail = (formData.get("donorEmail") as string) || "";

    const consentDawit = formData.get("consentDawit") === "true";
    const consentSelam = formData.get("consentSelam") === "true";
    // Default true when the field is absent so older clients keep working.
    const consentNarration = formData.get("consentNarration") !== "false";

    // --- Validation ---
    // The voice is required: everything downstream is built from it.
    if (!voiceFile) {
      return NextResponse.json(
        { error: "A voice note is required — it is what the story is made from." },
        { status: 400 }
      );
    }
    if (!videoFile && photoFiles.length === 0) {
      return NextResponse.json(
        { error: "Add at least one photo or a video of the workshop." },
        { status: 400 }
      );
    }

    // Extracted WAV is uncompressed (~32 KB per second), so allow headroom
    if (voiceFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio file is too large (limit 25MB)" }, { status: 400 });
    }
    if (videoFile && videoFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Video file is too large (limit 50MB)" }, { status: 400 });
    }
    for (const p of photoFiles) {
      if (p.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `Photo "${p.name}" is too large (limit 10MB)` }, { status: 400 });
      }
      if (p.type && !p.type.startsWith("image/")) {
        return NextResponse.json({ error: "Photos must be image files" }, { status: 400 });
      }
    }

    // Browser-extracted blobs can arrive with an empty MIME type, so allow that
    if (voiceFile.type && !voiceFile.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Invalid voice file format (audio only)" }, { status: 400 });
    }
    if (videoFile && videoFile.type && !videoFile.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid video file format" }, { status: 400 });
    }

    console.log("Files validated. Uploading media to storage...");

    // --- Upload media ---
    const voiceBuffer = Buffer.from(await voiceFile.arrayBuffer());
    const voiceUrl = await db.uploadMedia(voiceFile.name, voiceBuffer, voiceFile.type || "audio/wav");

    const media: MediaItem[] = [];

    if (videoFile) {
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const videoUrl = await db.uploadMedia(videoFile.name, videoBuffer, videoFile.type);
      media.push({ url: videoUrl, type: "video" });
    }

    for (const photo of photoFiles) {
      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      const photoUrl = await db.uploadMedia(photo.name, photoBuffer, photo.type || "image/jpeg");
      media.push({ url: photoUrl, type: "image" });
    }

    console.log(`Media uploaded. Voice: ${voiceUrl}, ${media.length} visual item(s).`);

    // --- AI pipeline ---
    // Each call reports whether it ran live so the UI can be honest about it.
    const transcription = await addisai.transcribe(voiceBuffer, voiceFile.type || "audio/wav");
    console.log("Transcript completed.");

    const translation = await addisai.translate(transcription.text);
    console.log("Translation completed.");

    const story = await addisai.generateStory(translation.text, milestone);
    console.log("Story generation completed.");

    const captions = await addisai.generateCaptions(translation.text, duration);
    console.log("Captions generated.");

    // NVIDIA Nemotron-3 Nano Omni scene analysis
    const mediaUrls = media.map((m) => m.url);
    const scenes = await nvidia.analyzeWorkshopMedia(mediaUrls, milestone);
    console.log("NVIDIA Nemotron scene analysis completed.");

    const aiSource: "live" | "fallback" =
      transcription.live && translation.live && story.live ? "live" : "fallback";

    // --- Layer 1: anonymous on-chain certificate ---
    // Hash the anonymised fields so the value is defensible, not random.
    const certFields = {
      region: "Addis Ababa",
      date: new Date().toISOString().split("T")[0],
      sdg: "SDG 8 — Decent Work and Economic Growth",
      milestone,
      coverage: "Workshop equipment",
    };

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(certFields)));
    const hash =
      "0x" +
      Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    const cert = await db.createCertificate({ ...certFields, hash });
    console.log(`Anonymous certificate generated. ID: ${cert.id}`);

    // --- Layer 2: off-chain story ---
    const videoItem = media.find((m) => m.type === "video");

    const savedStory = await db.createStory({
      certificate_id: cert.id,
      founder_id: founderId,
      founder_name: founderName,
      voice_url: voiceUrl,
      video_url: videoItem ? videoItem.url : "",
      media,
      visibility,
      status: "READY_FOR_REVIEW",
      donor_name: donorName,
      donor_email: donorEmail,
      ai_source: aiSource,
      amharic_transcript: transcription.text,
      english_translation: translation.text,
      generated_story: story.text,
      captions,
      scenes,
    });

    console.log(`Story record created. ID: ${savedStory.id} (Status: READY_FOR_REVIEW, Visibility: ${visibility})`);


    // --- Consent: per person, per purpose, revocable ---
    await db.createConsent({
      story_id: savedStory.id,
      person_name: founderName,
      permissions: {
        funder_page: true,
        public_page: consentDawit,
        social_media: consentDawit,
        sharing: consentDawit,
        // Re-voicing his words in another language is his call alone.
        translated_narration: consentNarration,
      },
      revoked: false,
    });

    await db.createConsent({
      story_id: savedStory.id,
      person_name: "Selam Girma",
      permissions: {
        funder_page: true,
        public_page: consentSelam,
        social_media: consentSelam,
        sharing: consentSelam,
        // Selam's consent covers her appearance in the media. Translated
        // narration is about the founder's words, so it is not her purpose.
        translated_narration: false,
      },
      revoked: false,
    });

    console.log("Consent records registered.");

    return NextResponse.json({
      success: true,
      storyId: savedStory.id,
      certificateId: cert.id,
      aiSource,
      narrationConsented: consentNarration,
    });
  } catch (error: any) {
    console.error("Critical error in story generation pipeline:", error);
    let errorMessage = "An unexpected error occurred in the story generation pipeline.";
    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null && error.message) {
      errorMessage = String(error.message);
    } else if (typeof error === "string" && error.trim()) {
      errorMessage = error;
    }

    if (!errorMessage || errorMessage.trim() === "" || errorMessage === "<none>") {
      errorMessage = "An unexpected error occurred in the story generation pipeline.";
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
