"use client";

/**
 * Extracts the audio track from a video file entirely in the browser
 * and returns it as a 16 kHz mono WAV Blob.
 *
 * Why in the browser: Vercel's serverless runtime has no ffmpeg and a
 * read-only filesystem, so server-side extraction is not an option.
 *
 * 16 kHz mono is what speech-to-text models expect, and it keeps the
 * upload small on a slow connection.
 */
export async function extractAudioFromVideo(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) {
    throw new Error("This browser cannot decode audio.");
  }

  const ctx = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("No audio track found in this video.");
  }

  return encodeWav(audioBuffer);
}

function encodeWav(buffer: AudioBuffer): Blob {
  const targetRate = 16000;
  const source = buffer.getChannelData(0);
  const ratio = buffer.sampleRate / targetRate;
  const length = Math.floor(source.length / ratio);

  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, source[Math.floor(i * ratio)]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);

  new Int16Array(bytes, 44).set(samples);

  return new Blob([bytes], { type: "audio/wav" });
}

/**
 * Returns the duration of a media file in seconds.
 * Use this to time captions against the real clip instead of
 * assuming a fixed 15 seconds.
 */
export function getMediaDuration(
  file: File,
  kind: "video" | "audio" = "video"
): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      URL.revokeObjectURL(el.src);
      resolve(Number.isFinite(d) && d > 0 ? d : 15);
    };
    el.onerror = () => resolve(15);
    el.src = URL.createObjectURL(file);
  });
}
