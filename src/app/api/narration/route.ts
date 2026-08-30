import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildNarration, narrationAllowed, NarrationLang } from "@/lib/narration";

// One language per request. Two ElevenLabs calls in a single invocation risks
// the Vercel timeout; the client fires the two requests in parallel instead.
export const maxDuration = 60;

function parseLang(value: unknown): NarrationLang | null {
  return value === "en" || value === "de" || value === "om" || value === "ti" ? value : null;
}

/**
 * POST — generate (or return) one narration for one story.
 * Idempotent: an existing row with audio is returned unchanged, so this is
 * safe to hammer.
 */
export async function POST(req: NextRequest) {
  try {
    await db.init();

    const body = await req.json();
    const storyId: string | undefined = body?.storyId;
    const lang = parseLang(body?.lang);

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }
    if (!lang) {
      return NextResponse.json(
        { error: "lang must be one of: 'en', 'de', 'om', 'ti'." },
        { status: 400 }
      );
    }


    // Real rows only. No mock-story fallback here — /story/anything must never
    // create narration rows for a story that does not exist.
    const story = await db.getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Gate at the source, not just at display. No audio is ever created for a
    // founder who did not agree to be re-voiced.
    const consents = await db.getConsentForStory(story.id);
    if (!narrationAllowed(consents, story.founder_name)) {
      return NextResponse.json(
        { error: "Translated narration is not permitted for this story." },
        { status: 403 }
      );
    }

    const existing = await db.getNarration(story.id, lang);
    if (existing && existing.audio_url) {
      return NextResponse.json({ success: true, narration: existing, cached: true });
    }

    const row = await buildNarration(story, lang);
    const saved = await db.upsertNarration(row);

    // Note the 200 even when audio failed: text-without-audio is a useful
    // state, and losing the text as well would be worse.
    return NextResponse.json({ success: true, narration: saved, cached: false });
  } catch (error) {
    console.error("Error in POST /api/narration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Narration generation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET — read the narrations for a story.
 * The story page server-renders its own, so this exists for the founder page's
 * "is it ready yet" poll and for debugging on stage.
 */
export async function GET(req: NextRequest) {
  try {
    await db.init();
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    const story = await db.getStory(storyId);
    if (!story) {
      return NextResponse.json({ exists: false, allowed: false, narrations: [] });
    }

    const consents = await db.getConsentForStory(story.id);
    const allowed = narrationAllowed(consents, story.founder_name);

    // Do not ship the text to a browser that should not have it.
    if (!allowed) {
      return NextResponse.json({ exists: true, allowed: false, narrations: [] });
    }

    const narrations = await db.getNarrations(story.id);
    return NextResponse.json({ exists: true, allowed: true, narrations });
  } catch (error) {
    console.error("Error in GET /api/narration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read narrations" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — remove every narration row for the story AND the generated MP3s
 * from the media bucket. Called by the consent route when the founder
 * withdraws. Deleted, not hidden.
 */
export async function DELETE(req: NextRequest) {
  try {
    await db.init();
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    const deleted = await db.deleteNarrations(storyId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error in DELETE /api/narration:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete narrations" },
      { status: 500 }
    );
  }
}
