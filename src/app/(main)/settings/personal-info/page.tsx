"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function PersonalInfoPage() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.email) setCurrentEmail(user.email);
    });
  }, []);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !password.trim()) return;
    if (newEmail === currentEmail) return toast.error("New email is the same as current");
    setLoading(true);
    try {
      // Re-authenticate first
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      });
      if (authErr) throw new Error("Wrong password");

      // Update email — Supabase sends confirmation to new email
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw new Error(error.message);

      setStep("verify");
      toast.success("Confirmation sent to " + newEmail);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update email");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Personal Info</span>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {step === "verify" ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-white font-bold text-xl">Check your email</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-white font-semibold">{newEmail}</span>.
              Click the link to confirm your new email address.
            </p>
            <p className="text-zinc-600 text-xs">Your email won't change until you confirm it.</p>
            <button
              onClick={() => { setStep("form"); setPassword(""); }}
              className="mt-4 text-purple-400 text-sm hover:text-purple-300 transition"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="text-zinc-400 text-sm mb-6">
              Current email: <span className="text-white font-medium">{currentEmail}</span>
            </p>

            <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1.5 block">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-medium mb-1.5 block">Confirm with Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your current password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newEmail || !password}
                className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-white font-semibold text-sm transition mt-2"
              >
                {loading ? "Updating..." : "Update Email"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
