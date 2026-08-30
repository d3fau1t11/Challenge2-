import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await db.init();
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    const consents = await db.getConsentForStory(storyId);
    return NextResponse.json({ success: true, consents });
  } catch (error) {
    console.error("Error in GET /api/consent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read consents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.init();
    const body = await req.json();
    const { id, revoked, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: "Consent record ID is required" }, { status: 400 });
    }

    // Read the row BEFORE updating so we can compare old against new.
    // We delete narration only on a real transition, not on every save —
    // otherwise toggling back and forth during the demo thrashes the bucket.
    const previous = await db.getConsentById(id);

    const updated = await db.updateConsent(id, revoked, permissions);
    if (!updated) {
      return NextResponse.json({ error: "Consent record not found" }, { status: 404 });
    }

    if (previous) {
      const wasAllowed =
        !previous.revoked && previous.permissions?.translated_narration !== false;
      const nowAllowed =
        !updated.revoked && updated.permissions?.translated_narration !== false;

      // Narration is derived data with no evidentiary value, so withdrawal
      // destroys it rather than hiding it. The original Amharic recording and
      // the certificate are untouched.
      if (wasAllowed && !nowAllowed) {
        const deleted = await db.deleteNarrations(updated.story_id);
        console.log(
          `Consent withdrawn for translated narration — deleted ${deleted} narration row(s) and their audio.`
        );
        return NextResponse.json({
          success: true,
          consent: updated,
          narrationsDeleted: deleted,
        });
      }
    }

    return NextResponse.json({ success: true, consent: updated });
  } catch (error) {
    console.error("Error in POST /api/consent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update consent" },
      { status: 500 }
    );
  }
}
