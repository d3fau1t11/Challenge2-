"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  Globe,
  Lock,
  UserCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  ExternalLink,
  QrCode,
  LogOut,
  User as UserIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Story, db } from "@/lib/db";
import { supabaseClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function FounderDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadFounderStories(currentUser);
      } else {
        setLoadingStories(false);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadFounderStories(currentUser);
      } else {
        setLoadingStories(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFounderStories = async (currentUser: User) => {
    setLoadingStories(true);
    try {
      // Fetch stories from Supabase or fallback
      const { data, error } = await supabaseClient
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setStories(data);
      } else {
        const local = await db.getAllStories();
        setStories(local);
      }
    } catch (err) {
      console.error("Error loading founder stories:", err);
      const local = await db.getAllStories();
      setStories(local);
    } finally {
      setLoadingStories(false);
    }
  };

  const handleRevokeStory = async (storyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this off-chain story? Media access will be disabled, but the blockchain certificate will remain 100% valid."
      )
    )
      return;

    setActionId(storyId);
    try {
      const { error } = await supabaseClient
        .from("stories")
        .update({ status: "REVOKED", updated_at: new Date().toISOString() })
        .eq("id", storyId);

      if (error) {
        await db.revokeStory(storyId);
      }

      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, status: "REVOKED" } : s))
      );
    } catch (err) {
      console.error("Error revoking story:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
    router.push("/founder");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-indigo-400 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" /> Loading Founder Dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4">
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Founder Authentication Required</h2>
          <p className="text-slate-400 text-sm">
            Please sign in to access your founder dashboard and manage your impact stories.
          </p>
          <Link
            href="/founder"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            Sign In on Founder Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-12 h-12 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">
                {user.user_metadata?.full_name || "Dawit Alemu"}
              </h1>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/founder"
              className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-2.5 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Create New Story
            </Link>

            <button
              onClick={handleSignOut}
              type="button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard Section Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> My Impact Stories
          </h2>
          <span className="text-xs text-slate-400">
            {stories.length} story record(s)
          </span>
        </div>

        {/* Stories List */}
        {loadingStories ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading your stories...
          </div>
        ) : stories.length === 0 ? (
          <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <p className="text-slate-400 text-sm">You haven&apos;t published any impact stories yet.</p>
            <Link
              href="/founder"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-2xl text-xs transition-all"
            >
              <Plus className="w-4 h-4" /> Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map((story) => {
              const isRevoked = story.status === "REVOKED";
              const isReadyForReview = story.status === "READY_FOR_REVIEW";
              const isPublished = story.status === "PUBLISHED" || !story.status;

              return (
                <div
                  key={story.id}
                  className={`bg-slate-900/40 backdrop-blur-md border rounded-3xl p-6 space-y-5 flex flex-col justify-between transition-all ${
                    isRevoked
                      ? "border-rose-500/20 bg-rose-950/10"
                      : isReadyForReview
                      ? "border-amber-500/30 bg-amber-950/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Status & Visibility Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {isRevoked ? (
                        <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Revoked
                        </span>
                      ) : isReadyForReview ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          Ready for Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                      )}

                      {/* Visibility badge */}
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

                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-1">
                        {story.founder_name}&apos;s Workshop
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Addis Ababa &bull; Milestone: <strong>9 employees</strong>
                      </p>
                    </div>

                    {story.donor_email && (
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 truncate">
                        Assigned Donor: <strong className="text-slate-300">{story.donor_name || "Donor"}</strong> ({story.donor_email})
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-slate-800/60">
                    {!isRevoked && (
                      <>
                        <Link
                          href={`/story/${story.id}`}
                          className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View Story
                        </Link>

                        <Link
                          href={`/founder/review/${story.id}`}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Review
                        </Link>

                        <Link
                          href={`/certificate/${story.certificate_id}`}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" /> QR
                        </Link>
                      </>
                    )}

                    {!isRevoked ? (
                      <button
                        onClick={() => handleRevokeStory(story.id)}
                        disabled={actionId === story.id}
                        type="button"
                        className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/20 py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </button>
                    ) : (
                      <Link
                        href={`/certificate/${story.certificate_id}`}
                        className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Certificate Still Valid (On-Chain)
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
