import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { id, userId } = await req.json();
    if (!id || !userId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const { data: reel } = await admin.from("reels").select("user_id, video_url, thumbnail_url").eq("id", id).maybeSingle();
    if (!reel) return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    if (reel.user_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await Promise.all([
      admin.from("reel_likes").delete().eq("reel_id", id),
      admin.from("comments").delete().eq("reel_id", id),
      admin.from("reel_views").delete().eq("reel_id", id),
      admin.from("reel_reposts").delete().eq("reel_id", id),
      admin.from("saved_posts").delete().eq("reel_id", id),
      admin.from("notifications").delete().eq("reel_id", id),
    ]);

    const { error } = await admin.from("reels").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, video_url: reel.video_url, thumbnail_url: reel.thumbnail_url });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
