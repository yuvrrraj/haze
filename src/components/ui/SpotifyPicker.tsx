"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  cover: string | null;
  preview_url: string | null;
  duration_ms: number;
  start_offset?: number;
  youtube_video_id?: string;
}

interface Category {
  label: string;
  tracks: SpotifyTrack[];
}

function CategoryIcon({ label, size = 12 }: { label: string; size?: number }) {
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

interface Props {
  onSelect: (track: SpotifyTrack | null) => void;
  selected: SpotifyTrack | null;
  forceOpen?: boolean;
  onClose?: () => void;
}

function waveHeight(i: number): number {
  return 20 + Math.sin(i * 0.8) * 10 + Math.sin(i * 2.1) * 8 + Math.sin(i * 5.3) * 5;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Trim Screen ───────────────────────────────────────────────────────────────
function TrimScreen({ track, onConfirm, onBack }: {
  track: SpotifyTrack;
  onConfirm: (track: SpotifyTrack) => void;
  onBack: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const ytStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullDuration = track.duration_ms > 0 ? track.duration_ms / 1000 : 210;
  const DURATIONS = [5, 15, 30, 45, 60, 90];
  const [clipLen, setClipLen] = useState(30);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const PREVIEW_DURATION = 30;
  const BARS = 120;

  const [windowStart, setWindowStart] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWindow = useRef(0);
  const windowStartRef = useRef(0);
  const clipLenRef = useRef(30);
  const playingRef = useRef(false);

  function setWindowStartSynced(v: number) { setWindowStart(v); windowStartRef.current = v; }
  function setClipLenSynced(v: number) { setClipLen(v); clipLenRef.current = v; }
  function setPlayingSynced(v: boolean) { setPlaying(v); playingRef.current = v; }

  const ytTrimIframe = useRef<HTMLIFrameElement | null>(null);

  function clearYTTimer() {
    if (ytStopTimer.current) { clearInterval(ytStopTimer.current); ytStopTimer.current = null; }
  }

  function stopYTTrim() {
    clearYTTimer();
    if (ytTrimIframe.current) { ytTrimIframe.current.src = ""; ytTrimIframe.current.remove(); ytTrimIframe.current = null; }
    setPlayingSynced(false);
  }

  function playYTClip(start: number, end: number) {
    stopYTTrim();
    const iframe = document.createElement("iframe");
    iframe.width = "1"; iframe.height = "1";
    iframe.style.cssText = "position:fixed;bottom:0;right:0;opacity:0;pointer-events:none;z-index:-1";
    iframe.allow = "autoplay";
    iframe.src = `https://www.youtube.com/embed/${track.youtube_video_id}?autoplay=1&start=${Math.floor(start)}&controls=0&disablekb=1&rel=0&mute=0`;
    document.body.appendChild(iframe);
    ytTrimIframe.current = iframe;
    setPlayingSynced(true);
    // stop after clip duration
    ytStopTimer.current = setTimeout(() => stopYTTrim(), (end - start) * 1000);
  }

  useEffect(() => () => { stopYTTrim(); }, []);

  useEffect(() => {
    if (!track.preview_url) return;
    const audio = new Audio(track.preview_url);
    audioRef.current = audio;
    audio.addEventListener("timeupdate", () => setPreviewTime(audio.currentTime));
    audio.addEventListener("ended", () => { setPlayingSynced(false); audio.currentTime = 0; setPreviewTime(0); });
    audio.play().catch(() => {});
    setPlaying(true);
    return () => { audio.pause(); audio.src = ""; };
  }, [track.preview_url]);

  function togglePlay() {
    const start = windowStartRef.current;
    const end = start + clipLenRef.current;
    if (track.youtube_video_id) {
      if (playingRef.current) { stopYTTrim(); }
      else { playYTClip(start, end); }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playingRef.current) { audio.pause(); setPlayingSynced(false); }
    else { audio.currentTime = 0; audio.play().catch(() => {}); setPlayingSynced(true); }
  }

  function getClientX(e: React.MouseEvent | React.TouchEvent) {
    return "touches" in e ? e.touches[0].clientX : e.clientX;
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    dragging.current = true;
    dragStartX.current = getClientX(e);
    dragStartWindow.current = windowStart;
  }

  const onPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    // Dragging waveform RIGHT = moving window earlier (negative direction)
    const dx = getClientX(e) - dragStartX.current;
    const dSec = -(dx / rect.width) * fullDuration;
    const newStart = Math.max(0, Math.min(fullDuration - clipLenRef.current, dragStartWindow.current + dSec));
    setWindowStartSynced(newStart);
  }, [fullDuration, clipLen]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (track.youtube_video_id) {
      playYTClip(windowStartRef.current, windowStartRef.current + clipLenRef.current);
      return;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setPreviewTime(0);
      audio.play().catch(() => {});
      setPlayingSynced(true);
    }
  }, [track.youtube_video_id, windowStart, clipLen]);

  // Waveform scrolls: offset so the selected window is always centered under the fixed bracket
  // The bracket is fixed at center of the container
  // waveform translateX = -(windowStart / fullDuration) * totalWaveWidth + containerWidth/2 - windowWidth/2
  const windowWidthPct = (clipLen / fullDuration) * 100; // % of total waveform
  // playhead moves inside the fixed bracket
  const playheadPct = (previewTime / PREVIEW_DURATION) * 100;
  const markers = Array.from({ length: Math.floor(fullDuration / 30) + 1 }, (_, i) => i * 30).filter(t => t <= fullDuration);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 shrink-0">
        <button type="button" onClick={onBack} className="text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h2 className="text-white font-bold text-lg flex-1">Choose Clip</h2>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm({ ...track, start_offset: Math.round(windowStart), duration_ms: clipLen * 1000 }); }}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-full transition"
        >
          Done
        </button>
      </div>

      {/* Track info */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-3 shrink-0">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
          {track.cover
            ? <Image src={track.cover} alt={track.album} width={64} height={64} className="object-cover w-full h-full" unoptimized />
            : <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
              </div>
          }
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-base truncate">{track.name}</p>
          <p className="text-zinc-400 text-sm truncate">{track.artist}</p>
          <p className="text-zinc-600 text-xs mt-0.5">Full length: {fmt(fullDuration)}</p>
        </div>
      </div>

      {/* Start / End info bar */}
      <div className="px-5 pb-3 shrink-0">
        <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-2.5 relative">
          <div className="text-center">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Start</p>
            <p className="text-green-400 font-bold text-sm">{fmt(windowStart)}</p>
          </div>
          <div className="text-center relative">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Duration</p>
            {track.youtube_video_id ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowDurationPicker(p => !p)}
                  className="text-white font-bold text-sm flex items-center gap-1 mx-auto hover:text-green-400 transition"
                >
                  {clipLen}s
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showDurationPicker && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-50 flex flex-col min-w-[80px]">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setClipLenSynced(d); setWindowStartSynced(Math.min(windowStartRef.current, Math.max(0, fullDuration - d))); setShowDurationPicker(false); }}
                        className={`px-4 py-2 text-sm font-semibold transition ${
                          clipLen === d ? "bg-green-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-white font-bold text-sm">30s</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wide">End</p>
            <p className="text-green-400 font-bold text-sm">{fmt(Math.min(windowStart + clipLen, fullDuration))}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 gap-3">
        <p className="text-zinc-500 text-xs text-center">Drag the waveform to pick your {clipLen}s clip</p>

        {/* Instagram-style: fixed bracket, scrolling waveform */}
        <div
          ref={timelineRef}
          className="relative h-20 rounded-2xl bg-zinc-900 cursor-grab active:cursor-grabbing select-none touch-none overflow-hidden"
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        >
          {/* Scrolling waveform — width = fullDuration/clipLen * 100% so window always fills container */}
          <div
            className="absolute top-0 bottom-0 flex items-center gap-px px-1"
            style={{
              width: `${(fullDuration / clipLen) * 100}%`,
              transform: `translateX(${-(windowStart / fullDuration) * 100}%)`,
              transition: dragging.current ? "none" : "transform 0.05s linear",
            }}
          >
            {Array.from({ length: BARS }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full bg-zinc-500"
                style={{ height: `${waveHeight(i)}%` }}
              />
            ))}
          </div>

          {/* Dim left side */}
          <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-zinc-900 to-transparent pointer-events-none z-10" />
          {/* Dim right side */}
          <div className="absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-zinc-900 to-transparent pointer-events-none z-10" />

          {/* Fixed green bracket — always covers full width of visible area */}
          <div className="absolute inset-0 border-2 border-green-400 rounded-2xl pointer-events-none z-20" />
          {/* Left handle */}
          <div className="absolute top-0 bottom-0 left-0 w-5 bg-green-400 flex items-center justify-center pointer-events-none z-20 rounded-l-xl">
            <div className="flex gap-0.5"><div className="w-px h-5 bg-black/50 rounded-full" /><div className="w-px h-5 bg-black/50 rounded-full" /></div>
          </div>
          {/* Right handle */}
          <div className="absolute top-0 bottom-0 right-0 w-5 bg-green-400 flex items-center justify-center pointer-events-none z-20 rounded-r-xl">
            <div className="flex gap-0.5"><div className="w-px h-5 bg-black/50 rounded-full" /><div className="w-px h-5 bg-black/50 rounded-full" /></div>
          </div>

          {/* Playhead — moves inside the bracket */}
          {playing && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none z-30"
              style={{ left: `${playheadPct}%` }}
            />
          )}
        </div>

        {/* Time markers — scroll with waveform */}
        <div className="relative h-4 overflow-hidden">
          <div
            className="absolute top-0 flex"
            style={{
              width: `${(fullDuration / clipLen) * 100}%`,
              transform: `translateX(${-(windowStart / fullDuration) * 100}%)`,
            }}
          >
            {markers.map((t) => (
              <span
                key={t}
                className="absolute text-[10px] text-zinc-600 -translate-x-1/2"
                style={{ left: `${(t / fullDuration) * 100}%` }}
              >
                {fmt(t)}
              </span>
            ))}
          </div>
        </div>

        <p className="text-zinc-600 text-[11px] text-center">
          Clip starts at <span className="text-green-400">{fmt(windowStart)}</span> · ends at <span className="text-green-400">{fmt(Math.min(windowStart + clipLen, fullDuration))}</span>
        </p>

        <div className="flex justify-center mt-1">
          <button
            type="button" onClick={togglePlay} disabled={!track.preview_url && !track.youtube_video_id}
            className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 disabled:opacity-40 flex items-center justify-center text-white transition shadow-lg shadow-green-900/40"
          >
            {playing
              ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            }
          </button>
        </div>
        {!track.preview_url && !track.youtube_video_id && <p className="text-zinc-600 text-xs text-center">No audio preview available</p>}
      </div>
    </div>
  );
}

// ── Track Row ─────────────────────────────────────────────────────────────────
function TrackRow({ track, previewId, onPreview, onAdd }: {
  track: SpotifyTrack;
  previewId: string | null;
  onPreview: (t: SpotifyTrack) => void;
  onAdd: (t: SpotifyTrack) => void;
}) {
  const playing = previewId === track.id;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
        {track.cover
          ? <Image src={track.cover} alt={track.album} width={48} height={48} className="object-cover" style={{ width: "100%", height: "100%" }} unoptimized />
          : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-zinc-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
            </div>
        }
        {playing && (
          <div className="absolute inset-0 bg-black/50 flex items-end justify-center pb-1 gap-px">
            {[4,7,5,8,4].map((h, i) => (
              <div key={i} className="w-0.5 bg-green-400 rounded-full animate-bounce" style={{ height: h, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{track.name}</p>
        <p className="text-zinc-400 text-xs truncate">{track.artist}</p>
        {!track.preview_url && !track.youtube_video_id && <p className="text-zinc-600 text-xs">No preview</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {(track.preview_url || track.youtube_video_id) && (
          <button type="button" onClick={() => onPreview(track)}
            className={`p-2 rounded-full transition ${playing ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            {playing
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            }
          </button>
        )}
        <button type="button" onClick={() => onAdd(track)}
          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Hidden YouTube IFrame Player ─────────────────────────────────────────────
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let ytApiLoaded = false;
let ytApiReady = false;
const ytReadyCallbacks: (() => void)[] = [];

function loadYTApi(cb: () => void) {
  if (ytApiReady) { cb(); return; }
  ytReadyCallbacks.push(cb);
  if (ytApiLoaded) return;
  ytApiLoaded = true;
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytReadyCallbacks.forEach(fn => fn());
    ytReadyCallbacks.length = 0;
  };
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
}

function useYTPlayer(containerId: string, active: boolean) {
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const [ytReady, setYtReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let destroyed = false;
    function createPlayer() {
      if (destroyed || playerRef.current) return;
      const el = document.getElementById(containerId);
      if (!el) { setTimeout(createPlayer, 100); return; }
      playerRef.current = new window.YT.Player(containerId, {
        width: 1, height: 1,
        videoId: "dQw4w9WgXcQ", // dummy id so player initializes properly
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, rel: 0, mute: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (destroyed) return;
            readyRef.current = true;
            setYtReady(true);
            (window as any).__ytTrimPlayer = playerRef.current;
          },
        },
      });
    }
    loadYTApi(createPlayer);
    return () => {
      destroyed = true;
      readyRef.current = false;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      (window as any).__ytTrimPlayer = null;
    };
  }, [active, containerId]);

  return { playerRef, ytReady, readyRef };
}

