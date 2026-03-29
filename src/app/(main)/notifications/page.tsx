"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import toast from "react-hot-toast";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface Actor { id: string; username: string; avatar_url: string | null; }
interface Notification {
  id: string; type: string; is_read: boolean; created_at: string;
  actor_id: string; post_id: string | null; reel_id: string | null; story_id: string | null;
  actor: Actor | null;
  post: { image_url: string } | null;
  reel: { thumbnail_url: string } | null;
}
interface FollowRequest {
  id: string; requester_id: string; created_at: string;
  requester: { username: string; avatar_url: string | null } | null;
}

function typeLabel(type: string): string {
  switch (type) {
    case "follow":            return "started following you";
    case "follow_request":    return "requested to follow you";
    case "request_approved":  return "accepted your follow request";
    case "request_declined":  return "declined your follow request";
    case "like_post":         return "liked your post";
    case "like_reel":         return "liked your reel";
    case "comment_post":      return "commented on your post";
    case "comment_reel":      return "commented on your reel";
    case "like_story":              return "liked your story";
    case "verified":                return "your account has been verified! 🎉";
    case "verification_rejected":   return "your verification request was not approved";
    case "sponsor_approved":        return "your sponsor request has been approved! 💰";
    case "sponsor_rejected":        return "your sponsor request was not approved";
    default:                        return "interacted with you";
  }
}

function TypeIcon({ type }: { type: string }) {
  if (type === "follow" || type === "follow_request") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={type === "follow_request" ? "text-yellow-400" : "text-purple-400"}>
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
  if (type === "request_approved") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
  if (type === "request_declined") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
  if (type === "like_post" || type === "like_reel" || type === "like_story") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
  if (type === "comment_post" || type === "comment_reel") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
  if (type === "verified") return <VerifiedBadge size={12} />;
  if (type === "verification_rejected") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
  if (type === "sponsor_approved") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  );
  if (type === "sponsor_rejected") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"activity" | "requests">("activity");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [notifRes, reqRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(id, username, avatar_url), post:posts(image_url), reel:reels(thumbnail_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("follow_requests")
        .select("id, requester_id, created_at, requester:profiles!follow_requests_requester_id_fkey(username, avatar_url)")
        .eq("target_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const list = (notifRes.data ?? []).map((n) => ({
      ...n,
      actor: Array.isArray(n.actor) ? n.actor[0] ?? null : n.actor,
      post: Array.isArray(n.post) ? n.post[0] ?? null : n.post,
      reel: Array.isArray(n.reel) ? n.reel[0] ?? null : n.reel,
    })) as Notification[];

    setNotifications(list);
    setRequests((reqRes.data ?? []) as unknown as FollowRequest[]);
    setLoading(false);

    // If there are requests, default to requests tab
    if ((reqRes.data ?? []).length > 0) setTab("requests");

    // Mark all notifications as read
    await supabase.from("notifications").update({ is_read: true })
      .eq("user_id", user.id).eq("is_read", false);
  }

  async function approveRequest(req: FollowRequest) {
    if (!currentUserId) return;
    setActioning(req.id);
    const { error } = await supabase.from("follows").insert({ follower_id: req.requester_id, following_id: currentUserId });
    if (error) {
      toast.error("Failed to approve request");
      setActioning(null);
      return;
    }
    // Trigger handles deleting follow_request + sending approved notification
    setNotifications((prev) => prev.filter((n) => !(n.type === "follow_request" && n.actor_id === req.requester_id)));
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast.success("Request approved");
    setActioning(null);
  }

  async function declineRequest(req: FollowRequest) {
    setActioning(req.id);
    await supabase.from("follow_requests").delete().eq("id", req.id);
    setNotifications((prev) => prev.filter((n) => !(n.type === "follow_request" && n.actor_id === req.requester_id)));
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    toast.success("Request declined");
    setActioning(null);
  }

  function handleClick(n: Notification) {
    if (n.type === "verified" || n.type === "verification_rejected") {
      router.push("/profile");
      return;
    }
    if (n.type === "sponsor_approved" || n.type === "sponsor_rejected") {
      router.push("/settings/sponsor");
      return;
    }
    if (n.type === "follow" || n.type === "follow_request" || n.type === "request_approved" || n.type === "request_declined") {
      router.push(`/profile/${n.actor_id}`);
    } else if (n.post_id) {
      if (n.type === "comment_post") sessionStorage.setItem("openComments", JSON.stringify({ type: "post", id: n.post_id }));
      router.push("/feed");
    } else if (n.reel_id) {
      if (n.type === "comment_reel") sessionStorage.setItem("openComments", JSON.stringify({ type: "reel", id: n.reel_id }));
      router.push("/reels");
    }
  }

  // Activity tab excludes follow_request type (those go to Requests tab)
  const activityNotifs = notifications.filter((n) => n.type !== "follow_request");

  return (
    <div className="max-w-lg mx-auto bg-black min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-black border-b border-zinc-900">
        <div className="px-4 py-4">
          <h1 className="text-white font-bold text-xl">Notifications</h1>
        </div>
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setTab("activity")}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${tab === "activity" ? "text-white border-purple-500" : "text-zinc-500 border-transparent"}`}
          >
            Activity
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 flex items-center justify-center gap-2 ${tab === "requests" ? "text-white border-purple-500" : "text-zinc-500 border-transparent"}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "requests" ? (
        /* ── Requests tab ── */
        requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p className="text-sm">No follow requests</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => router.push(`/profile/${req.requester_id}`)} className="shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800">
                    {req.requester?.avatar_url ? (
                      <Image src={ikUrl(req.requester.avatar_url, { w: 88, h: 88 })} alt="" width={44} height={44} className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                        {req.requester?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">
                    <span className="font-semibold">@{req.requester?.username ?? "Someone"}</span>
                    {" "}requested to follow you
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">{timeAgo(req.created_at)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approveRequest(req)}
                    disabled={actioning === req.id}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-40"
                  >
                    {actioning === req.id ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin inline-block" /> : "Confirm"}
                  </button>
                  <button
                    onClick={() => declineRequest(req)}
                    disabled={actioning === req.id}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Activity tab ── */
        activityNotifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {activityNotifs.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-900 ${
                  n.type === "verified" ? "bg-blue-950/20" :
                  n.type === "verification_rejected" ? "bg-red-950/20" :
                  !n.is_read ? "bg-purple-950/20" : ""
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800">
                    {n.actor?.avatar_url ? (
                      <Image src={ikUrl(n.actor.avatar_url, { w: 88, h: 88 })} alt={n.actor.username} width={44} height={44} className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                        {n.actor?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-950 flex items-center justify-center">
                    <TypeIcon type={n.type} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-snug">
                    <span className="font-semibold">@{n.actor?.username ?? "Someone"}</span>
                    {" "}{typeLabel(n.type)}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {(n.post?.image_url || n.reel?.thumbnail_url) && (
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-zinc-800 shrink-0 relative">
                    <Image
                      src={n.post?.image_url ? ikUrl(n.post.image_url, { w: 112, h: 112, q: 80 }) : n.reel!.thumbnail_url}
                      alt="" fill className="object-cover" unoptimized={!!n.reel?.thumbnail_url}
                    />
                    {n.reel?.thumbnail_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                      </div>
                    )}
                  </div>
                )}
                {!n.is_read && !(n.post?.image_url || n.reel?.thumbnail_url) && (
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
