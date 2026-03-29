"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Reel, Comment } from "@/types";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineShareAlt, AiOutlineClose, AiOutlineSend, AiOutlineArrowLeft } from "react-icons/ai";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { BiRepost } from "react-icons/bi";
import ShareSheet, { SharePayload } from "@/components/ui/ShareSheet";
import toast from "react-hot-toast";

export default function ReelPlayer({ reel, preload }: { reel: Reel; preload?: boolean }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showThumb, setShowThumb] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [commentsCount, setCommentsCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const viewedRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [showRepostSheet, setShowRepostSheet] = useState(false);

  const EMOJIS = ["🔥", "💯", "😍", "🤩", "👏", "💀", "😂", "❤️", "🎉", "⚡"];

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) return;
      setCurrentUserId(user.id);
      Promise.all([
        supabase.from("reel_likes").select("id").eq("user_id", user.id).eq("reel_id", reel.id).maybeSingle(),
        supabase.from("reel_likes").select("id", { count: "exact", head: true }).eq("reel_id", reel.id),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("reel_id", reel.id),
        supabase.from("reel_reposts").select("id").eq("user_id", user.id).eq("reel_id", reel.id).maybeSingle(),
        supabase.from("reel_reposts").select("id", { count: "exact", head: true }).eq("reel_id", reel.id),
        supabase.from("reel_views").select("reel_id", { count: "exact", head: true }).eq("reel_id", reel.id),
      ]).then(([{ data: like }, { count: lc }, { count: cc }, { data: repost }, { count: rc }, { count: vc }]) => {
        setLiked(!!like);
        if (lc !== null) setLikesCount(lc);
        if (cc !== null) setCommentsCount(cc);
        setReposted(!!repost);
        if (rc !== null) setRepostCount(rc);
        if (vc !== null) setViewsCount(vc);
      });
    });
  }, [reel.id]);

  // Intersection observer — auto play/pause
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (video.readyState >= 3) { video.play().catch(() => {}); }
        else {
          const onCanPlay = () => { video.play().catch(() => {}); video.removeEventListener("canplay", onCanPlay); };
          video.addEventListener("canplay", onCanPlay);
        }
      } else {
        video.pause();
        setPlaying(false);
      }
    }, { threshold: 0.5 });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play().catch(() => {}); } else { video.pause(); }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 700);
  }

  async function toggleLike() {
    if (!currentUserId) return;
    if (liked) {
      await supabase.from("reel_likes").delete().eq("user_id", currentUserId).eq("reel_id", reel.id);
      setLiked(false); setLikesCount((c) => c - 1);
    } else {
      await supabase.from("reel_likes").upsert(
        { user_id: currentUserId, reel_id: reel.id },
        { onConflict: "user_id,reel_id", ignoreDuplicates: true }
      );
      setLiked(true); setLikesCount((c) => c + 1);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, user:profiles(username, avatar_url)")
      .eq("reel_id", reel.id)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    await supabase.from("comments").insert({ user_id: currentUserId, reel_id: reel.id, content: commentText.trim() });
    setCommentText("");
    setCommentsCount((c) => c + 1);
    loadComments();
  }

  async function handleRepost(emoji: string | null) {
    if (!currentUserId) return;
    setShowRepostSheet(false);
    if (reposted) {
      await supabase.from("reel_reposts").delete().eq("user_id", currentUserId).eq("reel_id", reel.id);
      setReposted(false);
      setRepostCount((c) => c - 1);
      toast("Repost removed");
    } else {
      await supabase.from("reel_reposts").upsert(
        { user_id: currentUserId, reel_id: reel.id, emoji },
        { onConflict: "user_id,reel_id", ignoreDuplicates: true }
      );
      setReposted(true);
      setRepostCount((c) => c + 1);
      toast.success(emoji ? `Reposted with ${emoji}` : "Reposted!");
    }
  }

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
    if (error) toast.error("Failed", { id: toastId });
    else toast.success("Shared to your story!", { id: toastId });
  }

  const sharePayload: SharePayload = {
    type: "reel",
    id: reel.id,
    thumbnail: reel.thumbnail_url,
    videoUrl: reel.video_url,
    caption: reel.caption ?? "",
    username: reel.user?.username ?? "",
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full snap-start bg-black overflow-hidden cursor-pointer"
      onClick={togglePlay}
    >
      {/* Thumbnail */}
      {showThumb && reel.thumbnail_url && (
        <Image src={reel.thumbnail_url} alt="thumbnail" fill className="object-cover" priority={preload} unoptimized sizes="100vw" />
      )}

      <video
        ref={videoRef}
        src={reel.video_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop muted playsInline
        preload={preload ? "auto" : "metadata"}
        onPlaying={() => {
          setPlaying(true); setShowThumb(false);
          if (!viewedRef.current) {
            viewedRef.current = true;
            getCurrentUser().then((user) => {
              supabase.from("reel_views").insert({ reel_id: reel.id, viewer_id: user?.id ?? null })
                .then(() => setViewsCount((c) => c + 1));
            });
          }
        }}
        onPause={() => setPlaying(false)}
      />

      {/* Play/pause flash */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-4 bg-black/50 rounded-full">
            {playing ? <BsFillPauseFill size={44} className="text-white" /> : <BsFillPlayFill size={44} className="text-white" />}
          </div>
        </div>
      )}

      {/* Back arrow — top left */}
      <button
        onClick={(e) => { e.stopPropagation(); router.push("/feed"); }}
        className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white z-30"
      >
        <AiOutlineArrowLeft size={22} />
      </button>

      {/* Volume — top right */}
      <button
        onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white z-30"
      >
        {muted ? <HiVolumeOff size={22} /> : <HiVolumeUp size={22} />}
      </button>

      {/* Bottom-left: avatar + user + caption — clickable to profile */}
      <div className="absolute bottom-8 left-4 right-20 z-20">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/profile/${reel.user_id}`); }}
          className="flex items-center gap-2 mb-1"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 border border-white/30 shrink-0">
            {reel.user?.avatar_url ? (
              <Image src={ikUrl(reel.user.avatar_url, { w: 64, h: 64 })} alt={reel.user.username} width={32} height={32} className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-300">
                {reel.user?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white font-bold text-sm drop-shadow">@{reel.user?.username}</span>
        </button>
        {reel.caption && <p className="text-white/90 text-sm drop-shadow pl-10">{reel.caption}</p>}
      </div>

      {/* Right side actions */}
      <div
        className="absolute right-3 bottom-10 flex flex-col items-center gap-6 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          {liked
            ? <AiFillHeart size={30} className="text-red-500 drop-shadow" />
            : <AiOutlineHeart size={30} className="text-white drop-shadow" />}
          <span className="text-white text-xs drop-shadow">{likesCount}</span>
        </button>

        {/* Comment */}
        <button onClick={() => { loadComments(); setShowComments(true); }} className="flex flex-col items-center gap-1">
          <AiOutlineComment size={30} className="text-white drop-shadow" />
          <span className="text-white text-xs drop-shadow">{commentsCount}</span>
        </button>

        {/* Share */}
        <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1">
          <AiOutlineShareAlt size={28} className="text-white drop-shadow" />
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          <span className="text-white text-xs drop-shadow">{viewsCount >= 1000 ? (viewsCount / 1000).toFixed(1) + "K" : viewsCount}</span>
        </div>

        {/* Repost */}
        <button
          onClick={() => reposted ? handleRepost(null) : setShowRepostSheet(true)}
          className="flex flex-col items-center gap-1"
        >
          <BiRepost size={32} className={reposted ? "text-green-400 drop-shadow" : "text-white drop-shadow"} />
          <span className="text-white text-xs drop-shadow">{repostCount > 0 ? repostCount : ""}</span>
        </button>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setShowComments(false)}>
          <div
            className="w-full bg-zinc-950 rounded-t-2xl flex flex-col"
            style={{ height: "60vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
              <span className="text-white font-semibold">Comments</span>
              <button onClick={() => setShowComments(false)}><AiOutlineClose size={20} className="text-zinc-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {comments.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">No comments yet</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                    {c.user?.avatar_url
                      ? <Image src={ikUrl(c.user.avatar_url, { w: 56, h: 56 })} alt={c.user.username ?? ""} width={28} height={28} className="object-cover" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{c.user?.username?.[0]?.toUpperCase()}</div>
                    }
                  </div>
                  <div>
                    <span className="text-zinc-200 text-xs font-semibold">{c.user?.username}</span>
                    <p className="text-zinc-400 text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex gap-2 px-4 py-3 border-t border-zinc-800 shrink-0">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 rounded-full bg-zinc-800 text-white text-sm outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button type="submit" className="p-2 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition">
                <AiOutlineSend size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Repost emoji sheet */}
      {showRepostSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowRepostSheet(false)}>
          <div
            className="w-full bg-zinc-950 rounded-t-2xl px-4 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-sm mb-4 text-center">Repost with an emoji</p>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => handleRepost(em)}
                  className="text-3xl flex items-center justify-center h-14 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition"
                >
                  {em}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleRepost(null)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition"
            >
              Repost without emoji
            </button>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {showShare && (
        <ShareSheet
          payload={sharePayload}
          onStory={shareToStory}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
