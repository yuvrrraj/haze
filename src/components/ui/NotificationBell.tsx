"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  // Derived — rings continuously while unread > 0, stops the moment user clicks
  const ringing = unread > 0;

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let removed = false;
    const channel = supabase
      .channel(`bell-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => setUnread((n) => n + 1)
      )
      .subscribe();
    return () => {
      removed = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function fetchUnread() {
    const user = await getCurrentUser();
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnread(count ?? 0);
  }

  async function handleClick() {
    setUnread(0); // stop ringing immediately
    router.push("/notifications");
    const user = await getCurrentUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-full hover:bg-zinc-800 transition text-zinc-300 hover:text-white"
    >
      {/* Bell icon with ring animation */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transformOrigin: "50% 4px", display: "block" }}
        className={ringing ? "animate-bell-ring" : ""}
      >
        {/* Bell body */}
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        {/* Clapper */}
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {/* Silent — short diagonal slash only across the bell, not full canvas */}
        {unread === 0 && (
          <line x1="4" y1="4" x2="20" y2="20" />
        )}
      </svg>

      {/* Red dot */}
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
      )}
    </button>
  );
}
