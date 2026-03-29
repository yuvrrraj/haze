"use client";
import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReelPlayer from "@/components/reels/ReelPlayer";
import { Reel } from "@/types";

function ReelsInner() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");
  const [reels, setReels] = useState<Reel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("reels")
      .select("*, user:profiles!reels_user_id_fkey(*)")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setReels((data ?? []) as Reel[]));
  }, []);

  useEffect(() => {
    if (!targetId || reels.length === 0) return;
    const idx = reels.findIndex((r) => r.id === targetId);
    if (idx === -1) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = idx * window.innerHeight;
  }, [targetId, reels]);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black">
      {reels.map((reel, i) => (
        <ReelPlayer key={reel.id} reel={reel} preload={i < 2} />
      ))}
    </div>
  );
}

export default function ReelsPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReelsInner />
    </Suspense>
  );
}
