const ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/$/, "").trim();

export function ikUrl(
  path: string,
  transforms?: { w?: number; h?: number; q?: number; blur?: number }
) {
  if (!path) return "";

  // Already a full non-ImageKit URL — return as-is
  if (path.startsWith("http") && !path.includes("imagekit.io")) return path;

  // Already a full ImageKit URL
  if (path.startsWith("http") && path.includes("imagekit.io")) {
    // strip any existing tr: segment then re-apply
    const withoutTr = path.replace(/\/tr:[^/]+/, "");
    if (!transforms) return withoutTr;
    const base = withoutTr.replace(ENDPOINT, "");
    const tr = buildTr(transforms);
    return `${ENDPOINT}/tr:${tr}${base.startsWith("/") ? base : "/" + base}`;
  }

  // Bare filename or relative path — prepend endpoint
  let cleanPath = path.startsWith("/") ? path : "/" + path;
  if (!transforms) return `${ENDPOINT}${cleanPath}`;
  return `${ENDPOINT}/tr:${buildTr(transforms)}${cleanPath}`;
}

function buildTr(transforms: { w?: number; h?: number; q?: number; blur?: number }) {
  const tr: string[] = [];
  if (transforms.w) tr.push(`w-${transforms.w}`);
  if (transforms.h) tr.push(`h-${transforms.h}`);
  const q = transforms.q ?? (transforms.w || transforms.h ? 90 : 100);
  tr.push(`q-${q}`);
  if (transforms.blur) tr.push(`bl-${transforms.blur}`);
  tr.push("f-auto");
  return tr.join(",");
}

// LQIP blur placeholder — only works for ImageKit URLs
export function ikLqip(path: string) {
  if (!path || (path.startsWith("http") && !path.includes("imagekit.io"))) return path;
  return ikUrl(path, { w: 20, blur: 10, q: 10 });
}
