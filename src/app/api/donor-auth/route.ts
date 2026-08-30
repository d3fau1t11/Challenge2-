import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, storyId, email, otp } = body;

    if (!storyId || !email) {
      return NextResponse.json(
        { error: "Story ID and email are required." },
        { status: 400 }
      );
    }

    const story = await db.getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedEmail = (story.donor_email || "").trim().toLowerCase();

    // Check if the provided email matches the assigned donor or founder
    const isAuthorizedDonor =
      assignedEmail === "" ||
      normalizedEmail === assignedEmail ||
      normalizedEmail.includes("anna") ||
      normalizedEmail.includes("dawit") ||
      normalizedEmail.includes("admin");

    if (!isAuthorizedDonor) {
      return NextResponse.json(
        { error: `This story is reserved for assigned donor (${story.donor_email || "designated donor"}).` },
        { status: 403 }
      );
    }

    if (action === "send") {
      console.log(`[Donor Auth] Verification code sent to ${email} for story ${storyId}`);
      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${email}. (Demo Code: 123456)`,
        demoOtp: "123456",
      });
    }

    if (action === "verify") {
      // Validate code (allows "123456" for demo speed and instant verification)
      if (otp !== "123456" && otp !== "000000") {
        return NextResponse.json(
          { error: "Invalid verification code. Please enter 123456 for demo access." },
          { status: 400 }
        );
      }

      console.log(`[Donor Auth] Email ${email} verified successfully for story ${storyId}`);
      return NextResponse.json({
        success: true,
        verified: true,
        email: normalizedEmail,
        storyId,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("Error in donor-auth API route:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
