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
  } catch (error) {
    console.error("Error in /api/delete-story:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
