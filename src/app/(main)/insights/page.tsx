"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";

interface PostInsight {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  views: number;
  likes: number;
  comments: number;
}
interface ReelInsight {
  id: string;
  thumbnail_url: string | null;
  caption: string | null;
  created_at: string;
  views: number;
  likes: number;
  comments: number;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function InsightsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "posts" | "reels">("overview");
  const [posts, setPosts] = useState<PostInsight[]>([]);
  const [reels, setReels] = useState<ReelInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) { router.replace("/"); return; }

    const [postsRes, reelsRes, postViewsRes, reelViewsRes, postLikesRes, reelLikesRes, postCommentsRes, reelCommentsRes] = await Promise.all([
      supabase.from("posts").select("id, image_url, caption, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("reels").select("id, thumbnail_url, caption, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("post_views").select("post_id"),
      supabase.from("reel_views").select("reel_id"),
      supabase.from("likes").select("post_id"),
      supabase.from("reel_likes").select("reel_id"),
      supabase.from("comments").select("post_id").not("post_id", "is", null),
      supabase.from("comments").select("reel_id").not("reel_id", "is", null),
    ]);

    // Build count maps
    const pv: Record<string, number> = {};
    const rv: Record<string, number> = {};
    const pl: Record<string, number> = {};
    const rl: Record<string, number> = {};
    const pc: Record<string, number> = {};
    const rc: Record<string, number> = {};

    for (const r of postViewsRes.data ?? []) pv[r.post_id] = (pv[r.post_id] ?? 0) + 1;
    for (const r of reelViewsRes.data ?? []) rv[r.reel_id] = (rv[r.reel_id] ?? 0) + 1;
    for (const r of postLikesRes.data ?? []) pl[r.post_id] = (pl[r.post_id] ?? 0) + 1;
    for (const r of reelLikesRes.data ?? []) rl[r.reel_id] = (rl[r.reel_id] ?? 0) + 1;
    for (const r of postCommentsRes.data ?? []) pc[r.post_id] = (pc[r.post_id] ?? 0) + 1;
    for (const r of reelCommentsRes.data ?? []) rc[r.reel_id] = (rc[r.reel_id] ?? 0) + 1;

    setPosts((postsRes.data ?? []).map((p: any) => ({
      ...p, views: pv[p.id] ?? 0, likes: pl[p.id] ?? 0, comments: pc[p.id] ?? 0,
    })));
    setReels((reelsRes.data ?? []).map((r: any) => ({
      ...r, views: rv[r.id] ?? 0, likes: rl[r.id] ?? 0, comments: rc[r.id] ?? 0,
    })));
    setLoading(false);
  }

  const totalPostViews = posts.reduce((s, p) => s + p.views, 0);
  const totalReelViews = reels.reduce((s, r) => s + r.views, 0);
  const totalViews = totalPostViews + totalReelViews;
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0) + reels.reduce((s, r) => s + r.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p.comments, 0) + reels.reduce((s, r) => s + r.comments, 0);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black border-b border-zinc-800 flex items-center gap-3 px-4 h-14">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span className="font-bold text-lg">Insights</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(["overview", "posts", "reels"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${tab === t ? "text-white border-b-2 border-purple-500" : "text-zinc-500"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="px-4 py-5 space-y-4">
              <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">Overall Performance</p>

              {/* Total views big card */}
              <div className="bg-gradient-to-br from-purple-900/50 to-zinc-900 border border-purple-800/40 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span className="text-zinc-400 text-sm">Total Views</span>
                </div>
                <p className="text-4xl font-bold text-white">{fmt(totalViews)}</p>
                <div className="flex gap-4 mt-3">
                  <div>
                    <p className="text-zinc-500 text-xs">Posts</p>
                    <p className="text-white font-semibold">{fmt(totalPostViews)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Reels</p>
                    <p className="text-white font-semibold">{fmt(totalReelViews)}</p>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span className="text-zinc-400 text-xs">Total Likes</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{fmt(totalLikes)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="text-zinc-400 text-xs">Total Comments</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{fmt(totalComments)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    <span className="text-zinc-400 text-xs">Posts</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{posts.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    <span className="text-zinc-400 text-xs">Reels</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{reels.length}</p>
                </div>
              </div>

              {/* Top post */}
              {posts.length > 0 && (() => {
                const top = [...posts].sort((a, b) => b.views - a.views)[0];
                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-3">Top Post</p>
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                        <Image src={ikUrl(top.image_url, { w: 56, h: 56, q: 70 })} alt="" width={56} height={56} className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{top.caption || "No caption"}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-zinc-400 text-xs">{fmt(top.views)} views</span>
                          <span className="text-zinc-400 text-xs">{fmt(top.likes)} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Top reel */}
              {reels.length > 0 && (() => {
                const top = [...reels].sort((a, b) => b.views - a.views)[0];
                return (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-3">Top Reel</p>
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                        {top.thumbnail_url
                          ? <Image src={top.thumbnail_url} alt="" width={40} height={56} className="object-cover w-full h-full" unoptimized />
                          : <div className="w-full h-full bg-zinc-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{top.caption || "No caption"}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-zinc-400 text-xs">{fmt(top.views)} views</span>
                          <span className="text-zinc-400 text-xs">{fmt(top.likes)} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* POSTS */}
          {tab === "posts" && (
            <div className="divide-y divide-zinc-900">
              {posts.length === 0 && <p className="text-center text-zinc-600 py-20 text-sm">No posts yet</p>}
              {posts.map((p) => (
                <div key={p.id} className="flex gap-3 px-4 py-4 items-center">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                    <Image src={ikUrl(p.image_url, { w: 56, h: 56, q: 70 })} alt="" width={56} height={56} className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{p.caption || "No caption"}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                    <div className="flex gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {fmt(p.views)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {fmt(p.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {fmt(p.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REELS */}
          {tab === "reels" && (
            <div className="divide-y divide-zinc-900">
              {reels.length === 0 && <p className="text-center text-zinc-600 py-20 text-sm">No reels yet</p>}
              {reels.map((r) => (
                <div key={r.id} className="flex gap-3 px-4 py-4 items-center">
                  <div className="w-10 h-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                    {r.thumbnail_url
                      ? <Image src={r.thumbnail_url} alt="" width={40} height={56} className="object-cover w-full h-full" unoptimized />
                      : <div className="w-full h-full bg-zinc-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{r.caption || "No caption"}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{new Date(r.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                    <div className="flex gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {fmt(r.views)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {fmt(r.likes)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {fmt(r.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
