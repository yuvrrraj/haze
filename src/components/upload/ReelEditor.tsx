"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

interface ReelEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onClose: () => void;
  onNext?: (editedFile: File) => void;
}

export default function ReelEditor({ file, onSave, onClose, onNext }: ReelEditorProps) {
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
      // Security check
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "EDITOR_READY") {
        setIsLoading(false);
        // Send the video to the editor
        const reader = new FileReader();
        reader.onload = (e) => {
          iframeRef.current?.contentWindow?.postMessage(
            {
              type: "LOAD_VIDEO",
              videoData: e.target?.result,
              fileName: file.name,
            },
            window.location.origin
          );
        };
        reader.readAsDataURL(file);
      } else if (event.data.type === "SAVE_VIDEO") {
        // Convert blob URL or base64 to File and proceed to caption
        fetch(event.data.videoData)
          .then((res) => res.blob())
          .then((blob) => {
            const editedFile = new File([blob], file.name, { type: file.type });
            if (onNext) {
              onNext(editedFile);
            } else {
              onSave(editedFile);
            }
          });
      } else if (event.data.type === "CLOSE_EDITOR") {
        onClose();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [file, onNext, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
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
        src="/editing/reels/reels.html"
        className="w-full h-full border-0"
        title="Reel Editor"
      />
    </div>
  );
}
