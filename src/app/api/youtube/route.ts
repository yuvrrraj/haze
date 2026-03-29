import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ items: [] });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key === "YOUR_YOUTUBE_API_KEY_HERE") {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(q)}&key=${key}&maxResults=15`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
    const data = await res.json();

    const items = (data.items ?? []).map((item: any) => ({
      id: item.id.videoId,
      name: item.snippet.title,
      artist: item.snippet.channelTitle,
      cover: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    }));

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "YouTube search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
