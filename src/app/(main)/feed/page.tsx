"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { Post, Reel, Story } from "@/types";
import PostCard from "@/components/feed/PostCard";
import ReelCard from "@/components/feed/ReelCard";
import StoriesBar from "@/components/stories/StoriesBar";

function SkeletonFeed() {
  return (
    <div className="flex flex-col gap-0">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border-b border-zinc-900 pb-4 pt-3 px-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800" />
            <div className="flex flex-col gap-1.5">
              <div className="w-24 h-3 rounded bg-zinc-800" />
              <div className="w-16 h-2.5 rounded bg-zinc-800" />
            </div>
          </div>
          <div className="w-full aspect-square rounded-xl bg-zinc-800" />
          <div className="flex gap-4 mt-3">
            <div className="w-6 h-6 rounded bg-zinc-800" />
            <div className="w-6 h-6 rounded bg-zinc-800" />
            <div className="w-6 h-6 rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [likedReelIds, setLikedReelIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [savedReelIds, setSavedReelIds] = useState<Set<string>>(new Set());
  const scrolled = useRef(false);

  useEffect(() => {
    async function load() {
      // Step 1: fetch posts + reels immediately — use stored counts
      const [postsRes, reelsRes] = await Promise.all([
        supabase
          .from("posts")
          .select("*, user:profiles!posts_user_id_fkey(id,username,avatar_url,is_verified,badge)")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("reels")
          .select("*, user:profiles!reels_user_id_fkey(id,username,avatar_url,is_verified,badge)")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Show feed immediately with stored counts
      setPosts((postsRes.data ?? []) as Post[]);
      setReels((reelsRes.data ?? []) as Reel[]);
      setLoading(false);

      // Step 2: load user interactions in background (non-blocking)
      const user = await getCurrentUser();
      if (!user) return;

      const postIds = (postsRes.data ?? []).map((p: any) => p.id);
      const reelIds = (reelsRes.data ?? []).map((r: any) => r.id);

      const [likesRes, reelLikesRes, savedRes] = await Promise.all([
        postIds.length
          ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
          : Promise.resolve({ data: [] }),
        reelIds.length
          ? supabase.from("reel_likes").select("reel_id").eq("user_id", user.id).in("reel_id", reelIds)
          : Promise.resolve({ data: [] }),
        supabase.from("saved_posts").select("post_id, reel_id").eq("user_id", user.id),
      ]);

      setLikedPostIds(new Set((likesRes.data ?? []).map((r: any) => r.post_id)));
      setLikedReelIds(new Set((reelLikesRes.data ?? []).map((r: any) => r.reel_id)));
      const saved = savedRes.data ?? [];
      setSavedPostIds(new Set(saved.filter((r: any) => r.post_id).map((r: any) => r.post_id)));
      setSavedReelIds(new Set(saved.filter((r: any) => r.reel_id).map((r: any) => r.reel_id)));

      // Stories load last — fully non-blocking
      supabase
        .from("stories")
        .select("*, user:profiles!stories_user_id_fkey(id,username,avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data: s }) => setStories((s ?? []) as Story[]));
    }

    load();
  }, []);

  useEffect(() => {
    if (loading || scrolled.current) return;
    const postId = searchParams.get("post");
    if (!postId) return;
    scrolled.current = true;
    setTimeout(() => {
      document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, [loading, searchParams]);

  const feed = [
    ...posts.map((p) => ({ ...p, _type: "post" as const })),
    ...reels.map((r) => ({ ...r, _type: "reel" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-lg mx-auto">
      <StoriesBar stories={stories} />
      {loading ? (
        <SkeletonFeed />
      ) : feed.length === 0 ? (
        <p className="text-center text-zinc-500 py-20 text-sm">No posts yet</p>
      ) : (
        <div className="flex flex-col gap-0">
          {feed.map((item, i) =>
            item._type === "post" ? (
              <PostCard
                key={item.id}
                post={item as Post}
                index={i}
                initialLiked={likedPostIds.has(item.id)}
                initialSaved={savedPostIds.has(item.id)}
              />
            ) : (
              <ReelCard
                key={item.id}
                reel={item as Reel}
                initialLiked={likedReelIds.has(item.id)}
                initialSaved={savedReelIds.has(item.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<SkeletonFeed />}>
      <FeedContent />
    </Suspense>
  );
}
