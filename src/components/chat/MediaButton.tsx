"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { AiOutlineCamera, AiOutlinePicture, AiOutlineClose, AiOutlineSend } from "react-icons/ai";
import { BsArrowRepeat } from "react-icons/bs";

interface Props {
  onSend: (url: string) => Promise<void>;
  onTextSend: () => void;
  canSend: boolean;
  sending: boolean;
}

export default function MediaButton({ onSend, onTextSend, sending }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHold = useRef(false);

  function onPressStart() {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      setShowMenu(true);
    }, 400);
  }
  function onPressEnd() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }
  function onClick() {
    if (didHold.current) return;
    onTextSend();
  }

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast.error("Camera access denied");
      setShowCamera(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (showCamera && !capturedUrl) {
      startCamera(facingMode);
    }
    return () => {
      if (!showCamera) stopStream();
    };
  }, [showCamera, facingMode, capturedUrl, startCamera, stopStream]);

  function openCamera() {
    setShowMenu(false);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setShowCamera(true);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stopStream();
      setCapturedBlob(blob);
      setCapturedUrl(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    startCamera(facingMode);
  }

  function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }

  function closeCamera() {
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(null);
    setCapturedUrl(null);
    setShowCamera(false);
  }

  async function sendCaptured() {
    if (!capturedBlob) return;
    closeCamera();
    setUploading(true);
    const toastId = toast.loading("Sending photo...");
    try {
      const file = new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      const form = new FormData();
      form.append("file", file);
      form.append("type", "chat_image");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const { url, error } = await res.json();
      if (!url) throw new Error(error ?? "Upload failed");
      await onSend(url);
      toast.success("Photo sent!", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    }
    setUploading(false);
  }

  async function handleGalleryFile(file: File) {
    setShowMenu(false);
    setUploading(true);
    const toastId = toast.loading("Sending image...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "chat_image");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const { url, error } = await res.json();
      if (!url) throw new Error(error ?? "Upload failed");
      await onSend(url);
      toast.success("Image sent!", { id: toastId });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    }
    setUploading(false);
  }

  return (
    <>
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryFile(f); e.target.value = ""; }} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Send button */}
      <button
        type="button"
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onClick={onClick}
        disabled={sending || uploading}
        className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-full text-white transition shrink-0"
      >
        {sending || uploading
          ? <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <AiOutlineSend size={18} />
        }
      </button>

      {/* Media options sheet */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="w-full bg-zinc-950 rounded-t-2xl px-4 py-5 max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-semibold text-sm">Send Media</p>
              <button onClick={() => setShowMenu(false)} className="text-zinc-500 hover:text-white transition">
                <AiOutlineClose size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex flex-col items-center gap-3 py-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
                  <AiOutlinePicture size={26} className="text-purple-400" />
                </div>
                <span className="text-white text-sm font-medium">Gallery</span>
              </button>
              <button
                onClick={openCamera}
                className="flex flex-col items-center gap-3 py-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition active:scale-95"
              >
                <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                  <AiOutlineCamera size={26} className="text-green-400" />
                </div>
                <span className="text-white text-sm font-medium">Camera</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live camera UI */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={closeCamera} className="p-2 rounded-full bg-black/50 text-white">
              <AiOutlineClose size={22} />
            </button>
            {!capturedUrl && (
              <button onClick={flipCamera} className="p-2 rounded-full bg-black/50 text-white">
                <BsArrowRepeat size={22} />
              </button>
            )}
          </div>

          {/* Viewfinder / Preview */}
          <div className="flex-1 relative overflow-hidden">
            {capturedUrl ? (
              <img src={capturedUrl} alt="captured" className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-center gap-8 py-8 shrink-0">
            {capturedUrl ? (
              <>
                {/* Retake */}
                <button
                  onClick={retake}
                  className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-white"
                >
                  <BsArrowRepeat size={24} />
                </button>
                {/* Send */}
                <button
                  onClick={sendCaptured}
                  className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg"
                >
                  <AiOutlineSend size={26} />
                </button>
              </>
            ) : (
              /* Capture shutter */
              <button
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
