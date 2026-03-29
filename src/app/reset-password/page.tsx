"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Method = "choose" | "email" | "email_sent" | "secondary" | "backup" | "new_password" | "done";

function ForgotContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailReset = searchParams.get("type") === "recovery";

  const [method, setMethod] = useState<Method>(isEmailReset ? "new_password" : "choose");
  const [sessionReady, setSessionReady] = useState(!isEmailReset);
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [secondaryPass, setSecondaryPass] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"secondary" | "backup">("secondary");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSec, setShowSec] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Exchange the recovery token from URL for a real session
  useEffect(() => {
    if (!isEmailReset) return;

    // Check if session already exists (token already exchanged)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setSessionReady(true); return; }
    });

    // Also listen for the PASSWORD_RECOVERY event in case it fires after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [isEmailReset]);

  // ── Resolve username or email to email ──
  async function resolveEmail(input: string): Promise<string> {
    const val = input.trim();
    if (val.includes("@")) return val;
    // It's a username — resolve via RPC
    const { data, error } = await supabase.rpc("get_email_by_username", { uname: val.toLowerCase() });
    if (error || !data) throw new Error("Username not found");
    return data as string;
  }

  // ── Send email reset link ──
  async function sendEmailReset(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const resolvedEmail = await resolveEmail(identifier);
      setEmail(resolvedEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });
      if (error) throw new Error(error.message);
      setMethod("email_sent");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset link");
    }
    setLoading(false);
  }

  // ── Verify secondary password ──
  async function verifySecondary(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !secondaryPass.trim()) return;
    setLoading(true);
    try {
      const resolvedEmail = await resolveEmail(identifier);
      setEmail(resolvedEmail);
      const { data: hasIt } = await supabase.rpc("has_secondary_password_by_email", { user_email: resolvedEmail });
      if (!hasIt) throw new Error("No secondary password set for this account");
      const { data: verified } = await supabase.rpc("verify_secondary_password_by_email", {
        user_email: resolvedEmail,
        plain_password: secondaryPass.trim(),
      });
      if (!verified) throw new Error("Incorrect secondary password");
      setMethod("new_password");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    }
    setLoading(false);
  }

  // ── Verify backup code ──
  async function verifyBackupCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !backupCode.trim()) return;
    setLoading(true);
    try {
      const resolvedEmail = await resolveEmail(identifier);
      setEmail(resolvedEmail);

      // Get user id from email first
      const { data: uid, error: uidErr } = await supabase.rpc("get_user_id_by_email", { user_email: resolvedEmail });
      if (uidErr || !uid) throw new Error("Account not found");

      // Verify the backup code is valid WITHOUT consuming it yet (consume happens on password reset)
      const { data: valid, error: verifyErr } = await supabase.rpc("check_backup_code_valid", {
        uid,
        plain_code: backupCode.trim().toLowerCase(),
      });
      if (verifyErr) throw new Error(verifyErr.message);
      if (!valid) throw new Error("Invalid backup code");

      setVerifyMethod("backup");
      setMethod("new_password");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    }
    setLoading(false);
  }

  // ── Set new password (after any verification) ──
  async function setNewPass(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      if (isEmailReset) {
        if (!sessionReady) throw new Error("Session not ready yet, please wait");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
      } else if (verifyMethod === "backup") {
        const { data: success, error } = await supabase.rpc("reset_password_with_backup_code", {
          user_email: email.trim(),
          backup_code: backupCode.trim().toLowerCase(),
          new_password: newPassword,
        });
        if (error || !success) throw new Error("Invalid backup code or already used");
      } else {
        // Secondary password flow
        const { data: success, error } = await supabase.rpc("reset_password_with_secondary", {
          user_email: email.trim(),
          secondary_plain: secondaryPass.trim(),
          new_password: newPassword,
        });
        if (error || !success) throw new Error(error?.message ?? "Failed to reset password");
      }
      setMethod("done");
      toast.success("Password reset successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    }
    setLoading(false);
  }

  function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
        {show ? (
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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Social<span className="text-purple-500">Site</span></h1>
          <p className="text-zinc-400 text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">

          {/* CHOOSE METHOD */}
          {method === "choose" && (
            <>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Forgot Password?</h2>
                <p className="text-zinc-400 text-sm mt-1">Choose how you want to reset it</p>
              </div>
              <button onClick={() => setMethod("email")}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-left">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Reset via Email</p>
                  <p className="text-zinc-500 text-xs mt-0.5">We'll send a reset link to your email</p>
                </div>
              </button>
              <button onClick={() => setMethod("secondary")}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-left">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Use Secondary Password</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Verify with your backup password</p>
                </div>
              </button>
              <button onClick={() => setMethod("backup")}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-left">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Use Backup Code</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Use one of your saved backup codes</p>
                </div>
              </button>
              <button onClick={() => router.push("/")} className="text-zinc-500 text-sm hover:text-white transition text-center">
                Back to Sign In
              </button>
            </>
          )}

          {/* EMAIL RESET */}
          {method === "email" && (
            <>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Reset via Email</h2>
                <p className="text-zinc-400 text-sm mt-1">Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={sendEmailReset} className="flex flex-col gap-4">
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or username" required autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                <button type="submit" disabled={loading || !identifier}
                  className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              <button onClick={() => setMethod("choose")} className="text-zinc-500 text-sm hover:text-white transition text-center">← Back</button>
            </>
          )}

          {/* EMAIL SENT */}
          {method === "email_sent" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Check your email</h2>
              <p className="text-zinc-400 text-sm">We sent a reset link to <span className="text-white font-semibold">{email || identifier}</span>. Click it to set a new password.</p>
              <button onClick={() => router.push("/")} className="mt-2 text-purple-400 text-sm hover:text-purple-300 transition">Back to Sign In</button>
            </div>
          )}

          {/* SECONDARY PASSWORD VERIFY */}
          {method === "secondary" && (
            <>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Secondary Password</h2>
                <p className="text-zinc-400 text-sm mt-1">Enter your email and secondary password</p>
              </div>
              <form onSubmit={verifySecondary} className="flex flex-col gap-4">
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or username" required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                <div className="relative">
                  <input type={showSec ? "text" : "password"} value={secondaryPass} onChange={(e) => setSecondaryPass(e.target.value)}
                    placeholder="Your secondary password" required
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                  <EyeBtn show={showSec} onToggle={() => setShowSec((v) => !v)}/>
                </div>
                <button type="submit" disabled={loading || !identifier || !secondaryPass}
                  className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </form>
              <button onClick={() => setMethod("choose")} className="text-zinc-500 text-sm hover:text-white transition text-center">← Back</button>
            </>
          )}

          {/* BACKUP CODE VERIFY */}
          {method === "backup" && (
            <>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Use Backup Code</h2>
                <p className="text-zinc-400 text-sm mt-1">Enter your account and a backup code</p>
              </div>
              <form onSubmit={verifyBackupCode} className="flex flex-col gap-4">
                <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or username" required autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="xxxxx-xxxxx"
                  required
                  className="w-full text-center font-mono tracking-wider px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
                />
                <p className="text-zinc-600 text-xs text-center -mt-2">Each backup code can only be used once</p>
                <button type="submit" disabled={loading || !identifier || !backupCode}
                  className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>
              <button onClick={() => setMethod("choose")} className="text-zinc-500 text-sm hover:text-white transition text-center">← Back</button>
            </>
          )}

          {/* NEW PASSWORD */}
          {method === "new_password" && (
            <>
              <div className="text-center">
                <h2 className="text-white font-bold text-lg">Set New Password</h2>
                <p className="text-zinc-400 text-sm mt-1">Choose a strong new password</p>
              </div>
              {isEmailReset && !sessionReady ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400 text-sm">Verifying reset link...</p>
                </div>
              ) : (
                <form onSubmit={setNewPass} className="flex flex-col gap-4">
                  <div className="relative">
                    <input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)" required minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"/>
                    <EyeBtn show={showNew} onToggle={() => setShowNew((v) => !v)}/>
                  </div>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password" required
                      className={`w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 placeholder-zinc-500 ${confirmPassword && confirmPassword !== newPassword ? "ring-1 ring-red-500/50 focus:ring-red-500" : "focus:ring-purple-500"}`}/>
                    <EyeBtn show={showConfirm} onToggle={() => setShowConfirm((v) => !v)}/>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && <p className="text-red-400 text-xs -mt-2">Passwords don't match</p>}
                  <button type="submit" disabled={loading || !newPassword || newPassword !== confirmPassword}
                    className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition">
                    {loading ? "Saving..." : "Reset Password"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* DONE */}
          {method === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Password Reset!</h2>
              <p className="text-zinc-400 text-sm">Your password has been updated. You can now sign in.</p>
              <button onClick={() => router.push("/")} className="mt-2 py-3 px-8 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition">
                Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    }>
      <ForgotContent/>
    </Suspense>
  );
}
