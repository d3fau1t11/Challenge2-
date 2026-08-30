"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Check, RefreshCw, User, Lock, Unlock, Languages, Trash2 } from "lucide-react";
import { Consent } from "@/lib/db";

interface ConsentClientViewProps {
  storyId: string;
  initialConsents: Consent[];
}

export default function ConsentClientView({ storyId, initialConsents }: ConsentClientViewProps) {
  const [consents, setConsents] = useState<Consent[]>(initialConsents);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Send update to API
  const updateConsentState = async (updatedConsent: Consent) => {
    setSavingId(updatedConsent.id);
    setSaveStatus("Saving changes...");

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: updatedConsent.id,
          revoked: updatedConsent.revoked,
          permissions: updatedConsent.permissions,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save consent changes");
      }

      const json = await res.json();

      // Deletion is the point, so say it happened rather than just "saved".
      if (json.narrationsDeleted > 0) {
        setSaveStatus(
          `Updated — ${json.narrationsDeleted} generated narration file(s) deleted from storage.`
        );
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setSaveStatus("Privacy settings updated!");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error("Error saving consent:", err);
      setSaveStatus("Error saving changes");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  // Toggle master revoke switch
  const handleToggleRevoke = (consentId: string, isRevoked: boolean) => {
    const updated = consents.map((c) => {
      if (c.id === consentId) {
        const item = { ...c, revoked: isRevoked };
        updateConsentState(item);
        return item;
      }
      return c;
    });
    setConsents(updated);
  };

  // Toggle granular permissions
  const handleTogglePermission = (consentId: string, key: keyof Consent["permissions"], val: boolean) => {
    const updated = consents.map((c) => {
      if (c.id === consentId) {
        const item = {
          ...c,
          permissions: {
            ...c.permissions,
            [key]: val,
          },
        };
        updateConsentState(item);
        return item;
      }
      return c;
    });
    setConsents(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center py-12 px-4">
      <div className="max-w-xl w-full bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <Link
              href={`/story/${storyId}`}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Story
            </Link>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Privacy & Consent Dashboard
            </h1>
            <p className="text-xs text-slate-400 leading-normal">
              Manage revocable off-chain permissions for each participant. Changes affect public page display immediately.
            </p>
          </div>
        </div>

        {/* Global Save Indicator */}
        {saveStatus && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {saveStatus}
            </span>
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          </div>
        )}

        <div className="space-y-6">
          {consents.map((consent) => {
            const isSaving = savingId === consent.id;

            // Translated narration is about re-voicing the founder's WORDS.
            // Selam's consent governs her appearance in the media — a different
            // purpose on a different person — so her row does not get this.
            const isFounder = consent.person_name !== "Selam Girma";

            return (
              <div
                key={consent.id}
                className={`border rounded-2xl p-5 transition-all duration-300 ${
                  consent.revoked
                    ? "bg-rose-950/10 border-rose-500/20 shadow-rose-950/5"
                    : "bg-slate-950/40 border-slate-800 shadow-slate-950/5"
                }`}
              >
                {/* Participant Identity */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">{consent.person_name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {consent.person_name === "Selam Girma" ? "Machine Operator" : "Workshop Founder"}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                      consent.revoked
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {consent.revoked ? (
                      <>
                        <Lock className="w-3 h-3" /> Revoked
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" /> Consented
                      </>
                    )}
                  </span>
                </div>

                {/* Master Switch */}
                <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 mb-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-300">Grant Sharing Consent</div>
                    <p className="text-[10px] text-slate-500">Enable/disable all public usage parameters</p>
                  </div>
                  <button
                    onClick={() => handleToggleRevoke(consent.id, !consent.revoked)}
                    disabled={isSaving}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center ${
                      !consent.revoked ? "bg-emerald-500" : "bg-slate-800"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        !consent.revoked ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Granular Checkboxes (Only active when NOT revoked) */}
                <div
                  className={`space-y-3 transition-opacity duration-300 ${
                    consent.revoked ? "opacity-30 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Authorized Purposes
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Funder Page */}
                    <label className="flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/60 p-3 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={consent.permissions.funder_page}
                        onChange={(e) =>
                          handleTogglePermission(consent.id, "funder_page", e.target.checked)
                        }
                        className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-300">Private Funder Page</div>
                        <div className="text-[9px] text-slate-500">Visible to donors like Anna</div>
                      </div>
                    </label>

                    {/* Public Page */}
                    <label className="flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/60 p-3 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={consent.permissions.public_page}
                        onChange={(e) =>
                          handleTogglePermission(consent.id, "public_page", e.target.checked)
                        }
                        className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-300">Public Story Link</div>
                        <div className="text-[9px] text-slate-500">Accessible by QR scan</div>
                      </div>
                    </label>

                    {/* Social Media */}
                    <label className="flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/60 p-3 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={consent.permissions.social_media}
                        onChange={(e) =>
                          handleTogglePermission(consent.id, "social_media", e.target.checked)
                        }
                        className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-300">Social Media</div>
                        <div className="text-[9px] text-slate-500">For public platform shares</div>
                      </div>
                    </label>

                    {/* Sharing */}
                    <label className="flex items-center gap-3 bg-slate-950/40 hover:bg-slate-950 border border-slate-800/60 p-3 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={consent.permissions.sharing}
                        onChange={(e) =>
                          handleTogglePermission(consent.id, "sharing", e.target.checked)
                        }
                        className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-300">Direct Sharing</div>
                        <div className="text-[9px] text-slate-500">WhatsApp and messaging links</div>
                      </div>
                    </label>
                  </div>

                  {/* Translated narration — founder only. This is his words being
                      re-voiced, which is a different question from appearing in
                      the media, so it gets its own control and its own row. */}
                  {isFounder && (
                    <label className="flex items-start gap-3 bg-indigo-950/20 hover:bg-indigo-950/30 border border-indigo-500/20 p-3.5 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={consent.permissions.translated_narration !== false}
                        onChange={(e) =>
                          handleTogglePermission(consent.id, "translated_narration", e.target.checked)
                        }
                        className="mt-0.5 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5 text-indigo-400" /> Translated narration
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Allow an English and German narration of my words, read by a synthetic
                          voice. My own Amharic recording always stays the main one.
                        </div>
                        <div className="text-[10px] text-emerald-400/80 leading-relaxed flex items-start gap-1.5 pt-0.5">
                          <Trash2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          Turning this off deletes the generated audio files from storage — not
                          just hides them.
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative Footer */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex gap-3 text-slate-400">
          <ShieldAlert className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">Revocation Protocol</div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Revocation is immediate and takes place off-chain. It blocks all web and API routes delivering audio or video files. Machine-generated narration is derived data, so withdrawing it deletes the files outright. The on-chain impact certificate is unmodified.
            </p>
          </div>
        </div>

        {/* Back navigation */}
        <Link
          href={`/story/${storyId}`}
          className="w-full bg-slate-800 hover:bg-slate-750 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          Return to Story Page <ArrowLeft className="w-3.5 h-3.5" />
        </Link>

      </div>
    </div>
  );
}
