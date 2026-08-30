import Link from "next/link";
import { ArrowRight, ShieldCheck, HeartHandshake, QrCode, Play } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center py-20 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

      {/* Main Content Wrapper */}
      <main className="max-w-4xl w-full text-center space-y-10 relative z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" /> TrueImpact Platform
        </div>


        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-400">
            The Certificate Proves.<br />The Story Moves.
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
            Our platform provides a private, consent-driven storytelling layer for blockchain-certified impact. Let donors experience the real workshop behind the anonymized transaction metrics.
          </p>
        </div>

        {/* Double Layer Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-6">
          
          {/* Layer 1 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-emerald-500/10 p-6 rounded-3xl space-y-3 relative group hover:border-emerald-500/20 transition-all">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-emerald-400">Layer 1 — On-Chain Certificate</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Provides immutable, anonymized proof of milestones (SDG criteria, region, timestamp, amount). Never contains private records, voices, or faces.
            </p>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-2">
              Immutable & Public
            </div>
          </div>

          {/* Layer 2 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-indigo-500/10 p-6 rounded-3xl space-y-3 relative group hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-indigo-400">Layer 2 — Off-Chain Story</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Rich, human-interest narratives, original founder voice notes, and videos. Owned off-chain with granular, revocable consent controls.
            </p>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-2">
              Revocable & Private
            </div>
          </div>

        </div>

        {/* Action Portals */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          
          {/* Founder portal button */}
          <Link
            href="/founder"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold py-4 px-8 rounded-2xl text-sm flex items-center justify-center gap-2 group shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all"
          >
            Create Impact Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Founder Dashboard Link */}
          <Link
            href="/founder/dashboard"
            className="w-full sm:w-auto bg-slate-900 border border-indigo-500/20 text-indigo-300 hover:bg-slate-850 font-bold py-4 px-8 rounded-2xl text-sm flex items-center justify-center gap-2 hover:border-indigo-500/40 active:scale-[0.98] transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Founder Dashboard
          </Link>

          {/* Browse All Stories & QR Certs Link */}
          <Link
            href="/stories"
            className="w-full sm:w-auto bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold py-4 px-8 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <QrCode className="w-4 h-4 text-indigo-400" /> Browse All Stories & QR Certs
          </Link>

          {/* Scan QR Code button */}
          <Link
            href="/scan"
            className="w-full sm:w-auto bg-slate-900 border border-emerald-500/30 text-emerald-300 hover:bg-slate-850 font-bold py-4 px-8 rounded-2xl text-sm flex items-center justify-center gap-2 hover:border-emerald-500/50 active:scale-[0.98] transition-all shadow-lg"
          >
            <QrCode className="w-4 h-4 text-emerald-400" /> Scan QR Code
          </Link>


          {/* Certificate Demo Link */}
          <Link
            href="/certificate/demo-cert"
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 font-bold py-4 px-8 rounded-2xl text-sm flex items-center justify-center gap-2 hover:border-slate-700 active:scale-[0.98] transition-all"
          >
            View Certificate
          </Link>


        </div>
      </main>
    </div>
  );
}

