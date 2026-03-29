"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";

type Step = "status" | "set" | "change" | "remove_confirm" | "done";

export default function SecondaryPasswordPage() {
  const router = useRouter();
  const [hasSecondary, setHasSecondary] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("status");
  const [userId, setUserId] = useState("");
  const [currentMain, setCurrentMain] = useState("");   // main password to confirm identity
  const [secondary, setSecondary] = useState("");
  const [confirmSecondary, setConfirmSecondary] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ main: false, sec: false, confirm: false });

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("secondary_password_hash")
      .eq("id", user.id)
      .maybeSingle();
    setHasSecondary(!!data?.secondary_password_hash);
  }

  async function handleSet(e: React.FormEvent) {
    e.preventDefault();
    if (secondary.length < 6) return toast.error("Secondary password must be at least 6 characters");
    if (secondary !== confirmSecondary) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user?.email) throw new Error("Not authenticated");
      // Verify main password first
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentMain });
      if (authErr) throw new Error("Main password is incorrect");
      // Set secondary password via RPC
      const { error } = await supabase.rpc("set_secondary_password", { user_id: userId, plain_password: secondary });
      if (error) throw new Error(error.message);
      setHasSecondary(true);
      setStep("done");
      toast.success("Secondary password set!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setLoading(false);
  }

  async function handleRemove() {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("remove_secondary_password", { user_id: userId });
      if (error) throw new Error(error.message);
      setHasSecondary(false);
      setStep("status");
      toast.success("Secondary password removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
    setLoading(false);
  }

  function reset() {
    setCurrentMain(""); setSecondary(""); setConfirmSecondary("");
    setStep("status");
  }

  function EyeBtn({ field }: { field: "main" | "sec" | "confirm" }) {
    return (
      <button type="button" onClick={() => setShow((s) => ({ ...s, [field]: !s[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
        {show[field] ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    );
  }

  if (hasSecondary === null) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => step !== "status" ? reset() : router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span className="font-bold text-lg">Secondary Password</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* STATUS */}
        {step === "status" && (
          <div className="flex flex-col gap-4">
            {/* Info card */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${hasSecondary ? "border-green-500/30 bg-green-500/10" : "border-zinc-700 bg-zinc-900"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${hasSecondary ? "bg-green-500/20" : "bg-zinc-800"}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasSecondary ? "text-green-400" : "text-zinc-400"}>
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Secondary Password</p>
                <p className={`text-xs mt-0.5 ${hasSecondary ? "text-green-400" : "text-zinc-500"}`}>
                  {hasSecondary ? "✓ Set — you can use it to reset your main password" : "Not set"}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-4">
              <p className="text-white font-semibold text-sm mb-2">What is a Secondary Password?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                A backup password you set in advance. If you ever forget your main password, you can use this to verify your identity and reset it — without needing access to your email.
              </p>
            </div>

            {hasSecondary ? (
              <div className="flex flex-col gap-2">
                <button onClick={() => setStep("change")} className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition">
                  Change Secondary Password
                </button>
                <button onClick={() => setStep("remove_confirm")} className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-red-500/30 text-red-400 rounded-xl font-semibold text-sm transition">
                  Remove Secondary Password
                </button>
              </div>
            ) : (
              <button onClick={() => setStep("set")} className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition">
                Set Secondary Password
              </button>
            )}
          </div>
        )}

        {/* SET / CHANGE FORM */}
        {(step === "set" || step === "change") && (
          <form onSubmit={handleSet} className="flex flex-col gap-4">
            <p className="text-zinc-400 text-sm">{step === "set" ? "Set a backup password to recover your account." : "Update your secondary password."}</p>

            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Confirm with Main Password</label>
              <div className="relative">
                <input type={show.main ? "text" : "password"} value={currentMain} onChange={(e) => setCurrentMain(e.target.value)}
                  placeholder="Your current main password" required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                <EyeBtn field="main"/>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1.5 block">New Secondary Password</label>
              <div className="relative">
                <input type={show.sec ? "text" : "password"} value={secondary} onChange={(e) => setSecondary(e.target.value)}
                  placeholder="At least 6 characters" required minLength={6}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                <EyeBtn field="sec"/>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Confirm Secondary Password</label>
              <div className="relative">
                <input type={show.confirm ? "text" : "password"} value={confirmSecondary} onChange={(e) => setConfirmSecondary(e.target.value)}
                  placeholder="Repeat secondary password" required
                  className={`w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 placeholder-zinc-500 ${confirmSecondary && confirmSecondary !== secondary ? "ring-1 ring-red-500/50 focus:ring-red-500" : "focus:ring-purple-500"}`}/>
                <EyeBtn field="confirm"/>
              </div>
              {confirmSecondary && confirmSecondary !== secondary && <p className="text-red-400 text-xs mt-1">Passwords don't match</p>}
            </div>

            <button type="submit" disabled={loading || !currentMain || !secondary || secondary !== confirmSecondary}
              className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-white font-semibold text-sm transition mt-2">
              {loading ? "Saving..." : step === "set" ? "Set Secondary Password" : "Update Secondary Password"}
            </button>
          </form>
        )}

        {/* REMOVE CONFIRM */}
        {step === "remove_confirm" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Remove Secondary Password?</h2>
              <p className="text-zinc-400 text-sm px-4">You won't be able to use it to recover your account anymore.</p>
            </div>
            <button onClick={handleRemove} disabled={loading} className="py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">
              {loading ? "Removing..." : "Yes, Remove It"}
            </button>
            <button onClick={() => setStep("status")} className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition">Cancel</button>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl">Secondary Password Set!</h2>
            <p className="text-zinc-400 text-sm px-4">You can now use it to reset your main password if you ever forget it.</p>
            <button onClick={reset} className="mt-4 text-purple-400 text-sm hover:text-purple-300 transition">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
