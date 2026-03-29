"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const TRUST_DAYS = 30;

function MFAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factorId = searchParams.get("factorId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (useBackup) {
      if (!backupCode.trim()) return;
      setLoading(true);

      // Get userId from current session (not URL params - more reliable)
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        toast.error("Session expired. Please sign in again.");
        setLoading(false);
        router.replace("/");
        return;
      }

      // Step 1: verify without consuming
      const { data: isValid, error: verifyErr } = await supabase.rpc("verify_backup_code_only", {
        user_id: uid,
        plain_code: backupCode.trim().toLowerCase(),
      });

      if (verifyErr || !isValid) {
        toast.error("Invalid backup code. Try again.");
        setBackupCode("");
        setLoading(false);
        return;
      }

      // Step 2: consume only after confirmed valid
      const { data: consumed } = await supabase.rpc("consume_backup_code", {
        user_id: uid,
        plain_code: backupCode.trim().toLowerCase(),
      });

      if (!consumed) {
        toast.error("Backup code already used. Try another.");
        setBackupCode("");
        setLoading(false);
        return;
      }

      toast.success("Backup code accepted!");
      router.replace("/feed");
      setLoading(false);
      return;
    }
    // Normal TOTP flow
    if (otp.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: otp });
    if (error) {
      toast.error("Invalid code. Try again.");
      setOtp("");
    } else {
      if (remember && userId) {
        localStorage.setItem(`mfa_trusted_${userId}`, JSON.stringify({
          expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }));
      }
      toast.success("Verified!");
      router.replace("/feed");
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Social<span className="text-purple-500">Site</span></h1>
          <p className="text-zinc-400 text-sm mt-1">Two-Factor Authentication</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-white font-bold text-lg">
              {useBackup ? "Enter Backup Code" : "Enter Authentication Code"}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {useBackup
                ? "Enter one of your saved backup codes"
                : "Open your authenticator app and enter the 6-digit code"}
            </p>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            {/* Toggle between TOTP and backup code */}
            {!useBackup ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full text-center text-3xl font-mono tracking-[0.5em] px-4 py-4 rounded-xl bg-zinc-800 text-white outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-600"
              />
            ) : (
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="xxxxx-xxxxx"
                autoFocus
                className="w-full text-center text-xl font-mono tracking-wider px-4 py-4 rounded-xl bg-zinc-800 text-white outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-600"
              />
            )}

            {/* Remember this device (only for TOTP) */}
            {!useBackup && (
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                className="flex items-center gap-3 px-1 py-1 group"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition shrink-0 ${
                  remember ? "bg-purple-600 border-purple-600" : "border-zinc-600 group-hover:border-zinc-400"
                }`}>
                  {remember && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Remember this device</p>
                  <p className="text-zinc-500 text-xs">Skip 2FA for {TRUST_DAYS} days on this device</p>
                </div>
              </button>
            )}

            <button
              type="submit"
              disabled={loading || (!useBackup && otp.length !== 6) || (useBackup && !backupCode.trim())}
              className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            {/* Toggle backup code */}
            <button
              type="button"
              onClick={() => { setUseBackup((v) => !v); setOtp(""); setBackupCode(""); }}
              className="text-purple-400 hover:text-purple-300 text-sm transition text-center"
            >
              {useBackup ? "Use authenticator app instead" : "Use a backup code"}
            </button>
          </form>

          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-white text-sm transition text-center"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MFAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MFAContent />
    </Suspense>
  );
}