// ── Main SpotifyPicker ────────────────────────────────────────────────────────
export default function SpotifyPicker({ onSelect, selected, forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [trimTrack, setTrimTrack] = useState<SpotifyTrack | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [sourceTab, setSourceTab] = useState<"itunes" | "youtube">("itunes");
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [ytPlayingId, setYtPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playerRef: ytPlayerRef, ytReady, readyRef: ytReadyRef } = useYTPlayer("yt-hidden-player", true);

  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);

  // Load suggested categories once when picker opens
  useEffect(() => {
    if (!open || categories.length > 0) return;
    setSuggestedLoading(true);
    fetch("/api/spotify?suggested=1")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));
  }, [open]);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearchError(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setSearchError(null);
      try {
        if (sourceTab === "youtube") {
          const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.error) { setSearchError(data.error); setResults([]); }
          else setResults((data.items ?? []).map((item: any) => ({
            id: item.id, name: item.name, artist: item.artist,
            album: "", cover: item.cover, preview_url: null,
            duration_ms: 0, youtube_video_id: item.id,
          })));
        } else {
          const res = await fetch(`/api/spotify?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.error) { setSearchError(data.error); setResults([]); }
          else setResults(data.tracks ?? []);
        }
      } catch { setSearchError("Failed to search. Check your connection."); setResults([]); }
      setLoading(false);
    }, 400);
  }, [query, sourceTab]);

  const ytPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  function stopYTPreview() {
    if (ytPreviewTimer.current) { clearTimeout(ytPreviewTimer.current); ytPreviewTimer.current = null; }
    if (ytIframeRef.current) { ytIframeRef.current.src = ""; ytIframeRef.current.remove(); ytIframeRef.current = null; }
    setYtPlayingId(null);
  }

  function togglePreview(track: SpotifyTrack) {
    if (track.youtube_video_id) {
      audioRef.current?.pause(); setPreviewId(null);
      if (ytPlayingId === track.id) { stopYTPreview(); return; }
      stopYTPreview();
      const iframe = document.createElement("iframe");
      iframe.width = "1"; iframe.height = "1";
      iframe.style.cssText = "position:fixed;bottom:0;right:0;opacity:0;pointer-events:none;z-index:-1";
      iframe.allow = "autoplay";
      iframe.src = `https://www.youtube.com/embed/${track.youtube_video_id}?autoplay=1&start=0&controls=0&disablekb=1&rel=0&mute=0`;
      document.body.appendChild(iframe);
      ytIframeRef.current = iframe;
      setYtPlayingId(track.id);
      ytPreviewTimer.current = setTimeout(() => stopYTPreview(), 90000);
      return;
    }
    stopYTPreview();
    if (!track.preview_url) return;
    if (previewId === track.id) { audioRef.current?.pause(); setPreviewId(null); return; }
    audioRef.current?.pause();
    audioRef.current = new Audio(track.preview_url);
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPreviewId(null);
    setPreviewId(track.id);
  }

  function openTrim(track: SpotifyTrack) {
    audioRef.current?.pause(); setPreviewId(null); setTrimTrack(track);
  }

  function confirmTrim(track: SpotifyTrack) {
    setTrimTrack(null); setOpen(false); onSelect(track); setQuery(""); setResults([]);
  }

  function remove() { audioRef.current?.pause(); setPreviewId(null); stopYTPreview(); onSelect(null); }

  function closeSearch() {
    setOpen(false); audioRef.current?.pause(); setPreviewId(null);
    stopYTPreview();
    if (onClose) onClose();
  }

  useEffect(() => () => {
    audioRef.current?.pause();
    stopYTPreview();
  }, []);

  // Tabs: "All" + each category label
  const tabs = ["All", ...categories.map((c) => c.label)];

  // Tracks shown under current tab
  const tabTracks: SpotifyTrack[] = activeTab === "All"
    ? categories.flatMap((c) => c.tracks)
    : categories.find((c) => c.label === activeTab)?.tracks ?? [];



  const effectivePreviewId = previewId ?? ytPlayingId;

  return (
    <div>
      {/* Hidden YouTube player container */}
      <div id="yt-hidden-player" style={{ position: "fixed", bottom: 0, right: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", zIndex: -1 }} />

      {/* Selected track pill */}
      {selected ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800 border border-green-500/40">
          {selected.cover && (
            <Image src={selected.cover} alt={selected.album} width={36} height={36} className="rounded-md object-cover shrink-0" unoptimized />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{selected.name}</p>
            <p className="text-zinc-400 text-xs truncate">{selected.artist}</p>
            {selected.start_offset !== undefined && (
              <p className="text-green-400 text-xs mt-0.5">
                Clip from {Math.floor(selected.start_offset / 60)}:{String(selected.start_offset % 60).padStart(2, "0")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setTrimTrack(selected)}
              className="p-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition" title="Adjust clip"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/>
                <line x1="8.12" y1="8.12" x2="12" y2="12"/><line x1="12" y1="12" x2="15.88" y2="15.88"/>
                <line x1="21" y1="3" x2="15" y2="9"/><line x1="3" y1="21" x2="9" y2="15"/>
              </svg>
            </button>
            <button type="button" onClick={remove} className="p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-sm transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
          </svg>
          Add Music
        </button>
      )}

      {/* Trim screen */}
      {trimTrack && (
        <TrimScreen track={trimTrack} onConfirm={confirmTrim} onBack={() => { setTrimTrack(null); }} />
      )}

      {/* Search + browse modal — hidden (not unmounted) when TrimScreen is open */}
      {open && (
        <div className={`fixed inset-0 z-[60] bg-black flex flex-col ${trimTrack ? "hidden" : ""}`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800 shrink-0">
            <button type="button" onClick={closeSearch} className="text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <h2 className="text-white font-bold text-lg flex-1">Add Music</h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>

          {/* Source tabs */}
          <div className="px-4 pt-3 pb-2 shrink-0 flex gap-2">
            <button type="button" onClick={() => { setSourceTab("itunes"); setResults([]); setSearchError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                sourceTab === "itunes" ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}>
              🎵 iTunes (Free Preview)
            </button>
            <button type="button" onClick={() => { setSourceTab("youtube"); setResults([]); setSearchError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                sourceTab === "youtube" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}>
              ▶ YouTube (Full Audio)
            </button>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-2 shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder={sourceTab === "youtube" ? "Search YouTube music..." : "Search songs, artists..."}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-zinc-800 text-white text-sm outline-none focus:ring-2 focus:ring-green-500 placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Category tabs — only shown when not searching and on iTunes tab */}
          {!query && sourceTab === "itunes" && (
            <div className="px-4 pb-2 shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      activeTab === tab ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <CategoryIcon label={tab} size={11} />
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Search results */}
            {query && loading && (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {query && !loading && results.length === 0 && !searchError && (
              <p className="text-center text-zinc-500 py-12 text-sm">No results found</p>
            )}
            {query && searchError && (
              <div className="mx-4 mt-6 p-4 rounded-xl bg-red-900/30 border border-red-700/40">
                <p className="text-red-400 text-sm font-medium text-center">Music search unavailable</p>
                <p className="text-red-500/70 text-xs text-center mt-1">{searchError}</p>
              </div>
            )}
            {query && !loading && results.map((track) => (
              <TrackRow key={track.id} track={track} previewId={effectivePreviewId} onPreview={togglePreview} onAdd={openTrim} />
            ))}

            {/* YouTube empty state */}
            {!query && sourceTab === "youtube" && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"/></svg>
                <p className="text-zinc-400 text-sm">Search any song on YouTube</p>
                <p className="text-zinc-600 text-xs">Full audio plays, video stays hidden</p>
              </div>
            )}

            {/* Suggested for you — iTunes only */}
            {!query && sourceTab === "itunes" && (
              <>
                <div className="px-4 pt-3 pb-2">
                  <p className="text-white text-sm font-bold">Suggested for you</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {activeTab === "All" ? "All categories" : activeTab}
                  </p>
                </div>

                {suggestedLoading && (
                  <div className="flex justify-center py-10">
                    <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!suggestedLoading && tabTracks.length === 0 && (
                  <p className="text-center text-zinc-600 py-10 text-sm">No songs found</p>
                )}

                {!suggestedLoading && tabTracks.map((track) => (
                  <TrackRow key={track.id} track={track} previewId={effectivePreviewId} onPreview={togglePreview} onAdd={openTrim} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
