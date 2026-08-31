import Link from "next/link";
import { ShieldCheck, HeartHandshake, QrCode, Grid, Plus } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 text-xs mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                True<span className="text-indigo-400">Impact</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The certificate proves the impact. The story makes people see it. Connecting verified blockchain impact certificates to authentic, consent-driven founder stories.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Aligned with SDG 8 — Decent Work & Economic Growth
            </div>
          </div>

          {/* Platform Nav */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/stories" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-indigo-400" /> Browse Stories
                </Link>
              </li>
              <li>
                <Link href="/scan" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Scan QR Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Founder Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Publisher Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/founder" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" /> Create Story
                </Link>
              </li>
              <li>
                <Link href="/founder/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Founder Dashboard
                </Link>
              </li>
              <li>
                <Link href="/certificate/demo-cert" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-violet-400" /> Sample Certificate
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>&copy; {new Date().getFullYear()} TrueImpact Platform. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 transition-colors">On-Chain Proof</span>
            &bull;
            <span className="hover:text-slate-400 transition-colors">Off-Chain Consent</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
