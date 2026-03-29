"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Post, Comment } from "@/types";
import { ikUrl, ikLqip } from "@/lib/imagekit";
import { registerAudio, unregisterAudio } from "@/lib/audioManager";
import { useIntersection } from "@/hooks/useIntersection";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineShareAlt, AiOutlineEllipsis, AiOutlineSend } from "react-icons/ai";
import ShareSheet, { SharePayload } from "@/components/ui/ShareSheet";
import { useRouter } from "next/navigation";

export default function PostCard({ post, index = 99, initialLiked = false, initialSaved = false }: { post: Post; index?: number; initialLiked?: boolean; initialSaved?: boolean }) {
  const router = useRouter();
  const { ref, isVisible: intersected } = useIntersection();
  const isVisible = index < 2 || intersected;
  const imgSrc = ikUrl(post.image_url);
  const lqip = ikLqip(post.image_url);
  const isSponsored = (post as any).is_sponsored === true;

  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);
  const [viewsCount, setViewsCount] = useState(0);
  const viewedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ytMusicRef = useRef<any>(null);
  const [musicMuted, setMusicMuted] = useState(true);
  const musicUrl: string | null = (post as any).music_preview_url ?? null;
  const musicName: string | null = (post as any).music_name ?? null;
  const musicYoutubeId: string | null = (post as any).music_youtube_id ?? null;
  const musicStartOffset: number = (post as any).music_start_offset ?? 0;
  const musicDuration: number = (post as any).music_duration_ms ? (post as any).music_duration_ms / 1000 : 30;
  // Init iTunes audio
  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = 0.7;
    audio.muted = true;
    if (musicStartOffset > 0) audio.currentTime = musicStartOffset;
    musicRef.current = audio;
    return () => { audio.pause(); audio.src = ""; musicRef.current = null; };
  }, [musicUrl, musicStartOffset]);

  // Init YouTube audio via iframe embed (works in Capacitor WebView)
  useEffect(() => {
    if (!musicYoutubeId) return;
    const containerId = `yt-post-${post.id}`;
    const timer = setTimeout(() => {
      const el = document.getElementById(containerId);
      if (!el || ytMusicRef.current) return;
      const iframe = document.createElement("iframe");
      iframe.width = "1";
      iframe.height = "1";
      iframe.style.cssText = "position:absolute;opacity:0;pointer-events:none;";
      iframe.allow = "autoplay";
      iframe.src = `https://www.youtube.com/embed/${musicYoutubeId}?autoplay=0&controls=0&start=${Math.floor(musicStartOffset)}&enablejsapi=0`;
      el.appendChild(iframe);
      ytMusicRef.current = iframe;
    }, 100);
    return () => {
      clearTimeout(timer);
      if (ytLoopTimer.current) clearInterval(ytLoopTimer.current);
      try { ytMusicRef.current?.remove?.(); } catch {}
      ytMusicRef.current = null;
    };
  }, [musicYoutubeId, musicStartOffset, post.id]);

  // Pause when scrolls out of view
  useEffect(() => {
    if (!isVisible) {
      musicRef.current?.pause();
      const iframe = ytMusicRef.current as HTMLIFrameElement | null;
      if (iframe) iframe.src = `https://www.youtube.com/embed/${musicYoutubeId}?autoplay=0&controls=0&start=${Math.floor(musicStartOffset)}&enablejsapi=0`;
      if (!musicMuted) setMusicMuted(true);
    }
  }, [isVisible]);

  const stopAudioRef = useRef<(() => void) | null>(null);

  function stopYT() {
    const iframe = ytMusicRef.current as HTMLIFrameElement | null;
    if (iframe && musicYoutubeId) iframe.src = `https://www.youtube.com/embed/${musicYoutubeId}?autoplay=0&controls=0&start=${Math.floor(musicStartOffset)}&enablejsapi=0`;
  }

  function playYT() {
    const iframe = ytMusicRef.current as HTMLIFrameElement | null;
    if (iframe && musicYoutubeId) iframe.src = `https://www.youtube.com/embed/${musicYoutubeId}?autoplay=1&controls=0&start=${Math.floor(musicStartOffset)}&enablejsapi=0&mute=0`;
  }

  function toggleMusicMute() {
    const newMuted = !musicMuted;
    setMusicMuted(newMuted);

    if (!newMuted) {
      function stopThis() {
        const audio = musicRef.current;
        if (audio) { audio.muted = true; audio.pause(); }
        stopYT();
        setMusicMuted(true);
        stopAudioRef.current = null;
      }
      stopAudioRef.current = stopThis;
      registerAudio(stopThis);
      const audio = musicRef.current;
      if (audio) { audio.muted = false; audio.play().catch(() => {}); }
      playYT();
    } else {
      if (stopAudioRef.current) { unregisterAudio(stopAudioRef.current); stopAudioRef.current = null; }
      const audio = musicRef.current;
      if (audio) { audio.muted = true; audio.pause(); }
      stopYT();
    }
  }

  useEffect(() => {
    supabase.from("post_views").select("post_id", { count: "exact", head: true }).eq("post_id", post.id)
      .then(({ count }) => { if (count !== null) setViewsCount(count); });
    try {
      const raw = sessionStorage.getItem("openComments");
      if (raw) {
        const { type, id } = JSON.parse(raw);
        if (type === "post" && id === post.id) {
          sessionStorage.removeItem("openComments");
          setShowComments(true);
        }
      }
    } catch {}
    getCurrentUser().then((user) => {
      if (user) setCurrentUserId(user.id);
    }).catch(() => {});
  }, [post.id]);

  // Record view when post becomes visible
  useEffect(() => {
    if (!isVisible || viewedRef.current) return;
    viewedRef.current = true;
    getCurrentUser().then((user) => {
      supabase.from("post_views").insert({ post_id: post.id, viewer_id: user?.id ?? null }).then(() => {
        setViewsCount((c: number) => c + 1);
      });
    });
  }, [isVisible]);

  async function toggleLike() {
    if (!currentUserId) return toast.error("Login to like");
    if (liked) {
      await supabase.from("likes").delete().eq("user_id", currentUserId).eq("post_id", post.id);
      setLiked(false);
      setLikesCount((c) => c - 1);
    } else {
      const { error } = await supabase.from("likes").upsert(
        { user_id: currentUserId, post_id: post.id },
        { onConflict: "user_id,post_id", ignoreDuplicates: true }
      );
      if (!error) { setLiked(true); setLikesCount((c) => c + 1); }
    }
  }

  async function toggleSave() {
    if (!currentUserId) return toast.error("Login to save");
    if (saved) {
      await supabase.from("saved_posts").delete().eq("user_id", currentUserId).eq("post_id", post.id);
      setSaved(false);
    } else {
      await supabase.from("saved_posts").insert({ user_id: currentUserId, post_id: post.id });
      setSaved(true);
      toast.success("Post saved!");
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, post_id, user:profiles!comments_user_id_fkey(username, avatar_url)")
      .eq("post_id", post.id)
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
      post_id: post.id,
      content,
    }).select("id, content, created_at, user_id, post_id, user:profiles!comments_user_id_fkey(username, avatar_url)").single();
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
      image_url: post.image_url,
      thumbnail_url: post.image_url,
      expires_at: expires,
    });
    if (error) toast.error("Failed to share", { id: toastId });
    else toast.success("Shared to your story!", { id: toastId });
  }

  return (
    <article id={`post-${post.id}`} ref={ref} className="border-b border-zinc-800">
      {/* Hidden YouTube audio player */}
      {musicYoutubeId && <div id={`yt-post-${post.id}`} style={{ position: "fixed", bottom: 0, right: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -1 }} />}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.push(`/profile/${post.user_id}`)} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 shrink-0">
            {post.user?.avatar_url ? (
              <Image src={ikUrl(post.user.avatar_url, { w: 72, h: 72 })} alt={post.user.username} width={36} height={36} className="object-cover" loading="eager" priority={index < 2} />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                {post.user?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-semibold text-sm leading-tight truncate">{post.user?.username}</span>
            {isSponsored && <span className="text-xs text-yellow-400 font-semibold leading-tight">💰 Sponsored</span>}
          </div>
        </button>
        <div className="relative flex items-center gap-1 shrink-0">
          {musicName && (
            <button onClick={toggleMusicMute} className="p-1.5 text-zinc-400 hover:text-white transition">
              {musicMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
          )}
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

      {/* Music strip — shown below header, above image */}
      {musicName && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <div className="overflow-hidden flex-1">
            <div style={{ display: "flex", animation: "marquee 8s linear infinite", whiteSpace: "nowrap" }}>
              <span className="text-xs text-zinc-400" style={{ paddingRight: 32 }}>
                {(post as any).music_name ?? ""}{(post as any).music_artist ? ` · ${(post as any).music_artist}` : ""}
              </span>
              <span className="text-xs text-zinc-400" style={{ paddingRight: 32 }}>
                {(post as any).music_name ?? ""}{(post as any).music_artist ? ` · ${(post as any).music_artist}` : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square bg-zinc-900">
        {isVisible ? (
          <Image src={imgSrc} alt={post.caption ?? "post"} fill className="object-cover" placeholder="blur" blurDataURL={lqip} sizes="100vw" unoptimized loading="eager" />
        ) : (
          <div className="w-full h-full bg-zinc-800 animate-pulse" />
        )}
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

      {post.caption && (
        <p className="px-4 pb-2 text-sm text-zinc-200">
          <span className="font-semibold mr-1">{post.user?.username}</span>
          {post.caption}
        </p>
      )}

      {showShare && (
        <ShareSheet
          payload={{
            type: "post",
            id: post.id,
            thumbnail: ikUrl(post.image_url, { w: 400, h: 400, q: 80 }),
            caption: post.caption ?? "",
            username: post.user?.username ?? "",
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

          {/* Comment input */}
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
