"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import {
  AiOutlineHome, AiOutlineSearch, AiOutlinePlusCircle,
  AiOutlinePlayCircle, AiOutlineUser,
} from "react-icons/ai";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, hiddenNav } = useAuthStore();

  const avatarUrl = profile?.avatar_url ?? null;
  const [mounted, setMounted] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;

    async function setup() {
      const user = await getCurrentUser();
      if (!user) return;
      userId = user.id;

      // Initial count
      const { count } = await supabase
        .from("message_requests")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");
      setPendingRequests(count ?? 0);

      // Realtime — update count instantly on any change
      channel = supabase
        .channel(`msg-req-badge-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "message_requests",
        }, (payload) => {
          if (payload.new?.receiver_id === user.id && payload.new?.status === "pending") {
            setPendingRequests((c) => c + 1);
          }
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "message_requests",
        }, (payload) => {
          if (payload.new?.receiver_id === user.id) {
            // If status changed away from pending, decrement
            if (payload.old?.status === "pending" && payload.new?.status !== "pending") {
              setPendingRequests((c) => Math.max(0, c - 1));
            }
          }
        })
        .subscribe();
    }

    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [mounted]);

  const links = [
    { href: "/feed",    icon: AiOutlineHome,       label: "Home" },
    { href: "/explore", icon: AiOutlineSearch,     label: "Explore" },
    { href: "/upload",  icon: AiOutlinePlusCircle, label: "Upload" },
    { href: "/reels",   icon: AiOutlinePlayCircle, label: "Reels" },
  ];

  const chatActive = pathname.startsWith("/chat");

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex items-center justify-around h-16 z-50 transition-transform duration-300 ${
      hiddenNav ? "translate-y-full" : "translate-y-0"
    }`}>
      {links.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href);
        const isUpload = href === "/upload";
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-center transition ${
              isUpload ? "text-white" : active ? "text-purple-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            {isUpload ? (
              <div className={`p-2 rounded-xl transition ${active ? "bg-purple-600" : "bg-purple-600 hover:bg-purple-700"}`}>
                <Icon size={22} />
              </div>
            ) : (
              <Icon size={24} />
            )}
          </Link>
        );
      })}

      {/* Chat */}
      <Link href="/chat" className={`relative flex items-center justify-center transition ${
        pendingRequests > 0 ? "text-red-500 animate-pulse" : chatActive ? "text-purple-400" : "text-zinc-500 hover:text-white"
      }`}>
        {mounted && (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="2.5" />
            </svg>
            {pendingRequests > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </>
        )}
      </Link>

      <button
        className={`flex items-center justify-center transition ${
          pathname.startsWith("/profile") ? "text-purple-400" : "text-zinc-500"
        }`}
        onClick={() => router.push("/profile")}
      >
        <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
          pathname.startsWith("/profile") ? "border-purple-400" : "border-zinc-600"
        }`}>
          {avatarUrl ? (
            <Image src={ikUrl(avatarUrl)} alt="profile" width={28} height={28} className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
              <AiOutlineUser size={16} className={pathname.startsWith("/profile") ? "text-purple-400" : "text-zinc-500"} />
            </div>
          )}
        </div>
      </button>
    </nav>
  );
}
