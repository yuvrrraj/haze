"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineMail, AiOutlineLock, AiOutlineUser } from "react-icons/ai";
import { MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";
import { getSavedAccounts, saveAccount, removeSavedAccount, type SavedAccount } from "@/lib/savedAccounts";
import Image from "next/image";

export default function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  async function resolveEmail(input: string): Promise<string | null> {
    if (input.includes("@")) return input;
    const { data, error } = await supabase.from("profiles").select("id").eq("username", input.toLowerCase()).single();
    if (error || !data) { toast.error("Username not found"); return null; }
    const { data: authData, error: authError } = await supabase.rpc("get_email_by_user_id", { uid: data.id });
    if (authError || !authData) { toast.error("Could not resolve username to email"); return null; }
    return authData;
  }

  async function handleMfa(userId: string, factorId: string) {
    const trusted = localStorage.getItem(`mfa_trusted_${userId}`);
    if (trusted) {
      const { expiry } = JSON.parse(trusted);
      if (Date.now() < expiry) return true;
      localStorage.removeItem(`mfa_trusted_${userId}`);
    }
    router.push(`/mfa?factorId=${factorId}&userId=${userId}`);
    return false;
  }

  async function persistAccount(userId: string, email: string, password: string) {
    const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).single();
    if (profile) {
      saveAccount({ id: userId, email, username: profile.username, avatar_url: profile.avatar_url, password });
      setSavedAccounts(getSavedAccounts());
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const email = await resolveEmail(identifier.trim());
    if (!email) { setLoading(false); return; }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); toast.error(error.message); return; }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factorId = factors?.totp?.find((f) => f.status === "verified")?.id ?? "";
      const userId = data.user?.id ?? "";
      const passed = await handleMfa(userId, factorId);
      if (!passed) { setLoading(false); return; }
    }

    setLoading(false);
    toast.success("Welcome back!");
    // persist in background — don't block redirect
    persistAccount(data.user!.id, email, password);
    router.replace("/feed");
  }

  async function loginWithSaved(acc: SavedAccount) {
    setSwitchingId(acc.id);
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password });
    if (error) {
      setSwitchingId(null);
      toast.error(error.message);
      return;
    }
    setSwitchingId(null);
    toast.success(`Welcome back, ${acc.username}!`);
    router.replace("/feed");
  }

  function removeAccount(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeSavedAccount(id);
    setSavedAccounts(getSavedAccounts());
  }

  const [showPassword, setShowPassword] = useState(false);
  const isEmail = identifier.includes("@");

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          {isEmail
            ? <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            : <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          }
          <input
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>

        <div className="relative">
          <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
          >
            {showPassword ? (
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
        </div>

        {/* Saved Logins (left) + Forgot password (right) */}
        <div className="flex items-center justify-between -mt-2">
          <button
            type="button"
            onClick={() => setShowSaved((v) => !v)}
            className="text-xs text-purple-400 hover:underline"
          >
            Saved Logins
          </button>
          <button type="button" onClick={() => router.push("/reset-password")} className="text-xs text-purple-400 hover:underline">
            Forgot password?
          </button>
        </div>

        {/* Saved accounts dropdown */}
        {showSaved && (
          <div className="flex flex-col gap-2 -mt-1">
            {savedAccounts.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-3 bg-zinc-800 rounded-xl">
                No saved accounts yet. Sign in once to save your account.
              </p>
            ) : (
              savedAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => loginWithSaved(acc)}
                  disabled={switchingId === acc.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition text-left group disabled:opacity-60"
                >
                  {acc.avatar_url ? (
                    <Image src={acc.avatar_url} alt={acc.username} width={36} height={36} className="rounded-full object-cover w-9 h-9" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-sm">
                      {acc.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">@{acc.username}</p>
                    <p className="text-zinc-500 text-xs truncate">{acc.email}</p>
                  </div>
                  {switchingId === acc.id ? (
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MdClose
                      size={16}
                      className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => removeAccount(e, acc.id)}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-zinc-500 text-xs">
          No account?{" "}
          <button type="button" onClick={onSwitch} className="text-purple-400 hover:underline">Sign up</button>
        </p>
      </form>
    </div>
  );
}
