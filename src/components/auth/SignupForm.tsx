"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineMail, AiOutlineLock, AiOutlineUser } from "react-icons/ai";

export default function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setLoading(false); return toast.error(error.message); }

    if (!data.user) { setLoading(false); return toast.error("Signup failed, please try again"); }

    // If email confirmation is required, session will be null — show message and stop
    if (!data.session) {
      setLoading(false);
      return toast.success("Check your email to confirm your account!", { duration: 6000 });
    }

    // Session is active (email confirmation disabled) — create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username: username.trim().toLowerCase(),
      created_at: new Date().toISOString(),
    });

    setLoading(false);
    if (profileError) toast.error("Account created but profile setup failed: " + profileError.message);
    else toast.success("Account created! Welcome 🎉");
  }

  return (
    <form onSubmit={handleSignup} className="flex flex-col gap-4">
      {/* Username */}
      <div className="relative">
        <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      {/* Email */}
      <div className="relative">
        <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      {/* Password */}
      <div className="relative">
        <AiOutlineLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-zinc-500 text-xs">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="text-purple-400 hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
