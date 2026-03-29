"use client";
import { useEffect, useRef, useState } from "react";
import { AiOutlineSend } from "react-icons/ai";

// ── VoicePlayer ───────────────────────────────────────────────────────────────
export function VoicePlayer({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speeds = [1, 1.5, 2];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = speed; a.play(); setPlaying(true); }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  }

  function cycleSpeed() {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function fmt(s: number) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  const bar = isMe ? "bg-white/60" : "bg-purple-400";
  const fill = isMe ? "bg-white" : "bg-purple-500";
  const btn = isMe ? "bg-white/20 hover:bg-white/30 text-white" : "bg-zinc-700 hover:bg-zinc-600 text-white";

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl min-w-[200px] max-w-[260px] ${isMe ? "bg-purple-600 rounded-br-sm" : "bg-zinc-800 rounded-bl-sm"}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Mic icon */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isMe ? "bg-white/20" : "bg-zinc-700"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isMe ? "white" : "#a78bfa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>

      {/* Play/pause */}
      <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${btn}`}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>

      {/* Waveform bars + progress */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Static waveform bars */}
        <div className="flex items-center gap-[2px] h-6 cursor-pointer" onClick={seek}>
          {Array.from({ length: 28 }).map((_, i) => {
            const h = [3,5,8,6,10,7,12,9,6,11,8,5,10,7,4,9,11,6,8,5,10,7,12,8,6,9,5,7][i] ?? 6;
            const filled = (i / 28) * 100 <= progress;
            return (
              <div
                key={i}
                className={`rounded-full w-[3px] transition-colors ${filled ? fill : bar}`}
                style={{ height: `${h * 2}px` }}
              />
            );
          })}
        </div>
        {/* Time */}
        <div className="flex justify-between">
          <span className={`text-[10px] ${isMe ? "text-white/70" : "text-zinc-500"}`}>
            {audioRef.current ? fmt(audioRef.current.currentTime) : "0:00"}
          </span>
          <span className={`text-[10px] ${isMe ? "text-white/70" : "text-zinc-500"}`}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 transition ${isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}
      >
        {speed}x
      </button>
    </div>
  );
}

// ── VoiceRecorder ─────────────────────────────────────────────────────────────
interface VoiceRecorderProps {
  onSend: (blob: Blob) => Promise<void>;
  onCancel: () => void;
  sending?: boolean;
}

export function VoiceRecorder({ onSend, onCancel, sending }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(30).fill(3));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
    return () => stopAll();
  }, []);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio for waveform
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);

      // Timer
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

      // Waveform animation
      const data = new Uint8Array(analyser.frequencyBinCount);
      function draw() {
        analyser.getByteFrequencyData(data);
        const newBars = Array.from({ length: 30 }, (_, i) => {
          const val = data[Math.floor((i / 30) * data.length)] ?? 0;
          return Math.max(3, Math.floor((val / 255) * 28));
        });
        setBars(newBars);
        animRef.current = requestAnimationFrame(draw);
      }
      draw();
    } catch {
      onCancel();
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // Recording UI
  if (recording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-t border-zinc-900 shrink-0">
        {/* Cancel */}
        <button onClick={() => { stopAll(); onCancel(); }} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Live waveform */}
        <div className="flex-1 flex items-center gap-[2px] h-8">
          {bars.map((h, i) => (
            <div
              key={i}
              className="rounded-full bg-red-500 w-[3px] transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="text-red-400 text-sm font-mono shrink-0">{fmt(elapsed)}</span>

        {/* Stop & preview */}
        <button
          onClick={stopRecording}
          className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        </button>
      </div>
    );
  }

  // Preview UI (after stop)
  if (audioBlob) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-t border-zinc-900 shrink-0">
        {/* Cancel */}
        <button onClick={() => { setAudioBlob(null); onCancel(); }} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Preview player */}
        <div className="flex-1">
          <VoicePlayer src={URL.createObjectURL(audioBlob)} isMe={false} />
        </div>

        {/* Send */}
        <button
          onClick={() => onSend(audioBlob)}
          disabled={sending}
          className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 disabled:opacity-40 transition shrink-0"
        >
          <AiOutlineSend size={16} />
        </button>
      </div>
    );
  }

  return null;
}

// ── MicButton ─────────────────────────────────────────────────────────────────
export function MicButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-2.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition shrink-0"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  );
}
