"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { chatApi } from "@/app/(main)/chat/page";
import toast from "react-hot-toast";
import { AiOutlineClose, AiOutlineSend, AiOutlineShareAlt, AiOutlineSearch } from "react-icons/ai";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface SharePayload {
  type: "post" | "reel";
  id: string;
  thumbnail: string;   // always an image URL for preview
  videoUrl?: string;   // only for reels
  caption: string;
  username: string;
}

interface Props {
  payload: SharePayload;
  onStory: () => Promise<void>;
  onClose: () => void;
}

export default function ShareSheet({ payload, onStory, onClose }: Props) {
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sharingStory, setSharingStory] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [convData, followData] = await Promise.all([
      chatApi("get_conversations"),
      supabase.from("follows").select("following_id").eq("follower_id", user.id).limit(30),
    ]);

    const convos = convData?.data?.conversations ?? [];
    const convoIds: string[] = convos.map((c: { user1_id: string; user2_id: string }) =>
      c.user1_id === user.id ? c.user2_id : c.user1_id
    );
    const followIds = (followData.data ?? []).map((f: { following_id: string }) => f.following_id);
    const allIds = [...new Set([...convoIds, ...followIds])].filter((id) => id !== user.id);

    if (allIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", allIds)
      .limit(30);

    const list = profiles ?? [];
    setAllUsers(list);
    setFiltered(list);
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setFiltered(allUsers); setSearching(false); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${q.trim()}%`)
      .neq("id", currentUserId ?? "")
      .limit(20);
    setFiltered(data ?? []);
    setSearching(false);
  }, [allUsers, currentUserId]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  function toggleSelect(profile: Profile) {
    setSelected((prev) =>
      prev.find((p) => p.id === profile.id)
        ? prev.filter((p) => p.id !== profile.id)
        : [...prev, profile]
    );
  }

  async function sendToSelected() {
    if (!currentUserId || selected.length === 0) return;
    setSending(true);
    // Encode as structured share message
    const shareJson = `__SHARE__:${JSON.stringify({ ...payload, userMessage: message.trim() })}`;

    await Promise.all(
      selected.map(async (profile) => {
        const data = await chatApi("get_or_create_conversation", { otherUserId: profile.id });
        const conversationId = data?.conversationId;
        if (!conversationId) return;
        await chatApi("send_message", { conversationId, content: shareJson });
        setSent((s) => ({ ...s, [profile.id]: true }));
      })
    );

    setSending(false);
    toast.success(selected.length === 1 ? `Sent to @${selected[0].username}` : `Sent to ${selected.length} people`);
    setMessage("");
    setSelected([]);
    onClose();
  }

  async function handleStory() {
    setSharingStory(true);
    await onStory();
    setSharingStory(false);
    onClose();
  }

  function handleNative() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: payload.caption || `Check this ${payload.type}!`, url }).catch((err) => {
        if (err?.name !== "AbortError") toast.error("Could not share");
      });
    } else {
      navigator.clipboard?.writeText(url).then(() => toast.success("Link copied!"));
    }
    onClose();
  }

  const isSelected = (id: string) => selected.some((p) => p.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-zinc-950 rounded-t-2xl flex flex-col"
        style={{ height: "72vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <span className="text-white font-semibold text-base">Share</span>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition">
            <AiOutlineClose size={20} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-2.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-2">
            {searching
              ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
              : <AiOutlineSearch size={16} className="text-zinc-500 shrink-0" />
            }
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white transition">
                <AiOutlineClose size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Users grid — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* People grid */}
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-10">
              {search ? "No users found" : "Follow people to share with them"}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-5 px-4 py-4">
              {filtered.map((profile) => {
                const sel = isSelected(profile.id);
                return (
                  <button
                    key={profile.id}
                    onClick={() => toggleSelect(profile)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`relative w-16 h-16 rounded-full shrink-0 transition-all ${sel ? "ring-[3px] ring-purple-500 ring-offset-2 ring-offset-zinc-950" : ""}`}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                        {profile.avatar_url ? (
                          <Image
                            src={ikUrl(profile.avatar_url, { w: 128, h: 128 })}
                            alt={profile.username}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400">
                            {profile.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {sel && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-zinc-950">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-300 w-16 text-center truncate">@{profile.username}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message box + Send — only shown when someone is selected */}
        {selected.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950 shrink-0 flex items-center gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message..."
              className="flex-1 px-4 py-2.5 rounded-full bg-zinc-800 text-white text-sm placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendToSelected}
              disabled={sending}
              className="shrink-0 p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-full text-white transition"
            >
              {sending
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <AiOutlineSend size={18} />
              }
            </button>
          </div>
        )}

        {/* Bottom actions — Your Story + More */}
        <div className="flex border-t border-zinc-800 shrink-0">
          <button
            onClick={handleStory}
            disabled={sharingStory}
            className="flex-1 flex flex-col items-center gap-1.5 py-4 pb-8 hover:bg-zinc-900 transition active:bg-zinc-800"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-dashed border-purple-500">
              {sharingStory
                ? <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              }
            </div>
            <span className="text-xs text-zinc-400">Your Story</span>
          </button>

          <div className="w-px bg-zinc-800" />

          <button
            onClick={handleNative}
            className="flex-1 flex flex-col items-center gap-1.5 py-4 pb-8 hover:bg-zinc-900 transition active:bg-zinc-800"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <AiOutlineShareAlt size={20} className="text-purple-400" />
            </div>
            <span className="text-xs text-zinc-400">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
