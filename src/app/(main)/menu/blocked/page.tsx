"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { IoArrowBack } from "react-icons/io5";
import toast from "react-hot-toast";

interface BlockedUser {
  blocked_id: string;
  profile: { username: string; avatar_url: string | null } | null;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data } = await supabase
      .from("blocked_users")
      .select("blocked_id, profile:profiles!blocked_id(username, avatar_url)")
      .eq("blocker_id", user.id);
    setBlocked((data ?? []).map((r: any) => ({
      blocked_id: r.blocked_id,
      profile: Array.isArray(r.profile) ? r.profile[0] ?? null : r.profile,
    })));
    setLoading(false);
  }

  async function unblock(blockedId: string) {
    if (!currentUserId) return;
    await supabase.from("blocked_users").delete().eq("blocker_id", currentUserId).eq("blocked_id", blockedId);
    setBlocked((prev) => prev.filter((b) => b.blocked_id !== blockedId));
    toast.success("User unblocked");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <IoArrowBack size={20} />
        </button>
        <span className="font-bold text-lg">Blocked Users</span>
      </div>

      {blocked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <p className="text-sm">No blocked users</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900">
          {blocked.map((b) => (
            <div key={b.blocked_id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                {b.profile?.avatar_url ? (
                  <Image src={ikUrl(b.profile.avatar_url, { w: 88, h: 88 })} alt={b.profile.username} width={44} height={44} className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400">
                    {b.profile?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <span className="text-white text-sm font-medium flex-1">@{b.profile?.username ?? "Unknown"}</span>
              <button
                onClick={() => unblock(b.blocked_id)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
