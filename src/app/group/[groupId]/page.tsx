"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineArrowLeft, AiOutlineSend } from "react-icons/ai";
import { IoInformationCircleOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { VoiceRecorder, VoicePlayer, MicButton } from "@/components/chat/VoiceMessage";
import MediaButton from "@/components/chat/MediaButton";
import ImageViewer from "@/components/chat/ImageViewer";

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  type: "group" | "channel";
  created_by: string;
}
interface Member {
  user_id: string;
  role: "admin" | "member" | "allowed";
  profile: { username: string; avatar_url: string | null } | null;
}
interface GroupMessage {
  id: string;
  content: string;
  sender_id: string;
  type: "text" | "voice";
  created_at: string;
  sender?: { username: string; avatar_url: string | null } | null;
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<"admin" | "member" | "allowed" | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Voice recording removed — handled by VoiceRecorder component

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function fetchMessages(merge = false) {
    const { data } = await supabase
      .from("group_messages")
      .select("id, content, sender_id, type, created_at, sender:profiles(username, avatar_url)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    const msgList: GroupMessage[] = (data ?? []).map((m: any) => ({
      ...m,
      sender: Array.isArray(m.sender) ? m.sender[0] ?? null : m.sender,
    }));
    setMessages(msgList);
    if (!merge) scrollToBottom();
  }

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const [{ data: g }, { data: mems }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
        supabase.from("group_members").select("user_id, role, profile:profiles(username, avatar_url)").eq("group_id", groupId),
      ]);

      if (!g) { router.replace("/chat"); return; }
      setGroup(g);

      const memberList: Member[] = (mems ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        profile: Array.isArray(m.profile) ? m.profile[0] ?? null : m.profile,
      }));
      setMembers(memberList);
      const me = memberList.find((m) => m.user_id === user.id);
      setMyRole(me?.role ?? null);
      if (me?.profile) setMyProfile(me.profile);

      await fetchMessages(false);
      setLoading(false);

      // Poll every 2s — only adds NEW messages not already in state
      pollRef.current = setInterval(async () => {
        const { data } = await supabase
          .from("group_messages")
          .select("id, content, sender_id, type, created_at, sender:profiles(username, avatar_url)")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true });

        const msgList: GroupMessage[] = (data ?? []).map((m: any) => ({
          ...m,
          sender: Array.isArray(m.sender) ? m.sender[0] ?? null : m.sender,
        }));

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = msgList.filter((m) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          if (isNearBottom()) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          return [...prev, ...newMsgs];
        });
      }, 2000);
    }

    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [groupId]);

  function canSend() {
    if (!group || !myRole) return false;
    if (group.type === "group") return true;
    return myRole === "admin" || myRole === "allowed";
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || !canSend()) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    const { data, error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: currentUserId, content, type: "text" })
      .select("id, content, sender_id, type, created_at")
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, { ...data, sender: null }]);
      scrollToBottom();
      await supabase.from("groups").update({ last_message: content, last_message_at: new Date().toISOString() }).eq("id", groupId);
    }
    setSending(false);
  }

  async function sendVoice(blob: Blob) {
    if (!canSend()) return;
    setSendingVoice(true);
    const toastId = toast.loading("Sending voice note...");
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice.webm");
      formData.append("type", "voice");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await res.json();
      if (!url) throw new Error("Upload failed");
      const { data, error } = await supabase
        .from("group_messages")
        .insert({ group_id: groupId, sender_id: currentUserId, content: url, type: "voice" })
        .select("id, content, sender_id, type, created_at").single();
      if (!error && data) {
        setMessages((prev) => [...prev, { ...data, sender: null }]);
        scrollToBottom();
        await supabase.from("groups").update({ last_message: "🎤 Voice note", last_message_at: new Date().toISOString() }).eq("id", groupId);
      }
      setShowVoice(false);
      toast.success("Voice note sent!", { id: toastId });
    } catch {
      toast.error("Failed to send voice note", { id: toastId });
    }
    setSendingVoice(false);
  }

  async function sendImage(url: string) {
    if (!canSend() || !currentUserId) return;
    const { data, error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: currentUserId, content: url, type: "image" })
      .select("id, content, sender_id, type, created_at").single();
    if (!error && data) {
      setMessages((prev) => [...prev, { ...data, sender: null }]);
      scrollToBottom();
      await supabase.from("groups").update({ last_message: "📷 Image", last_message_at: new Date().toISOString() }).eq("id", groupId);
    }
  }

  async function deleteMessage(msgId: string) {
    setLongPressMsg(null);
    const { error } = await supabase.from("group_messages").delete().eq("id", msgId);
    if (error) toast.error("Failed to delete message");
  }

  function handleLongPressStart(msgId: string) {
    longPressTimer.current = setTimeout(() => setLongPressMsg(msgId), 500);
  }
  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isChannel = group?.type === "channel";
  const isAdmin = myRole === "admin";

  return (
    <div className="flex flex-col bg-black fixed inset-0">
      {/* Long press overlay */}
      {longPressMsg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center pb-10" onClick={() => setLongPressMsg(null)}>
          <div className="bg-zinc-800 rounded-2xl overflow-hidden w-72" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const msg = messages.find((m) => m.id === longPressMsg);
              const canDelete = msg && (msg.sender_id === currentUserId || isAdmin);
              return canDelete ? (
                <button
                  onClick={() => deleteMessage(longPressMsg)}
                  className="flex items-center gap-3 w-full px-5 py-4 text-red-400 hover:bg-zinc-700 transition text-sm font-medium"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Delete Message
                </button>
              ) : (
                <p className="px-5 py-4 text-zinc-500 text-sm">No actions available</p>
              );
            })()}
            <div className="h-px bg-zinc-700" />
            <button onClick={() => setLongPressMsg(null)} className="w-full px-5 py-4 text-zinc-400 text-sm hover:bg-zinc-700 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-zinc-900 shrink-0">
        <button onClick={() => router.push("/chat")} className="p-1.5 rounded-full hover:bg-zinc-800 transition text-white">
          <AiOutlineArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
          {group?.avatar_url ? (
            <Image src={ikUrl(group.avatar_url, { w: 72, h: 72 })} alt={group.name} width={36} height={36} className="object-cover" unoptimized />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400 ${isChannel ? "bg-gradient-to-br from-blue-800 to-zinc-700" : "bg-gradient-to-br from-purple-800 to-zinc-700"}`}>
              {group?.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{group?.name}</p>
          <p className="text-zinc-500 text-xs">{isChannel ? "Channel" : `${members.length} members`}</p>
        </div>
        <button
          onClick={() => router.push(`/group/${groupId}/info`)}
          className="p-1.5 rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
        >
          <IoInformationCircleOutline size={22} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-zinc-600 py-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId;
          const showSender = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
          const showAvatar = i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id;
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              onMouseDown={() => handleLongPressStart(msg.id)}
              onMouseUp={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(msg.id)}
              onTouchEnd={handleLongPressEnd}
            >
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
                      {msg.sender?.avatar_url ? (
                        <Image src={ikUrl(msg.sender.avatar_url, { w: 56, h: 56 })} alt="" width={28} height={28} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                          {msg.sender?.username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                {showSender && !isMe && (
                  <span className="text-zinc-400 text-xs font-medium mb-1 ml-1">@{msg.sender?.username}</span>
                )}
                {msg.type === "voice" ? (
                  <VoicePlayer src={msg.content} isMe={isMe} />
                ) : (msg.type as string) === "image" ? (
                  <div
                    className={`rounded-2xl overflow-hidden max-w-[220px] cursor-pointer active:opacity-80 transition ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}
                    onClick={() => setActiveImage(msg.content)}
                  >
                    <Image src={msg.content} alt="image" width={220} height={220} className="object-cover w-full" unoptimized />
                  </div>
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? "bg-purple-600 text-white rounded-br-sm" : "bg-zinc-800 text-white rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                )}
                <p className="text-zinc-600 text-[10px] mt-0.5 px-1">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Voice recorder */}
      {showVoice && canSend() && (
        <VoiceRecorder
          onSend={sendVoice}
          onCancel={() => setShowVoice(false)}
          sending={sendingVoice}
        />
      )}

      {/* Input */}
      {!canSend() ? (
        <div className="flex items-center justify-center px-4 py-4 bg-zinc-950 border-t border-zinc-900 shrink-0">
          <p className="text-zinc-500 text-sm text-center">
            {isChannel ? "Only admins and allowed members can send messages." : "You cannot send messages here."}
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

      {activeImage && (
        <ImageViewer url={activeImage} onClose={() => setActiveImage(null)} />
      )}
    </div>
  );
}
