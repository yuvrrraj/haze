"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Reel, Comment } from "@/types";
import { ikUrl } from "@/lib/imagekit";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineShareAlt, AiOutlineEllipsis, AiOutlineSend } from "react-icons/ai";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import ShareSheet, { SharePayload } from "@/components/ui/ShareSheet";
import { useRouter } from "next/navigation";

export default function ReelCard({ reel, initialLiked = false, initialSaved = false }: { reel: Reel; initialLiked?: boolean; initialSaved?: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showThumb, setShowThumb] = useState(true);
  const [showIcon, setShowIcon] = useState(false);
  const isSponsored = (reel as any).is_sponsored === true;
  const reelIdRef = useRef(reel.id);

  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsCount, setCommentsCount] = useState((reel as any).comments_count ?? 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [viewsCount, setViewsCount] = useState(0);
  const viewedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicUrl: string | null = (reel as any).music_preview_url ?? null;

  // Init music — don't autoplay, wait for user to unmute
  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = 0.7;
    audio.muted = true;
    musicRef.current = audio;
    return () => { audio.pause(); audio.src = ""; musicRef.current = null; };
  }, [musicUrl]);

  // Sync music mute/play with video state
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (playing && !muted) audio.play().catch(() => {});
    else audio.pause();
  }, [muted, playing]);

  // Listen for global stop-other-reels event
  useEffect(() => {
    function handleStopOthers(e: Event) {
      const id = (e as CustomEvent).detail?.id;
      if (id !== reelIdRef.current) {
        // Stop this reel
        const video = videoRef.current;
        if (video && !video.paused) { video.pause(); }
        musicRef.current?.pause();
        setPlaying(false);
      }
    }
    window.addEventListener("reel-playing", handleStopOthers);
    return () => window.removeEventListener("reel-playing", handleStopOthers);
  }, []);

  useEffect(() => {
    // Fetch real view count on mount
    supabase.from("reel_views").select("reel_id", { count: "exact", head: true }).eq("reel_id", reel.id)
      .then(({ count }) => { if (count !== null) setViewsCount(count); });

    try {
      const raw = sessionStorage.getItem("openComments");
      if (raw) {
        const { type, id } = JSON.parse(raw);
        if (type === "reel" && id === reel.id) {
          sessionStorage.removeItem("openComments");
          setShowComments(true);
          loadComments();
        }
      }
    } catch {}
    getCurrentUser().then((user) => {
      if (user) setCurrentUserId(user.id);
    }).catch(() => {});
  }, [reel.id]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (!playing) {
      // Stop all other reels first
      window.dispatchEvent(new CustomEvent("reel-playing", { detail: { id: reelIdRef.current } }));
      if (video.readyState >= 3) {
        video.play().catch(() => {});
      } else {
        const onCanPlay = () => { video.play().catch(() => {}); video.removeEventListener("canplay", onCanPlay); };
        video.addEventListener("canplay", onCanPlay);
        video.load();
      }
    } else {
      video.pause();
      musicRef.current?.pause();
    }
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 700);
  }

  async function toggleLike() {
    if (!currentUserId) return toast.error("Login to like");
    if (liked) {
      await supabase.from("reel_likes").delete().eq("user_id", currentUserId).eq("reel_id", reel.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      const { error } = await supabase.from("reel_likes").upsert(
        { user_id: currentUserId, reel_id: reel.id },
        { onConflict: "user_id,reel_id", ignoreDuplicates: true }
      );
      if (!error) { setLiked(true); setLikesCount((c) => c + 1); }
    }
  }

  async function toggleSave() {
    if (!currentUserId) return toast.error("Login to save");
    if (saved) {
      await supabase.from("saved_posts").delete().eq("user_id", currentUserId).eq("reel_id", reel.id);
      setSaved(false);
    } else {
      await supabase.from("saved_posts").insert({ user_id: currentUserId, reel_id: reel.id });
      setSaved(true);
      toast.success("Reel saved!");
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, reel_id, user:profiles!comments_user_id_fkey(username, avatar_url)")
      .eq("reel_id", reel.id)
      .order("created_at", { ascending: true });
    const normalized = (data ?? []).map((c: any) => ({
      ...c,
      user: Array.isArray(c.user) ? c.user[0] ?? null : c.user,
    }));
    setComments(normalized as Comment[]);
  }

  function toggleComments() {
    if (!showComments) loadComments();
    setShowComments((s) => !s);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUserId) return toast.error("Login to comment");
    const content = commentText.trim();
    setCommentText("");
    const { data, error } = await supabase.from("comments").insert({
      user_id: currentUserId,
      reel_id: reel.id,
      content,
    }).select("id, content, created_at, user_id, reel_id, user:profiles!comments_user_id_fkey(username, avatar_url)").single();
    if (error) { setCommentText(content); return toast.error(error.message); }
    const newComment = { ...data, user: Array.isArray(data.user) ? data.user[0] ?? null : data.user };
    setComments((prev) => [...prev, newComment as Comment]);
    setCommentsCount((c) => c + 1);
  }

  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);

  async function shareToStory(): Promise<void> {
    if (!currentUserId) { toast.error("Login first"); return; }
    const toastId = toast.loading("Sharing to story...");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("stories").insert({
      user_id: currentUserId,
      video_url: reel.video_url,
      thumbnail_url: reel.thumbnail_url,
      expires_at: expires,
    });
    if (error) toast.error("Failed to share", { id: toastId });
    else toast.success("Shared to your story!", { id: toastId });
  }

  return (
    <article className="border-b border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.push(`/profile/${reel.user_id}`)} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
            {reel.user?.avatar_url ? (
              <Image src={ikUrl(reel.user.avatar_url, { w: 72, h: 72 })} alt={reel.user.username} width={36} height={36} className="object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                {reel.user?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm leading-tight">{reel.user?.username}</span>
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">Reel</span>
            </div>
            {isSponsored && <span className="text-xs text-yellow-400 font-semibold leading-tight">💰 Sponsored</span>}
            {musicUrl && (
              <div className="flex items-center gap-1" style={{ maxWidth: 160 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ display: "flex", animation: "marquee 8s linear infinite", whiteSpace: "nowrap" }}>
                    <span className="text-xs text-zinc-400" style={{ paddingRight: 32 }}>
                      {(reel as any).music_name ?? ""}{(reel as any).music_artist ? ` · ${(reel as any).music_artist}` : ""}
                    </span>
                    <span className="text-xs text-zinc-400" style={{ paddingRight: 32 }}>
                      {(reel as any).music_name ?? ""}{(reel as any).music_artist ? ` · ${(reel as any).music_artist}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </button>
        <div className="relative flex items-center gap-1 shrink-0">
          <button onClick={() => setShowMenu((v) => !v)} className="text-zinc-400 hover:text-white transition p-1">
            <AiOutlineEllipsis size={22} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { toggleSave(); setShowMenu(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-zinc-700 transition ${saved ? "text-purple-400" : "text-white"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{saved ? "Unsave" : "Save"}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline video player */}
      <div className="flex justify-center px-4 pb-1">
        <div
          className="relative w-full max-w-[320px] rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 cursor-pointer"
          style={{ aspectRatio: "9/16" }}
          onClick={togglePlay}
        >
          {showThumb && reel.thumbnail_url && (
            <Image src={reel.thumbnail_url} alt={reel.caption ?? "reel"} fill className="object-cover" sizes="320px" unoptimized loading="eager" />
          )}
          <video
            ref={videoRef}
            src={reel.video_url}
            className="absolute inset-0 w-full h-full object-cover"
            loop muted={muted} playsInline preload="metadata"
            onPlaying={() => {
              setPlaying(true); setShowThumb(false);
              if (!viewedRef.current) {
                viewedRef.current = true;
                getCurrentUser().then((user) => {
                  supabase.from("reel_views").insert({ reel_id: reel.id, viewer_id: user?.id ?? null }).then(() => {
                    setViewsCount((c: number) => c + 1);
                  });
                });
              }
            }}
            onPause={() => setPlaying(false)}
          />
          {showIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="p-4 bg-black/50 rounded-full">
                {playing ? <BsFillPauseFill size={40} className="text-white" /> : <BsFillPlayFill size={40} className="text-white" />}
              </div>
            </div>
          )}
          {!playing && !showIcon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <div className="p-4 bg-black/40 rounded-full">
                <BsFillPlayFill size={40} className="text-white" />
              </div>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full text-white z-10"
          >
            {muted ? <HiVolumeOff size={18} /> : <HiVolumeUp size={18} />}
          </button>
          <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-0.5 rounded text-xs text-white pointer-events-none">Reel</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={toggleLike} className={`flex items-center gap-1 transition ${liked ? "text-red-500" : "text-zinc-300 hover:text-red-400"}`}>
          {liked ? <AiFillHeart size={24} /> : <AiOutlineHeart size={24} />}
          <span className="text-sm">{likesCount}</span>
        </button>
        <button onClick={toggleComments} className={`flex items-center gap-1 transition ${showComments ? "text-purple-400" : "text-zinc-300 hover:text-white"}`}>
          <AiOutlineComment size={24} />
          <span className="text-sm">{commentsCount}</span>
        </button>
        <div className="flex items-center gap-1 text-zinc-500 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{viewsCount}</span>
        </div>
        <button onClick={() => setShowShare(true)} className="ml-auto text-zinc-300 hover:text-white transition">
          <AiOutlineShareAlt size={24} />
        </button>
      </div>

      {reel.caption && (
        <p className="px-4 pb-2 text-sm text-zinc-200">
          <span className="font-semibold mr-1">{reel.user?.username}</span>
          {reel.caption}
        </p>
      )}

      {showShare && (
        <ShareSheet
          payload={{
            type: "reel",
            id: reel.id,
            thumbnail: reel.thumbnail_url,
            videoUrl: reel.video_url,
            caption: reel.caption ?? "",
            username: reel.user?.username ?? "",
          } satisfies SharePayload}
          onStory={shareToStory}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                {c.user?.avatar_url ? (
                  <Image src={ikUrl(c.user.avatar_url, { w: 56, h: 56 })} alt={c.user.username ?? ""} width={28} height={28} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-bold">
                    {c.user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-zinc-200 text-xs">{c.user?.username}</span>
                <span className="text-zinc-400 text-sm">{c.content}</span>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-zinc-600 text-xs">No comments yet</p>}
          <form onSubmit={submitComment} className="flex gap-2 mt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-1.5 rounded-full bg-zinc-800 text-white text-sm outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button type="submit" className="p-1.5 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition">
              <AiOutlineSend size={16} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
