"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { AiOutlineCamera, AiOutlineEdit, AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import { BsFillPlayFill } from "react-icons/bs";
import FollowersModal from "@/components/ui/FollowersModal";

import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Post { id: string; image_url: string; }
interface Reel { id: string; thumbnail_url: string | null; video_url: string; }
interface RepostedReel { id: string; reel_id: string; emoji: string | null; reel: { id: string; thumbnail_url: string | null; video_url: string; } }

export default function ProfilePage() {
  const router = useRouter();
  const { profile, updateProfile } = useAuthStore();
  const { setHiddenNav } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [tab, setTab] = useState<"posts" | "reels" | "reposts">("posts");
  const [reposts, setReposts] = useState<RepostedReel[]>([]);
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [pinnedReelId, setPinnedReelId] = useState<string | null>(null);
  const [longPressId, setLongPressId] = useState<{ id: string; type: "post" | "reel" } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeInput, setBadgeInput] = useState(profile?.badge ?? "");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFollowModal, setShowFollowModal] = useState<"followers" | "following" | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isSpecialUser, setIsSpecialUser] = useState(false);
  const [highlights, setHighlights] = useState<{id:string;title:string;cover_url:string|null}[]>([]);
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashPosts, setDashPosts] = useState<{id:string;image_url:string;caption:string|null;views:number}[]>([]);
  const [dashReels, setDashReels] = useState<{id:string;thumbnail_url:string|null;caption:string|null;views:number}[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [hlLongPress, setHlLongPress] = useState<{id:string;title:string;cover_url:string|null} | null>(null);
  const [hlEditing, setHlEditing] = useState(false);
  const [hlEditTitle, setHlEditTitle] = useState("");
  const [hlEditCoverFile, setHlEditCoverFile] = useState<File | null>(null);
  const [hlEditCoverPreview, setHlEditCoverPreview] = useState<string | null>(null);
  const [hlSaving, setHlSaving] = useState(false);
  const hlLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hlCoverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Sync bio/username/badge inputs when profile loads from store
  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? "");
      setUsername(profile.username ?? "");
      setBadgeInput(profile.badge ?? "");
    }
  }, [profile?.id]);

  useEffect(() => { if (profile?.id) loadContent(profile.id); }, [profile?.id]);

  async function loadContent(userId: string) {
    const [{ data: userPosts }, { data: userReels }, { count: followers }, { count: following }, { data: prof }, { data: userReposts }] = await Promise.all([
      supabase.from("posts").select("id, image_url").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("reels").select("id, thumbnail_url, video_url").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      supabase.from("profiles").select("pinned_post_id, pinned_reel_id, is_verified, username").eq("id", userId).maybeSingle(),
      supabase.from("reel_reposts").select("id, reel_id, emoji, reel:reels(id, thumbnail_url, video_url)").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    setPinnedPostId(prof?.pinned_post_id ?? null);
    setPinnedReelId(prof?.pinned_reel_id ?? null);
    setIsVerified(prof?.is_verified ?? false);
    setIsSpecialUser(prof?.username === "verified");
    setPosts(userPosts ?? []);
    setReels(userReels ?? []);
    setReposts((userReposts ?? []) as unknown as RepostedReel[]);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setLoading(false);
    // Load highlights
    supabase.from("highlights").select("id,title,cover_url").eq("user_id", userId).order("created_at", { ascending: true })
      .then(({ data }) => setHighlights(data ?? []));
    // Load total views
    Promise.all([
      supabase.from("post_views").select("post_id, posts!inner(user_id)").eq("posts.user_id", userId),
      supabase.from("reel_views").select("reel_id, reels!inner(user_id)").eq("reels.user_id", userId),
    ]).then(([pv, rv]) => {
      setTotalViews((pv.data?.length ?? 0) + (rv.data?.length ?? 0));
    });
  }

  async function loadDashboard(userId: string) {
    setDashLoading(true);
    const [postsRes, reelsRes, pvRes, rvRes] = await Promise.all([
      supabase.from("posts").select("id, image_url, caption").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("reels").select("id, thumbnail_url, caption").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("post_views").select("post_id"),
      supabase.from("reel_views").select("reel_id"),
    ]);
    const pv: Record<string, number> = {};
    const rv: Record<string, number> = {};
    for (const r of pvRes.data ?? []) pv[r.post_id] = (pv[r.post_id] ?? 0) + 1;
    for (const r of rvRes.data ?? []) rv[r.reel_id] = (rv[r.reel_id] ?? 0) + 1;
    setDashPosts((postsRes.data ?? []).map((p: any) => ({ ...p, views: pv[p.id] ?? 0 })));
    setDashReels((reelsRes.data ?? []).map((r: any) => ({ ...r, views: rv[r.id] ?? 0 })));
    setDashLoading(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Uploading avatar...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "avatar");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!json.url) throw new Error(json.error ?? "Upload failed");

      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: json.url })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      updateProfile({ avatar_url: json.url });
      toast.success("Avatar updated!", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar", { id: toastId });
    }
    if (avatarRef.current) avatarRef.current.value = "";
  }

  async function uploadCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Uploading cover...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "post");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!json.url) throw new Error(json.error ?? "Upload failed");

      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ cover_url: json.url })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      updateProfile({ cover_url: json.url });
      toast.success("Cover updated!", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload cover", { id: toastId });
    }
    if (coverRef.current) coverRef.current.value = "";
  }

  async function saveUsername() {
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3) return toast.error("Username must be at least 3 characters");
    if (!profile?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", profile.id);

    if (error) return toast.error(error.message.includes("unique") ? "Username already taken" : error.message);
    updateProfile({ username: trimmed });
    setEditingUsername(false);
    toast.success("Username updated!");
  }

  function handleLongPressStart(id: string, type: "post" | "reel") {
    longPressTimer.current = setTimeout(() => setLongPressId({ id, type }), 500);
  }
  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  async function deletePostOrReel(id: string, type: "post" | "reel") {
    setLongPressId(null);
    const toastId = toast.loading(type === "post" ? "Deleting post..." : "Deleting reel...");

    const user = await getCurrentUser();
    if (!user) { toast.error("Not logged in", { id: toastId }); return; }

    const endpoint = type === "post" ? "/api/delete-post" : "/api/delete-reel";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userId: user.id }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Failed to delete", { id: toastId });
      return;
    }

    // update local state immediately
    if (type === "post") setPosts((prev) => prev.filter((p) => p.id !== id));
    else setReels((prev) => prev.filter((r) => r.id !== id));
    toast.success(type === "post" ? "Post deleted" : "Reel deleted", { id: toastId });

    // cleanup storage in background
    if (type === "post" && data.image_url) {
      fetch("/api/delete-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.image_url, resourceType: "image" }),
      });
    } else if (type === "reel") {
      if (data.video_url) fetch("/api/delete-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: data.video_url, resourceType: "video" }) });
      if (data.thumbnail_url) fetch("/api/delete-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: data.thumbnail_url, resourceType: "video" }) });
    }
  }

  function openEditCaption() {
    if (!longPressId) return;
    const current = longPressId.type === "post"
      ? (posts.find(p => p.id === longPressId.id) as any)?.caption ?? ""
      : (reels.find(r => r.id === longPressId.id) as any)?.caption ?? "";
    setCaptionInput(current);
    setEditingCaption(true);
    setHiddenNav(true);
  }

  async function saveCaption() {
    if (!longPressId) return;
    setCaptionSaving(true);
    const table = longPressId.type === "post" ? "posts" : "reels";
    const { error } = await supabase.from(table).update({ caption: captionInput.trim() || null }).eq("id", longPressId.id);
    if (error) { toast.error("Failed to update caption"); setCaptionSaving(false); return; }
    if (longPressId.type === "post") setPosts((prev) => prev.map((p) => p.id === longPressId!.id ? { ...p, caption: captionInput.trim() || null } as any : p));
    else setReels((prev) => prev.map((r) => r.id === longPressId!.id ? { ...r, caption: captionInput.trim() || null } as any : r));
    toast.success("Caption updated!");
    setCaptionSaving(false);
    setEditingCaption(false);
    setLongPressId(null);
    setHiddenNav(false);
  }

  async function togglePin(id: string, type: "post" | "reel") {
    setLongPressId(null);
    if (!profile?.id) return;
    const col = type === "post" ? "pinned_post_id" : "pinned_reel_id";
    const current = type === "post" ? pinnedPostId : pinnedReelId;
    const newVal = current === id ? null : id;
    const { error } = await supabase.from("profiles").update({ [col]: newVal }).eq("id", profile.id);
    if (error) return toast.error(error.message);
    if (type === "post") setPinnedPostId(newVal);
    else setPinnedReelId(newVal);
    toast.success(newVal ? "📌 Pinned to profile" : "Unpinned");
  }

  function hlPressStart(hl: {id:string;title:string;cover_url:string|null}) {
    hlLongPressTimer.current = setTimeout(() => {
      setHlLongPress(hl);
      setHiddenNav(true);
    }, 500);
  }
  function hlPressEnd() {
    if (hlLongPressTimer.current) clearTimeout(hlLongPressTimer.current);
  }

  function openHlEdit() {
    if (!hlLongPress) return;
    setHlEditTitle(hlLongPress.title);
    setHlEditCoverPreview(hlLongPress.cover_url);
    setHlEditCoverFile(null);
    setHlEditing(true);
  }

  function handleHlCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setHlEditCoverFile(f);
    setHlEditCoverPreview(URL.createObjectURL(f));
  }

  async function saveHlEdit() {
    if (!hlLongPress || !hlEditTitle.trim()) return;
    setHlSaving(true);
    let coverUrl = hlLongPress.cover_url;
    if (hlEditCoverFile) {
      try {
        const form = new FormData();
        form.append("file", hlEditCoverFile);
        form.append("type", "post");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!data.url) throw new Error(data.error ?? "Upload failed");
        coverUrl = data.url;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Cover upload failed");
        setHlSaving(false);
        return;
      }
    }
    const { error } = await supabase.from("highlights").update({ title: hlEditTitle.trim(), cover_url: coverUrl }).eq("id", hlLongPress.id);
    if (error) { toast.error("Failed to update"); setHlSaving(false); return; }
    setHighlights(prev => prev.map(h => h.id === hlLongPress.id ? { ...h, title: hlEditTitle.trim(), cover_url: coverUrl } : h));
    toast.success("Highlight updated!");
    setHlSaving(false);
    setHlEditing(false);
    setHlLongPress(null);
    setHiddenNav(false);
  }

  async function deleteHighlight() {
    if (!hlLongPress) return;
    const { error } = await supabase.from("highlights").delete().eq("id", hlLongPress.id);
    if (error) { toast.error("Failed to delete"); return; }
    setHighlights(prev => prev.filter(h => h.id !== hlLongPress.id));
    toast.success("Highlight deleted");
    setHlLongPress(null);
    setHiddenNav(false);
  }

  function openDashboard() {
    setShowDashboard(true);
    setHiddenNav(true);
    if (profile?.id && dashPosts.length === 0 && dashReels.length === 0) loadDashboard(profile.id);
  }
  function closeDashboard() { setShowDashboard(false); setHiddenNav(false); }

  function openBadgeDrawer() { setBadgeInput(profile?.badge ?? ""); setShowBadgeModal(true); setHiddenNav(true); }
  function closeBadgeDrawer() { setShowBadgeModal(false); setHiddenNav(false); }

  async function saveBadge(value?: string) {
    if (!profile?.id) return;
    const trimmed = (value !== undefined ? value : badgeInput).trim();
    const { error } = await supabase
      .from("profiles")
      .update({ badge: trimmed || null })
      .eq("id", profile.id);
    if (error) return toast.error(error.message);
    updateProfile({ badge: trimmed || null });
    setShowBadgeModal(false);
    setHiddenNav(false);
    toast.success(trimmed ? `Badge set to "${trimmed}"` : "Badge removed");
  }

  async function saveBio() {
    if (!profile?.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ bio: bio.trim() })
      .eq("id", profile.id);

    if (error) return toast.error(error.message);
    updateProfile({ bio: bio.trim() });
    setEditingBio(false);
    toast.success("Bio updated!");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Floating menu removed — hamburger navigates to /menu page */}

      {/* Cover */}
      <div className="relative h-44 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {profile?.cover_url ? (
          <Image src={ikUrl(profile.cover_url)} alt="cover" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-zinc-900" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
        {/* Hamburger — navigates to menu page */}
        <button
          onClick={() => router.push("/menu")}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button onClick={() => coverRef.current?.click()} className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-purple-600 transition">
          <AiOutlineCamera size={18} />
        </button>
        <input ref={coverRef} type="file" accept="image/*" onChange={uploadCover} className="hidden" />
      </div>

      <div className="relative px-4">
        {/* Avatar overlaps cover */}
        <div className="absolute -top-14 left-4">
          <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-zinc-800 shadow-xl">
            {profile?.avatar_url ? (
              <Image src={ikUrl(profile.avatar_url)} alt="avatar" width={112} height={112} className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                {profile?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <button onClick={() => avatarRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 bg-purple-600 rounded-full text-white hover:bg-purple-700 transition">
            <AiOutlineCamera size={14} />
          </button>
          <input ref={avatarRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
        </div>

        {/* Spacer for avatar */}
        <div className="pt-16">
          {/* Username */}
          <div className="mt-1">
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-lg font-bold">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  minLength={3} maxLength={30} autoFocus
                />
                <button onClick={saveUsername} className="p-1.5 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition">
                  <AiOutlineCheck size={16} />
                </button>
                <button onClick={() => { setEditingUsername(false); setUsername(profile?.username ?? ""); }} className="p-1.5 bg-zinc-800 rounded-lg text-white hover:bg-zinc-700 transition">
                  <AiOutlineClose size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">@{profile?.username}</h2>
                {isVerified && <VerifiedBadge size={20} />}
                {profile?.badge && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/40 text-purple-200 font-semibold tracking-wide">
                    {profile.badge}
                  </span>
                )}
                <button onClick={() => setEditingUsername(true)} className="text-zinc-500 hover:text-purple-400 transition">
                  <AiOutlineEdit size={16} />
                </button>
                <button onClick={openBadgeDrawer} className="text-zinc-500 hover:text-yellow-400 transition" title="Set badge">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                </button>
                {isSpecialUser && (
                  <button
                    onClick={() => router.push("/admin")}
                    title="Admin Panel"
                    className="text-blue-400 hover:text-blue-300 transition"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mt-2">
            {editingBio ? (
              <div className="flex flex-col gap-2">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={150} placeholder="Write your bio..." className="w-full px-3 py-2 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                <div className="flex gap-2">
                  <button onClick={saveBio} className="flex items-center gap-1 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition">
                    <AiOutlineCheck size={14} /> Save
                  </button>
                  <button onClick={() => { setEditingBio(false); setBio(profile?.bio ?? ""); }} className="flex items-center gap-1 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition">
                    <AiOutlineClose size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-zinc-400 text-sm flex-1">{profile?.bio || <span className="italic text-zinc-600">No bio yet</span>}</p>
                <button onClick={() => setEditingBio(true)} className="text-zinc-500 hover:text-purple-400 transition mt-0.5">
                  <AiOutlineEdit size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Followers / Following */}
          <div className="flex gap-6 mt-3">
            <button onClick={() => setShowFollowModal("followers")} className="text-center hover:opacity-80 transition">
              <p className="text-white font-bold text-lg leading-tight">{followersCount}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Followers</p>
            </button>
            <button onClick={() => setShowFollowModal("following")} className="text-center hover:opacity-80 transition">
              <p className="text-white font-bold text-lg leading-tight">{followingCount}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Following</p>
            </button>
          </div>

          {/* Dashboard card — only show if user has posts or reels */}
          {(posts.length > 0 || reels.length > 0) && <button
            onClick={openDashboard}
            className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-zinc-400 text-xs font-medium">Total Views</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">
                {totalViews === null ? "—" : totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + "K" : totalViews}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800 mt-5" />

      {/* Highlights row */}
      {highlights.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {highlights.map((hl) => (
              <button
                key={hl.id}
                onClick={() => router.push(`/highlights/${hl.id}`)}
                onMouseDown={() => hlPressStart(hl)}
                onMouseUp={hlPressEnd}
                onMouseLeave={hlPressEnd}
                onTouchStart={() => hlPressStart(hl)}
                onTouchEnd={hlPressEnd}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-600 bg-zinc-800">
                  {hl.cover_url ? (
                    <Image src={ikUrl(hl.cover_url, { w: 128, h: 128, q: 80 })} alt={hl.title} width={64} height={64} className="object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-400 truncate w-16 text-center">{hl.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        <button onClick={() => setTab("posts")} className={`flex-1 py-3 flex items-center justify-center gap-1.5 transition border-b-2 ${tab === "posts" ? "border-purple-500 text-white" : "border-transparent text-zinc-500"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <span className={`text-xs font-bold ${tab === "posts" ? "text-purple-400" : "text-zinc-500"}`}>{posts.length}</span>
        </button>
        <button onClick={() => setTab("reels")} className={`flex-1 py-3 flex items-center justify-center gap-1.5 transition border-b-2 ${tab === "reels" ? "border-purple-500 text-white" : "border-transparent text-zinc-500"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className={`text-xs font-bold ${tab === "reels" ? "text-purple-400" : "text-zinc-500"}`}>{reels.length}</span>
        </button>
        <button onClick={() => setTab("reposts")} className={`flex-1 py-3 flex items-center justify-center gap-1.5 transition border-b-2 ${tab === "reposts" ? "border-purple-500 text-white" : "border-transparent text-zinc-500"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span className={`text-xs font-bold ${tab === "reposts" ? "text-purple-400" : "text-zinc-500"}`}>{reposts.length}</span>
        </button>
      </div>

      {/* Posts grid */}
      {tab === "posts" && (() => {
        const sorted = pinnedPostId
          ? [posts.find(p => p.id === pinnedPostId)!, ...posts.filter(p => p.id !== pinnedPostId)]
          : posts;
        return (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {sorted.map((post) => {
              const isPinned = post.id === pinnedPostId;
              return (
                <div
                  key={post.id}
                  className="relative aspect-square bg-zinc-900 group overflow-hidden"
                  onMouseDown={() => handleLongPressStart(post.id, "post")}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(post.id, "post")}
                  onTouchEnd={handleLongPressEnd}
                >
                  <Image src={ikUrl(post.image_url, { w: 300, h: 300, q: 70 })} alt="post" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="33vw" unoptimized />
                  {isPinned && (
                    <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-full p-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22" />
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {posts.length === 0 && <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg><p className="text-sm">No posts yet</p></div>}
          </div>
        );
      })()}

      {/* Reels grid */}
      {tab === "reels" && (() => {
        const sorted = pinnedReelId
          ? [reels.find(r => r.id === pinnedReelId)!, ...reels.filter(r => r.id !== pinnedReelId)]
          : reels;
        return (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {sorted.map((reel) => {
              const isPinned = reel.id === pinnedReelId;
              return (
                <div
                  key={reel.id}
                  className="relative aspect-[9/16] bg-zinc-900 group overflow-hidden"
                  onMouseDown={() => handleLongPressStart(reel.id, "reel")}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(reel.id, "reel")}
                  onTouchEnd={handleLongPressEnd}
                >
                  {reel.thumbnail_url ? (
                    <Image src={reel.thumbnail_url} alt="reel" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="33vw" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-zinc-900" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <BsFillPlayFill size={24} className="text-white/80" />
                  </div>
                  {isPinned && (
                    <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-full p-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22" />
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
            {reels.length === 0 && <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg><p className="text-sm">No reels yet</p></div>}
          </div>
        );
      })()}

      {/* Reposts grid */}
      {tab === "reposts" && (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {reposts.map((r) => (
            <div
              key={r.id}
              className="relative aspect-[9/16] bg-zinc-900 group overflow-hidden cursor-pointer"
              onClick={() => router.push(`/reels?id=${r.reel.id}`)}
            >
              {r.reel.thumbnail_url ? (
                <Image src={r.reel.thumbnail_url} alt="repost" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="33vw" unoptimized />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <BsFillPlayFill size={24} className="text-white/80" />
              </div>
              {r.emoji && (
                <div className="absolute top-1.5 right-1.5 text-lg leading-none">{r.emoji}</div>
              )}
              {/* repost icon badge */}
              <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-full p-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
            </div>
          ))}
          {reposts.length === 0 && (
            <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <p className="text-sm">No reposts yet</p>
            </div>
          )}
        </div>
      )}

      {/* Long-press options sheet */}
      {longPressId && !editingCaption && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setLongPressId(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 pb-8 flex flex-col gap-2 max-w-lg mx-auto">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />
            <button
              onClick={() => togglePin(longPressId.id, longPressId.type)}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-white text-sm font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
              </svg>
              {(longPressId.type === "post" ? pinnedPostId : pinnedReelId) === longPressId.id ? "Unpin from profile" : "Pin to profile"}
            </button>
            <button
              onClick={openEditCaption}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-white text-sm font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Caption
            </button>
            <button
              onClick={() => deletePostOrReel(longPressId.id, longPressId.type)}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-red-400 text-sm font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete
            </button>
            <button
              onClick={() => setLongPressId(null)}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-zinc-400 text-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Edit caption sheet */}
      {editingCaption && longPressId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70" onClick={() => { setEditingCaption(false); setLongPressId(null); setHiddenNav(false); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 pb-10 max-w-lg mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
            <h3 className="text-white font-bold text-base text-center">Edit Caption</h3>
            <textarea
              value={captionInput}
              onChange={e => setCaptionInput(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Write a caption..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder-zinc-500"
            />
            <div className="flex gap-3">
              <button onClick={() => { setEditingCaption(false); setLongPressId(null); setHiddenNav(false); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition">Cancel</button>
              <button onClick={saveCaption} disabled={captionSaving} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition">
                {captionSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      {showFollowModal && profile && (
        <FollowersModal
          userId={profile.id}
          type={showFollowModal}
          onClose={() => setShowFollowModal(null)}
          isOwner
        />
      )}

      {/* Highlight long-press sheet */}
      {hlLongPress && !hlEditing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => { setHlLongPress(null); setHiddenNav(false); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 pb-10 flex flex-col gap-2 max-w-lg mx-auto">
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />
            {/* Preview */}
            <div className="flex items-center gap-3 px-2 pb-3 border-b border-zinc-800">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                {hlLongPress.cover_url ? (
                  <Image src={ikUrl(hlLongPress.cover_url, { w: 96, h: 96, q: 80 })} alt={hlLongPress.title} width={48} height={48} className="object-cover" unoptimized onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
                  </div>
                )}
              </div>
              <span className="text-white font-semibold">{hlLongPress.title}</span>
            </div>
            <button onClick={openHlEdit} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-white text-sm font-medium">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Highlight
            </button>
            <button onClick={deleteHighlight} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-red-400 text-sm font-medium">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Delete Highlight
            </button>
            <button onClick={() => { setHlLongPress(null); setHiddenNav(false); }} className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-zinc-800 transition text-zinc-400 text-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Highlight edit modal */}
      {hlEditing && hlLongPress && (
        <>
          <div className="fixed inset-0 z-50 bg-black/80" onClick={() => { setHlEditing(false); setHlLongPress(null); setHiddenNav(false); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 pb-10 max-w-lg mx-auto space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
            <h3 className="text-white font-bold text-base text-center">Edit Highlight</h3>

            {/* Cover picker */}
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => hlCoverRef.current?.click()} className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500 bg-zinc-800">
                {hlEditCoverPreview ? (
                  <Image src={hlEditCoverPreview} alt="cover" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
              </button>
              <span className="text-xs text-zinc-500">Tap to change cover</span>
              <input ref={hlCoverRef} type="file" accept="image/*" onChange={handleHlCoverFile} className="hidden" />
            </div>

            {/* Name input */}
            <input
              value={hlEditTitle}
              onChange={e => setHlEditTitle(e.target.value)}
              placeholder="Highlight name"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 placeholder-zinc-500"
            />

            <div className="flex gap-3">
              <button onClick={() => { setHlEditing(false); setHlLongPress(null); setHiddenNav(false); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition">Cancel</button>
              <button onClick={saveHlEdit} disabled={hlSaving || !hlEditTitle.trim()} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition">
                {hlSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Badge Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          showBadgeModal ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            showBadgeModal ? "opacity-70" : "opacity-0"
          }`}
          onClick={() => closeBadgeDrawer()}
        />

        {/* Drawer panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-zinc-950 rounded-t-3xl transition-transform duration-300 ease-out ${
            showBadgeModal ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Profile Badge</p>
                <p className="text-zinc-500 text-xs">Shown next to your username</p>
              </div>
            </div>
            <button onClick={closeBadgeDrawer} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
              <AiOutlineClose size={16} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="px-5 pt-4 overflow-y-auto max-h-[52vh]">

            {/* Live preview */}
            <div className="flex items-center gap-2.5 bg-zinc-900 rounded-2xl px-4 py-3 mb-5 border border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-700 to-zinc-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <span className="text-white font-semibold text-sm">@{profile?.username}</span>
              {badgeInput.trim() ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/40 text-purple-200 font-semibold tracking-wide">
                  {badgeInput.trim()}
                </span>
              ) : (
                <span className="text-xs text-zinc-600 italic">no badge</span>
              )}
            </div>

            {/* Categories */}
            {([
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                ),
                label: "Arts & Performance",
                items: ["Dancer", "Actor", "Musician", "Photographer", "Artist", "Filmmaker"],
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" />
                  </svg>
                ),
                label: "Sports & Fitness",
                items: ["Athlete", "Sports", "Fitness", "Footballer", "Swimmer", "Boxer"],
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                ),
                label: "Digital & Creative",
                items: ["Creator", "Gamer", "Streamer", "Designer", "Developer", "Blogger"],
              },
              {
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l19-9-9 19-2-8-8-2z" />
                  </svg>
                ),
                label: "Lifestyle",
                items: ["Chef", "Traveller", "Model", "Influencer", "Entrepreneur", "Coach"],
              },
            ]).map((cat) => (
              <div key={cat.label} className="mb-5">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-zinc-500">{cat.icon}</span>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">{cat.label}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => setBadgeInput(item)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                        badgeInput === item
                          ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40 scale-105"
                          : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-purple-500/60 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom input */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Custom</p>
              </div>
              <input
                value={badgeInput}
                onChange={(e) => setBadgeInput(e.target.value)}
                placeholder="Type your own badge..."
                maxLength={30}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-zinc-600 transition"
              />
              <p className="text-zinc-600 text-xs mt-1.5 text-right">{badgeInput.length}/30</p>
            </div>
          </div>

          {/* Actions — always visible, outside scroll */}
          <div className="px-5 pt-3 pb-8 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => saveBadge()}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-purple-900/30"
            >
              Save Badge
            </button>
            {profile?.badge && (
              <button
                onClick={() => saveBadge("")}
                className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 rounded-2xl text-sm font-medium transition-all"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard sheet */}
      {showDashboard && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70" onClick={closeDashboard} />
          <div className="fixed inset-0 z-50 flex flex-col bg-black max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="text-white font-bold text-lg">Dashboard</h2>
              <button onClick={closeDashboard} className="p-2 rounded-full hover:bg-zinc-800 transition text-zinc-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Total views summary */}
            <div className="px-4 py-4 border-b border-zinc-900 shrink-0">
              <div className="bg-gradient-to-br from-purple-900/50 to-zinc-900 border border-purple-800/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-xs mb-1">Total Views</p>
                  <p className="text-3xl font-bold text-white">
                    {totalViews === null ? "—" : totalViews >= 1_000_000 ? (totalViews / 1_000_000).toFixed(1) + "M" : totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + "K" : totalViews}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs">Posts</p>
                    <p className="text-white font-semibold text-sm">{dashPosts.reduce((s, p) => s + p.views, 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-zinc-500 text-xs">Reels</p>
                    <p className="text-white font-semibold text-sm">{dashReels.reduce((s, r) => s + r.views, 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {dashLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pb-8">
                {/* Posts */}
                {dashPosts.length > 0 && (
                  <div className="px-4 pt-4">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Posts</p>
                    <div className="flex flex-col gap-2">
                      {dashPosts.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3 py-2.5">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            <Image src={ikUrl(p.image_url, { w: 48, h: 48, q: 70 })} alt="" width={48} height={48} className="object-cover" unoptimized />
                          </div>
                          <p className="flex-1 text-white text-sm truncate">{p.caption || "No caption"}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span className="text-white font-semibold text-sm">{p.views >= 1000 ? (p.views / 1000).toFixed(1) + "K" : p.views}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reels */}
                {dashReels.length > 0 && (
                  <div className="px-4 pt-5">
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Reels</p>
                    <div className="flex flex-col gap-2">
                      {dashReels.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl px-3 py-2.5">
                          <div className="w-9 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            {r.thumbnail_url
                              ? <Image src={r.thumbnail_url} alt="" width={36} height={48} className="object-cover w-full h-full" unoptimized />
                              : <div className="w-full h-full bg-zinc-700" />}
                          </div>
                          <p className="flex-1 text-white text-sm truncate">{r.caption || "No caption"}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span className="text-white font-semibold text-sm">{r.views >= 1000 ? (r.views / 1000).toFixed(1) + "K" : r.views}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPosts.length === 0 && dashReels.length === 0 && (
                  <p className="text-center text-zinc-600 py-20 text-sm">No posts or reels yet</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
