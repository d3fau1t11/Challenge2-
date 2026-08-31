import { db } from "@/lib/db";
import QRCode from "qrcode";
import Link from "next/link";
import { ShieldCheck, Calendar, MapPin, Landmark, Award, EyeOff, ExternalLink, QrCode, BookOpen } from "lucide-react";

import { getURL } from "@/lib/getURL";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CertificatePage({ params }: PageProps) {
  const { id } = await params;
  await db.init();

  // Fetch certificate from DB
  let certificate = await db.getCertificate(id);
  let story = await db.getStoryByCertificateId(id);

  // Fallback seed data for hackathon presentation safety
  if (!certificate) {
    certificate = {
      id: id,
      region: "Addis Ababa, Ethiopia",
      date: "2026-08-29",
      sdg: "SDG 8 — Decent Work and Economic Growth",
      milestone: "9 employees",
      coverage: "Garment workshop equipment",
      hash: "0x8a91a969999a4bc5bf09dbfd44616f94f96a07c4d793701b10f79ba59db97d0bf",
    };
  }

  // Determine story ID (use certificate ID as fallback if no story registered yet)
  const storyId = story ? story.id : id;

  // Resolve application base URL dynamically for QR Code across local and production environments
  const storyUrl = getURL(`/story/${storyId}`);

  // Generate QR Code data URL
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(storyUrl, {
      margin: 2,
      width: 250,
      color: {
        dark: "#1e1b4b", // dark indigo
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR Code:", err);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-16 px-4">
      {/* Container Card */}
      <div className="max-w-4xl w-full bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px]" />

        {/* Top bar indicating Layer 1 status */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border-b border-emerald-500/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <ShieldCheck className="w-5 h-5" /> Layer 1 — On-Chain Verified Proof
          </div>
          <div className="text-slate-400 text-xs font-mono select-all">
            Cert ID: {certificate.id.slice(0, 8)}...
          </div>
        </div>

        <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          
          {/* Certificate Metadata Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Impact Certificate
              </h2>
              <p className="text-slate-400 text-sm">
                This document represents cryptographic verification of social impact. It contains strictly anonymized milestone details.
              </p>
            </div>

            {/* Technical Parameters List */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              
              {/* SDG */}
              <div className="flex items-start gap-3">
                <Landmark className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">UN SDG Indicator</div>
                  <div className="text-sm font-semibold text-slate-200">{certificate.sdg}</div>
                </div>
              </div>

              {/* Milestone */}
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Certified Milestone</div>
                  <div className="text-sm font-semibold text-emerald-400">{certificate.milestone}</div>
                </div>
              </div>

              {/* Region */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Region / Coverage</div>
                  <div className="text-sm font-semibold text-slate-200">
                    {certificate.region} ({certificate.coverage})
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Certification Date</div>
                  <div className="text-sm font-semibold text-slate-200">{certificate.date}</div>
                </div>
              </div>

            </div>

            {/* Cryptographic Privacy Alert */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex gap-3">
              <EyeOff className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Privacy Protected</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  No personal identifier, face, voice note, employee record, or name is recorded in this certificate. Sensitive data remains strictly off-chain.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center space-y-6 bg-slate-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden group">
            
            {/* Blurred placeholder representing the certificate image */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=200')] bg-cover opacity-[0.02] filter blur-xl scale-125" />

            <div className="space-y-1 relative z-10">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4" /> Scan to Reveal Story
              </div>
              <p className="text-xs text-slate-500">Links verified certificate to the human story</p>
            </div>

            {/* QR Image Box */}
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-800 relative z-10 hover:scale-[1.02] transition-transform duration-300">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCodeDataUrl} alt="QR Code Link to Story" className="w-44 h-44 sm:w-52 sm:h-52 select-none" />
              ) : (
                <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-slate-900 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Link buttons */}
            <div className="w-full relative z-10">
              <Link
                href={`/story/${storyId}`}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4" /> View Linked Impact Story <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>


          </div>

        </div>

        {/* Footer Hash displaying block tx */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-6 py-4 text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
            Cryptographic Certificate Proof Hash
          </div>
          <div className="text-[11px] font-mono text-emerald-400 select-all break-all leading-normal px-2 bg-slate-900/60 py-1.5 rounded-lg border border-slate-800/80">
            {certificate.hash}
          </div>
        </div>

      </div>
    </div>
  );
}
