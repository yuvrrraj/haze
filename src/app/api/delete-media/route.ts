import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import ImageKit from "imagekit";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

function cloudinaryPublicId(url: string): { publicId: string; resourceType: "video" | "image" } {
  // e.g. https://res.cloudinary.com/cloud/video/upload/v123/socialsite/reels/abc.mp4
  // e.g. https://res.cloudinary.com/cloud/image/upload/v123/socialsite/posts/abc.jpg
  const match = url.match(/cloudinary\.com\/[^/]+\/(video|image)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
  return {
    publicId: match?.[2] ?? "",
    resourceType: (match?.[1] === "image" ? "image" : "video") as "video" | "image",
  };
}

async function deleteFromImageKit(url: string) {
  const endpoint = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/$/, "");
  // strip transforms like /tr:w-600,f-auto
  const clean = url.replace(/\/tr:[^/]+/, "");
  const path = clean.startsWith(endpoint) ? clean.slice(endpoint.length) : clean;
  const files = await imagekit.listFiles({ path, limit: 1 } as any);
  if (Array.isArray(files) && files.length > 0) {
    await imagekit.deleteFile((files[0] as any).fileId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, resourceType } = await req.json();
    if (!url) return NextResponse.json({ error: "No url" }, { status: 400 });

    if (resourceType === "image" && url.includes("imagekit.io")) {
      await deleteFromImageKit(url).catch(() => {});
    } else if (url.includes("cloudinary.com")) {
      const { publicId, resourceType: detectedType } = cloudinaryPublicId(url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: detectedType,
          invalidate: true,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
