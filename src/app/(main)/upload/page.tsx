"use client";
import React, { useState, useRef } from "react";
import UploadPost from "@/components/upload/UploadPost";
import UploadReel from "@/components/upload/UploadReel";
import UploadStory from "@/components/upload/UploadStory";

type Tab = "post" | "reel" | "story";

const PostIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const ReelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
  </svg>
);

const StoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {/* outer dashed ring - ringlight effect */}
    <circle cx="12" cy="12" r="11" strokeWidth="2" strokeDasharray="3 2"/>
    {/* inner ring */}
    <circle cx="12" cy="12" r="7.5" strokeWidth="1.5"/>
    {/* center dot */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
  </svg>
);

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "post",  label: "Post",  icon: <PostIcon /> },
  { key: "reel",  label: "Reel",  icon: <ReelIcon /> },
  { key: "story", label: "Story", icon: <StoryIcon /> },
];

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>("post");
  const storyInputRef = useRef<HTMLInputElement>(null);

  function handleTabClick(key: Tab) {
    setTab(key);
    if (key === "story") {
      setTimeout(() => storyInputRef.current?.click(), 50);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <h2 className="text-xl font-bold text-white mb-4">Create</h2>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === t.key
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "post" && <UploadPost />}
      {tab === "reel" && <UploadReel />}
      {tab === "story" && <UploadStory directInputRef={storyInputRef} />}
    </div>
  );
}
