"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Share2, Shield, ArrowLeft, Volume2, Landmark, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { Certificate, Story, Consent } from "@/lib/db";

interface StoryClientViewProps {
  story: Story;
  certificate: Certificate;
  consents: Consent[];
}

export default function StoryClientView({ story, certificate, consents }: StoryClientViewProps) {
  // Check if consent has been revoked for public sharing
  const publicConsentDawit = consents.find(c => c.person_name === story.founder_name);
  const publicConsentSelam = consents.find(c => c.person_name === "Selam Girma");

  const isAccessRestricted = 
    (publicConsentDawit?.revoked || publicConsentDawit?.permissions.public_page === false) ||
    (publicConsentSelam?.revoked || publicConsentSelam?.permissions.public_page === false);

  // Audio/Video player sync states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeMedia, setActiveMedia] = useState<"audio" | "video" | null>(null);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync subtitle tracking
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // Find the subtitle that fits the current time
  const activeCaption = story.captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  // Copy link utility
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Audio trigger
  const toggleAudio = () => {
    if (isPlayingVideo) {
      videoRef.current?.pause();
      setIsPlayingVideo(false);
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
        setActiveMedia(null);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlayingAudio(true);
        setActiveMedia("audio");
      }
    }
  };

  // Video trigger
  const toggleVideo = () => {
    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    }

    if (videoRef.current) {
      if (isPlayingVideo) {
        videoRef.current.pause();
        setIsPlayingVideo(false);
        setActiveMedia(null);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlayingVideo(true);
        setActiveMedia("video");
      }
    }
  };

  // Render Access Restricted Screen if consent is revoked
  if (isAccessRestricted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-rose-500/20 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-rose-950/30 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-rose-300">
            Access Restricted
          </h2>
          
          <div className="text-sm text-slate-400 leading-relaxed text-left space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <p>
              In compliance with privacy standards, off-chain content (voice notes, videos, and narrative story) is immediately removed if consent is revoked.
            </p>
            <p className="font-semibold text-rose-400/90 text-xs">
              Status: One or more participants in this story have revoked their consent for public sharing.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <Link
              href={`/certificate/${certificate.id}`}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
            >
              View Verified Certificate <ExternalLink className="w-4 h-4" />
            </Link>

            <Link
              href={`/consent/${story.id}`}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
            >
              Configure Consent Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-10 px-4">
      {/* Fallback Audio element */}
      <audio
        ref={audioRef}
        src={story.voice_url || "/sounds/mock_audio.mp3"}
        onTimeUpdate={() => audioRef.current && activeMedia === "audio" && handleTimeUpdate(audioRef.current.currentTime)}
        onEnded={() => {
          setIsPlayingAudio(false);
          setActiveMedia(null);
        }}
        className="hidden"
      />

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl space-y-6 flex flex-col relative pb-8">
        
        {/* Header Back button */}
        <div className="px-6 pt-6 flex justify-between items-center">
          <Link
            href={`/certificate/${certificate.id}`}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Certificate
          </Link>
          
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
            Active Story
          </span>
        </div>

        {/* Video Player Section */}
        <div className="px-6">
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group">
            <video
              ref={videoRef}
              src={story.video_url}
              onTimeUpdate={() => videoRef.current && activeMedia === "video" && handleTimeUpdate(videoRef.current.currentTime)}
              onEnded={() => {
                setIsPlayingVideo(false);
                setActiveMedia(null);
              }}
              playsInline
              onClick={toggleVideo}
              className="w-full h-full object-cover cursor-pointer"
            />

            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-slate-950/40 flex items-center justify-center transition-opacity duration-300 ${
              isPlayingVideo ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}>
              <button
                onClick={toggleVideo}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlayingVideo ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
            </div>

            {/* Timed Captions Overlay (Active during video playing) */}
            {isPlayingVideo && activeCaption && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-800 text-white text-xs px-3 py-2 rounded-xl text-center font-medium shadow-md">
                {activeCaption.text}
              </div>
            )}
          </div>
        </div>

        {/* Dawit's Amharic Voice Playback Trigger */}
        <div className="px-6">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-indigo-400" /> Dawit's Voice Note
              </div>
              <p className="text-[11px] text-slate-500">Play original voice recording in Amharic</p>
            </div>
            
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-md transition-all ${
                isPlayingAudio
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
              }`}
            >
              {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Subtitles Overlay during Voice Note playback */}
          {isPlayingAudio && activeCaption && (
            <div className="mt-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-4 py-3 rounded-xl text-center font-semibold italic animate-fade-in">
              "{activeCaption.text}"
            </div>
          )}
        </div>

        {/* Narrative Narrative Block */}
        <div className="px-6 space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Dawit's Story</div>
          <div className="bg-slate-950/30 border-l-2 border-indigo-500/40 pl-4 py-1 italic text-slate-300 text-sm leading-relaxed">
            "{story.generated_story}"
          </div>
        </div>

        {/* Impact Badges Layer */}
        <div className="px-6 space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified Impact</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-indigo-400 text-sm font-black">{certificate.milestone}</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Milestone</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-indigo-400 text-sm font-black">Addis Ababa</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Location</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-center">
              <div className="text-emerald-400 text-sm font-black flex items-center justify-center gap-0.5">
                SDG 8
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Decent Work</div>
            </div>
          </div>
        </div>

        {/* Certificate details block */}
        <div className="mx-6 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-emerald-400" /> Certificate Reference</span>
            <Link
              href={`/certificate/${certificate.id}`}
              className="text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              View Certificate
            </Link>
          </div>
          <div className="space-y-1 font-mono text-[10px] text-slate-500 leading-normal">
            <div>Hash: <span className="text-slate-400 break-all select-all">{certificate.hash.slice(0, 32)}...</span></div>
            <div>Date: <span className="text-slate-400">{certificate.date}</span></div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pt-2 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Link Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" /> Share Story
              </>
            )}
          </button>
          
          <Link
            href={`/consent/${story.id}`}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Shield className="w-4 h-4 text-indigo-400" /> Manage Privacy
          </Link>
        </div>

      </div>
    </div>
  );
}
