"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Video, Plus, BarChart2, Shield, ArrowRight, CheckCircle2, Loader2, Upload } from "lucide-react";

export default function FounderPage() {
  const router = useRouter();
  const [founderName, setFounderName] = useState("Dawit Alemu");
  const [milestone, setMilestone] = useState("9 employees");
  const [language, setLanguage] = useState("am");

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Consent state
  const [consentDawit, setConsentDawit] = useState(true);
  const [consentSelam, setConsentSelam] = useState(true);

  // Submission/Progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    "Uploading media to secure off-chain storage...",
    "Transcribing Dawit's Amharic voice note...",
    "Translating transcription to English...",
    "NVIDIA Nemotron analyzing workshop video...",
    "Structuring respectful human story...",
    "Generating English captions and finalized link..."
  ];

  // Start recording audio
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setAudioFile(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        // Stop all tracks in stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access denied. Please upload a voice note file instead.");
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Audio file selection
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Audio file is too large (max 10MB).");
        return;
      }
      setAudioFile(file);
      setAudioBlob(null);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  // Video file selection
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError("Video file is too large (max 50MB).");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const voice = audioBlob || audioFile;
    if (!voice) {
      setError("Please record a voice note or upload an audio file.");
      return;
    }
    if (!videoFile) {
      setError("Please upload a workshop video file.");
      return;
    }

    setIsSubmitting(true);
    setCurrentStep(0);

    // Simulate progress milestones alongside the API call
    const progressInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("voice", audioBlob, "voice.wav");
      } else if (audioFile) {
        formData.append("voice", audioFile);
      }
      formData.append("video", videoFile);
      formData.append("milestone", milestone);
      formData.append("founderName", founderName);
      formData.append("consentDawit", String(consentDawit));
      formData.append("consentSelam", String(consentSelam));

      const res = await fetch("/api/generate-story", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to generate story");
      }

      const data = await res.json();
      setCurrentStep(steps.length); // complete all steps
      
      // Redirect to the newly generated story page
      setTimeout(() => {
        router.push(`/story/${data.storyId}`);
      }, 1000);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      setError(err.message || "An error occurred while generating the story.");
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
            AI is analyzing your off-chain materials to construct a premium storytelling experience.
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-xl w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-3 py-1 rounded-full font-medium">
            <Shield className="w-3.5 h-3.5" /> Off-Chain Storytelling Layer
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
            Tell Your Story
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Dawit, let's create a beautiful storytelling link that connects directly to the anonymous impact certificate. Let donors see the human side of your workshop.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Founder Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Founder Name</label>
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
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="am">Amharic (አማርኛ)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Milestone Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 block">
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

          {/* Voice Note Input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              🎙 Dawit's Voice Note (Amharic)
            </label>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isRecording 
                    ? "bg-rose-500 text-white animate-pulse" 
                    : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4" /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" /> Record Live Note
                  </>
                )}
              </button>

              <div className="text-slate-500 text-sm font-medium">OR</div>

              <div className="w-full relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                  id="audio-upload"
                />
                <label
                  htmlFor="audio-upload"
                  className="w-full border border-slate-800 border-dashed rounded-xl px-4 py-2.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <Upload className="w-4 h-4" /> {audioFile ? audioFile.name : "Upload audio file"}
                </label>
              </div>
            </div>

            {audioUrl && (
              <div className="px-1">
                <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
              </div>
            )}
          </div>

          {/* Video Input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              🎥 Add Workshop Video / Burst
            </label>
            <div className="border border-slate-800 border-dashed rounded-2xl bg-slate-950 p-6 text-center hover:border-slate-700 transition-colors relative">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
                id="video-upload"
                required={!videoPreview}
              />
              <label htmlFor="video-upload" className="cursor-pointer space-y-3 block">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20">
                  <Video className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    {videoFile ? videoFile.name : "Select workshop footage"}
                  </p>
                  <p className="text-xs text-slate-500">MP4 format recommended, up to 50MB</p>
                </div>
              </label>
            </div>
            {videoPreview && (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <video src={videoPreview} controls className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Consent Section */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" /> Revocable Off-chain Consent
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
                  I, <strong>{founderName}</strong>, consent to make this story and voice note publicly accessible via the QR code links. I understand I can revoke this consent at any time.
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
                  Employee <strong>Selam Girma</strong> consents to appear in the uploaded video for public sharing purposes. She understands she can revoke this consent at any time.
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 group shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            Create Impact Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

      </div>
    </div>
  );
}
