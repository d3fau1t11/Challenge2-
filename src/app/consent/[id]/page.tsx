import { db } from "@/lib/db";
import ConsentClientView from "./ConsentClientView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsentPage({ params }: PageProps) {
  const { id } = await params;
  await db.init();

  let story = await db.getStory(id);
  if (!story) {
    story = await db.getStoryByCertificateId(id);
  }

  const storyId = story ? story.id : id;
  let consents = story ? await db.getConsentForStory(story.id) : [];

  if (consents.length === 0) {
    // Seed default mock consents for demonstration safety
    consents = [
      {
        id: "consent-dawit",
        story_id: storyId,
        person_name: story ? story.founder_name : "Dawit Alemu",
        permissions: { funder_page: true, public_page: true, social_media: true, sharing: true },
        revoked: false
      },
      {
        id: "consent-selam",
        story_id: storyId,
        person_name: "Selam Girma",
        permissions: { funder_page: true, public_page: true, social_media: true, sharing: true },
        revoked: false
      }
    ];
  }

  return (
    <ConsentClientView
      storyId={storyId}
      initialConsents={consents}
    />
  );
}
