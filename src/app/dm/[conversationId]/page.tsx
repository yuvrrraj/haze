"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineArrowLeft, AiOutlineSend, AiOutlineHeart, AiFillHeart, AiOutlineComment, AiOutlineShareAlt, AiOutlineClose } from "react-icons/ai";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { HiVolumeUp, HiVolumeOff } from "react-icons/hi";
import ShareSheet, { SharePayload } from "@/components/ui/ShareSheet";
import { VoiceRecorder, VoicePlayer, MicButton } from "@/components/chat/VoiceMessage";
import MediaButton from "@/components/chat/MediaButton";
import ImageViewer from "@/components/chat/ImageViewer";
import toast from "react-hot-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  seen: boolean;
  created_at: string;
}
interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  show_activity?: boolean;
  last_active?: string | null;
}
interface ShareData {
  type: "post" | "reel";
  id: string;
  thumbnail: string;
  videoUrl?: string;
  caption: string;
  username: string;
  userMessage?: string;
}
interface CommentRow {
  id: string;
  content: string;
  user: { username: string; avatar_url: string | null } | null;
}

function parseShare(content: string): ShareData | null {
  if (!content.startsWith("__SHARE__:")) return null;
  try { return JSON.parse(content.slice(10)); } catch { return null; }
}

