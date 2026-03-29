"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function SecurityPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    if (newPassword === currentPassword) return toast.error("New password must be different");
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user?.email) throw new Error("Not authenticated");

      // Verify current password is correct first
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (authErr) throw new Error("Current password is incorrect");

      // After signInWithPassword the session is refreshed — now update password
      // Wait briefly for session to settle
      await new Promise((r) => setTimeout(r, 300));

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setDone(true);
      toast.success("Password updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    }
    setLoading(false);
  }

  function EyeIcon({ show }: { show: boolean }) {
    return show ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Security</span>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl">Password Updated</h2>
            <p className="text-zinc-400 text-sm">Your password has been changed successfully.</p>
            <button
              onClick={() => { setDone(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
              className="mt-4 text-purple-400 text-sm hover:text-purple-300 transition"
            >
              Change again
            </button>
          </div>
        ) : (
          <>
            <p className="text-zinc-400 text-sm mb-6">Choose a strong password to keep your account secure.</p>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              {/* Current password */}
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                    <EyeIcon show={showCurrent} />
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1.5 block">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                    <EyeIcon show={showNew} />
                  </button>
                </div>
                {/* Strength indicator */}
                {newPassword.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= i * 3
                          ? i <= 1 ? "bg-red-500" : i <= 2 ? "bg-yellow-500" : i <= 3 ? "bg-blue-500" : "bg-green-500"
                          : "bg-zinc-700"
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className={`w-full px-4 py-3 pr-11 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 placeholder-zinc-500 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "focus:ring-red-500 ring-1 ring-red-500/50"
                        : "focus:ring-purple-500"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition">
                    <EyeIcon show={showConfirm} />
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-white font-semibold text-sm transition mt-2"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            {/* 2FA */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Two-Factor Authentication</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Add an extra layer of security with Google Authenticator</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/settings/2fa")}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Manage 2FA
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
