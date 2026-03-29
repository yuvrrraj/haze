"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { AiOutlineEdit, AiOutlinePlus } from "react-icons/ai";
import { IoArrowBack } from "react-icons/io5";
import toast from "react-hot-toast";
import CreateGroupModal from "@/components/chat/CreateGroupModal";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
}
interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  show_activity?: boolean;
  last_active?: string | null;
}
interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  type: "group" | "channel";
  created_by: string;
  last_message: string | null;
  last_message_at: string;
  member_count?: number;
}

export async function chatApi(action: string, payload = {}) {
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

// ── Password verify modal ─────────────────────────────────────────────────────
function PasswordModal({ onVerified, onClose }: { onVerified: () => void; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const user = await getCurrentUser();
    if (!user?.email) { toast.error("No email found"); setLoading(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    setLoading(false);
    if (error) { toast.error("Wrong password"); return; }
    onVerified();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-white font-bold text-lg mb-1">Verify Identity</h2>
        <p className="text-zinc-400 text-sm mb-4">Enter your password to hide chats</p>
        <form onSubmit={verify} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-white font-semibold text-sm transition"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
          <button type="button" onClick={onClose} className="py-2 text-zinc-500 text-sm">Cancel</button>
        </form>
      </div>
    </div>
  );
}

// ── Select chats to hide modal ────────────────────────────────────────────────
function HideSelectModal({
  conversations, profiles, currentUserId, hiddenIds, onDone, onClose,
}: {
  conversations: Conversation[];
  profiles: Record<string, Profile>;
  currentUserId: string;
  hiddenIds: Set<string>;
  onDone: (selected: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(hiddenIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <button onClick={onClose} className="text-white"><IoArrowBack size={22} /></button>
        <h2 className="text-white font-bold text-lg flex-1">Select Chats to Hide</h2>
        <button onClick={() => onDone(Array.from(selected))} className="text-purple-400 font-semibold text-sm">Done</button>
      </div>
      <p className="text-zinc-500 text-xs px-4 py-2">Select chats to hide from your inbox</p>
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {conversations.map((conv) => {
          const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
          const other = profiles[otherId];
          const isSelected = selected.has(conv.id);
          return (
            <button key={conv.id} onClick={() => toggle(conv.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition text-left">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                {other?.avatar_url ? (
                  <Image src={ikUrl(other.avatar_url, { w: 88, h: 88 })} alt={other.username} width={44} height={44} className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400">{other?.username?.[0]?.toUpperCase() ?? "?"}</div>
                )}
              </div>
              <span className="text-white text-sm font-medium flex-1">@{other?.username ?? "Unknown"}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${isSelected ? "bg-purple-600 border-purple-600" : "border-zinc-600"}`}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Hidden chats inbox ───────────────────────────────────────────────────────
function HiddenInbox({
  conversations, profiles, currentUserId, hiddenIds, onUnhide, onClose, onOpenDm,
}: {
  conversations: Conversation[];
  profiles: Record<string, Profile>;
  currentUserId: string;
  hiddenIds: Set<string>;
  onUnhide: (ids: string[]) => void;
  onClose: () => void;
  onOpenDm: (convId: string) => void;
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const hiddenConvs = conversations.filter((c) => hiddenIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {menuOpenId && <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
        <button onClick={onClose} className="text-white"><IoArrowBack size={22} /></button>
        <h2 className="text-white font-bold text-lg flex-1">Hidden Chats</h2>
      </div>

      {hiddenConvs.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-600">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 11H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <p className="text-sm">No hidden chats</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {hiddenConvs.map((conv) => {
            const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
            const other = profiles[otherId];
            const isMenuOpen = menuOpenId === conv.id;
            return (
              <div key={conv.id} className="relative flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition">
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  onClick={() => onOpenDm(conv.id)}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                    {other?.avatar_url ? (
                      <Image src={ikUrl(other.avatar_url, { w: 96, h: 96 })} alt={other.username} width={48} height={48} className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400">
                        {other?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">@{other?.username ?? "Unknown"}</p>
                    <p className="text-zinc-500 text-xs truncate mt-0.5 flex items-center gap-1">
                      {conv.last_message?.startsWith("__SHARE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Shared a post</>) : conv.last_message?.startsWith("__VOICE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Voice note</>) : conv.last_message?.startsWith("__IMAGE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Image</>) : (conv.last_message ?? "Say hello 👋")}
                    </p>
                  </div>
                  <p className="text-zinc-600 text-xs shrink-0 mr-2">
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                  </p>
                </button>
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : conv.id); }}
                    className="p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 top-8 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                      <button
                        onClick={() => { setMenuOpenId(null); onUnhide([conv.id]); }}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 11H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                        Unhide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main chat inbox ───────────────────────────────────────────────────────────
function ChatInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myShowActivity, setMyShowActivity] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [openingDm, setOpeningDm] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"general" | "messages">("general");

  const [showMenu, setShowMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHiddenInbox, setShowHiddenInbox] = useState(false);
  const [showHideSelect, setShowHideSelect] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // delete mode
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState<Set<string>>(new Set());

  useEffect(() => { init(); }, []);

  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get("userId");
    if (userId && currentUserId && userId !== handledUserIdRef.current) {
      handledUserIdRef.current = userId;
      openDm(userId);
    }
  }, [searchParams, currentUserId]);

  async function init() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Load Supabase data + Nhost conversations in parallel
    const [hiddenData, groupsData, convData, myProfile, reqCount] = await Promise.all([
      supabase.from("hidden_conversations").select("conversation_id").eq("user_id", user.id),
      supabase.from("groups").select("id, name, description, avatar_url, type, created_by, last_message, last_message_at, group_members!inner(user_id)").eq("group_members.user_id", user.id).order("last_message_at", { ascending: false }),
      chatApi("get_conversations"),
      supabase.from("profiles").select("show_activity").eq("id", user.id).maybeSingle(),
      supabase.from("message_requests").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending"),
    ]);

    setPendingRequestCount(reqCount.count ?? 0);
    setMyShowActivity(myProfile.data?.show_activity ?? true);

    setHiddenIds(new Set((hiddenData.data ?? []).map((h: { conversation_id: string }) => h.conversation_id)));

    const groupsWithCount: Group[] = (groupsData.data ?? []).map((g: any) => ({
      ...g,
      member_count: Array.isArray(g.group_members) ? g.group_members.length : 0,
    }));
    setGroups(groupsWithCount);

    const convos: Conversation[] = convData?.data?.conversations ?? [];
    setConversations(convos);

    if (convos.length > 0) {
      const otherIds = convos.map((c) => c.user1_id === user.id ? c.user2_id : c.user1_id);
      const { data: profileData } = await supabase
        .from("profiles").select("id, username, avatar_url, show_activity, last_active").in("id", otherIds);
      const map: Record<string, Profile> = {};
      (profileData ?? []).forEach((p: Profile) => { map[p.id] = p; });
      setProfiles(map);
    }

    setLoading(false);
  }

  async function openDm(otherUserId: string) {
    setOpeningDm(true);
    const data = await chatApi("get_or_create_conversation", { otherUserId });
    if (data?.conversationId) {
      router.push(`/dm/${data.conversationId}`);
    } else {
      setOpeningDm(false);
    }
  }

  const [pendingAction, setPendingAction] = useState<"view" | "hide">("view");

  async function saveHidden(selected: string[]) {
    if (!currentUserId) return;
    const toastId = toast.loading("Saving...");
    await supabase.from("hidden_conversations").delete().eq("user_id", currentUserId);
    if (selected.length > 0) {
      await supabase.from("hidden_conversations").insert(
        selected.map((id) => ({ user_id: currentUserId, conversation_id: id }))
      );
    }
    setHiddenIds(new Set(selected));
    setShowHideSelect(false);
    toast.success("Hidden chats updated", { id: toastId });
  }

  async function deleteSelected_() {
    if (!currentUserId || deleteSelected.size === 0) return;
    const toastId = toast.loading("Deleting...");
    await Promise.all(Array.from(deleteSelected).map((id) => chatApi("delete_conversation", { conversationId: id })));
    setConversations((prev) => prev.filter((c) => !deleteSelected.has(c.id)));
    setDeleteSelected(new Set());
    setDeleteMode(false);
    toast.success("Chats deleted", { id: toastId });
  }

  const visibleConversations = conversations.filter((c) => !hiddenIds.has(c.id));
  
  const filteredConversations = activeTab === "messages" ? [] : visibleConversations;
  const filteredGroups = activeTab === "general" ? [] : groups;

  if (loading || openingDm) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black border-b border-zinc-900">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-white font-bold text-xl">Messages</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="16" y1="11" x2="22" y2="11"/>
              </svg>
            </button>
            {/* Message Requests button */}
            <button
              onClick={() => router.push("/chat/requests")}
              className={`relative p-2 rounded-full transition ${
                pendingRequestCount > 0
                  ? "text-red-500 animate-pulse"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10"/>
                <line x1="12" y1="7" x2="12" y2="13"/>
              </svg>
              {pendingRequestCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => { setShowMenu((v) => !v); setDeleteMode(false); }}
                className="p-2 rounded-full hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
              >
                <AiOutlineEdit size={22} />
              </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                <button
                  onClick={() => { setShowMenu(false); setPendingAction("view"); setShowPasswordModal(true); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>Hidden Chats</span>
                </button>
                <div className="h-px bg-zinc-700" />
                <button
                  onClick={() => { setShowMenu(false); setPendingAction("hide"); setShowPasswordModal(true); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 11H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2z" />
                    <path d="M11 15a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <span>Hide Chat</span>
                </button>
                <div className="h-px bg-zinc-700" />
                <button
                  onClick={() => { setShowMenu(false); setDeleteMode(true); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  <span>Delete Chat</span>
                </button>
              </div>
            </>
          )}
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-zinc-900">
          {(["general", "messages"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "text-white border-b-2 border-purple-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "general" ? "General" : "Messages"}
            </button>
          ))}
        </div>
      </div>

      {/* Delete mode bar */}
      {deleteMode && (
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-zinc-400 text-sm">{deleteSelected.size} selected</span>
          <div className="flex gap-3">
            <button onClick={() => { setDeleteMode(false); setDeleteSelected(new Set()); }} className="text-zinc-400 text-sm">Cancel</button>
            <button
              onClick={deleteSelected_}
              disabled={deleteSelected.size === 0}
              className="text-red-400 text-sm font-semibold disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {filteredConversations.length === 0 && filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <p className="text-sm">
            {activeTab === "general" ? "No direct messages yet" : "No groups or channels yet"}
          </p>
          {activeTab === "messages" && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white text-sm font-medium transition"
            >
              Create with Options
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-zinc-900">
          {/* Groups */}
          {filteredGroups.map((group) => {
            const isDeleteSelected = deleteSelected.has(group.id);
            return (
              <button
                key={group.id}
                onClick={() => {
                  if (deleteMode) {
                    setDeleteSelected((prev) => {
                      const next = new Set(prev);
                      next.has(group.id) ? next.delete(group.id) : next.add(group.id);
                      return next;
                    });
                  } else {
                    router.push(`/group/${group.id}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition text-left ${isDeleteSelected ? "bg-zinc-900" : ""}`}
              >
                {deleteMode && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${isDeleteSelected ? "bg-red-500 border-red-500" : "border-zinc-600"}`}>
                    {isDeleteSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  {group.avatar_url ? (
                    <Image src={ikUrl(group.avatar_url, { w: 96, h: 96 })} alt={group.name} width={48} height={48} className="object-cover" unoptimized />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400 ${
                      group.type === "channel" ? "bg-gradient-to-br from-blue-800 to-zinc-700" : "bg-gradient-to-br from-purple-800 to-zinc-700"
                    }`}>
                      {group.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm truncate">{group.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      group.type === "channel" ? "bg-blue-900/50 text-blue-400" : "bg-purple-900/50 text-purple-400"
                    }`}>
                      {group.type === "channel" ? "C" : "G"}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs truncate mt-0.5 flex items-center gap-1">
                    {group.last_message === "🎤 Voice note" || group.last_message?.startsWith("__VOICE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Voice note</>) : group.last_message === "📷 Image" ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Image</>) : (group.last_message || `${group.member_count} members`)}
                  </p>
                </div>
                <p className="text-zinc-600 text-xs shrink-0">
                  {group.last_message_at ? new Date(group.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                </p>
              </button>
            );
          })}
          
          {/* Direct Messages */}
          {filteredConversations.map((conv) => {
            const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
            const other = profiles[otherId];
            const isDeleteSelected = deleteSelected.has(conv.id);
            return (
              <button
                key={conv.id}
                onClick={() => {
                  if (deleteMode) {
                    setDeleteSelected((prev) => {
                      const next = new Set(prev);
                      next.has(conv.id) ? next.delete(conv.id) : next.add(conv.id);
                      return next;
                    });
                  } else {
                    router.push(`/dm/${conv.id}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition text-left ${isDeleteSelected ? "bg-zinc-900" : ""}`}
              >
                {deleteMode && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${isDeleteSelected ? "bg-red-500 border-red-500" : "border-zinc-600"}`}>
                    {isDeleteSelected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="relative w-12 h-12 shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                    {other?.avatar_url ? (
                      <Image src={ikUrl(other.avatar_url, { w: 96, h: 96 })} alt={other.username} width={48} height={48} className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400">
                        {other?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                  {/* Green dot — only if both users have show_activity ON and other is online */}
                  {myShowActivity && other?.show_activity && other?.last_active &&
                    Date.now() - new Date(other.last_active).getTime() < 45 * 1000 && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">@{other?.username ?? "Unknown"}</p>
                  <p className="text-zinc-500 text-xs truncate mt-0.5 flex items-center gap-1">
                    {conv.last_message?.startsWith("__SHARE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Shared a post</>) : conv.last_message?.startsWith("__VOICE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>Voice note</>) : conv.last_message?.startsWith("__IMAGE__:") ? (<><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Image</>) : (conv.last_message ?? "Say hello 👋")}
                  </p>
                </div>
                <p className="text-zinc-600 text-xs shrink-0">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {showPasswordModal && (
        <PasswordModal
          onVerified={() => {
            setShowPasswordModal(false);
            if (pendingAction === "hide") setShowHideSelect(true);
            else setShowHiddenInbox(true);
          }}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {showHideSelect && currentUserId && (
        <HideSelectModal
          conversations={conversations}
          profiles={profiles}
          currentUserId={currentUserId}
          hiddenIds={hiddenIds}
          onDone={saveHidden}
          onClose={() => setShowHideSelect(false)}
        />
      )}

      {showHiddenInbox && currentUserId && (
        <HiddenInbox
          conversations={conversations}
          profiles={profiles}
          currentUserId={currentUserId}
          hiddenIds={hiddenIds}
          onUnhide={async (ids) => {
            if (!currentUserId) return;
            const toastId = toast.loading("Saving...");
            const remaining = Array.from(hiddenIds).filter((id) => !ids.includes(id));
            await supabase.from("hidden_conversations").delete().eq("user_id", currentUserId);
            if (remaining.length > 0) {
              await supabase.from("hidden_conversations").insert(
                remaining.map((id) => ({ user_id: currentUserId, conversation_id: id }))
              );
            }
            setHiddenIds(new Set(remaining));
            toast.success("Chats unhidden", { id: toastId });
          }}
          onClose={() => setShowHiddenInbox(false)}
          onOpenDm={(convId) => { setShowHiddenInbox(false); router.push(`/dm/${convId}`); }}
        />
      )}
      
      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupId) => {
            setShowCreateGroup(false);
            router.push(`/group/${groupId}`);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatInbox />
    </Suspense>
  );
}
