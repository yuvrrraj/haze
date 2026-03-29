"use client";
import { useEffect } from "react";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { setUser, setProfile } = useAuthStore();

  useEffect(() => {
    let active = true;

    // Load from cache first (no network)
    getCurrentUser().then((user) => {
      if (active && user) fetchProfile(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) fetchProfile(session.user.id);
      else { setUser(null); setProfile(null); }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,bio,avatar_url,cover_url,badge,is_verified,is_private,show_activity,restrict_messages")
      .eq("id", userId)
      .single();
    if (data) { setUser(data); setProfile(data); }
  }
}
