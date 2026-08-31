import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { storyId } = await req.json();

    if (!storyId) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    await db.init();
    const success = await db.deleteStory(storyId);

    if (success) {
      return NextResponse.json({ success: true, message: "Story deleted successfully" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Failed to delete story from database" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error in /api/delete-story:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
