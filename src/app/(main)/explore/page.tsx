import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { ikUrl } from "@/lib/imagekit";
import Link from "next/link";
import { AiOutlinePlayCircle } from "react-icons/ai";
import UserSearch from "@/components/explore/UserSearch";
import MusicSection from "@/components/explore/MusicSection";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [{ data: posts }, { data: reels }] = await Promise.all([
    supabase.from("posts").select("id, image_url, likes_count").order("likes_count", { ascending: false }).limit(30),
    supabase.from("reels").select("id, thumbnail_url, likes_count").order("likes_count", { ascending: false }).limit(15),
  ]);

  // Merge and shuffle by likes
  const grid = [
    ...(posts ?? []).map((p) => ({ ...p, _type: "post" as const })),
    ...(reels ?? []).map((r) => ({ ...r, image_url: r.thumbnail_url, _type: "reel" as const })),
  ].sort((a, b) => b.likes_count - a.likes_count);

  return (
    <main>
      <UserSearch />
      <MusicSection />
      <div className="p-1 grid grid-cols-3 gap-0.5">
        {grid.map((item) => (
          <Link
            key={item.id}
            href={item._type === "reel" ? "/reels" : `/feed?post=${item.id}`}
            className="relative aspect-square bg-zinc-800"
          >
            {item.image_url ? (
              <Image
                src={ikUrl(item.image_url, { w: 300, h: 300, q: 70 })}
                alt="media"
                fill
                className="object-cover"
                sizes="33vw"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800" />
            )}
            {item._type === "reel" && (
              <div className="absolute top-1.5 right-1.5">
                <AiOutlinePlayCircle size={20} className="text-white drop-shadow" />
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
