"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { supabase, getCurrentUser, getCachedUser } from "@/lib/supabase";

const BottomNav = dynamic(() => import("@/components/ui/BottomNav"), { ssr: false });
const NotificationBell = dynamic(() => import("@/components/ui/NotificationBell"), { ssr: false });

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useAuth();
  const pathname = usePathname();

  useEffect(() => {
    let userId: string | null = null;

    async function ping() {
      // Use cached user first, fall back to async only once
      const user = getCachedUser() ?? await getCurrentUser();
      if (!user) return;
      userId = user.id;
      supabase.from("profiles").update({ last_active: new Date().toISOString() }).eq("id", user.id).then(() => {});
    }

    function markOffline() {
      if (!userId) return;
      supabase.from("profiles").update({ last_active: new Date(0).toISOString() }).eq("id", userId).then(() => {});
    }

    ping();
    const interval = setInterval(ping, 30000);
    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") ping();
      else markOffline();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, []);

  const isFeed = pathname === "/feed";
  const isMenu = pathname === "/menu";

  return (
    <div className="min-h-screen bg-black text-white">
      {isFeed && (
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-black/80 backdrop-blur border-b border-zinc-800">
          <h1 className="text-lg font-bold">
            <span className="text-purple-500">Haze</span>
          </h1>
          <NotificationBell />
        </header>
      )}
      <main className="pb-20">
        {children}
      </main>
      {!isMenu && <BottomNav />}
    </div>
  );
}
