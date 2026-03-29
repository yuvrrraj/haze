"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getCurrentUser } from "@/lib/supabase";
import Image from "next/image";
import { ikUrl } from "@/lib/imagekit";
import toast from "react-hot-toast";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface VerifRequest {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  category: string;
  reason: string;
  link1: string;
  link2: string;
  contact_email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  user: { id: string; username: string; avatar_url: string | null; is_verified: boolean } | null;
}

interface SponsorReq {
  id: string;
  user_id: string;
  post_id: string | null;
  reel_id: string | null;
  content_type: "post" | "reel";
  details: string;
  duration_hours: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  expires_at: string | null;
  user: { id: string; username: string; avatar_url: string | null } | null;
  post: { id: string; image_url: string; caption: string | null } | null;
  reel: { id: string; thumbnail_url: string | null; caption: string | null } | null;
}

function timeLeft(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${m}m left`;
}

export default function AdminVerificationPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSpecialUser, setIsSpecialUser] = useState(false);
  const [requests, setRequests] = useState<VerifRequest[]>([]);
  const [sponsorRequests, setSponsorRequests] = useState<SponsorReq[]>([]);
  const [section, setSection] = useState<"verification" | "sponsor">("verification");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const user = await getCurrentUser();
    if (!user) { router.replace("/"); return; }
    setCurrentUserId(user.id);

    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
    if (profile?.username !== "verified") { router.replace("/"); return; }
    setIsSpecialUser(true);

    await Promise.all([loadRequests(user.id), loadSponsorRequests(user.id)]);
    setLoading(false);
  }

  async function loadRequests(uid?: string) {
    const id = uid ?? currentUserId;
    if (!id) return;
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_all", reviewerId: id }),
    });
    const json = await res.json();
    if (json.data) setRequests(json.data as VerifRequest[]);
  }

  async function loadSponsorRequests(uid?: string) {
    const id = uid ?? currentUserId;
    if (!id) return;
    const res = await fetch("/api/sponsor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_all", reviewerId: id }),
    });
    const json = await res.json();
    if (json.data) setSponsorRequests(json.data as unknown as SponsorReq[]);
  }

  async function handleAction(req: VerifRequest, action: "approve" | "reject") {
    if (!currentUserId) return;
    setActioning(req.id);
    const toastId = toast.loading(action === "approve" ? "Approving..." : "Rejecting...");

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: req.id, reviewerId: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(action === "approve" ? "✅ Verified!" : "❌ Rejected", { id: toastId });
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed", { id: toastId });
    }
    setActioning(null);
  }

  async function removeBadge(userId: string) {
    if (!currentUserId) return;
    const toastId = toast.loading("Removing badge...");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_badge", reviewerId: currentUserId, targetUserId: userId, requestId: "none" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Badge removed", { id: toastId });
      await loadRequests();
    } catch {
      toast.error("Failed to remove badge", { id: toastId });
    }
  }

  async function handleSponsorAction(req: SponsorReq, action: "approve" | "reject") {
    if (!currentUserId) return;
    setActioning(req.id);
    const toastId = toast.loading(action === "approve" ? "Approving..." : "Rejecting...");
    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: req.id, reviewerId: currentUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve" ? "✅ Sponsor approved!" : "❌ Rejected", { id: toastId });
      await loadSponsorRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed", { id: toastId });
    }
    setActioning(null);
  }

  async function removeSponsorBadge(req: SponsorReq) {
    if (!currentUserId) return;
    const toastId = toast.loading("Removing badge...");
    try {
      const res = await fetch("/api/sponsor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_badge", requestId: req.id, reviewerId: currentUserId, postId: req.post_id, reelId: req.reel_id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Badge removed", { id: toastId });
      await loadSponsorRequests();
    } catch {
      toast.error("Failed to remove badge", { id: toastId });
    }
  }

  const filteredVerif = requests.filter((r) => r.status === tab);
  const filteredSponsor = sponsorRequests.filter((r) => r.status === tab);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isSpecialUser) return null;

  const pendingVerif = requests.filter(r => r.status === "pending").length;
  const pendingSponsor = sponsorRequests.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800 sticky top-0 bg-black z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Admin Panel</span>
        <span className="ml-auto text-xs text-zinc-500">{pendingVerif + pendingSponsor} pending</span>
      </div>

      {/* Section toggle */}
      <div className="flex gap-2 px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => setSection("verification")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
            section === "verification" ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          <VerifiedBadge size={14} />
          Verification
          {pendingVerif > 0 && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingVerif}</span>}
        </button>
        <button
          onClick={() => setSection("sponsor")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
            section === "sponsor" ? "bg-yellow-500 text-black" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          💰 Sponsor
          {pendingSponsor > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${section === "sponsor" ? "bg-black/20 text-black" : "bg-yellow-500/20 text-yellow-400"}`}>{pendingSponsor}</span>}
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-zinc-800">
        {(["pending", "approved", "rejected"] as const).map((t) => {
          const count = section === "verification"
            ? requests.filter(r => r.status === t).length
            : sponsorRequests.filter(r => r.status === t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition border-b-2 flex items-center justify-center gap-1.5 ${
                tab === t
                  ? section === "verification" ? "text-white border-blue-500" : "text-white border-yellow-500"
                  : "text-zinc-500 border-transparent"
              }`}
            >
              {t}
              {count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  t === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                  t === "approved" ? "bg-green-500/20 text-green-400" :
                  "bg-red-500/20 text-red-400"
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── VERIFICATION SECTION ── */}
      {section === "verification" && (
        filteredVerif.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
            <p className="text-sm">No {tab} verification requests</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {filteredVerif.map((req) => {
              const isExpanded = expanded === req.id;
              const isActioning = actioning === req.id;
              return (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      {req.user?.avatar_url ? (
                        <Image src={ikUrl(req.user.avatar_url, { w: 88, h: 88 })} alt="" width={44} height={44} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base font-bold text-zinc-400 bg-gradient-to-br from-purple-800 to-zinc-700">
                          {req.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-semibold text-sm">@{req.username}</p>
                        {req.user?.is_verified && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-zinc-500 text-xs">{req.full_name} · {req.category}</p>
                    </div>
                    <p className="text-zinc-600 text-xs shrink-0">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>

                  <button onClick={() => setExpanded(isExpanded ? null : req.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 text-sm text-zinc-400 hover:bg-zinc-800 transition mb-3">
                    <span>View Details</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mb-3 flex flex-col gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Reason</p>
                        <p className="text-zinc-300 text-sm leading-relaxed">{req.reason}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Links</p>
                        <a href={req.link1} target="_blank" rel="noopener noreferrer" className="block text-blue-400 text-xs truncate hover:underline">{req.link1}</a>
                        <a href={req.link2} target="_blank" rel="noopener noreferrer" className="block text-blue-400 text-xs truncate hover:underline mt-1">{req.link2}</a>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Contact Email</p>
                        <p className="text-zinc-300 text-xs">{req.contact_email}</p>
                      </div>
                    </div>
                  )}

                  {tab === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req, "approve")} disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-white text-sm font-bold transition">
                        {isActioning ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>✅ Approve</>}
                      </button>
                      <button onClick={() => handleAction(req, "reject")} disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-500/40 disabled:opacity-40 rounded-xl text-zinc-300 hover:text-red-400 text-sm font-bold transition">
                        {isActioning ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>❌ Reject</>}
                      </button>
                    </div>
                  )}
                  {tab === "approved" && req.user?.is_verified && (
                    <button onClick={() => removeBadge(req.user_id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/30 border border-zinc-700 hover:border-red-500/40 rounded-xl text-zinc-400 hover:text-red-400 text-sm font-medium transition">
                      Remove Verified Badge
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── SPONSOR SECTION ── */}
      {section === "sponsor" && (
        filteredSponsor.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
            <p className="text-sm">No {tab} sponsor requests</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {filteredSponsor.map((req) => {
              const isExpanded = expanded === req.id;
              const isActioning = actioning === req.id;
              const thumb = req.content_type === "post"
                ? (req.post?.image_url ? ikUrl(req.post.image_url, { w: 88, h: 88 }) : "")
                : (req.reel?.thumbnail_url ?? "");
              const tLeft = timeLeft(req.expires_at);
              const isExpired = tLeft === "Expired";
              return (
                <div key={req.id} className="px-4 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      {req.user?.avatar_url ? (
                        <Image src={ikUrl(req.user.avatar_url, { w: 80, h: 80 })} alt="" width={40} height={40} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-400 bg-gradient-to-br from-yellow-800 to-zinc-700">
                          {req.user?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">@{req.user?.username}</p>
                      <p className="text-zinc-500 text-xs capitalize">{req.content_type} · {req.duration_hours >= 24 ? `${req.duration_hours / 24}d` : `${req.duration_hours}h`}</p>
                    </div>
                    {thumb && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                        <Image src={thumb} alt="" fill className="object-cover" unoptimized />
                        {req.content_type === "reel" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-zinc-600 text-xs shrink-0">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>

                  {req.status === "approved" && req.expires_at && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${isExpired ? "bg-red-500/10 border border-red-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isExpired ? "text-red-400" : "text-yellow-400"}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className={`text-xs font-semibold ${isExpired ? "text-red-400" : "text-yellow-400"}`}>{tLeft}</span>
                      <span className="text-zinc-600 text-xs ml-auto">Expires {new Date(req.expires_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  <button onClick={() => setExpanded(isExpanded ? null : req.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 text-sm text-zinc-400 hover:bg-zinc-800 transition mb-3">
                    <span>View Details</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mb-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Sponsor Details</p>
                      <p className="text-zinc-300 text-sm leading-relaxed">{req.details}</p>
                    </div>
                  )}

                  {tab === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleSponsorAction(req, "approve")} disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 rounded-xl text-black text-sm font-bold transition">
                        {isActioning ? <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" /> : <>✅ Approve</>}
                      </button>
                      <button onClick={() => handleSponsorAction(req, "reject")} disabled={isActioning}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-500/40 disabled:opacity-40 rounded-xl text-zinc-300 hover:text-red-400 text-sm font-bold transition">
                        {isActioning ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <>❌ Reject</>}
                      </button>
                    </div>
                  )}
                  {tab === "approved" && (
                    <button onClick={() => removeSponsorBadge(req)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/30 border border-zinc-700 hover:border-red-500/40 rounded-xl text-zinc-400 hover:text-red-400 text-sm font-medium transition">
                      Remove Sponsored Badge
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
