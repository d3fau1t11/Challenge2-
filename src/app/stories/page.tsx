"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  QrCode,
  ExternalLink,
  Globe,
  Lock,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Search,
  BookOpen,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { Story } from "@/lib/db";

// Fallback demo story if database is fresh
const DEMO_STORIES: Story[] = [
  {
    id: "demo-story-id",
    certificate_id: "demo-cert",
    founder_name: "Dawit Alemu",
    voice_url: "/uploads/demo-voice.wav",
    video_url: "",
    media: [
      { url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800", type: "image" },
      { url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=800", type: "image" },
    ],
    visibility: "public",
    status: "PUBLISHED",
    ai_source: "live",
    amharic_transcript:
      "ትልቅ ህልም ይታይሃል ገና ዛሬ ስትጀምር አንድ ሚሊየን ፎሎወር ይታይሃል ገና አሁን ስትጀምር አንድ ሚሊየን በወር ስታገኝ ይታይሃል...",
    english_translation:
      "You see a big dream even as you start today. You see a million followers right at the beginning. You see making a million a month...",
    generated_story:
      "Dawit Alemu started his garment and leather workshop in Addis Ababa with a vision to create dignified jobs...",
    captions: [],
    scenes: [],
    created_at: new Date().toISOString(),
  },
];

export default function PublicStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQrStory, setActiveQrStory] = useState<Story | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setStories(data);
      } else {
        setStories(DEMO_STORIES);
      }
    } catch (err) {
      console.error("Error fetching public stories:", err);
      setStories(DEMO_STORIES);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (storyId: string) => {
    const url = `${window.location.origin}/story/${storyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(storyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredStories = stories.filter(
    (s) =>
      s.founder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.generated_story?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.certificate_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back Home
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all"
          >
            <QrCode className="w-3.5 h-3.5" /> Camera QR Scanner
          </Link>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4" /> Story Storage & QR Certificates
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-400">
            TrueImpact Stories Storage
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Browse all verified founder impact stories along with their linked cryptographic certificate QR codes.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by founder, milestone, or certificate ID..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-lg"
          />
        </div>

        {/* Stories Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" /> Loading story storage...
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <p className="text-slate-400 text-sm">No impact stories matched your search.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-indigo-400 hover:underline font-semibold"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => {
              const isRevoked = story.status === "REVOKED";
              const qrUrl = typeof window !== "undefined"
                ? `${window.location.origin}/story/${story.id}`
                : `/story/${story.id}`;

              return (
                <div
                  key={story.id}
                  className="bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 flex flex-col justify-between space-y-6 transition-all shadow-xl hover:shadow-2xl group"
                >
                  <div className="space-y-4">
                    {/* Badges Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Verified Certificate
                      </span>

                      <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                        {story.visibility === "public" ? (
                          <>
                            <Globe className="w-3 h-3 text-emerald-400" /> Public
                          </>
                        ) : story.visibility === "private" ? (
                          <>
                            <Lock className="w-3 h-3 text-amber-400" /> Private
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-indigo-400" /> Donor Only
                          </>
                        )}
                      </span>
                    </div>

                    {/* QR Code Embedded Card */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-center gap-4 relative overflow-hidden">
                      {/* QR Thumbnail */}
                      <button
                        onClick={() => setActiveQrStory(story)}
                        className="bg-white p-2 rounded-xl flex-shrink-0 hover:scale-105 transition-transform shadow-md group/qr"
                        title="Click to expand QR Code"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrUrl)}`}
                          alt="Story QR Code"
                          className="w-16 h-16 object-contain"
                        />
                      </button>

                      <div className="space-y-1 truncate">
                        <div className="text-xs font-bold text-white truncate">
                          {story.founder_name}&apos;s Workshop
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Cert ID: <span className="font-mono text-slate-300">#{story.certificate_id.slice(0, 8)}...</span>
                        </div>
                        <button
                          onClick={() => setActiveQrStory(story)}
                          className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-0.5"
                        >
                          <QrCode className="w-3 h-3" /> View QR Cert
                        </button>
                      </div>
                    </div>

                    {/* Story Preview Snippet */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {story.generated_story || story.english_translation}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <Link
                      href={`/story/${story.id}`}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> View Story
                    </Link>

                    <Link
                      href={`/certificate/${story.certificate_id}`}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      title="View Blockchain Certificate"
                    >
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Cert
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Code Expansion Modal */}
        {activeQrStory && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-6 text-center shadow-2xl relative animate-[fadeIn_0.2s_ease-out]">
              <button
                onClick={() => setActiveQrStory(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">{activeQrStory.founder_name}&apos;s Story QR</h3>
                <p className="text-xs text-slate-400">
                  Scan with your phone camera to open this verified impact story
                </p>
              </div>

              {/* QR Image */}
              <div className="p-4 bg-white rounded-2xl inline-block mx-auto shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? `${window.location.origin}/story/${activeQrStory.id}`
                      : `/story/${activeQrStory.id}`
                  )}`}
                  alt="Story Certificate QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>

              <div className="space-y-2">
                <div className="text-[11px] text-slate-400 truncate bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/story/${activeQrStory.id}`
                    : `/story/${activeQrStory.id}`}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyLink(activeQrStory.id)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                  >
                    {copiedId === activeQrStory.id ? "Copied Link!" : "Copy Story Link"}
                  </button>
                  <Link
                    href={`/story/${activeQrStory.id}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
