"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import toast from "react-hot-toast";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillPlayFill } from "react-icons/bs";
import FollowersModal from "@/components/ui/FollowersModal";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuthStore } from "@/store/authStore";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_private: boolean;
  badge: string | null;
  is_verified: boolean;
  restrict_messages: boolean;
}
interface Post { id: string; image_url: string; }
interface Reel { id: string; thumbnail_url: string | null; }

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [tab, setTab] = useState<"posts" | "reels">("posts");
  const [pinnedPostId, setPinnedPostId] = useState<string | null>(null);
  const [pinnedReelId, setPinnedReelId] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState<"followers" | "following" | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [showMsgRequest, setShowMsgRequest] = useState(false);
  const [msgRequestText, setMsgRequestText] = useState("");
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  const { setHiddenNav } = useAuthStore();

  useEffect(() => { load(); }, [id]);

  async function load() {
    const user = await getCurrentUser();
    setCurrentUserId(user?.id ?? null);
    if (user?.id === id) { router.replace("/profile"); return; }

    const [
      { data: p },
      { data: userPosts },
      { data: userReels },
      { count: followers },
      { count: following },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("posts").select("id, image_url").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("reels").select("id, thumbnail_url").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
    ]);

    setProfile(p ?? null);
    setPosts(userPosts ?? []);
    setReels(userReels ?? []);
    setFollowersCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setPinnedPostId(p?.pinned_post_id ?? null);
    setPinnedReelId(p?.pinned_reel_id ?? null);

    if (user) {
      const [{ data: followRow }, { data: blockRow }, { data: reqRow }, { data: msgReqRow }] = await Promise.all([
        supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle(),
        supabase.from("blocked_users").select("id").eq("blocker_id", user.id).eq("blocked_id", id).maybeSingle(),
        supabase.from("follow_requests").select("id").eq("requester_id", user.id).eq("target_id", id).maybeSingle(),
        supabase.from("message_requests").select("id").eq("sender_id", user.id).eq("receiver_id", id).maybeSingle(),
      ]);
      setIsFollowing(!!followRow);
      setIsBlocked(!!blockRow);
      setHasRequested(!!reqRow);
      setHasSentRequest(!!msgReqRow);
    }
    setLoading(false);
  }

  async function toggleBlock() {
    if (!currentUserId) return;
    setShowDotMenu(false);
    if (isBlocked) {
      await supabase.from("blocked_users").delete().eq("blocker_id", currentUserId).eq("blocked_id", id);
      setIsBlocked(false);
      toast.success("User unblocked");
    } else {
      await supabase.from("blocked_users").insert({ blocker_id: currentUserId, blocked_id: id });
      setIsBlocked(true);
      toast.success("User blocked");
    }
  }

  async function toggleFollow() {
    if (!currentUserId) return toast.error("Sign in to follow");
    setFollowLoading(true);
    // Private account and not yet following — send/cancel request
    if (profile?.is_private && !isFollowing) {
      if (hasRequested) {
        await supabase.from("follow_requests").delete().eq("requester_id", currentUserId).eq("target_id", id);
        setHasRequested(false);
        toast.success("Follow request withdrawn");
      } else {
        await supabase.from("follow_requests").insert({ requester_id: currentUserId, target_id: id });
        setHasRequested(true);
        toast.success("Follow request sent");
      }
      setFollowLoading(false);
      return;
    }
    // Public account or already following — normal follow/unfollow
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", id);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: id });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
    setFollowLoading(false);
  }

  async function sendMsgRequest() {
    if (!currentUserId || !msgRequestText.trim()) return;
    setSendingRequest(true);
    const { error } = await supabase.from("message_requests").upsert({
      sender_id: currentUserId,
      receiver_id: id,
      message: msgRequestText.trim(),
      status: "pending",
    }, { onConflict: "sender_id,receiver_id" });
    setSendingRequest(false);
    if (error) return toast.error("Failed to send request");
    setHasSentRequest(true);
    setShowMsgRequest(false);
    setMsgRequestText("");
    setHiddenNav(false);
    toast.success("Message request sent!");
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black gap-4">
      <p className="text-zinc-400">User not found</p>
      <button onClick={() => router.back()} className="text-purple-400 text-sm">Go back</button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen pb-24">

      {/* Cover photo with back + three-dots overlaid */}
      <div className="relative h-44 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {profile.cover_url ? (
          <Image src={ikUrl(profile.cover_url)} alt="cover" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-zinc-900" />
        )}
        {/* Gradient fade at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />

        {/* Back button — top left */}
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 z-20 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        >
          <AiOutlineArrowLeft size={20} />
        </button>

        {/* Three-dots — top right */}
        <div className="absolute top-3 right-3 z-20" ref={dotMenuRef}>
          <button
            onClick={() => setShowDotMenu((v) => !v)}
            className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {showDotMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDotMenu(false)} />
              <div className="absolute right-0 top-9 z-50 bg-zinc-800 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
                <button
                  onClick={toggleBlock}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  {isBlocked ? "Unblock User" : "Block User"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Avatar — overlaps cover */}
      <div className="relative px-4">
        <div className="absolute -top-14 left-4">
          <div className="w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-zinc-800 shadow-xl">
            {profile.avatar_url ? (
              <Image src={ikUrl(profile.avatar_url)} alt="avatar" width={112} height={112} className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                {profile.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Spacer for avatar overlap */}
        <div className="pt-16">

          {/* Username + badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-white font-bold text-xl">@{profile.username}</h1>
            {profile.is_verified && <VerifiedBadge size={20} />}
            {profile.badge && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/40 text-purple-200 font-semibold tracking-wide">
                {profile.badge}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-zinc-300 text-sm mt-2 leading-relaxed">{profile.bio}</p>
          )}

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

          {/* Follow + Message buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
                isFollowing
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600"
                  : hasRequested
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600"
                  : "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
              }`}
            >
              {followLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : isFollowing ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Following
                </>
              ) : hasRequested ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7" />
                    <polyline points="17 14 19 16 23 12" />
                  </svg>
                  Undo Request
                </>
              ) : profile?.is_private ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="8" r="4" />
                    <path d="M4 20c0-4 3.2-7 8-7" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  Request
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="8" r="4" />
                    <path d="M4 20c0-4 3.2-7 8-7" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  Follow
                </>
              )}
            </button>

            {/* Message button */}
            {profile.is_private && !isFollowing ? (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-600 text-sm font-bold cursor-not-allowed select-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Message
              </div>
            ) : profile.restrict_messages && !isFollowing ? (
              <button
                onClick={() => hasSentRequest ? toast("Request already sent") : (setShowMsgRequest(true), setHiddenNav(true))}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition border ${
                  hasSentRequest
                    ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 cursor-default"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {hasSentRequest ? "Request Sent" : "Message"}
              </button>
            ) : (
              <Link
                href={`/chat?userId=${id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-bold transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Message
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800 mt-5" />

      {/* Tabs + grid — only show if public OR viewer is a follower */}
      {(isFollowing || !profile.is_private) ? (
        <>
      {/* Tabs */}
      <div className="flex">
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${
            tab === "posts"
              ? "text-white border-b-2 border-purple-500"
              : "text-zinc-500 border-b-2 border-transparent"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Posts
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            tab === "posts" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400"
          }`}>{posts.length}</span>
        </button>
        <button
          onClick={() => setTab("reels")}
          className={`flex-1 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${
            tab === "reels"
              ? "text-white border-b-2 border-purple-500"
              : "text-zinc-500 border-b-2 border-transparent"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Reels
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            tab === "reels" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400"
          }`}>{reels.length}</span>
        </button>
      </div>

      {/* Posts grid */}
      {tab === "posts" && (() => {
        const sorted = pinnedPostId
          ? [posts.find(p => p.id === pinnedPostId)!, ...posts.filter(p => p.id !== pinnedPostId)]
          : posts;
        return (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {sorted.map((post) => (
              <div key={post.id} className="relative aspect-square bg-zinc-900 group overflow-hidden">
                <Image
                  src={ikUrl(post.image_url, { w: 300, h: 300, q: 70 })}
                  alt="post" fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="33vw" unoptimized
                />
                {post.id === pinnedPostId && (
                  <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-full p-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {posts.length === 0 && (
              <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                <p className="text-sm">No posts yet</p>
              </div>
            )}
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
            {sorted.map((reel) => (
              <div key={reel.id} className="relative aspect-[9/16] bg-zinc-900 group overflow-hidden">
                {reel.thumbnail_url ? (
                  <Image src={reel.thumbnail_url} alt="reel" fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="33vw" unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <BsFillPlayFill size={28} className="text-white drop-shadow-lg" />
                </div>
                {reel.id === pinnedReelId && (
                  <div className="absolute top-1.5 left-1.5 bg-black/70 rounded-full p-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="17" x2="12" y2="22" />
                      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {reels.length === 0 && (
              <div className="col-span-3 py-20 flex flex-col items-center gap-2 text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                <p className="text-sm">No reels yet</p>
              </div>
            )}
          </div>
        );
      })()}
        </>
      ) : (
        /* Private account locked state */
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-zinc-500">
          <div className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="font-bold text-white text-lg">This account is private</p>
          <p className="text-sm text-zinc-500 text-center px-8">
            {hasRequested
              ? "Your follow request is pending approval"
              : "Follow this account to see their photos and videos"}
          </p>
        </div>
      )}

      {showFollowModal && (
        <FollowersModal
          userId={id}
          type={showFollowModal}
          onClose={() => setShowFollowModal(null)}
        />
      )}

      {/* Message Request Modal */}
      {showMsgRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-zinc-900 rounded-t-2xl w-full max-w-lg p-6 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Send Message Request</h3>
              <button onClick={() => { setShowMsgRequest(false); setHiddenNav(false); }} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="text-zinc-500 text-sm">@{profile?.username} has message requests on. Send one message — they can accept or decline.</p>
            <textarea
              value={msgRequestText}
              onChange={(e) => setMsgRequestText(e.target.value)}
              placeholder="Write your message..."
              rows={3}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
              autoFocus
            />
            <button
              onClick={sendMsgRequest}
              disabled={sendingRequest || !msgRequestText.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition"
            >
              {sendingRequest ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
