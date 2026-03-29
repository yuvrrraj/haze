"use client";
import { useEffect, useRef, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

interface PostEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onClose: () => void;
  onNext?: (editedFile: File) => void;
}

export default function PostEditor({ file, onSave, onClose, onNext }: PostEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Handle Escape key to close editor
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check - only accept messages from our own origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "EDITOR_READY") {
        setIsLoading(false);
        // Send the image to the editor
        const reader = new FileReader();
        reader.onload = (e) => {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "LOAD_IMAGE",
              imageData: e.target?.result,
              fileName: file.name,
            },
            window.location.origin
          );
        };
        reader.readAsDataURL(file);
      } else if (event.data.type === "SAVE_IMAGE") {
        // Parse data URL directly: data:[mime];base64,[data]
        const dataUrl: string = event.data.imageData;
        const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const ext = mime === "image/jpeg" ? ".jpg" : mime === "image/png" ? ".png" : ".jpg";
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const editedFile = new File([blob], baseName + ext, { type: mime });
        if (onNext) {
          onNext(editedFile);
        } else {
          onSave(editedFile);
        }
      } else if (event.data.type === "CLOSE_EDITOR") {
        onClose();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [file, onNext, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-semibold text-lg">Edit Photo</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
        >
          <AiOutlineClose size={20} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p>Loading editor...</p>
          </div>
        </div>
      )}

      {/* Editor iframe */}
      <iframe
        ref={iframeRef}
        src="/editing/posts/index.html"
        className="w-full h-full border-0"
        title="Photo Editor"
      />
    </div>
  );
}
