"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { IoArrowBack } from "react-icons/io5";
import toast from "react-hot-toast";

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  type: "group" | "channel";
  created_by: string;
}
interface Member {
  user_id: string;
  role: "admin" | "member" | "allowed";
  profile: { username: string; avatar_url: string | null } | null;
}
interface SearchProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<"admin" | "member" | "allowed" | null>(null);
  const [loading, setLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, [groupId]);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [{ data: g }, { data: mems }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
      supabase.from("group_members").select("user_id, role, profile:profiles(username, avatar_url)").eq("group_id", groupId),
    ]);

    if (!g) { router.replace("/chat"); return; }
    setGroup(g);
    setEditName(g.name);
    setEditDesc(g.description ?? "");

    const memberList: Member[] = (mems ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      profile: Array.isArray(m.profile) ? m.profile[0] ?? null : m.profile,
    }));
    setMembers(memberList);
    setMyRole(memberList.find((m) => m.user_id === user.id)?.role ?? null);
    setLoading(false);
  }

  const isAdmin = myRole === "admin";
  const isCreator = group?.created_by === currentUserId;
  const isChannel = group?.type === "channel";

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "avatar");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const { url } = await res.json();
    if (!url) { toast.error("Upload failed"); setAvatarUploading(false); return; }
    await supabase.from("groups").update({ avatar_url: url }).eq("id", groupId);
    setGroup((g) => g ? { ...g, avatar_url: url } : g);
    setAvatarUploading(false);
    toast.success("Avatar updated");
  }

  async function saveGroupInfo() {
    if (!editName.trim()) return;
    const { error } = await supabase.from("groups")
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq("id", groupId);
    if (error) { toast.error("Failed to save"); return; }
    setGroup((g) => g ? { ...g, name: editName.trim(), description: editDesc.trim() || null } : g);
    toast.success("Saved");
  }

  async function searchUsers(q: string) {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from("profiles").select("id, username, avatar_url").ilike("username", `%${q}%`).limit(10);
    const existingIds = new Set(members.map((m) => m.user_id));
    setSearchResults((data ?? []).filter((p: SearchProfile) => !existingIds.has(p.id)));
    setSearching(false);
  }

  async function addMember(profile: SearchProfile) {
    const toastId = toast.loading("Adding...");
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: profile.id, role: "member" });
    if (error) { toast.error("Failed to add member", { id: toastId }); return; }
    setMembers((prev) => [...prev, { user_id: profile.id, role: "member", profile }]);
    setSearchResults((prev) => prev.filter((p) => p.id !== profile.id));
    setSearchQuery("");
    toast.success(`@${profile.username} added`, { id: toastId });
  }

  async function removeMember(userId: string) {
    setMenuMemberId(null);
    const toastId = toast.loading("Removing...");
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    if (error) { toast.error("Failed to remove", { id: toastId }); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    toast.success("Member removed", { id: toastId });
  }

  async function changeRole(userId: string, newRole: "admin" | "member" | "allowed") {
    setMenuMemberId(null);
    const toastId = toast.loading("Updating role...");
    const { error } = await supabase.from("group_members").update({ role: newRole }).eq("group_id", groupId).eq("user_id", userId);
    if (error) { toast.error("Failed to update role", { id: toastId }); return; }
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: newRole } : m));
    const labels: Record<string, string> = { admin: "Now an admin", member: "Role set to member", allowed: "Can now send messages" };
    toast.success(labels[newRole], { id: toastId });
  }

  async function leaveGroup() {
    if (!currentUserId) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", currentUserId);
    router.replace("/chat");
    toast.success(`Left ${isChannel ? "channel" : "group"}`);
  }

  async function deleteGroup() {
    setShowDeleteConfirm(false);
    const toastId = toast.loading("Deleting...");
    // Messages and members cascade delete via FK
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) { toast.error("Failed to delete", { id: toastId }); return; }
    toast.success(`${isChannel ? "Channel" : "Group"} deleted`, { id: toastId });
    router.replace("/chat");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {menuMemberId && <div className="fixed inset-0 z-40" onClick={() => setMenuMemberId(null)} />}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-bold text-lg mb-2">Delete {isChannel ? "Channel" : "Group"}?</h2>
            <p className="text-zinc-400 text-sm mb-5">This will permanently delete all messages and members. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition">Cancel</button>
              <button onClick={deleteGroup} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800 sticky top-0 bg-black z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <IoArrowBack size={20} />
        </button>
        <span className="font-bold text-lg flex-1">{isChannel ? "Channel Info" : "Group Info"}</span>
        {isAdmin && (
          <button onClick={saveGroupInfo} className="text-purple-400 font-semibold text-sm px-2">Save</button>
        )}
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center gap-3 py-6 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800">
            {group?.avatar_url ? (
              <Image src={ikUrl(group.avatar_url, { w: 192, h: 192 })} alt={group.name} width={96} height={96} className="object-cover" unoptimized />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl font-bold text-zinc-400 ${isChannel ? "bg-gradient-to-br from-blue-800 to-zinc-700" : "bg-gradient-to-br from-purple-800 to-zinc-700"}`}>
                {group?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {isAdmin && (
            <>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition"
              >
                {avatarUploading
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                }
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
            </>
          )}
        </div>

        {isAdmin ? (
          <div className="w-full max-w-sm flex flex-col gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Name"
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 text-center font-bold"
            />
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-center"
            />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white font-bold text-xl">{group?.name}</p>
            {group?.description && <p className="text-zinc-400 text-sm mt-1">{group.description}</p>}
          </div>
        )}

        <span className={`text-xs px-3 py-1 rounded-full font-medium ${isChannel ? "bg-blue-900/50 text-blue-400" : "bg-purple-900/50 text-purple-400"}`}>
          {isChannel ? "Channel" : "Group"} · {members.length} members
        </span>
      </div>

      {/* Add member (admin only) */}
      {isAdmin && (
        <div className="px-4 mb-4">
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Add Members</p>
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search by username..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 bg-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-700">
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => addMember(p)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700 transition text-left">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                    {p.avatar_url
                      ? <Image src={ikUrl(p.avatar_url, { w: 64, h: 64 })} alt={p.username} width={32} height={32} className="object-cover" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{p.username[0]?.toUpperCase()}</div>
                    }
                  </div>
                  <span className="text-white text-sm flex-1">@{p.username}</span>
                  <span className="text-purple-400 text-xs font-semibold">Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="px-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Members</p>
        <div className="divide-y divide-zinc-900">
          {members.map((m) => {
            const isMe = m.user_id === currentUserId;
            const isMenuOpen = menuMemberId === m.user_id;
            return (
              <div key={m.user_id} className="relative flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  {m.profile?.avatar_url
                    ? <Image src={ikUrl(m.profile.avatar_url, { w: 80, h: 80 })} alt={m.profile.username} width={40} height={40} className="object-cover" unoptimized />
                    : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400">{m.profile?.username?.[0]?.toUpperCase() ?? "?"}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">@{m.profile?.username ?? "Unknown"}{isMe ? " (you)" : ""}</p>
                  <p className={`text-xs mt-0.5 ${m.role === "admin" ? "text-purple-400" : m.role === "allowed" ? "text-green-400" : "text-zinc-500"}`}>
                    {m.role === "admin" ? "Admin" : m.role === "allowed" ? "Can send" : "Member"}
                  </p>
                </div>
                {isAdmin && !isMe && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuMemberId(isMenuOpen ? null : m.user_id)}
                      className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                        {/* Make Admin */}
                        {m.role !== "admin" && (
                          <button onClick={() => changeRole(m.user_id, "admin")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-zinc-700 transition">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            Make Admin
                          </button>
                        )}
                        {/* Demote Admin → Member */}
                        {m.role === "admin" && (
                          <button onClick={() => changeRole(m.user_id, "member")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-yellow-400 hover:bg-zinc-700 transition">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                            Demote to Member
                          </button>
                        )}
                        {/* Allow/Revoke send (channels only) */}
                        {isChannel && m.role !== "admin" && (
                          <button onClick={() => changeRole(m.user_id, m.role === "allowed" ? "member" : "allowed")} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-green-400 hover:bg-zinc-700 transition">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                            {m.role === "allowed" ? "Revoke Send" : "Allow to Send"}
                          </button>
                        )}
                        <div className="h-px bg-zinc-700" />
                        <button onClick={() => removeMember(m.user_id)} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 flex flex-col gap-3">
        {/* Leave (non-admin or non-creator) */}
        {!isCreator && (
          <button onClick={leaveGroup} className="w-full py-3 rounded-xl bg-zinc-900 text-red-400 text-sm font-semibold hover:bg-zinc-800 transition">
            Leave {isChannel ? "Channel" : "Group"}
          </button>
        )}
        {/* Delete (creator only) */}
        {isCreator && (
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-xl bg-red-950 text-red-400 text-sm font-semibold hover:bg-red-900 transition">
            Delete {isChannel ? "Channel" : "Group"}
          </button>
        )}
      </div>
    </div>
  );
}
