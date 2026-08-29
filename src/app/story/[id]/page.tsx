import { db } from "@/lib/db";
import StoryClientView from "./StoryClientView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: PageProps) {
  const { id } = await params;
  await db.init();

  // Try to find the story in the database
  let story = await db.getStory(id);
  
  // If not found by story ID, try fetching by certificate ID
  if (!story) {
    story = await db.getStoryByCertificateId(id);
  }

  let certificate = null;
  let consents = [];

  if (story) {
    certificate = await db.getCertificate(story.certificate_id);
    consents = await db.getConsentForStory(story.id);
  } else {
    // Fallback Mock Story Data for demonstration safety
    story = {
      id: id,
      certificate_id: "demo-cert-id",
      founder_name: "Dawit Alemu",
      voice_url: "", // will use a mock speech audio player fallback if empty
      video_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            media: [{ url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", type: "video" as const }],
      ai_source: "fallback" as const,
      amharic_transcript: "ሰላም፣ ስሜ ዳዊት አሊሙ እባላለሁ። በአዲስ አበባ የልብስ ስፌት አውደ ጥናት አለኝ። በቅርቡ በነበረን ድጋፍ ስራችንን አስፋፍተን አሁን 9 ሰራተኞች አሉን።",
      english_translation: "Hello, my name is Dawit Alemu. I have a garment workshop in Addis Ababa. With the recent support, we expanded our work and now have 9 employees.",
      generated_story: "My name is Dawit Alemu. I run a garment workshop in Addis Ababa, Ethiopia. Thanks to the support of our donors, we have grown our workshop and successfully hit our milestone of employing 9 local garment workers. This provides decent wages, healthcare support, and stability to 9 families in our community. We are incredibly grateful for the opportunity to show our workshop, our machines, and the dedication of our employees.",
      captions: [
        { start: 0, end: 3.5, text: "Hello, my name is Dawit Alemu." },
        { start: 3.5, end: 7, text: "I have a garment workshop in Addis Ababa." },
        { start: 7, end: 11, text: "With the recent support, we expanded our work..." },
        { start: 11, end: 15, text: "...and now we employ 9 workers in our shop." }
      ],
      scenes: [
        { start: 0, end: 4, description: "Dawit greeting donors at the entrance of the workshop", importance: "medium" },
        { start: 4, end: 9, description: "Rows of electric sewing machines working, operators sewing shirts", importance: "high" },
        { start: 9, end: 13, description: "Selam Girma feeding canvas fabrics under the industrial needle feed", importance: "high" },
        { start: 13, end: 15, description: "Overview of workshop and completed garment racks", importance: "medium" }
      ],
      created_at: new Date().toISOString()
    };

    certificate = {
      id: "demo-cert-id",
      region: "Addis Ababa, Ethiopia",
      date: "2026-08-29",
      sdg: "SDG 8 — Decent Work and Economic Growth",
      milestone: "9 employees",
      coverage: "Garment workshop equipment",
      hash: "0x8a91a969999a4bc5bf09dbfd44616f94f96a07c4d793701b10f79ba59db97d0bf"
    };

    consents = [
      {
        id: "consent-dawit",
        story_id: id,
        person_name: "Dawit Alemu",
        permissions: { funder_page: true, public_page: true, social_media: true, sharing: true },
        revoked: false
      },
      {
        id: "consent-selam",
        story_id: id,
        person_name: "Selam Girma",
        permissions: { funder_page: true, public_page: true, social_media: true, sharing: true },
        revoked: false
      }
    ];
  }

  return (
    <StoryClientView
      story={story}
      certificate={certificate!}
      consents={consents}
    />
  );
}
