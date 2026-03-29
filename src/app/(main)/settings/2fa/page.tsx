"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Step = "status" | "qr" | "verify" | "enabled" | "disable_confirm";

export default function TwoFactorPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("status");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => { checkStatus(); }, []);

  async function checkStatus() {
    setChecking(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const totpFactor = data?.totp?.find((f) => f.status === "verified");
    if (totpFactor) {
      setIs2FAEnabled(true);
      setFactorId(totpFactor.id);
    }
    setChecking(false);
  }

  async function startEnroll() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      toast.error(error?.message ?? "Failed to start 2FA setup");
      setLoading(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep("qr");
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: otp });
    if (error) {
      toast.error("Invalid code. Try again.");
      setOtp("");
    } else {
      setIs2FAEnabled(true);
      setStep("enabled");
      toast.success("2FA enabled successfully! 🎉");
    }
    setLoading(false);
  }

  async function disable2FA() {
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      toast.error(error.message);
    } else {
      setIs2FAEnabled(false);
      setFactorId("");
      setStep("status");
      toast.success("2FA disabled");
    }
    setLoading(false);
  }

  if (checking) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button
          onClick={() => step === "qr" || step === "verify" ? setStep("status") : router.back()}
          className="p-2 rounded-full hover:bg-zinc-800 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Two-Factor Authentication</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ── STATUS ── */}
        {(step === "status" || step === "enabled") && (
          <div className="flex flex-col gap-6">
            {/* Status card */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${is2FAEnabled ? "border-green-500/30 bg-green-500/10" : "border-zinc-700 bg-zinc-900"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${is2FAEnabled ? "bg-green-500/20" : "bg-zinc-800"}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={is2FAEnabled ? "text-green-400" : "text-zinc-400"}>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Google Authenticator</p>
                <p className={`text-xs mt-0.5 ${is2FAEnabled ? "text-green-400" : "text-zinc-500"}`}>
                  {is2FAEnabled ? "✓ Enabled — your account is protected" : "Not enabled"}
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-white font-semibold text-sm">What is 2FA?</p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Two-factor authentication adds an extra layer of security. After entering your password, you'll also need a 6-digit code from your authenticator app.
              </p>
              <div className="flex flex-col gap-2 mt-1">
                {["Google Authenticator", "Microsoft Authenticator", "Authy"].map((app) => (
                  <div key={app} className="flex items-center gap-2 text-zinc-400 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {app}
                  </div>
                ))}
              </div>
            </div>

            {is2FAEnabled ? (
              <button
                onClick={() => setStep("disable_confirm")}
                className="py-3 bg-zinc-800 hover:bg-zinc-700 border border-red-500/30 text-red-400 rounded-xl font-semibold text-sm transition"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={startEnroll}
                disabled={loading}
                className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
              >
                {loading ? "Setting up..." : "Enable Google Authenticator"}
              </button>
            )}
          </div>
        )}

        {/* ── QR CODE ── */}
        {step === "qr" && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">Scan QR Code</h2>
              <p className="text-zinc-400 text-sm mt-1">Open your authenticator app and scan this code</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="2FA QR Code" width={200} height={200} />
              </div>
            </div>

            {/* Manual entry */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <p className="text-zinc-400 text-xs mb-2">Can't scan? Enter this code manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-purple-300 text-xs font-mono bg-zinc-800 px-3 py-2 rounded-lg break-all">{secret}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success("Copied!"); }}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition"
            >
              I've scanned it — Next
            </button>
          </div>
        )}

        {/* ── VERIFY OTP ── */}
        {step === "verify" && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-white font-bold text-lg">Enter Verification Code</h2>
              <p className="text-zinc-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
            </div>

            <form onSubmit={verifyOtp} className="flex flex-col gap-4">
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
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
              >
                {loading ? "Verifying..." : "Verify & Enable 2FA"}
              </button>
              <button type="button" onClick={() => setStep("qr")} className="text-zinc-500 text-sm hover:text-white transition">
                ← Back to QR code
              </button>
            </form>
          </div>
        )}

        {/* ── DISABLE CONFIRM ── */}
        {step === "disable_confirm" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-xl">Disable 2FA?</h2>
              <p className="text-zinc-400 text-sm leading-relaxed px-4">
                This will remove two-factor authentication from your account. Your account will be less secure.
              </p>
            </div>
            <button
              onClick={disable2FA}
              disabled={loading}
              className="py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
            >
              {loading ? "Disabling..." : "Yes, Disable 2FA"}
            </button>
            <button
              onClick={() => setStep("status")}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
