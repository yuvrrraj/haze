"use client";
import { Post, Reel, Story } from "@/types";
import PostCard from "@/components/feed/PostCard";
import ReelCard from "@/components/feed/ReelCard";
import StoriesBar from "@/components/stories/StoriesBar";

export default function FeedClient({ posts, reels, stories }: { posts: Post[]; reels: Reel[]; stories: Story[] }) {
  const feed = [
    ...posts.map((p) => ({ ...p, _type: "post" as const })),
    ...reels.map((r) => ({ ...r, _type: "reel" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <StoriesBar stories={stories} />
      <div className="flex flex-col gap-0">
        {feed.map((item, i) =>
          item._type === "post" ? (
            <PostCard key={item.id} post={item as Post} index={i} />
          ) : (
            <ReelCard key={item.id} reel={item as Reel} />
          )
        )}
      </div>
    </>
  );
}
