"use server";
import { v2 as cloudinary } from "cloudinary";

function configure() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadVideo(
  fileBuffer: Buffer,
  folder: "reels" | "stories" | "voice_notes"
): Promise<{ url: string; thumbnail: string; hlsUrl: string }> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video" as const,
        folder: `socialsite/${folder}`,
        // no transformation — store original quality
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary video upload error:", error);
          return reject(new Error(error.message));
        }
        if (!result) return reject(new Error("No result from Cloudinary"));

        // Generate thumbnail URL on-the-fly (no eager needed)
        const thumbnail = cloudinary.url(result.public_id, {
          resource_type: "video",
          format: "jpg",
          transformation: [{ width: 400, height: 700, crop: "fill", start_offset: "1" }],
        });

        resolve({
          url: result.secure_url,
          thumbnail,
          hlsUrl: result.secure_url, // use MP4 directly — no HLS wait
        });
      }
    );

    stream.end(fileBuffer);
  });
}

export async function uploadImage(
  fileBuffer: Buffer,
  folder: string
): Promise<string> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: `socialsite/${folder}`,
      },
      (error, result) => {
        if (error) return reject(new Error(error.message));
        if (!result) return reject(new Error("No result from Cloudinary"));
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
}
