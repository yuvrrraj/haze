"use client";
import { useState, useRef } from "react";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineCloudUpload, AiOutlineClose, AiOutlinePlayCircle } from "react-icons/ai";
import { MdEdit } from "react-icons/md";
import ReelEditor from "./ReelEditor";
import { useAuthStore } from "@/store/authStore";
import SpotifyPicker, { SpotifyTrack } from "@/components/ui/SpotifyPicker";

export default function UploadReel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [editedFile, setEditedFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setHiddenNav } = useAuthStore();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("Please select a video");
    if (f.size > 100 * 1024 * 1024) return toast.error("Video must be under 100MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleEditedFile(editedFile: File) {
    setFile(editedFile);
    setPreview(URL.createObjectURL(editedFile));
    setShowEditor(false);
    toast.success("Reel edited successfully!");
  }

  function handleNext(editedFile: File) {
    setEditedFile(editedFile);
    setFile(editedFile);
    setPreview(URL.createObjectURL(editedFile));
    setShowEditor(false);
    setShowCaptionModal(true);
    // Keep bottom nav hidden
    setHiddenNav(true);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Select a video first");
    await uploadReel();
  }

  async function uploadReel() {
    if (!file) return;
    setLoading(true);
    setProgress("Uploading video...");

    try {
      // Upload directly to Cloudinary from browser (bypasses Vercel 4.5MB limit)
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", uploadPreset);
      form.append("folder", "socialsite/reels");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: "POST", body: form });
      const result = await res.json();
      if (!result.secure_url) throw new Error(result.error?.message ?? "Upload failed");

      // Generate thumbnail from Cloudinary
      const thumbnail = result.secure_url.replace("/upload/", "/upload/w_400,h_700,c_fill,so_1/f_jpg/").replace(/\.[^.]+$/, ".jpg");

      setProgress("Saving...");
      const user = await getCurrentUser();
      if (!user) throw new Error("Not logged in");

      await supabase.from("profiles").upsert({
        id: user.id,
        username: user.email?.split("@")[0] ?? user.id.slice(0, 8),
      }, { onConflict: "id", ignoreDuplicates: true });

      const { error } = await supabase.from("reels").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        video_url: data.url,
        hls_url: data.hlsUrl ?? null,
        thumbnail_url: data.thumbnail ?? null,
        ...(selectedTrack ? { music_name: selectedTrack.name, music_artist: selectedTrack.artist, music_cover: selectedTrack.cover, music_preview_url: selectedTrack.preview_url } : {}),
      });
      if (error) {
        const { error: e2 } = await supabase.from("reels").insert({ user_id: user.id, caption: caption.trim() || null, video_url: data.url, hls_url: data.hlsUrl ?? null, thumbnail_url: data.thumbnail ?? null });
        if (e2) throw e2;
      }

      toast.success("Reel uploaded! 🎬");
      clearFile();
      setCaption("");
      setSelectedTrack(null);
      setShowCaptionModal(false);
      // Show bottom nav after upload
      setHiddenNav(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-64 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-500 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-purple-400 transition"
        >
          <AiOutlineCloudUpload size={48} />
          <span className="text-sm font-medium">Tap to select video</span>
          <span className="text-xs">MP4, MOV — max 100MB</span>
        </button>
      ) : (
        <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-zinc-900">
          <video src={preview} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center">
            <AiOutlinePlayCircle size={48} className="text-white/70" />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => { setShowEditor(true); setHiddenNav(true); }}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition flex items-center gap-1.5 text-sm font-medium px-3"
            >
              <MdEdit size={16} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMusicPicker(true)}
              className={`p-2 rounded-full text-white transition flex items-center gap-1.5 text-sm font-medium px-3 ${
                selectedTrack ? "bg-green-600 hover:bg-green-700" : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
              </svg>
              <span>{selectedTrack ? selectedTrack.name.slice(0, 12) + (selectedTrack.name.length > 12 ? "…" : "") : "Music"}</span>
            </button>
            <button
              type="button"
              onClick={clearFile}
              className="p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition"
            >
              <AiOutlineClose size={16} />
            </button>
          </div>
          <div className="absolute bottom-2 left-3 text-xs text-white/70">{file?.name}</div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Write a caption..."
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
      />

      {loading && progress && (
        <p className="text-center text-purple-400 text-sm animate-pulse">{progress}</p>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-40"
      >
        {loading ? "Uploading..." : "Share Reel"}
      </button>

      {/* Music Picker — only mounts when triggered */}
      {showMusicPicker && (
        <SpotifyPicker
          selected={selectedTrack}
          onSelect={(t) => { setSelectedTrack(t); setShowMusicPicker(false); }}
          forceOpen={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      {/* Reel Editor Modal */}
      {showEditor && file && (
        <ReelEditor
          file={file}
          onSave={handleEditedFile}
          onNext={handleNext}
          onClose={() => { setShowEditor(false); setHiddenNav(false); }}
        />
      )}

      {/* Caption Modal */}
      {showCaptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" style={{ touchAction: 'none' }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add Caption</h3>
              <button
                onClick={() => {
                  setShowCaptionModal(false);
                  setHiddenNav(false);
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition"
              >
                <AiOutlineClose size={20} className="text-zinc-400" />
              </button>
            </div>

            {preview && (
              <div className="relative w-full h-64 rounded-xl overflow-hidden bg-zinc-800">
                <video src={preview} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <AiOutlinePlayCircle size={48} className="text-white/70" />
                </div>
              </div>
            )}

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
              autoFocus
            />

            {selectedTrack ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-800 border border-green-500/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{selectedTrack.name}</p>
                  <p className="text-zinc-400 text-xs truncate">{selectedTrack.artist}</p>
                </div>
                <button type="button" onClick={() => setSelectedTrack(null)} className="p-1 text-zinc-500 hover:text-red-400 transition">
                  <AiOutlineClose size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMusicPicker(true)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-sm transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                Add Music
              </button>
            )}

            {loading && progress && (
              <p className="text-center text-purple-400 text-sm animate-pulse">{progress}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCaptionModal(false);
                  setHiddenNav(false);
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Back
              </button>
              <button
                onClick={uploadReel}
                disabled={loading}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-40"
              >
                {loading ? "Uploading..." : "Share Reel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