// ─── Full Instagram-style reel/post viewer ───────────────────────────────────
function MediaViewer({ share, onClose }: { share: ShareData; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const isReel = share.type === "reel";
  const table = isReel ? "reel_likes" : "likes";
  const idCol = isReel ? "reel_id" : "post_id";

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) return;
      setCurrentUserId(user.id);
      Promise.all([
        supabase.from(table).select("id").eq("user_id", user.id).eq(idCol, share.id).maybeSingle(),
        supabase.from(table).select("id", { count: "exact", head: true }).eq(idCol, share.id),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq(idCol, share.id),
      ]).then(([{ data: like }, { count: lc }, { count: cc }]) => {
        setLiked(!!like);
        if (lc !== null) setLikesCount(lc);
        if (cc !== null) setCommentsCount(cc);
      });
    });
    if (isReel && share.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [share.id]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.play().catch(() => {}); }
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 700);
  }

  async function toggleLike() {
    if (!currentUserId) return;
    if (liked) {
      await supabase.from(table).delete().eq("user_id", currentUserId).eq(idCol, share.id);
      setLiked(false); setLikesCount((c) => c - 1);
    } else {
      await supabase.from(table).upsert(
        { user_id: currentUserId, [idCol]: share.id },
        { onConflict: `user_id,${idCol}`, ignoreDuplicates: true }
      );
      setLiked(true); setLikesCount((c) => c + 1);
    }
  }

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, user:profiles(username, avatar_url)")
      .eq(idCol, share.id)
      .order("created_at", { ascending: true });
    setComments((data ?? []).map((c) => ({ ...c, user: Array.isArray(c.user) ? c.user[0] ?? null : c.user })) as CommentRow[]);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    await supabase.from("comments").insert({ user_id: currentUserId, [idCol]: share.id, content: commentText.trim() });
    setCommentText("");
    setCommentsCount((c) => c + 1);
    loadComments();
  }

  async function shareToStory(): Promise<void> {
    if (!currentUserId) { toast.error("Login first"); return; }
    const toastId = toast.loading("Sharing to story...");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("stories").insert({
      user_id: currentUserId,
      ...(isReel ? { video_url: share.videoUrl, thumbnail_url: share.thumbnail } : { image_url: share.thumbnail, thumbnail_url: share.thumbnail }),
      expires_at: expires,
    });
    if (error) toast.error("Failed", { id: toastId });
    else toast.success("Added to your story!", { id: toastId });
  }

  const sharePayload: SharePayload = {
    type: share.type,
    id: share.id,
    thumbnail: share.thumbnail,
    videoUrl: share.videoUrl,
    caption: share.caption,
    username: share.username,
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {isReel ? (
        // ── REEL: full-screen vertical video like Instagram Reels ──
        <div className="relative w-full h-full" onClick={togglePlay}>
          {/* Video */}
          <video
            ref={videoRef}
            src={share.videoUrl}
            className="w-full h-full object-cover"
            loop muted={muted} playsInline
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />

          {/* Play/pause flash */}
          {showIcon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="p-5 bg-black/50 rounded-full">
                {playing ? <BsFillPauseFill size={48} className="text-white" /> : <BsFillPlayFill size={48} className="text-white" />}
              </div>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white z-20"
          >
            <AiOutlineArrowLeft size={20} />
          </button>

          {/* Volume */}
          <button
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); if (videoRef.current) videoRef.current.muted = !muted; }}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white z-20"
          >
            {muted ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
          </button>

          {/* Bottom-left: user + caption */}
          <div className="absolute bottom-6 left-4 right-20 z-20 pointer-events-none">
            <p className="text-white font-bold text-sm">@{share.username}</p>
            {share.caption && <p className="text-white/90 text-sm mt-1">{share.caption}</p>}
            {share.userMessage && <p className="text-white/70 text-xs mt-1 italic">"{share.userMessage}"</p>}
          </div>

          {/* Right side actions */}
          <div className="absolute right-3 bottom-8 flex flex-col items-center gap-6 z-20" onClick={(e) => e.stopPropagation()}>
            {/* Like */}
            <button onClick={toggleLike} className="flex flex-col items-center gap-1">
              {liked
                ? <AiFillHeart size={30} className="text-red-500" />
                : <AiOutlineHeart size={30} className="text-white" />}
              <span className="text-white text-xs">{likesCount}</span>
            </button>
            {/* Comment */}
            <button onClick={() => { loadComments(); setShowComments(true); }} className="flex flex-col items-center gap-1">
              <AiOutlineComment size={30} className="text-white" />
              <span className="text-white text-xs">{commentsCount}</span>
            </button>
            {/* Share */}
            <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1">
              <AiOutlineShareAlt size={28} className="text-white" />
            </button>
          </div>
        </div>
      ) : (
        // ── POST: full-screen image with actions ──
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 px-4 py-3 bg-black shrink-0">
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-800 transition text-white">
              <AiOutlineArrowLeft size={20} />
            </button>
            <p className="text-white font-semibold text-sm flex-1">@{share.username}</p>
          </div>
          <div className="relative flex-1 bg-black">
            <Image src={share.thumbnail} alt={share.caption} fill className="object-contain" unoptimized />
          </div>
          {/* Actions bar */}
          <div className="flex items-center gap-5 px-4 py-3 bg-zinc-950 shrink-0">
            <button onClick={toggleLike} className={`flex items-center gap-1.5 ${liked ? "text-red-500" : "text-white"}`}>
              {liked ? <AiFillHeart size={26} /> : <AiOutlineHeart size={26} />}
              <span className="text-sm">{likesCount}</span>
            </button>
            <button onClick={() => { loadComments(); setShowComments(true); }} className="flex items-center gap-1.5 text-white">
              <AiOutlineComment size={26} />
              <span className="text-sm">{commentsCount}</span>
            </button>
            <button onClick={() => setShowShare(true)} className="ml-auto text-white">
              <AiOutlineShareAlt size={26} />
            </button>
          </div>
          {share.caption && <p className="px-4 pb-3 text-sm text-zinc-200 bg-zinc-950"><span className="font-semibold mr-1">@{share.username}</span>{share.caption}</p>}
          {share.userMessage && <p className="px-4 pb-3 text-xs text-zinc-400 bg-zinc-950 italic">"{share.userMessage}"</p>}
        </div>
      )}

      {/* Comments drawer */}
      {showComments && (
        <div className="fixed inset-0 z-[70] flex items-end" onClick={() => setShowComments(false)}>
          <div className="w-full bg-zinc-950 rounded-t-2xl flex flex-col" style={{ height: "60vh" }} onClick={(e) => e.stopPropagation()}>
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

async function chatApi(action: string, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) {
      console.error(`[chatApi] ${action} failed: ${res.status}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error(`[chatApi] ${action} error:`, err);
    return null;
  }
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [activeShare, setActiveShare] = useState<ShareData | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [disappearing, setDisappearing] = useState(false);
  const [togglingDisappearing, setTogglingDisappearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const disappearingRef = useRef(false);
  const sessionTokenRef = useRef<string | null>(null);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    init();
    return () => {
      if (disappearingRef.current && sessionTokenRef.current) {
        fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            action: "clear_disappearing_messages",
            payload: { conversationId },
          }),
          keepalive: true,
        });
      }
    };
  }, [conversationId]);

  async function init() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: { session } } = await supabase.auth.getSession();
    sessionTokenRef.current = session?.access_token ?? null;

    // Phase 1 — load conversation/profile so header shows immediately
    const convData = await chatApi("get_conversation", { conversationId });

    const conv = convData?.data?.conversations_by_pk;
    if (conv) {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const isUser1 = conv.user1_id === user.id;
      disappearingRef.current = false;
      if (isUser1 ? conv.disappearing_user1 : conv.disappearing_user2) {
        chatApi("toggle_disappearing", { conversationId, enable: false });
      }

      const [{ data: p }, { data: iBlocked }, { data: theyBlocked }, { data: myP }] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url, show_activity, last_active").eq("id", otherId).maybeSingle(),
        supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_id", otherId).maybeSingle(),
        supabase.from("blocked_users").select("id").eq("blocker_id", otherId).eq("blocked_id", user.id).maybeSingle(),
        supabase.from("profiles").select("id, username, avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      if (p) setOtherProfile(p);
      if (myP) setMyProfile(myP);
      setIsBlocked(!!iBlocked);
      setBlockedByOther(!!theyBlocked);
      supabase.from("profiles").update({ last_active: new Date().toISOString() }).eq("id", user.id).then(() => {});
    }

    // Show header/input immediately
    setLoading(false);

    // Phase 2 — load messages separately so they appear as soon as ready
    const msgData = await chatApi("get_messages", { conversationId });
    const msgs: Message[] = msgData?.data?.messages ?? [];
    lastMsgCountRef.current = msgs.length;
    setMessages(msgs);
    setMessagesLoading(false);
    scrollToBottom();
    chatApi("mark_seen", { conversationId });
  }

  const lastMsgCountRef = useRef(0);

  async function fetchMessages(initial = false) {
    const data = await chatApi("get_messages", { conversationId });
    const msgs: Message[] = data?.data?.messages ?? [];
    if (msgs.length < lastMsgCountRef.current) return;
    lastMsgCountRef.current = msgs.length;
    setMessages(msgs);
    if (initial || isNearBottom()) scrollToBottom();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistic insert — show immediately
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: currentUserId!,
      seen: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    await chatApi("send_message", { conversationId, content, disappearingFor: disappearingRef.current ? currentUserId : null });
    setSending(false);

    // Single refresh after send
    const data = await chatApi("get_messages", { conversationId });
    const msgs: Message[] = data?.data?.messages ?? [];
    if (msgs.length > 0) {
      lastMsgCountRef.current = msgs.length;
      setMessages(msgs);
      scrollToBottom();
    }
  }

  async function toggleDisappearing() {
    if (togglingDisappearing) return;
    setTogglingDisappearing(true);
    const next = !disappearing;
    await chatApi("toggle_disappearing", { conversationId, enable: next });
    setDisappearing(next);
    disappearingRef.current = next;
    setTogglingDisappearing(false);
    toast.success(next ? "Disappearing messages ON" : "Disappearing messages OFF");
  }

  async function sendVoice(blob: Blob) {
    setSendingVoice(true);
    const toastId = toast.loading("Sending voice note...");
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice.webm");
      formData.append("type", "voice");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await res.json();
      if (!url) throw new Error("Upload failed");
      await chatApi("send_message", { conversationId, content: `__VOICE__:${url}` });
      setShowVoice(false);
      toast.success("Voice note sent!", { id: toastId });
      const vdata = await chatApi("get_messages", { conversationId });
      const vmsgs: Message[] = vdata?.data?.messages ?? [];
      if (vmsgs.length > 0) { lastMsgCountRef.current = vmsgs.length; setMessages(vmsgs); scrollToBottom(); }
    } catch {
      toast.error("Failed to send voice note", { id: toastId });
    }
    setSendingVoice(false);
  }

  async function sendImage(url: string) {
    await chatApi("send_message", { conversationId, content: `__IMAGE__:${url}` });
    const data = await chatApi("get_messages", { conversationId });
    const msgs: Message[] = data?.data?.messages ?? [];
    if (msgs.length > 0) { lastMsgCountRef.current = msgs.length; setMessages(msgs); scrollToBottom(); }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col bg-black fixed inset-0">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 transition-colors duration-300 ${
        disappearing ? "bg-zinc-900 border-purple-900/50" : "bg-zinc-950 border-zinc-900"
      }`}>
        <button onClick={() => router.push("/chat")} className="p-1.5 rounded-full hover:bg-zinc-800 transition text-white">
          <AiOutlineArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          {otherProfile?.avatar_url ? (
            <Image src={ikUrl(otherProfile.avatar_url, { w: 72, h: 72 })} alt={otherProfile.username} width={36} height={36} className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">
              {otherProfile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">@{otherProfile?.username ?? "Unknown"}</p>
          {otherProfile?.show_activity && otherProfile?.last_active &&
            Date.now() - new Date(otherProfile.last_active).getTime() < 45 * 1000 && (
            <p className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              Active now
            </p>
          )}
        </div>
        {/* Disappearing messages toggle */}
        <button
          onClick={toggleDisappearing}
          disabled={togglingDisappearing}
          title={disappearing ? "Disappearing messages ON" : "Disappearing messages OFF"}
          className={`p-2 rounded-full transition-all ${
            disappearing
              ? "bg-purple-600/30 text-purple-400 ring-1 ring-purple-500/50"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>

      {/* Disappearing mode banner */}
      {disappearing && (
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-950/60 border-b border-purple-900/40 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 shrink-0">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
          <p className="text-purple-300 text-xs">Disappearing messages on — your messages will be deleted when you leave</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messagesLoading ? (
          <div className="flex flex-col gap-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
                <div className="w-7 h-7 rounded-full bg-zinc-800 shrink-0 animate-pulse" />
                <div className={`h-9 rounded-2xl bg-zinc-800 animate-pulse ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={{ width: `${40 + (i * 17) % 40}%` }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-600 py-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="7" y1="16" x2="13" y2="16" /><path d="M3 20l1.3-3.9A9 9 0 1 1 12 21a8.9 8.9 0 0 1-4.7-1.3L3 20z" /></svg>
            <p className="text-sm">Say hello to @{otherProfile?.username}</p>
          </div>
        ) : (
          <>{messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId;
          const showTime = i === messages.length - 1 || messages[i + 1]?.sender_id !== msg.sender_id;
          const showAvatar = showTime; // show avatar on last message of each group
          const share = parseShare(msg.content);
          const isVoice = msg.content.startsWith("__VOICE__:");
          const isImage = msg.content.startsWith("__IMAGE__:");
          const avatar = isMe
            ? null // own avatar not needed
            : otherProfile?.avatar_url;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className="w-7 h-7 shrink-0">
                {showAvatar && (
                  isMe ? (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-700 shrink-0">
                      {myProfile?.avatar_url ? (
                        <Image src={ikUrl(myProfile.avatar_url, { w: 56, h: 56 })} alt="me" width={28} height={28} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                          {myProfile?.username?.[0]?.toUpperCase() ?? "M"}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-700">
                      {avatar ? (
                        <Image src={ikUrl(avatar, { w: 56, h: 56 })} alt={otherProfile?.username ?? ""} width={28} height={28} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                          {otherProfile?.username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                {share ? (
                  <div
                    onClick={() => setActiveShare(share)}
                    className={`w-56 rounded-2xl overflow-hidden border cursor-pointer active:opacity-80 transition ${
                      isMe ? "border-purple-700 rounded-br-sm" : "border-zinc-700 rounded-bl-sm"
                    } bg-zinc-900`}
                  >
                    <div className="relative w-full aspect-square bg-zinc-800">
                      <Image src={share.thumbnail} alt={share.caption} fill className="object-cover" unoptimized />
                      {share.type === "reel" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="p-3 bg-black/50 rounded-full"><BsFillPlayFill size={28} className="text-white" /></div>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-white font-medium">
                        {share.type === "reel" ? "Reel" : "Post"}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-white text-xs font-semibold">@{share.username}</p>
                      {share.caption && <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">{share.caption}</p>}
                      {share.userMessage && <p className="text-zinc-300 text-xs mt-1.5 pt-1.5 border-t border-zinc-700">{share.userMessage}</p>}
                    </div>
                  </div>
                ) : isVoice ? (
                  <VoicePlayer src={msg.content.slice(10)} isMe={isMe} />
                ) : isImage ? (
                  <div
                    className={`rounded-2xl overflow-hidden max-w-[220px] cursor-pointer active:opacity-80 transition ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}
                    onClick={() => setActiveImage(msg.content.slice(10))}
                  >
                    <Image src={msg.content.slice(10)} alt="image" width={220} height={220} className="object-cover w-full" unoptimized />
                  </div>
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? "bg-purple-600 text-white rounded-br-sm" : "bg-zinc-800 text-white rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
                {showTime && (
                  <p className="text-zinc-600 text-[10px] mt-1 px-1">
                    {formatTime(msg.created_at)}
                    {isMe && msg.seen && <span className="ml-1 text-purple-400">· Seen</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Voice recorder */}
      {showVoice && (
        <VoiceRecorder
          onSend={sendVoice}
          onCancel={() => setShowVoice(false)}
          sending={sendingVoice}
        />
      )}

      {/* Input */}
      {isBlocked || blockedByOther ? (
        <div className="flex items-center justify-center px-4 py-4 bg-zinc-950 border-t border-zinc-900 shrink-0">
          <p className="text-zinc-500 text-sm text-center">
            {isBlocked ? "You have blocked this user. Unblock to send messages." : "You can't reply to this conversation."}
          </p>
        </div>
      ) : !showVoice && (
        <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-t border-zinc-900 shrink-0">
          <MicButton onClick={() => setShowVoice(true)} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-zinc-800 text-white placeholder-zinc-500 outline-none text-sm focus:ring-2 focus:ring-purple-500"
          />
          <MediaButton
            onSend={sendImage}
            onTextSend={() => sendMessage({ preventDefault: () => {} } as React.FormEvent)}
            canSend={!!input.trim()}
            sending={sending}
          />
        </form>
      )}

      {/* Full-screen media viewer — renders on top of chat */}
      {activeShare && (
        <MediaViewer share={activeShare} onClose={() => setActiveShare(null)} />
      )}

      {activeImage && (
        <ImageViewer url={activeImage} onClose={() => setActiveImage(null)} />
      )}
    </div>
  );
}
