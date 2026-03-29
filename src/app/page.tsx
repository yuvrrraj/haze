"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/feed");
      } else {
        setChecked(true);
      }
    }).catch(() => setChecked(true));
  }, []);

  if (!checked) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Haze" className="w-24 h-24 mx-auto mb-3 object-contain rounded-2xl" />
        <p className="text-zinc-400 mt-2 text-sm">Connect. Share. Explore.</p>
      </div>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === "login" ? "text-white border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === "signup" ? "text-white border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign Up
          </button>
        </div>
        <div className="p-6">
          {tab === "login" ? (
            <LoginForm onSwitch={() => setTab("signup")} />
          ) : (
            <SignupForm onSwitch={() => setTab("login")} />
          )}
        </div>
      </div>

      <p className="mt-6 text-xs bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}>
        made by Yuvraj Chaudhary
      </p>
    </div>
  );
}
