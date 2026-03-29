"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { ikUrl } from "@/lib/imagekit";
import { chatApi } from "@/app/(main)/chat/page";
import toast from "react-hot-toast";

interface MsgRequest {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: { username: string; avatar_url: string | null } | null;
}

function isCloudinary(url: string) { return url.includes("cloudinary.com"); }

export default function MessageRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MsgRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const user = await getCurrentUser();
    if (!user) return;
    const { data } = await supabase
      .from("message_requests")
      .select("id, sender_id, message, created_at, sender:profiles!message_requests_sender_id_fkey(username, avatar_url)")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests((data ?? []).map((r: any) => ({
      ...r,
      sender: Array.isArray(r.sender) ? r.sender[0] ?? null : r.sender,
    })));
    setLoading(false);
  }

  async function accept(req: MsgRequest) {
    setActing(req.id);
    // Update request status
    await supabase.from("message_requests").update({ status: "accepted" }).eq("id", req.id);
    // Open or create conversation
    const data = await chatApi("get_or_create_conversation", { otherUserId: req.sender_id });
    setActing(null);
    if (data?.conversationId) {
      toast.success("Request accepted!");
      router.push(`/dm/${data.conversationId}`);
    } else {
      toast.error("Could not open conversation");
    }
  }

  async function reject(req: MsgRequest) {
    setActing(req.id);
    await supabase.from("message_requests").update({ status: "rejected" }).eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setActing(null);
    toast.success("Request declined");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800 sticky top-0 bg-black z-10">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <span className="font-bold text-lg">Message Requests</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-600">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className="text-sm">No message requests</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900 max-w-lg mx-auto">
          {requests.map((req) => {
            const avatar = req.sender?.avatar_url ?? null;
            const isActing = acting === req.id;
            return (
              <div key={req.id} className="flex items-start gap-3 px-4 py-4">
                <button onClick={() => router.push(`/profile/${req.sender_id}`)} className="shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                    {avatar ? (
                      <Image
                        src={isCloudinary(avatar) ? avatar : ikUrl(avatar, { w: 96, h: 96 })}
                        alt={req.sender?.username ?? ""}
                        width={48} height={48}
                        className="object-cover"
                        unoptimized={isCloudinary(avatar)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-400">
                        {req.sender?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">@{req.sender?.username ?? "Unknown"}</p>
                  <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">{req.message}</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {new Date(req.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => accept(req)}
                      disabled={isActing}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
                    >
                      {isActing ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => reject(req)}
                      disabled={isActing}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
                    >
                      {isActing ? "..." : "Decline"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
