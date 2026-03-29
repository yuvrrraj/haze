"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Track {
  id: string;
  name: string;
  artist: string;
  cover: string | null;
  preview_url: string | null;
}

interface Category {
  label: string;
  tracks: Track[];
}

function CategoryIcon({ label, size = 11 }: { label: string; size?: number }) {
  const s = size;
  if (label === "All") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
  if (label === "Bollywood") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20"/><path d="M2 7h5"/><path d="M2 12h20"/><path d="M2 17h5"/><path d="M17 2v10"/>
    </svg>
  );
  if (label === "Sad") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
  if (label === "Haryanvi") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3a3 3 0 0 1 3 3v12a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M18 3a3 3 0 0 1 3 3v12a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M9 12h6"/>
    </svg>
  );
  if (label === "Romantic") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );
  if (label === "Party") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
    </svg>
  );
  if (label === "Hip-Hop") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  );
  if (label === "Pop") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
  return null;
}

function Skeleton() {
  return (
    <div className="flex-shrink-0 w-28 flex flex-col items-center gap-1.5">
      <div className="w-28 h-28 rounded-xl bg-zinc-800 animate-pulse" />
      <div className="h-3 w-20 rounded bg-zinc-800 animate-pulse" />
      <div className="h-3 w-14 rounded bg-zinc-700 animate-pulse" />
    </div>
  );
}

export default function MusicSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/spotify?suggested=1")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  function toggle(track: Track) {
    if (!track.preview_url) return;
    if (playingId === track.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    audioRef.current?.pause();
    audioRef.current = new Audio(track.preview_url);
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(track.id);
  }

  const tabs = ["All", ...categories.map((c) => c.label)];
  const visibleTracks: Track[] = activeTab === "All"
    ? categories.flatMap((c) => c.tracks)
    : categories.find((c) => c.label === activeTab)?.tracks ?? [];

  return (
    <div className="py-2">
      {/* Header */}
      <div className="px-3 mb-2">
        <p className="text-white text-sm font-bold">Suggested for you</p>
        <p className="text-zinc-500 text-xs mt-0.5">Pick a song to add to your post</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-3 overflow-x-auto scrollbar-hide pb-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 h-7 w-20 rounded-full bg-zinc-800 animate-pulse" />
            ))
          : tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                  activeTab === tab ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <CategoryIcon label={tab} size={11} />
                {tab}
              </button>
            ))}
      </div>

      {/* Track cards */}
      <div className="flex gap-3 px-3 overflow-x-auto pb-2 scrollbar-hide">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
          : visibleTracks.length === 0
          ? <p className="text-zinc-500 text-xs py-4">No songs found</p>
          : visibleTracks.map((track) => {
              const playing = playingId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggle(track)}
                  className="flex-shrink-0 w-28 flex flex-col items-center gap-1.5 group"
                >
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-zinc-800">
                    {track.cover ? (
                      <Image src={track.cover} alt={track.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
                        </svg>
                      </div>
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${playing ? "bg-black/50" : "bg-black/0 group-hover:bg-black/40"}`}>
                      {playing
                        ? <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="28" height="28" viewBox="0 0 24 24" fill="white" className="opacity-0 group-hover:opacity-100 transition"><polygon points="5,3 19,12 5,21"/></svg>
                      }
                    </div>
                    {playing && (
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center items-end gap-0.5">
                        {[6, 10, 8, 12, 7].map((h, i) => (
                          <div key={i} className="w-1 bg-green-400 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i * 0.08}s` }} />
                        ))}
                      </div>
                    )}
                    {!track.preview_url && (
                      <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
                        <span className="text-[9px] bg-black/70 text-zinc-400 px-1.5 py-0.5 rounded-full">No preview</span>
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-medium truncate w-full text-center leading-tight">{track.name}</p>
                  <p className="text-zinc-500 text-xs truncate w-full text-center leading-tight">{track.artist}</p>
                </button>
              );
            })}
      </div>
    </div>
  );
}
