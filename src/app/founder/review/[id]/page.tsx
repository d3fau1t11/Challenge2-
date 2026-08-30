"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  ArrowLeft,
  Edit3,
  RefreshCw,
  Trash2,
  Globe,
  Lock,
  UserCheck,
  Zap,
  Sparkles,
  QrCode,
} from "lucide-react";
import { Story, Certificate } from "@/lib/db";
import { supabaseClient } from "@/lib/supabaseClient";

export default function ReviewStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const storyId = resolvedParams.id;
  const router = useRouter();

  const [story, setStory] = useState<Story | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedStory, setEditedStory] = useState("");
  const [visibility, setVisibility] = useState<"public" | "donor_only" | "private">("donor_only");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStory() {
      try {
        const { data: storyData, error: storyErr } = await supabaseClient
          .from("stories")
          .select("*")
          .eq("id", storyId)
          .single();

        if (storyErr || !storyData) {
          // Try API fetch fallback
          const res = await fetch(`/api/story?id=${storyId}`);
          if (res.ok) {
            const json = await res.json();
            setStory(json.story);
            setCertificate(json.certificate);
            setEditedStory(json.story.generated_story);
            setVisibility(json.story.visibility || "donor_only");
          } else {
            setError("Story not found.");
          }
        } else {
          setStory(storyData);
          setEditedStory(storyData.generated_story);
          setVisibility(storyData.visibility || "donor_only");

          const { data: certData } = await supabaseClient
            .from("certificates")
            .select("*")
            .eq("id", storyData.certificate_id)
            .single();

          if (certData) setCertificate(certData);
        }
      } catch (err: any) {
        console.error("Error loading story for review:", err);
        setError("Could not load story details.");
      } finally {
        setLoading(false);
      }
    }
    loadStory();
  }, [storyId]);

  const handleApprovePublish = async () => {
    if (!story) return;
    setSaving(true);
    setError(null);

    try {
      const { error: updateErr } = await supabaseClient
        .from("stories")
        .update({
          generated_story: editedStory,
          visibility,
          status: "PUBLISHED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", story.id);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      router.push(`/story/${story.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to publish story.");
      setSaving(false);
    }
  };

  const handleRevokeDelete = async () => {
    if (!story || !confirm("Are you sure you want to revoke this story? Media will be disabled, but the blockchain certificate will remain 100% valid.")) return;
    setSaving(true);

    try {
      await supabaseClient
        .from("stories")
        .update({ status: "REVOKED", updated_at: new Date().toISOString() })
        .eq("id", story.id);

      router.push("/founder/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to revoke story.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-indigo-400 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" /> Loading story review...
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-rose-300">Review Unavailable</h2>
          <p className="text-slate-400 text-sm">{error || "Story could not be loaded."}</p>
          <Link
            href="/founder/dashboard"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-2xl w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/founder/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>

          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Ready for Review
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
            Review Your Impact Story
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Review the AI-constructed story before publishing. You have full ownership to edit text, set visibility, or revoke at any time.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Story Text Editor */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-indigo-400" /> Story Narrative (English)
            </span>
            <span className="text-[11px] text-indigo-400 font-normal">Editable</span>
          </label>

          <textarea
            rows={5}
            value={editedStory}
            onChange={(e) => setEditedStory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
          />
        </div>

        {/* Detected Scenes (NVIDIA Nemotron-3 Omni) */}
        {story.scenes && story.scenes.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> NVIDIA Nemotron Video Scenes
            </div>
            <div className="space-y-2">
              {story.scenes.map((scene, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs flex items-center justify-between gap-3">
                  <span className="text-slate-300">{scene.description}</span>
                  <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full flex-shrink-0">
                    {scene.start}s - {scene.end}s ({scene.importance})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visibility Controls */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-indigo-400" /> Select Story Visibility
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                visibility === "public"
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Globe className="w-4 h-4 mb-1.5 text-emerald-400" />
              <div className="text-xs font-bold">Public</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Open to anyone</div>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("donor_only")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                visibility === "donor_only"
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <UserCheck className="w-4 h-4 mb-1.5 text-indigo-400" />
              <div className="text-xs font-bold">Donor Only</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Email OTP required</div>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                visibility === "private"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Lock className="w-4 h-4 mb-1.5 text-amber-400" />
              <div className="text-xs font-bold">Private</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Owner only</div>
            </button>
          </div>

          {story.donor_email && (
            <div className="text-xs text-slate-400 bg-slate-900 p-3 rounded-xl border border-slate-800">
              Assigned Donor: <strong>{story.donor_name || "Assigned Donor"}</strong> ({story.donor_email})
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleApprovePublish}
            disabled={saving}
            type="button"
            className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" /> {saving ? "Publishing..." : "Approve & Publish Story"}
          </button>

          <button
            onClick={handleRevokeDelete}
            disabled={saving}
            type="button"
            className="w-full sm:w-auto bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 font-semibold py-3.5 px-5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Revoke / Delete
          </button>
        </div>
      </div>
    </div>
  );
}
