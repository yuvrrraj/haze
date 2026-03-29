"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Story } from "@/types";
import { ikUrl } from "@/lib/imagekit";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

function isCloudinary(url: string) {
  return url.includes("cloudinary.com");
}

export default function StoriesBar({ stories }: { stories: Story[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { profile, user } = useAuthStore();

  useEffect(() => setMounted(true), []);

  // Separate current user's story from others
  const seen = new Set<string>();
  const grouped: Story[] = [];
  let myStory: Story | null = null;
  for (const s of stories) {
    if (user && s.user_id === user.id) {
      if (!myStory) myStory = s;
      continue;
    }
    if (!seen.has(s.user_id)) {
      seen.add(s.user_id);
      grouped.push(s);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return toast.error("Select an image or video");

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", isVideo ? "story" : "post");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.url) throw new Error(data.error ?? "Upload failed");

      const user = await getCurrentUser();
      if (!user) throw new Error("Not logged in");

      await supabase.from("profiles").upsert(
        { id: user.id, username: user.email?.split("@")[0] ?? user.id.slice(0, 8) },
        { onConflict: "id", ignoreDuplicates: true }
      );

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        video_url: isVideo ? data.url : null,
        image_url: !isVideo ? data.url : null,
        thumbnail_url: data.thumbnail ?? (!isVideo ? data.url : null),
        expires_at: expires,
      });
      if (error) throw error;

      toast.success("Story posted! Expires in 24h");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const avatarUrl = profile?.avatar_url ?? null;

  if (!mounted) return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b border-zinc-800">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-zinc-800 animate-pulse" />
          <div className="w-10 h-2 rounded bg-zinc-800 animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar border-b border-zinc-800">
      {/* Your Story bubble */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="relative w-16 h-16">
          {/* Circle — view story if exists, else trigger upload */}
          {myStory && user ? (
            <Link href={`/stories?userId=${user.id}`} className="block w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                {(() => {
                  const src = myStory.thumbnail_url ?? myStory.image_url ?? avatarUrl;
                  return src ? (
                    <Image src={isCloudinary(src) ? src : ikUrl(src, { w: 64, h: 64 })} alt="your story" width={64} height={64} className="object-cover" unoptimized={isCloudinary(src)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    </div>
                  );
                })()}
              </div>
            </Link>
          ) : (
            <div className="w-16 h-16 rounded-full p-0.5 bg-zinc-700">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                {avatarUrl ? (
                  <Image src={isCloudinary(avatarUrl) ? avatarUrl : ikUrl(avatarUrl, { w: 64, h: 64 })} alt="your story" width={64} height={64} className="object-cover" unoptimized={isCloudinary(avatarUrl)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* + badge — always triggers upload */}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 rounded-full border-2 border-black flex items-center justify-center"
          >
            {uploading ? (
              <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/>
              </svg>
            )}
          </button>
        </div>
        <span className="text-xs text-zinc-400 truncate w-16 text-center">Your story</span>
      </div>

      <input ref={inputRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />

      {/* Other users' stories */}
      {grouped.map((story) => {
        const src = story.user?.avatar_url ?? story.thumbnail_url ?? story.image_url ?? null;
        return (
          <Link
            key={story.user_id}
            href={`/stories?userId=${story.user_id}`}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                {src ? (
                  <Image
                    src={isCloudinary(src) ? src : ikUrl(src, { w: 64, h: 64 })}
                    alt={story.user?.username ?? "story"}
                    width={64} height={64}
                    className="object-cover"
                    unoptimized={isCloudinary(src)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-400">
                    {story.user?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-zinc-400 truncate w-16 text-center">
              {story.user?.username}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
