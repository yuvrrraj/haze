import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Service role client — bypasses RLS
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { id, userId } = await req.json();
    if (!id || !userId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    // Verify the requester owns the post
    const { data: post } = await admin.from("posts").select("user_id, image_url").eq("id", id).maybeSingle();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.user_id !== userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    // Delete related rows then the post
    await Promise.all([
      admin.from("likes").delete().eq("post_id", id),
      admin.from("comments").delete().eq("post_id", id),
      admin.from("post_views").delete().eq("post_id", id),
      admin.from("saved_posts").delete().eq("post_id", id),
      admin.from("notifications").delete().eq("post_id", id),
    ]);

    const { error } = await admin.from("posts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, image_url: post.image_url });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
