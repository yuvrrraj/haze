"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { BsFillPlayFill } from "react-icons/bs";

import { IoArrowBack } from "react-icons/io5";

const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

interface SavedItem {
  id: string;
  post_id: string | null;
  reel_id: string | null;
  post: { image_url: string } | null;
  reel: { thumbnail_url: string | null } | null;
}

export default function SavedPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    const { data } = await supabase
      .from("saved_posts")
      .select("id, post_id, reel_id, post:posts(image_url), reel:reels(thumbnail_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as SavedItem[]);
    setLoading(false);
  }

  const savedPosts = items.filter((i) => i.post_id && i.post);
  const savedReels = items.filter((i) => i.reel_id && i.reel);

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="sticky top-0 z-10 px-4 py-3 bg-black border-b border-zinc-900 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white">
          <IoArrowBack size={22} />
        </button>
        <BookmarkIcon />
        <h1 className="text-white font-bold text-lg">Saved</h1>
      </div>

      <div className="flex border-b border-zinc-800">
        {(["posts", "reels"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${
              tab === t ? "text-white border-b-2 border-purple-500" : "text-zinc-500"
            }`}
          >
            {tab === t ? <BookmarkIcon filled /> : <BookmarkIcon />}
            <span className="text-xs font-bold capitalize">{t} ({t === "posts" ? savedPosts.length : savedReels.length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {tab === "posts" && savedPosts.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer"
              onClick={() => router.push(`/feed?post=${item.post_id}`)}
            >
              <Image
                src={ikUrl(item.post!.image_url, { w: 300, h: 300, q: 70 })}
                alt="saved post" fill className="object-cover" sizes="33vw" unoptimized
              />
            </div>
          ))}
          {tab === "reels" && savedReels.map((item) => (
            <div
              key={item.id}
              className="relative aspect-[9/16] bg-zinc-900 overflow-hidden cursor-pointer"
              onClick={() => router.push(`/reels?id=${item.reel_id}`)}
            >
              {item.reel?.thumbnail_url ? (
                <Image src={item.reel.thumbnail_url} alt="saved reel" fill className="object-cover" sizes="33vw" unoptimized />
              ) : <div className="w-full h-full bg-zinc-800" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <BsFillPlayFill size={24} className="text-white/80" />
              </div>
            </div>
          ))}
          {tab === "posts" && savedPosts.length === 0 && (
            <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600">
              <BookmarkIcon />
              <p className="text-sm">No saved posts yet</p>
            </div>
          )}
          {tab === "reels" && savedReels.length === 0 && (
            <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600">
              <BookmarkIcon />
              <p className="text-sm">No saved reels yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
