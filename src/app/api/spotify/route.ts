import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const CATEGORIES = [
  { label: "Bollywood", term: "bollywood hits 2024" },
  { label: "Sad",       term: "sad songs hindi heartbreak" },
  { label: "Haryanvi",  term: "haryanvi songs dj" },
  { label: "Romantic",  term: "romantic hindi love songs" },
  { label: "Party",     term: "party dance hits 2024" },
  { label: "Hip-Hop",   term: "hindi rap hip hop" },
  { label: "Pop",       term: "english pop hits 2024" },
];

function mapTrack(t: any) {
  return {
    id: String(t.trackId),
    name: t.trackName,
    artist: t.artistName,
    album: t.collectionName ?? "",
    cover: t.artworkUrl100 ?? t.artworkUrl60 ?? null,
    preview_url: t.previewUrl ?? null,
    duration_ms: t.trackTimeMillis ?? 0,
  };
}

async function fetchByTerm(term: string, limit = 8) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return (data.results ?? []).map(mapTrack);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const q         = req.nextUrl.searchParams.get("q");
  const suggested = req.nextUrl.searchParams.get("suggested");
  const category  = req.nextUrl.searchParams.get("category");

  // All categories — "Suggested for you"
  if (suggested) {
    const results = await Promise.all(
      CATEGORIES.map(async (cat) => ({
        label: cat.label,
        tracks: await fetchByTerm(cat.term, 8),
      }))
    );
    return NextResponse.json({ categories: results });
  }

  // Single category
  if (category) {
    const cat = CATEGORIES.find((c) => c.label === category);
    if (!cat) return NextResponse.json({ tracks: [] });
    return NextResponse.json({ tracks: await fetchByTerm(cat.term, 15) });
  }

  // Search
  if (!q) return NextResponse.json({ tracks: [] });
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=15`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`iTunes error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ tracks: (data.results ?? []).map(mapTrack) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Music search error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
