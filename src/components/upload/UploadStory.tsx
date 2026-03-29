"use client";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { supabase, getCurrentUser } from "@/lib/supabase";
import toast from "react-hot-toast";
import { AiOutlineCloudUpload, AiOutlineClose, AiOutlinePlayCircle } from "react-icons/ai";
import { MdEdit } from "react-icons/md";
import PostEditor from "./PostEditor";
import ReelEditor from "./ReelEditor";
import { useAuthStore } from "@/store/authStore";
import SpotifyPicker, { SpotifyTrack } from "@/components/ui/SpotifyPicker";

export default function UploadStory({ directInputRef }: { directInputRef?: React.RefObject<HTMLInputElement> }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editedFile, setEditedFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setHiddenNav } = useAuthStore();

  // merge external ref with internal
  function assignRef(el: HTMLInputElement | null) {
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    if (directInputRef) (directInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const video = f.type.startsWith("video/");
    const image = f.type.startsWith("image/");
    if (!video && !image) return toast.error("Select an image or video");
    setFile(f);
    setIsVideo(video);
    setPreview(URL.createObjectURL(f));
  }

  function handleEditedFile(editedFile: File) {
    setFile(editedFile);
    setPreview(URL.createObjectURL(editedFile));
    setShowEditor(false);
    toast.success("Story edited successfully!");
  }

  function handleNext(editedFile: File) {
    setEditedFile(editedFile);
    setFile(editedFile);
    setPreview(URL.createObjectURL(editedFile));
    setShowEditor(false);
    setShowUploadModal(true);
    // Keep bottom nav hidden
    setHiddenNav(true);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setSelectedTrack(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Select a file first");
    await uploadStory();
  }

  async function uploadStory() {
    if (!file) return;
    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", isVideo ? "story" : "post");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.url) throw new Error(data.error ?? "Upload failed");

      const user = await getCurrentUser();
      if (!user) throw new Error("Not logged in");

      // Ensure profile exists
      await supabase.from("profiles").upsert({
        id: user.id,
        username: user.email?.split("@")[0] ?? user.id.slice(0, 8),
      }, { onConflict: "id", ignoreDuplicates: true });

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        video_url: isVideo ? data.url : null,
        image_url: !isVideo ? data.url : null,
        thumbnail_url: data.thumbnail ?? (!isVideo ? data.url : null),
        expires_at: expires,
        ...(selectedTrack ? { music_name: selectedTrack.name, music_artist: selectedTrack.artist, music_cover: selectedTrack.cover, music_preview_url: selectedTrack.preview_url } : {}),
      });
      if (error) {
        const { error: e2 } = await supabase.from("stories").insert({ user_id: user.id, video_url: isVideo ? data.url : null, image_url: !isVideo ? data.url : null, thumbnail_url: data.thumbnail ?? (!isVideo ? data.url : null), expires_at: expires });
        if (e2) throw e2;
      }

      toast.success("Story posted! ⚡ Expires in 24h");
      clearFile();
      setSelectedTrack(null);
      setShowUploadModal(false);
      setHiddenNav(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-80 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-purple-500 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-purple-400 transition"
        >
          <AiOutlineCloudUpload size={48} />
          <span className="text-sm font-medium">Tap to select photo or video</span>
          <span className="text-xs">Story disappears after 24 hours</span>
        </button>
      ) : (
        <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-zinc-900">
          {isVideo ? (
            <video src={preview} className="w-full h-full object-cover" muted autoPlay loop />
          ) : (
            <Image src={preview} alt="story preview" fill className="object-cover" sizes="(max-width: 640px) 100vw, 400px" />
          )}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditor(true)}
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
          <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
            ⚡ Expires in 24 hours
          </div>
        </div>
      )}

      <input ref={assignRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />

      <button
        type="submit"
        disabled={loading || !file}
        className="py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-40"
      >
        {loading ? "Posting..." : "Post Story"}
      </button>

      {/* Music Picker */}
      <SpotifyPicker
        selected={selectedTrack}
        onSelect={(t) => { setSelectedTrack(t); setShowMusicPicker(false); }}
        forceOpen={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
      />

      {/* Editor Modal */}
      {showEditor && file && (
        isVideo ? (
          <ReelEditor
            file={file}
            onSave={handleEditedFile}
            onNext={handleNext}
            onClose={() => setShowEditor(false)}
          />
        ) : (
          <PostEditor
            file={file}
            onSave={handleEditedFile}
            onNext={handleNext}
            onClose={() => setShowEditor(false)}
          />
        )
      )}

      {/* Upload Confirmation Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" style={{ touchAction: 'none' }}>
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Post Story</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setHiddenNav(false);
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition"
              >
                <AiOutlineClose size={20} className="text-zinc-400" />
              </button>
            </div>

            {preview && (
              <div className="relative w-full h-80 rounded-xl overflow-hidden bg-zinc-800">
                {isVideo ? (
                  <>
                    <video src={preview} className="w-full h-full object-cover" muted autoPlay loop />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <AiOutlinePlayCircle size={48} className="text-white/70" />
                    </div>
                  </>
                ) : (
                  <Image src={preview} alt="story preview" fill className="object-cover" sizes="400px" />
                )}
                <div className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/70">
                  ⚡ Expires in 24 hours
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setHiddenNav(false);
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Back
              </button>
              <button
                onClick={uploadStory}
                disabled={loading}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-40"
              >
                {loading ? "Posting..." : "Post Story"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
