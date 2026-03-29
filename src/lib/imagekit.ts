const ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/$/, "");

export function ikUrl(
  path: string,
  transforms?: { w?: number; h?: number; q?: number; blur?: number }
) {
  if (!path) return "";

  // Non-ImageKit URLs (e.g. Cloudinary) — return as-is
  if (path.startsWith("http") && !path.includes("imagekit.io")) return path;

  // Strip endpoint prefix to get a clean relative path
  let cleanPath = path.startsWith(ENDPOINT) ? path.slice(ENDPOINT.length) : path;
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;
  // Strip any existing /tr:... transformation segment (handles both /tr:x/path and /tr:x,y/path)
  cleanPath = cleanPath.replace(/^\/tr:[^/]+(,[^/]+)*/, "");
  if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

  // No transforms requested — serve the original file at full quality
  if (!transforms) return `${ENDPOINT}${cleanPath}`;

  const tr: string[] = [];
  if (transforms.w) tr.push(`w-${transforms.w}`);
  if (transforms.h) tr.push(`h-${transforms.h}`);
  // default quality 90 when resizing, otherwise 100
  const q = transforms.q ?? (transforms.w || transforms.h ? 90 : 100);
  tr.push(`q-${q}`);
  if (transforms.blur) tr.push(`bl-${transforms.blur}`);
  tr.push("f-auto");

  return `${ENDPOINT}/tr:${tr.join(",")}${cleanPath}`;
}

// LQIP blur placeholder — only works for ImageKit URLs
export function ikLqip(path: string) {
  if (!path || (path.startsWith("http") && !path.includes("imagekit.io"))) return path;
  return ikUrl(path, { w: 20, blur: 10, q: 10 });
}
