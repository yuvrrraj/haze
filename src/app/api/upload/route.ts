import { NextRequest, NextResponse } from "next/server";
import { uploadVideo, uploadImage } from "@/lib/cloudinary";
import ImageKit from "imagekit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) ?? "post";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    console.log(`Upload: type=${type}, file=${file.name}, size=${file.size}`);
    const buffer = Buffer.from(await file.arrayBuffer());

    // ── ImageKit: only avatar & highlight cover ──────────────────────────
    if (type === "avatar" || type === "highlight") {
      const folder = type === "avatar" ? "/avatars" : "/highlights";
      const result = await imagekit.upload({
        file: buffer,
        fileName: `${Date.now()}-${file.name.replace(/\s+/g, "_")}`,
        folder,
        useUniqueFileName: true,
      });
      console.log("ImageKit uploaded:", result.url);
      return NextResponse.json({ url: result.url });
    }

    // ── Cloudinary: everything else ──────────────────────────────────────
    // posts, reels, stories, chat_image, chat_audio, chat_doc, voice
    const isVideo = type === "reel" || type === "voice" || type === "chat_audio" || file.type.startsWith("video/");

    if (isVideo) {
      const folder = type === "reel" ? "reels" : type === "voice" || type === "chat_audio" ? "voice_notes" : "stories";
      const result = await uploadVideo(buffer, folder as "reels" | "stories" | "voice_notes");
      console.log("Cloudinary video uploaded:", result.url);
      return NextResponse.json(result);
    }

    // Images: post, story, chat_image, chat_doc
    const folder = type === "post" ? "posts" : type === "story" ? "stories" : type === "chat_doc" ? "chat_docs" : "chat";
    const url = await uploadImage(buffer, folder);
    console.log("Cloudinary image uploaded:", url);
    return NextResponse.json({ url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
