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
  } catch (error: any) {
    console.error("Error in GET /api/consent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const updated = await db.updateConsent(id, revoked, permissions);
    if (!updated) {
      return NextResponse.json({ error: "Consent record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, consent: updated });
  } catch (error: any) {
    console.error("Error in POST /api/consent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
