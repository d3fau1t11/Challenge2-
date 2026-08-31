import { db, Narration } from "@/lib/db";
import { narrationAllowed } from "@/lib/narration";
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

  // Whether this ID resolved to a real database row. The client uses it to
  // decide whether it may fire narration generation — otherwise /story/anything
  // would POST jobs for a story that does not exist.
  const isRealStory = !!story;

  let narrations: Narration[] = [];
  let allowNarration = true;

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Story Not Found</h1>
            <p className="text-slate-400 text-xs leading-relaxed">
              No verified impact story was found for ID <span className="font-mono text-slate-300">&quot;{id}&quot;</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href="/stories"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-2xl text-xs transition-colors"
            >
              Browse Public Stories
            </a>
            <a
              href="/founder"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-2xl text-xs transition-colors"
            >
              Create Story
            </a>
          </div>
        </div>
      </div>
    );
  }

  certificate = await db.getCertificate(story.certificate_id);
  consents = await db.getConsentForStory(story.id);
  allowNarration = narrationAllowed(consents, story.founder_name);
  narrations = allowNarration ? await db.getNarrations(story.id) : [];

  return (
    <StoryClientView
      story={story}
      certificate={certificate!}
      consents={consents}
      narrations={narrations}
      narrationAllowed={allowNarration}
      isRealStory={isRealStory}
    />
  );
}
