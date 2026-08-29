"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Play, Pause, Share2, Shield, ArrowLeft, Landmark, Check, AlertTriangle, ExternalLink, Zap } from "lucide-react";
import { Certificate, Story, Consent } from "@/lib/db";

interface StoryClientViewProps {
  story: Story;
  certificate: Certificate;
  consents: Consent[];
}

export default function StoryClientView({ story, certificate, consents }: StoryClientViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Media resolution: fall back to the legacy single video_url field
  const media =
    story.media && story.media.length > 0
      ? story.media
      : story.video_url
      ? [{ url: story.video_url, type: "video" as const }]
      : [];

  const videoItem = media.find((m) => m.type === "video");
  const photos = media.filter((m) => m.type === "image");

  // Consent: per person, per purpose. Anyone who declined the public page is
  // blurred — the story still plays for everyone else.
  const restrictedPeople = consents
    .filter((c) => c.revoked || c.permissions?.public_page === false)
    .map((c) => c.person_name);

  const founderRestricted = restrictedPeople.includes(story.founder_name);
  const anyoneRestricted = restrictedPeople.length > 0;

  // If the founder himself revoked, there is no story to show at all
  if (founderRestricted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-950/30 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-rose-300">Story withdrawn</h2>

          <div className="text-sm text-slate-400 leading-relaxed text-left space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <p>
              The founder has withdrawn consent for this story. The off-chain voice, media, and
              narrative are no longer shown.
            </p>
            <p className="text-emerald-400/90 text-xs font-semibold">
              The impact certificate is unaffected. Nothing on the chain has changed.
            </p>
          </div>

          <Link
            href={`/certificate/${certificate.id}`}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          >
            View verified certificate <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const activeCaption = story.captions?.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  // Which photo shows right now: divide the clip evenly across them
  const photoIndex =
    photos.length > 0 && duration > 0
      ? Math.min(photos.length - 1, Math.floor((currentTime / duration) * photos.length))
      : 0;

  const togglePlay = () => {
    const el = videoItem ? videoRef.current : audioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-10 px-4">
      <audio
        ref={audioRef}
        src={story.voice_url}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl space-y-6 flex flex-col relative pb-8">

        <div className="px-6 pt-6 flex justify-between items-center">
          <Link
            href={`/certificate/${certificate.id}`}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to certificate
          </Link>

          {/* Honesty badge: says plainly whether the AI ran live */}
          {story.ai_source === "live" ? (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              <Zap className="w-3 h-3" /> Transcribed live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              Demo fallback
            </span>
          )}
        </div>

        {/* Visual: video if there is one, otherwise photos cross-fading with the audio */}
        <div className="px-6">
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group">
            {videoItem ? (
              <video
                ref={videoRef}
                src={videoItem.url}
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration || 0)}
                onEnded={() => setIsPlaying(false)}
                playsInline
                onClick={togglePlay}
                className={`w-full h-full object-cover cursor-pointer ${
                  anyoneRestricted ? "blur-md" : ""
                }`}
              />
            ) : photos.length > 0 ? (
              photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.url}
                  src={p.url}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    i === photoIndex ? "opacity-100" : "opacity-0"
                  } ${anyoneRestricted ? "blur-md" : ""}`}
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                No media
              </div>
            )}

            <div
              className={`absolute inset-0 bg-slate-950/40 flex items-center justify-center transition-opacity duration-300 ${
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              }`}
            >
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>

            {isPlaying && activeCaption && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-white text-xs px-3 py-2 rounded-xl text-center font-medium shadow-md">
                {activeCaption.text}
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex gap-1 justify-center pt-3">
              {photos.map((p, i) => (
                <div
                  key={p.url}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === photoIndex ? "w-6 bg-indigo-400" : "w-2 bg-slate-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {anyoneRestricted && (
          <div className="mx-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
            <Shield className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              {restrictedPeople.join(", ")} limited visibility to the funder&apos;s page only, so the
              media is blurred here. The story still plays.
            </p>
          </div>
        )}

        <div className="px-6 space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            {story.founder_name}&apos;s story
          </div>
          <div className="bg-slate-950/30 border-l-2 border-indigo-500/40 pl-4 py-1 italic text-slate-300 text-sm leading-relaxed">
            &ldquo;{story.generated_story}&rdquo;
          </div>
        </div>

        {story.amharic_transcript && (
          <div className="px-6 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              In his own words / በራሱ አንደበት
            </div>
            <p className="text-slate-400 text-sm leading-loose">{story.amharic_transcript}</p>
          </div>
        )}

        <div className="px-6 space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Verified impact
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-indigo-400 text-sm font-black">{certificate.milestone}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Milestone</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-indigo-400 text-sm font-black">{certificate.region}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Location</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-emerald-400 text-sm font-black">SDG 8</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Decent work</div>
            </div>
          </div>
        </div>

        {/* Layer 1 panel — deliberately visually distinct from the story above */}
        <div className="mx-6 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> On chain — anonymous
            </span>
            <Link href={`/certificate/${certificate.id}`} className="text-emerald-400 hover:underline">
              View certificate
            </Link>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-slate-500 leading-normal">
            <div>Region: <span className="text-slate-400">{certificate.region}</span></div>
            <div>Date: <span className="text-slate-400">{certificate.date}</span></div>
            <div>SDG: <span className="text-slate-400">{certificate.sdg}</span></div>
            <div className="break-all">
              Hash: <span className="text-slate-400 select-all">{certificate.hash.slice(0, 34)}…</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-400/60 leading-relaxed">
            No name, face, or voice is recorded on the chain. Those live only in the story above,
            and can be deleted without touching this.
          </p>
        </div>

        <div className="px-6 pt-2 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Link copied
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" /> Share story
              </>
            )}
          </button>

          <Link
            href={`/consent/${story.id}`}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Shield className="w-4 h-4 text-indigo-400" /> Manage privacy
          </Link>
        </div>
      </div>
    </div>
  );
}
