"use client";
import Image from "next/image";
import { AiOutlineClose, AiOutlineDownload, AiOutlineShareAlt } from "react-icons/ai";
import toast from "react-hot-toast";

interface Props {
  url: string;
  onClose: () => void;
}

export default function ImageViewer({ url, onClose }: Props) {
  async function handleDownload() {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `image-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded!");
    } catch {
      toast.error("Download failed");
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Image", url });
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") toast.error("Could not share");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/60 backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition">
          <AiOutlineClose size={20} />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition"
          >
            <AiOutlineShareAlt size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition"
          >
            <AiOutlineDownload size={20} />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={url}
          alt="image"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}
