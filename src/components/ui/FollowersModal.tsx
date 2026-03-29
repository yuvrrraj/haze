"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineClose, AiOutlineSearch } from "react-icons/ai";
import toast from "react-hot-toast";

interface UserRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Props {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
  isOwner?: boolean;
}

export default function FollowersModal({ userId, type, onClose, isOwner = false }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filtered, setFiltered] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // Supabase returns joined rows as array — normalise to single object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractProfiles(data: any[]): UserRow[] {
    return data
      .map((r) => (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles))
      .filter(Boolean) as UserRow[];
  }

  useEffect(() => { load(); }, [userId, type]);

  async function load() {
    setLoading(true);
    if (type === "followers") {
      const { data } = await supabase
        .from("follows")
        .select("profiles!follows_follower_id_fkey(id, username, avatar_url, bio)")
        .eq("following_id", userId);
      const list = extractProfiles(data ?? []);
      setUsers(list); setFiltered(list);
    } else {
      const { data } = await supabase
        .from("follows")
        .select("profiles!follows_following_id_fkey(id, username, avatar_url, bio)")
        .eq("follower_id", userId);
      const list = extractProfiles(data ?? []);
      setUsers(list); setFiltered(list);
    }
    setLoading(false);
  }

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(q ? users.filter((u) => u.username.toLowerCase().includes(q)) : users);
  }, [search, users]);

  async function removeFollower(followerId: string) {
    setRemoving(followerId);
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", userId);
    if (error) {
      toast.error("Failed to remove follower");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== followerId));
      setFiltered((prev) => prev.filter((u) => u.id !== followerId));
      toast.success("Follower removed");
    }
    setRemoving(null);
  }

  function goToProfile(id: string) {
    onClose();
    router.push(`/profile/${id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-zinc-950 rounded-t-2xl flex flex-col"
        style={{ height: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <span className="text-white font-semibold text-base capitalize">{type}</span>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition">
            <AiOutlineClose size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-2">
            <AiOutlineSearch size={16} className="text-zinc-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white">
                <AiOutlineClose size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-16">
              {search ? "No users found" : type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            <div className="divide-y divide-zinc-900">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition">
                  <button onClick={() => goToProfile(u.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      {u.avatar_url ? (
                        <Image
                          src={ikUrl(u.avatar_url, { w: 88, h: 88 })}
                          alt={u.username}
                          width={44}
                          height={44}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                          {u.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">@{u.username}</p>
                      {u.bio && <p className="text-zinc-500 text-xs truncate mt-0.5">{u.bio}</p>}
                    </div>
                  </button>
                  {isOwner && type === "followers" && (
                    <button
                      onClick={() => removeFollower(u.id)}
                      disabled={removing === u.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition disabled:opacity-40"
                    >
                      {removing === u.id ? (
                        <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin inline-block" />
                      ) : "Remove"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
