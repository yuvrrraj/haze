"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { useAuthStore } from "@/store/authStore";
import { AiOutlineClose, AiOutlineDelete, AiOutlineShareAlt } from "react-icons/ai";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import toast from "react-hot-toast";
import ShareSheet, { SharePayload } from "@/components/ui/ShareSheet";

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  expires_at: string;
  created_at: string;
  user: { username: string; avatar_url: string | null } | null;
}

type UserGroup = { user_id: string; stories: Story[] };

const DURATION = 5000;

function isCloudinary(url: string) {
  return url.includes("cloudinary.com");
}

function StoriesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");

  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [userIndex, setUserIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showHighlightModal, setShowHighlightModal] = useState(false);
  const [highlights, setHighlights] = useState<{id:string;title:string;cover_url:string|null}[]>([]);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [savingHighlight, setSavingHighlight] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("stories")
        .select("*, user:profiles(username, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) { router.replace("/feed"); return; }

      const map = new Map<string, Story[]>();
      for (const s of data as Story[]) {
        if (!map.has(s.user_id)) map.set(s.user_id, []);
        map.get(s.user_id)!.push(s);
      }
      const grouped: UserGroup[] = Array.from(map.entries()).map(([user_id, stories]) => ({ user_id, stories }));
      setGroups(grouped);
      const uIdx = grouped.findIndex((g) => g.user_id === targetUserId);
      setUserIndex(uIdx >= 0 ? uIdx : 0);
      setStoryIndex(0);
    }
    load();
  }, [targetUserId, router]);

  const currentGroup = groups[userIndex];
  const current = currentGroup?.stories[storyIndex] ?? null;

  useEffect(() => {
    if (!current || current.video_url) return;
    setProgress(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) goNextStory();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIndex, storyIndex, current?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current?.video_url) return;
    setProgress(0);
    video.currentTime = 0;
    video.muted = muted;
    video.play().catch(() => {});
    const onTime = () => { if (video.duration) setProgress((video.currentTime / video.duration) * 100); };
    const onEnd = () => goNextStory();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnd);
    return () => { video.removeEventListener("timeupdate", onTime); video.removeEventListener("ended", onEnd); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIndex, storyIndex, current?.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function goNextStory() {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else {
      if (userIndex < groups.length - 1) { setUserIndex((i) => i + 1); setStoryIndex(0); }
      else router.replace("/feed");
    }
  }

  function goPrevStory() {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (userIndex > 0) {
      const prevGroup = groups[userIndex - 1];
      setUserIndex((i) => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }

  function goNextUser() {
    if (userIndex < groups.length - 1) { setUserIndex((i) => i + 1); setStoryIndex(0); }
    else router.replace("/feed");
  }

  function goPrevUser() {
    if (userIndex > 0) { setUserIndex((i) => i - 1); setStoryIndex(0); }
  }

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) { if (diff > 0) goNextUser(); else goPrevUser(); }
  }

  async function shareToStory(): Promise<void> {
    if (!currentUserId) { toast.error("Login first"); return; }
    const toastId = toast.loading("Sharing to story...");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("stories").insert({
      user_id: currentUserId,
      ...(current?.video_url ? { video_url: current.video_url } : { image_url: current?.image_url }),
      thumbnail_url: current?.thumbnail_url,
      expires_at: expires,
    });
    if (error) toast.error("Failed to share", { id: toastId });
    else toast.success("Added to your story!", { id: toastId });
  }

  const { setHiddenNav } = useAuthStore();

  async function openHighlightModal() {
    if (!currentUserId) return;
    const { data } = await supabase.from("highlights").select("id,title,cover_url").eq("user_id", currentUserId).order("created_at", { ascending: false });
    setHighlights(data ?? []);
    setShowHighlightModal(true);
    setHiddenNav(true);
  }

  async function addToHighlight(highlightId: string) {
    if (!current) return;
    setSavingHighlight(true);
    const isVideo = !!current.video_url;
    const mediaUrl = current.video_url ?? current.image_url ?? "";
    const { error } = await supabase.from("highlight_stories").upsert({
      highlight_id: highlightId,
      story_id: current.id,
      media_url: mediaUrl,
      is_video: isVideo,
    }, { onConflict: "highlight_id,story_id", ignoreDuplicates: true });
    if (error) { toast.error("Failed to add"); }
    else {
      // Update cover to this story's thumbnail if highlight has no cover
      const hl = highlights.find(h => h.id === highlightId);
      if (!hl?.cover_url) {
        const coverSrc = current.thumbnail_url ?? current.image_url ?? null;
        if (coverSrc) {
          // Upload cover to ImageKit via API
          try {
            const res = await fetch(coverSrc);
            const blob = await res.blob();
            const form = new FormData();
            form.append("file", blob, "cover.jpg");
            form.append("type", "post");
            const up = await fetch("/api/upload", { method: "POST", body: form });
            const upData = await up.json();
            if (upData.url) await supabase.from("highlights").update({ cover_url: upData.url }).eq("id", highlightId);
          } catch {}
        }
      }
      toast.success("Added to highlight!");
    }
    setSavingHighlight(false);
    setShowHighlightModal(false);
    setHiddenNav(false);
  }

  async function createAndAddHighlight() {
    if (!currentUserId || !newHighlightTitle.trim() || !current) return;
    setSavingHighlight(true);
    const isVideo = !!current.video_url;
    const mediaUrl = current.video_url ?? current.image_url ?? "";

    // Upload cover to ImageKit
    let coverUrl: string | null = null;
    const coverSrc = current.thumbnail_url ?? current.image_url ?? null;
    if (coverSrc) {
      try {
        const res = await fetch(coverSrc);
        const blob = await res.blob();
        const form = new FormData();
        form.append("file", blob, "cover.jpg");
        form.append("type", "post");
        const up = await fetch("/api/upload", { method: "POST", body: form });
        const upData = await up.json();
        if (upData.url) coverUrl = upData.url;
      } catch {}
    }

    const { data: hl, error } = await supabase.from("highlights").insert({
      user_id: currentUserId,
      title: newHighlightTitle.trim(),
      cover_url: coverUrl,
    }).select("id").single();

    if (error || !hl) { toast.error("Failed to create highlight"); setSavingHighlight(false); return; }

    await supabase.from("highlight_stories").insert({
      highlight_id: hl.id,
      story_id: current.id,
      media_url: mediaUrl,
      is_video: isVideo,
    });

    toast.success(`Highlight "${newHighlightTitle.trim()}" created!`);
    setSavingHighlight(false);
    setShowHighlightModal(false);
    setHiddenNav(false);
    setNewHighlightTitle("");
  }

  async function deleteStory() {
    if (!current || !currentUserId) return;
    const toastId = toast.loading("Deleting...");
    const { error } = await supabase.from("stories").delete().eq("id", current.id);
    if (error) { toast.error("Failed to delete: " + error.message, { id: toastId }); return; }
    toast.success("Story deleted", { id: toastId });
    const remaining = currentGroup.stories.filter((s) => s.id !== current.id);
    if (remaining.length === 0) {
      const newGroups = groups.filter((g) => g.user_id !== currentGroup.user_id);
      if (newGroups.length === 0) { router.replace("/feed"); return; }
      setGroups(newGroups);
      setUserIndex((i) => Math.min(i, newGroups.length - 1));
      setStoryIndex(0);
    } else {
      setGroups((prev) => prev.map((g) => g.user_id === currentGroup.user_id ? { ...g, stories: remaining } : g));
      setStoryIndex(Math.min(storyIndex, remaining.length - 1));
    }
  }

  if (!current) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const mediaSrc = current.video_url ?? current.image_url ?? null;
  const isVideo = !!current.video_url;
  const avatarSrc = current.user?.avatar_url ?? null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative w-full max-w-sm h-full">
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {currentGroup.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-none" style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>
        <div className="absolute top-7 left-3 right-3 flex items-center gap-2 z-20">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
            {avatarSrc ? (
              <Image src={isCloudinary(avatarSrc) ? avatarSrc : ikUrl(avatarSrc, { w: 64, h: 64 })} alt={current.user?.username ?? ""} width={32} height={32} className="object-cover" unoptimized={isCloudinary(avatarSrc)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">{current.user?.username?.[0]?.toUpperCase()}</div>
            )}
          </div>
          <span className="text-white text-sm font-semibold flex-1">{current.user?.username}</span>
          {isVideo && (
            <button onClick={() => setMuted((m) => !m)} className="p-1.5 text-white">
              {muted ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
            </button>
          )}
          <button onClick={() => setShowShare(true)} className="p-1.5 text-white"><AiOutlineShareAlt size={20} /></button>
          {currentUserId === current.user_id && (
            <>
              <button onClick={openHighlightModal} className="p-1.5 text-white" title="Add to Highlight">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </button>
              <button onClick={deleteStory} className="p-1.5 text-red-400 hover:text-red-300 transition"><AiOutlineDelete size={20} /></button>
            </>
          )}
          <button onClick={() => router.replace("/feed")} className="p-1.5 text-white"><AiOutlineClose size={20} /></button>
        </div>
        {mediaSrc && (
          isVideo ? (
            <video ref={videoRef} src={mediaSrc} className="w-full h-full object-cover" playsInline muted={muted} />
          ) : (
            <Image src={isCloudinary(mediaSrc) ? mediaSrc : ikUrl(mediaSrc, { w: 480, h: 854, q: 90 })} alt="story" fill className="object-cover" unoptimized={isCloudinary(mediaSrc)} priority />
          )
        )}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={goPrevStory} />
          <div className="flex-1 cursor-pointer" onClick={goNextStory} />
        </div>
      </div>
      {showShare && current && (
        <ShareSheet
          payload={{ type: current.video_url ? "reel" : "post", id: current.id, thumbnail: current.thumbnail_url ?? current.image_url ?? "", videoUrl: current.video_url ?? undefined, caption: `${current.user?.username ?? ""}'s story`, username: current.user?.username ?? "" } satisfies SharePayload}
          onStory={shareToStory}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Add to Highlight Modal */}
      {showHighlightModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end justify-center" onClick={() => { setShowHighlightModal(false); setHiddenNav(false); }}>
          <div className="bg-zinc-900 rounded-t-2xl w-full max-w-sm p-5 pb-10 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
            <h3 className="text-white font-bold text-base text-center">Add to Highlight</h3>

            {/* Existing highlights */}
            {highlights.length > 0 && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {highlights.map((hl) => (
                  <button key={hl.id} onClick={() => addToHighlight(hl.id)} disabled={savingHighlight}
                    className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-500 bg-zinc-800">
                      {hl.cover_url ? (
                        <Image src={hl.cover_url} alt={hl.title} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-zinc-300 truncate w-14 text-center">{hl.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Create new highlight */}
            <div className="flex gap-2">
              <input
                value={newHighlightTitle}
                onChange={e => setNewHighlightTitle(e.target.value)}
                placeholder="New highlight name..."
                maxLength={30}
                className="flex-1 px-3 py-2.5 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
              />
              <button
                onClick={createAndAddHighlight}
                disabled={savingHighlight || !newHighlightTitle.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
              >
                {savingHighlight ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoriesPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StoriesInner />
    </Suspense>
  );
}
