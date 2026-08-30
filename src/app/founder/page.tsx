"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, BarChart2, Shield, ArrowRight, CheckCircle2, Loader2, Upload, Image as ImageIcon, Music, X, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { extractAudioFromVideo, getMediaDuration } from "@/lib/extractAudio";
import { supabaseClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function FounderPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [founderName, setFounderName] = useState("Dawit Alemu");
  const [milestone, setMilestone] = useState("9 employees");
  const [language, setLanguage] = useState("am");

  // MVP Visibility & Donor state
  const [visibility, setVisibility] = useState<"public" | "donor_only" | "private">("donor_only");
  const [donorName, setDonorName] = useState("Anna Beier");
  const [donorEmail, setDonorEmail] = useState("anna@example.com");

  // Media state — all uploads, no recording
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Consent state
  const [consentDawit, setConsentDawit] = useState(true);
  const [consentSelam, setConsentSelam] = useState(true);
  // Default checked, but a real control: he can turn it off before submitting.
  const [consentNarration, setConsentNarration] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [narrationStatus, setNarrationStatus] = useState<string | null>(null);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.user_metadata?.full_name) {
        setFounderName(currentUser.user_metadata.full_name);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.user_metadata?.full_name) {
        setFounderName(currentUser.user_metadata.full_name);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
    if (error) {
      setError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    setUser(null);
  };

  const steps = [
    "Uploading media to secure off-chain storage...",
    "Transcribing the Amharic voice note...",
    "Translating transcription to English...",
    "NVIDIA Nemotron-3 analyzing workshop scenes...",
    "Generating story draft for review...",
  ];

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("Audio file is too large (max 25MB).");
      return;
    }
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Video file is too large (max 50MB).");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handlePhotoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const tooBig = files.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large (max 10MB per photo).`);
      return;
    }
    if (photoFiles.length + files.length > 6) {
      setError("Up to 6 photos.");
      return;
    }

    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // The voice is the story. Everything downstream depends on it.
    // If no audio file was uploaded, pull the track out of the video.
    let voice: Blob | File | null = audioFile;
    let voiceFileName = audioFile ? audioFile.name : "voice.wav";

    if (!voice && videoFile) {
      setIsExtracting(true);
      try {
        voice = await extractAudioFromVideo(videoFile);
        voiceFileName = "extracted.wav";
      } catch (err) {
        console.error("Audio extraction failed:", err);
        setIsExtracting(false);
        setError("Could not read audio from that video. Please upload an audio file as well.");
        return;
      }
      setIsExtracting(false);
    }

    if (!voice) {
      setError("Please upload a voice note, or a video with the founder speaking in it.");
      return;
    }

    if (!videoFile && photoFiles.length === 0) {
      setError("Please add at least one photo or a video of the workshop.");
      return;
    }

    // Time the captions against the real media length
    const duration = videoFile
      ? await getMediaDuration(videoFile, "video")
      : audioFile
      ? await getMediaDuration(audioFile, "audio")
      : 15;

    setIsSubmitting(true);
    setCurrentStep(0);

    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const formData = new FormData();
      formData.append("voice", voice, voiceFileName);
      if (videoFile) formData.append("video", videoFile);
      photoFiles.forEach((p) => formData.append("photos", p));
      formData.append("duration", String(duration));
      formData.append("milestone", milestone);
      formData.append("founderName", founderName);
      if (user?.id) formData.append("founderId", user.id);
      formData.append("language", language);
      formData.append("visibility", visibility);
      formData.append("donorName", donorName);
      formData.append("donorEmail", donorEmail);
      formData.append("consentDawit", String(consentDawit));
      formData.append("consentSelam", String(consentSelam));
      formData.append("consentNarration", String(consentNarration));

      const res = await fetch("/api/generate-story", { method: "POST", body: formData });
      clearInterval(progressInterval);

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate story");
      }

      const data = await res.json();
      setCurrentStep(steps.length);

      if (consentNarration && data.storyId) {
        setNarrationStatus("Preparing translated narration…");

        const jobs = Promise.allSettled(
          (["en", "de"] as const).map((lang) =>
            fetch("/api/narration", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ storyId: data.storyId, lang }),
            })
          )
        ).then((results) => {
          const ok = results.filter(
            (r) => r.status === "fulfilled" && r.value.ok
          ).length;
          setNarrationStatus(
            ok === 2
              ? "English and German ready."
              : ok === 1
              ? "One translated narration ready; the other will finish on the story page."
              : "Translated narration not ready yet — the story still works."
          );
        });

        await Promise.race([jobs, new Promise((r) => setTimeout(r, 5000))]);
      }

      setTimeout(() => router.push(`/founder/review/${data.storyId}`), 1000);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : String(err?.error || err || "");
      const cleanMsg = msg && msg.trim() !== "" && msg !== "<none>" ? msg : "An error occurred while generating the story.";
      setError(cleanMsg);
    }
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="w-full h-full text-indigo-500 animate-spin absolute top-0 left-0" />
            <div className="w-12 h-12 bg-indigo-900/30 rounded-full flex items-center justify-center absolute top-4 left-4">
              <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Processing your story...
          </h2>
          <p className="text-slate-400 text-sm">
            AI is analyzing your off-chain materials to construct the storytelling experience.
          </p>

          <div className="space-y-4 pt-6 text-left">
            {steps.map((step, idx) => {
              const isDone = currentStep > idx;
              const isActive = currentStep === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 transition-opacity duration-300 ${
                    isDone ? "text-indigo-400 font-medium" : isActive ? "text-white" : "text-slate-600"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-indigo-500" />
                  ) : (
                    <div className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-slate-800" />
                  )}
                  <span className="text-sm">{step}</span>
                </div>
              );
            })}
          </div>

          {narrationStatus && (
            <p className="text-[11px] text-slate-500 pt-2 text-left leading-relaxed">
              {narrationStatus}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-indigo-400 font-medium">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading authentication state…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6">
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 shadow-2xl space-y-8 text-center">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Founder Portal Authentication</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Only authenticated founders can upload and manage impact stories. Please sign in with Google to access the management portal.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">

        {/* Authenticated User Header */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.user_metadata.avatar_url}
                alt={user.email || "Founder"}
                className="w-10 h-10 rounded-full border border-slate-700 object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {user.user_metadata?.full_name || "Authenticated Founder"}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            type="button"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-medium">
            <Shield className="w-3.5 h-3.5" /> Off-Chain Storytelling Layer
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
            ታሪክዎን ያጋሩ
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Upload a voice note and a few photos of the workshop. We turn it into a story that
            sits behind the anonymous impact certificate.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Founder name / ስም
              </label>
              <input
                type="text"
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Dawit Alemu"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Spoken language / ቋንቋ
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="am">Amharic (አማርኛ)</option>
                <option value="om">Afaan Oromo</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-indigo-400" /> What changed? (Milestone)
            </label>
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. 9 employees"
              required
            />
          </div>

          {/* Voice note — required */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-4 h-4 text-indigo-400" /> Voice note / የድምፅ መልእክት
              <span className="text-rose-400 normal-case font-normal tracking-normal">required</span>
            </label>

            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="hidden"
              id="audio-upload"
            />
            <label
              htmlFor="audio-upload"
              className="w-full border border-slate-800 border-dashed rounded-2xl px-4 py-5 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer hover:border-slate-700 transition-colors bg-slate-950"
            >
              <Upload className="w-4 h-4" /> {audioFile ? audioFile.name : "Upload an audio file"}
            </label>

            <p className="text-[11px] text-slate-500 leading-relaxed px-1">
              If you upload a video with the founder speaking, we take the audio from it and
              you can leave this empty.
            </p>

            {audioUrl && <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />}
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-400" /> Workshop photos / ፎቶዎች
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoFilesChange}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="w-full border border-slate-800 border-dashed rounded-2xl px-4 py-5 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer hover:border-slate-700 transition-colors bg-slate-950"
            >
              <Upload className="w-4 h-4" />
              {photoFiles.length ? `${photoFiles.length} photo(s) selected` : "Add photos (up to 6)"}
            </label>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Workshop photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 w-6 h-6 bg-slate-950/80 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-500/40 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-slate-500 px-1">
              Photos load far faster than video on a slow connection.
            </p>
          </div>

          {/* Video — optional */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-4 h-4 text-indigo-400" /> Workshop video / ቪዲዮ
              <span className="text-slate-500 normal-case font-normal tracking-normal">optional</span>
            </label>

            <input
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="w-full border border-slate-800 border-dashed rounded-2xl px-4 py-5 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer hover:border-slate-700 transition-colors bg-slate-950"
            >
              <Upload className="w-4 h-4" /> {videoFile ? videoFile.name : "Upload a video (up to 50MB)"}
            </label>

            {videoPreview && (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <video src={videoPreview} controls className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Step 4 — Visibility & Donor */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Who can see this story? (Visibility)
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                  visibility === "private"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="sr-only"
                />
                <span className="text-xs font-bold">Private</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Owner only</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                  visibility === "donor_only"
                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="donor_only"
                  checked={visibility === "donor_only"}
                  onChange={() => setVisibility("donor_only")}
                  className="sr-only"
                />
                <span className="text-xs font-bold">Donor Only</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Assigned donor</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                  visibility === "public"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  className="sr-only"
                />
                <span className="text-xs font-bold">Public</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Open to all</span>
              </label>
            </div>

            {visibility === "donor_only" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">Donor Name</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Anna Beier"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">Donor Email</label>
                  <input
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="e.g. anna@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Consent */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">

            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Revocable off-chain consent
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentDawit}
                  onChange={(e) => setConsentDawit(e.target.checked)}
                  className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  I, <strong>{founderName}</strong>, consent to this story and voice note being reachable
                  through the certificate QR code. I can revoke this at any time.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentSelam}
                  onChange={(e) => setConsentSelam(e.target.checked)}
                  className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Employee <strong>Selam Girma</strong> consents to appearing in the uploaded media.
                  She can revoke this at any time.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consentNarration}
                  onChange={(e) => setConsentNarration(e.target.checked)}
                  className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                  Allow an <strong>English and German narration</strong> of my words, read by a
                  synthetic voice. My own recording always stays the main one, and turning this
                  off later deletes the generated audio.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isExtracting}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Reading audio from video…
              </>
            ) : (
              <>
                Create impact story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
