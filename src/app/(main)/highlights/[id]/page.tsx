"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineClose, AiOutlineDelete } from "react-icons/ai";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import toast from "react-hot-toast";

interface HStory {
  id: string;
  media_url: string;
  is_video: boolean;
  created_at: string;
}
interface Highlight {
  id: string;
  title: string;
  cover_url: string | null;
  user_id: string;
  user: { username: string; avatar_url: string | null } | null;
}

const DURATION = 5000;

function isCloudinary(url: string) { return url.includes("cloudinary.com"); }

export default function HighlightPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [stories, setStories] = useState<HStory[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());
  const touchStartX = useRef(0);

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setCurrentUserId(u.id); });
    load();
  }, [id]);

  async function load() {
    const [{ data: hl }, { data: hs }] = await Promise.all([
      supabase.from("highlights").select("id,title,cover_url,user_id,user:profiles!highlights_user_id_fkey(username,avatar_url)").eq("id", id).maybeSingle(),
      supabase.from("highlight_stories").select("id,media_url,is_video,created_at").eq("highlight_id", id).order("created_at", { ascending: true }),
    ]);
    if (!hl || !hs || hs.length === 0) { router.replace("/feed"); return; }
    setHighlight({ ...hl, user: Array.isArray(hl.user) ? hl.user[0] ?? null : hl.user });
    setStories(hs);
    setLoading(false);
  }

  const current = stories[index] ?? null;

  // Image timer
  useEffect(() => {
    if (!current || current.is_video) return;
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) goNext();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, current?.id]);

  // Video timer
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current?.is_video) return;
    setProgress(0);
    video.currentTime = 0;
    video.muted = muted;
    video.play().catch(() => {});
    const onTime = () => { if (video.duration) setProgress((video.currentTime / video.duration) * 100); };
    const onEnd = () => goNext();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnd);
    return () => { video.removeEventListener("timeupdate", onTime); video.removeEventListener("ended", onEnd); };
  }, [index, current?.id]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);

  function goNext() {
    if (index < stories.length - 1) setIndex(i => i + 1);
    else router.replace("/profile");
  }
  function goPrev() { if (index > 0) setIndex(i => i - 1); }

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) { if (diff > 0) goNext(); else goPrev(); }
  }

  async function deleteHighlight() {
    if (!highlight) return;
    const { error } = await supabase.from("highlights").delete().eq("id", highlight.id);
    if (error) return toast.error("Failed to delete");
    toast.success("Highlight deleted");
    router.replace("/profile");
  }

  async function removeStory() {
    if (!current) return;
    await supabase.from("highlight_stories").delete().eq("id", current.id);
    const remaining = stories.filter(s => s.id !== current.id);
    if (remaining.length === 0) { deleteHighlight(); return; }
    setStories(remaining);
    setIndex(i => Math.min(i, remaining.length - 1));
    toast.success("Removed from highlight");
  }

  if (loading || !current || !highlight) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isOwner = currentUserId === highlight.user_id;
  const avatarSrc = highlight.user?.avatar_url ?? null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative w-full max-w-sm h-full">

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-none"
                style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 flex items-center gap-2 z-20">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
            {avatarSrc ? (
              <Image src={isCloudinary(avatarSrc) ? avatarSrc : ikUrl(avatarSrc, { w: 64, h: 64 })} alt="" width={32} height={32} className="object-cover" unoptimized={isCloudinary(avatarSrc)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">{highlight.user?.username?.[0]?.toUpperCase()}</div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">{highlight.user?.username}</p>
            <p className="text-white/60 text-xs">{highlight.title}</p>
          </div>
          {current.is_video && (
            <button onClick={() => setMuted(m => !m)} className="p-1.5 text-white">
              {muted ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
            </button>
          )}
          {isOwner && (
            <>
              <button onClick={removeStory} className="p-1.5 text-zinc-400 hover:text-red-400 transition" title="Remove this story">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
              <button onClick={deleteHighlight} className="p-1.5 text-red-400 hover:text-red-300 transition" title="Delete highlight">
                <AiOutlineDelete size={20} />
              </button>
            </>
          )}
          <button onClick={() => router.replace("/profile")} className="p-1.5 text-white">
            <AiOutlineClose size={20} />
          </button>
        </div>

        {/* Media */}
        {current.is_video ? (
          <video ref={videoRef} src={current.media_url} className="w-full h-full object-cover" playsInline muted={muted} />
        ) : (
          <Image src={isCloudinary(current.media_url) ? current.media_url : ikUrl(current.media_url, { w: 480, h: 854, q: 90 })} alt="highlight" fill className="object-cover" unoptimized={isCloudinary(current.media_url)} priority />
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={goPrev} />
          <div className="flex-1 cursor-pointer" onClick={goNext} />
        </div>
      </div>
    </div>
  );
}
