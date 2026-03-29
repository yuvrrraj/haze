"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Step = "status" | "generate" | "codes" | "regenerate_confirm";

function generateCode(): string {
  // 8-character alphanumeric code like Instagram: xxxxx-xxxxx
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const half = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${half()}-${half()}`;
}

function generateCodes(count = 8): string[] {
  return Array.from({ length: count }, generateCode);
}

export default function BackupCodesPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("status");
  const [codesCount, setCodesCount] = useState<number | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.rpc("get_backup_codes_count", { user_id: user.id });
    setCodesCount(data ?? 0);
    setChecking(false);
  }

  async function handleGenerate() {
    setLoading(true);
    const newCodes = generateCodes(8);
    setCodes(newCodes);
    // Save hashed codes to DB
    const { error } = await supabase.rpc("save_backup_codes", {
      user_id: userId,
      plain_codes: newCodes,
    });
    if (error) {
      toast.error("Failed to save backup codes");
      setLoading(false);
      return;
    }
    setCodesCount(8);
    setStep("codes");
    setLoading(false);
  }

  function copyAll() {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    toast.success("All codes copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCodes() {
    const text = `SocialSite Backup Codes\nGenerated: ${new Date().toLocaleDateString()}\n\nKeep these codes safe. Each can only be used once.\n\n${codes.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "socialsite-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Codes downloaded!");
  }

  async function handleClearCodes() {
    setLoading(true);
    await supabase.rpc("clear_backup_codes", { user_id: userId });
    setCodesCount(0);
    setCodes([]);
    setStep("status");
    toast.success("Backup codes removed");
    setLoading(false);
  }

  if (checking) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button
          onClick={() => step === "codes" || step === "regenerate_confirm" ? setStep("status") : router.back()}
          className="p-2 rounded-full hover:bg-zinc-800 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Backup Codes</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">

        {/* ── STATUS ── */}
        {step === "status" && (
          <>
            {/* Status card */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${(codesCount ?? 0) > 0 ? "border-green-500/30 bg-green-500/10" : "border-zinc-700 bg-zinc-900"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${(codesCount ?? 0) > 0 ? "bg-green-500/20" : "bg-zinc-800"}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={(codesCount ?? 0) > 0 ? "text-green-400" : "text-zinc-400"}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Backup Codes</p>
                <p className={`text-xs mt-0.5 ${(codesCount ?? 0) > 0 ? "text-green-400" : "text-zinc-500"}`}>
                  {(codesCount ?? 0) > 0
                    ? `${codesCount} code${codesCount === 1 ? "" : "s"} remaining`
                    : "No backup codes generated"}
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-zinc-900 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-white font-semibold text-sm">What are backup codes?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Backup codes let you sign in if you lose access to your authenticator app. Each code can only be used once.
              </p>
              <div className="flex flex-col gap-1.5 mt-1">
                {[
                  "8 one-time use codes",
                  "Each code works even without your phone",
                  "Generate new codes anytime (old ones expire)",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-zinc-400 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {(codesCount ?? 0) > 0 ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setStep("regenerate_confirm")}
                  className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition"
                >
                  Generate New Codes
                </button>
                <button
                  onClick={handleClearCodes}
                  disabled={loading}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-red-500/30 text-red-400 rounded-xl font-semibold text-sm transition disabled:opacity-40"
                >
                  Remove Backup Codes
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep("generate")}
                className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Generate Backup Codes
              </button>
            )}
          </>
        )}

        {/* ── GENERATE CONFIRM ── */}
        {step === "generate" && (
          <>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Generate Backup Codes</h2>
              <p className="text-zinc-400 text-sm leading-relaxed px-4">
                We'll generate 8 one-time backup codes. Save them somewhere safe — you won't be able to see them again.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
            >
              {loading ? "Generating..." : "Generate 8 Codes"}
            </button>
            <button onClick={() => setStep("status")} className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition">
              Cancel
            </button>
          </>
        )}

        {/* ── REGENERATE CONFIRM ── */}
        {step === "regenerate_confirm" && (
          <>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Generate New Codes?</h2>
              <p className="text-zinc-400 text-sm leading-relaxed px-4">
                Your existing {codesCount} backup code{codesCount === 1 ? "" : "s"} will be permanently deleted and replaced with 8 new ones.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
            >
              {loading ? "Generating..." : "Yes, Generate New Codes"}
            </button>
            <button onClick={() => setStep("status")} className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition">
              Cancel
            </button>
          </>
        )}

        {/* ── SHOW CODES ── */}
        {step === "codes" && (
          <>
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-yellow-300 text-sm leading-relaxed">
                Save these codes now. You won't be able to see them again after leaving this page.
              </p>
            </div>

            {/* Codes grid */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-2">
                {codes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
                    <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{i + 1}.</span>
                    <code className="text-white font-mono text-sm tracking-wider flex-1">{code}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${copied ? "bg-green-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                {copied ? "Copied!" : "Copy All"}
              </button>
              <button
                onClick={downloadCodes}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            </div>

            <button
              onClick={() => setStep("status")}
              className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition"
            >
              I've saved my codes — Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
