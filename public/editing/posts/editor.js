// ── State ──────────────────────────────────────────────────────────────────
const state = {
  image: null,
  rotation: 0,
  flipH: false,
  flipV: false,
  activeFilter: 'none',
  brightness: 0, contrast: 0, warmth: 0,
  saturation: 0, shadows: 0, highlights: 0,
  whites: 0, blacks: 0, clarity: 0,
  fade: 0, grain: 0, sharpen: 0,
  hue: 0, hslSat: 0, luminance: 0,
  vignette: 0,
  cropRatio: 'free',
  texts: [],
  selectedText: null,
  activeAdj: 'brightness',
};

// ── Adjustments Definition ─────────────────────────────────────────────────
const SVG = {
  brightness: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`,
  contrast:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/></svg>`,
  saturation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>`,
  warmth:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
  shadows:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor" stroke="none"/></svg>`,
  highlights: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/></svg>`,
  whites:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>`,
  blacks:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>`,
  clarity:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  fade:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9" stroke-opacity="0.6"/><line x1="3" y1="15" x2="21" y2="15" stroke-opacity="0.3"/></svg>`,
  grain:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="7" cy="8" r="1" fill="currentColor"/><circle cx="13" cy="5" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/><circle cx="5" cy="15" r="1" fill="currentColor"/><circle cx="11" cy="18" r="1" fill="currentColor"/><circle cx="19" cy="16" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="8" r="1" fill="currentColor"/></svg>`,
  sharpen:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 20 2 20"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="18"/></svg>`,
  hue:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 7.07 17.07" stroke-dasharray="4 2"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`,
  hslSat:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="4" stroke="#f66"/><circle cx="14" cy="12" r="4" stroke="#6f6"/><circle cx="11" cy="8" r="4" stroke="#66f"/></svg>`,
  luminance:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2V17H8.5v-1.8A7 7 0 0 1 5 9a7 7 0 0 1 7-7z"/></svg>`,
  vignette:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="3"/><ellipse cx="12" cy="12" rx="6" ry="6" stroke-opacity="0.5"/></svg>`,
};

const ADJUSTMENTS = [
  { id: 'brightness', label: 'Bright',    min: -100, max: 100 },
  { id: 'contrast',   label: 'Contrast',  min: -100, max: 100 },
  { id: 'saturation', label: 'Saturation',min: -100, max: 100 },
  { id: 'warmth',     label: 'Warmth',    min: -100, max: 100 },
  { id: 'shadows',    label: 'Shadows',   min: -100, max: 100 },
  { id: 'highlights', label: 'Highlights',min: -100, max: 100 },
  { id: 'whites',     label: 'Whites',    min: -100, max: 100 },
  { id: 'blacks',     label: 'Blacks',    min: -100, max: 100 },
  { id: 'clarity',    label: 'Clarity',   min: -100, max: 100 },
  { id: 'fade',       label: 'Fade',      min:    0, max: 100 },
  { id: 'grain',      label: 'Grain',     min:    0, max: 100 },
  { id: 'sharpen',    label: 'Sharpen',   min:    0, max: 100 },
  { id: 'hue',        label: 'Hue',       min: -180, max: 180 },
  { id: 'hslSat',     label: 'HSL Sat',   min: -100, max: 100 },
  { id: 'luminance',  label: 'Luminance', min: -100, max: 100 },
  { id: 'vignette',   label: 'Vignette',  min:    0, max: 100 },
];

// ── Filters Definition ─────────────────────────────────────────────────────
const FILTERS = [
  { id: 'none',        label: 'Normal' },
  { id: 'paris',       label: 'Paris' },
  { id: 'losangeles',  label: 'Los Angeles' },
  { id: 'fade',        label: 'Fade' },
  { id: 'fadewarm',    label: 'Fade Warm' },
  { id: 'fadecool',    label: 'Fade Cool' },
  { id: 'simple',      label: 'Simple' },
  { id: 'simplewarm',  label: 'Simple Warm' },
  { id: 'simplecool',  label: 'Simple Cool' },
  { id: 'boostwarm',   label: 'Boost Warm' },
  { id: 'boostcool',   label: 'Boost Cool' },
  { id: 'graphite',    label: 'Graphite' },
  { id: 'hyper',       label: 'Hyper' },
  { id: 'rosy',        label: 'Rosy' },
  { id: 'midnight',    label: 'Midnight' },
  { id: 'halo',        label: 'Halo' },
  { id: 'colorleak',   label: 'Color Leak' },
  { id: 'softlight',   label: 'Soft Light' },
  { id: 'zoomblur',    label: 'Zoom Blur' },
  { id: 'morie',       label: 'Morie' },
  { id: 'wavy',        label: 'Wavy' },
  { id: 'wideangle',   label: 'Wide Angle' },
  { id: 'oslo',        label: 'Oslo' },
  { id: 'lofi',        label: 'Lo-Fi' },
  { id: 'willow',      label: 'Willow' },
  { id: 'sierra',      label: 'Sierra' },
];

// ── Filter pixel/canvas processors ────────────────────────────────────────
function applyFilterToImageData(id, imageData, canvas) {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;
  const ctx = canvas.getContext('2d');

  switch (id) {
    case 'paris':       toneMap(d, [1.05,0.95,1.1], 10, 1.1); break;
    case 'losangeles':  toneMap(d, [1.1,1.0,0.9], 15, 1.15); break;
    case 'fade':        fadeEffect(d, 40); break;
    case 'fadewarm':    fadeEffect(d, 30); toneMap(d,[1.05,1.0,0.95],0,1); break;
    case 'fadecool':    fadeEffect(d, 30); toneMap(d,[0.95,1.0,1.05],0,1); break;
    case 'simple':      adjustSaturation(d, -30); break;
    case 'simplewarm':  adjustSaturation(d,-20); toneMap(d,[1.05,1.0,0.95],0,1); break;
    case 'simplecool':  adjustSaturation(d,-20); toneMap(d,[0.95,1.0,1.05],0,1); break;
    case 'boostwarm':   toneMap(d,[1.15,1.05,0.85],0,1.1); adjustSaturation(d,20); break;
    case 'boostcool':   toneMap(d,[0.85,1.05,1.15],0,1.1); adjustSaturation(d,20); break;
    case 'graphite':    toGrayscale(d); adjustContrast(d, 30); break;
    case 'hyper':       adjustSaturation(d,60); adjustContrast(d,30); break;
    case 'rosy':        toneMap(d,[1.1,0.9,0.9],0,1); adjustSaturation(d,15); break;
    case 'midnight':    toneMap(d,[0.7,0.8,1.1],-20,0.9); adjustSaturation(d,-20); break;
    case 'halo':        toneMap(d,[1.05,1.05,0.9],20,1.05); applyGlow(ctx,w,h); break;
    case 'colorleak':   colorLeak(d,w,h); break;
    case 'softlight':   softLight(d); break;
    case 'zoomblur':    zoomBlur(ctx,w,h); break;
    case 'morie':       morieEffect(d,w,h); break;
    case 'wavy':        wavyEffect(ctx,w,h); break;
    case 'wideangle':   wideAngle(ctx,w,h); break;
    case 'oslo':        toneMap(d,[0.9,1.0,1.05],-10,0.95); adjustSaturation(d,-15); break;
    case 'lofi':        adjustSaturation(d,40); adjustContrast(d,40); toneMap(d,[1.0,0.9,0.85],0,1); break;
    case 'willow':      toGrayscale(d); fadeEffect(d,20); break;
    case 'sierra':      toneMap(d,[1.05,1.0,0.9],10,1.05); adjustSaturation(d,-10); break;
    default: break;
  }
}

// ── Pixel helpers ──────────────────────────────────────────────────────────
function clamp(v) { return Math.max(0, Math.min(255, v)); }

function toneMap(d, rgb, brightnessAdd, contrastMul) {
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(((d[i]   * rgb[0]) + brightnessAdd - 128) * contrastMul + 128);
    d[i+1] = clamp(((d[i+1] * rgb[1]) + brightnessAdd - 128) * contrastMul + 128);
    d[i+2] = clamp(((d[i+2] * rgb[2]) + brightnessAdd - 128) * contrastMul + 128);
  }
}

function fadeEffect(d, amount) {
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(d[i]   + amount);
    d[i+1] = clamp(d[i+1] + amount);
    d[i+2] = clamp(d[i+2] + amount);
  }
}

function toGrayscale(d) {
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    d[i] = d[i+1] = d[i+2] = g;
  }
}

function adjustSaturation(d, amount) {
  const f = amount / 100;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    d[i]   = clamp(gray + (d[i]   - gray) * (1 + f));
    d[i+1] = clamp(gray + (d[i+1] - gray) * (1 + f));
    d[i+2] = clamp(gray + (d[i+2] - gray) * (1 + f));
  }
}

function adjustContrast(d, amount) {
  const f = (259 * (amount + 255)) / (255 * (259 - amount));
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(f * (d[i]   - 128) + 128);
    d[i+1] = clamp(f * (d[i+1] - 128) + 128);
    d[i+2] = clamp(f * (d[i+2] - 128) + 128);
  }
}

function softLight(d) {
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(d[i]   * 0.9 + 20);
    d[i+1] = clamp(d[i+1] * 0.9 + 20);
    d[i+2] = clamp(d[i+2] * 0.9 + 20);
  }
}

function colorLeak(d, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < w * 0.3) { d[i] = clamp(d[i] + 40); d[i+2] = clamp(d[i+2] - 20); }
      if (x > w * 0.7) { d[i+2] = clamp(d[i+2] + 40); d[i] = clamp(d[i] - 20); }
    }
  }
}

function morieEffect(d, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const wave = Math.sin((x + y) * 0.15) * 15;
      d[i]   = clamp(d[i]   + wave);
      d[i+1] = clamp(d[i+1] - wave * 0.5);
    }
  }
}

function applyGlow(ctx, w, h) {
  ctx.save();
  ctx.filter = 'blur(8px)';
  ctx.globalAlpha = 0.3;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(ctx.canvas, 0, 0, w, h);
  ctx.restore();
}

function zoomBlur(ctx, w, h) {
  const steps = 6;
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 1; i <= steps; i++) {
    const s = 1 + i * 0.015;
    const ox = (w - w * s) / 2;
    const oy = (h - h * s) / 2;
    ctx.drawImage(ctx.canvas, ox, oy, w * s, h * s);
  }
  ctx.restore();
}

function wavyEffect(ctx, w, h) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data; const dd = dst.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.round(x + Math.sin(y * 0.05) * 8);
      const sy = Math.round(y + Math.sin(x * 0.05) * 8);
      const si = (Math.min(Math.max(sy,0),h-1) * w + Math.min(Math.max(sx,0),w-1)) * 4;
      const di = (y * w + x) * 4;
      dd[di]=sd[si]; dd[di+1]=sd[si+1]; dd[di+2]=sd[si+2]; dd[di+3]=sd[si+3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

function wideAngle(ctx, w, h) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const sd = src.data; const dd = dst.data;
  const cx = w/2, cy = h/2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / cx, ny = (y - cy) / cy;
      const r = Math.sqrt(nx*nx + ny*ny);
      const f = 1 + r * r * 0.2;
      const sx = Math.round(nx * f * cx + cx);
      const sy = Math.round(ny * f * cy + cy);
      const di = (y * w + x) * 4;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        dd[di]=sd[si]; dd[di+1]=sd[si+1]; dd[di+2]=sd[si+2]; dd[di+3]=sd[si+3];
      }
    }
  }
  ctx.putImageData(dst, 0, 0);
}

// ── Adjustment helpers ─────────────────────────────────────────────────────
function applyAdjustments(d, w, h, ctx) {
  const s = state;

  // brightness
  if (s.brightness !== 0) {
    const b = s.brightness * 2.55;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = clamp(d[i]+b); d[i+1] = clamp(d[i+1]+b); d[i+2] = clamp(d[i+2]+b);
    }
  }
  // contrast
  if (s.contrast !== 0) adjustContrast(d, s.contrast);
  // warmth
  if (s.warmth !== 0) {
    const wf = s.warmth * 0.8;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = clamp(d[i]   + wf);
      d[i+2] = clamp(d[i+2] - wf);
    }
  }
  // saturation
  if (s.saturation !== 0) adjustSaturation(d, s.saturation);
  // shadows
  if (s.shadows !== 0) {
    const sf = s.shadows / 100;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
      if (lum < 0.5) {
        const boost = sf * (0.5 - lum) * 100;
        d[i] = clamp(d[i]+boost); d[i+1] = clamp(d[i+1]+boost); d[i+2] = clamp(d[i+2]+boost);
      }
    }
  }
  // highlights
  if (s.highlights !== 0) {
    const hf = s.highlights / 100;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
      if (lum > 0.5) {
        const boost = hf * (lum - 0.5) * 100;
        d[i] = clamp(d[i]+boost); d[i+1] = clamp(d[i+1]+boost); d[i+2] = clamp(d[i+2]+boost);
      }
    }
  }
  // whites
  if (s.whites !== 0) {
    const wf = s.whites * 0.5;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
      if (lum > 0.75) {
        d[i] = clamp(d[i]+wf); d[i+1] = clamp(d[i+1]+wf); d[i+2] = clamp(d[i+2]+wf);
      }
    }
  }
  // blacks
  if (s.blacks !== 0) {
    const bf = s.blacks * 0.5;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114) / 255;
      if (lum < 0.25) {
        d[i] = clamp(d[i]+bf); d[i+1] = clamp(d[i+1]+bf); d[i+2] = clamp(d[i+2]+bf);
      }
    }
  }
  // clarity (local contrast boost)
  if (s.clarity !== 0) {
    const cf = s.clarity / 100;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i+1] + d[i+2]) / 3;
      d[i]   = clamp(d[i]   + (d[i]   - avg) * cf * 2);
      d[i+1] = clamp(d[i+1] + (d[i+1] - avg) * cf * 2);
      d[i+2] = clamp(d[i+2] + (d[i+2] - avg) * cf * 2);
    }
  }
  // fade
  if (s.fade > 0) fadeEffect(d, s.fade * 0.6);
  // grain
  if (s.grain > 0) {
    const gf = s.grain / 100;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * gf * 80;
      d[i] = clamp(d[i]+n); d[i+1] = clamp(d[i+1]+n); d[i+2] = clamp(d[i+2]+n);
    }
  }
  // sharpen (simple unsharp mask approximation)
  if (s.sharpen > 0) {
    const sf2 = s.sharpen / 100;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i+1] + d[i+2]) / 3;
      d[i]   = clamp(d[i]   + (d[i]   - avg) * sf2 * 1.5);
      d[i+1] = clamp(d[i+1] + (d[i+1] - avg) * sf2 * 1.5);
      d[i+2] = clamp(d[i+2] + (d[i+2] - avg) * sf2 * 1.5);
    }
  }
  // hue rotation
  if (s.hue !== 0) {
    const h = s.hue / 360;
    for (let i = 0; i < d.length; i += 4) {
      let [rh, rs, rl] = rgbToHsl(d[i], d[i+1], d[i+2]);
      rh = (rh + h + 1) % 1;
      const [nr, ng, nb] = hslToRgb(rh, rs, rl);
      d[i] = nr; d[i+1] = ng; d[i+2] = nb;
    }
  }
  // hsl saturation
  if (s.hslSat !== 0) {
    const sf3 = s.hslSat / 100;
    for (let i = 0; i < d.length; i += 4) {
      let [rh, rs, rl] = rgbToHsl(d[i], d[i+1], d[i+2]);
      rs = Math.max(0, Math.min(1, rs + sf3));
      const [nr, ng, nb] = hslToRgb(rh, rs, rl);
      d[i] = nr; d[i+1] = ng; d[i+2] = nb;
    }
  }
  // luminance
  if (s.luminance !== 0) {
    const lf = s.luminance / 100;
    for (let i = 0; i < d.length; i += 4) {
      let [rh, rs, rl] = rgbToHsl(d[i], d[i+1], d[i+2]);
      rl = Math.max(0, Math.min(1, rl + lf * 0.5));
      const [nr, ng, nb] = hslToRgb(rh, rs, rl);
      d[i] = nr; d[i+1] = ng; d[i+2] = nb;
    }
  }
  // vignette
  if (s.vignette > 0) {
    const strength = s.vignette / 100;
    const cx = w / 2, cy = h / 2;
    const maxDist = Math.sqrt(cx*cx + cy*cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2) / maxDist;
        const factor = 1 - dist * dist * strength * 1.5;
        const i = (y * w + x) * 4;
        d[i]   = clamp(d[i]   * factor);
        d[i+1] = clamp(d[i+1] * factor);
        d[i+2] = clamp(d[i+2] * factor);
      }
    }
  }
}

// HSL helpers
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      default: h = ((r-g)/d + 4)/6;
    }
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l*255); return [v,v,v]; }
  const q = l < 0.5 ? l*(1+s) : l+s-l*s;
  const p = 2*l-q;
  const hue2rgb = (p,q,t) => {
    if(t<0)t+=1; if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  };
  return [
    Math.round(hue2rgb(p,q,h+1/3)*255),
    Math.round(hue2rgb(p,q,h)*255),
    Math.round(hue2rgb(p,q,h-1/3)*255)
  ];
}

// ── Render ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

function render() {
  if (!state.image) return;

  const img = state.image;
  const rad = state.rotation * Math.PI / 180;
  const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));

  let sw = img.naturalWidth, sh = img.naturalHeight;

  // apply crop ratio
  let cropW = sw, cropH = sh;
  if (state.cropRatio !== 'free') {
    const [rw, rh] = state.cropRatio.split(':').map(Number);
    const targetRatio = rw / rh;
    const imgRatio = sw / sh;
    if (imgRatio > targetRatio) { cropW = sh * targetRatio; }
    else { cropH = sw / targetRatio; }
  }

  const cw = Math.round(cropW * cos + cropH * sin);
  const ch = Math.round(cropW * sin + cropH * cos);
  canvas.width = cw;
  canvas.height = ch;

  ctx.save();
  ctx.translate(cw/2, ch/2);
  ctx.rotate(rad);
  ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);

  const ox = (sw - cropW) / 2, oy = (sh - cropH) / 2;
  ctx.drawImage(img, ox, oy, cropW, cropH, -cropW/2, -cropH/2, cropW, cropH);
  ctx.restore();

  // pixel-level filter
  if (state.activeFilter !== 'none') {
    const imageData = ctx.getImageData(0, 0, cw, ch);
    applyFilterToImageData(state.activeFilter, imageData, canvas);
    ctx.putImageData(imageData, 0, 0);
  }

  // adjustments
  const imageData = ctx.getImageData(0, 0, cw, ch);
  applyAdjustments(imageData.data, cw, ch, ctx);
  ctx.putImageData(imageData, 0, 0);

  // post-process canvas effects (zoom blur, wavy, wideangle need canvas)
  if (['zoomblur','wavy','wideangle','halo'].includes(state.activeFilter)) {
    const imageData2 = ctx.getImageData(0, 0, cw, ch);
    if (state.activeFilter === 'wavy') wavyEffect(ctx, cw, ch);
    else if (state.activeFilter === 'wideangle') wideAngle(ctx, cw, ch);
    else if (state.activeFilter === 'zoomblur') zoomBlur(ctx, cw, ch);
    else if (state.activeFilter === 'halo') applyGlow(ctx, cw, ch);
  }
}

// ── Filter Thumbnails ──────────────────────────────────────────────────────
function buildFilterGrid() {
  const grid = document.getElementById('filterGrid');
  FILTERS.forEach(f => {
    const item = document.createElement('div');
    item.className = 'filter-item' + (f.id === 'none' ? ' active' : '');
    item.dataset.id = f.id;

    const thumb = document.createElement('canvas');
    thumb.className = 'filter-thumb';
    thumb.width = 80; thumb.height = 80;
    thumb.getContext('2d', { willReadFrequently: true });

    const label = document.createElement('span');
    label.textContent = f.label;

    item.appendChild(thumb);
    item.appendChild(label);
    item.addEventListener('click', () => {
      document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      state.activeFilter = f.id;
      render();
    });
    grid.appendChild(item);
  });
}

function updateFilterThumbs() {
  if (!state.image) return;
  document.querySelectorAll('.filter-item').forEach(item => {
    const id = item.dataset.id;
    const thumb = item.querySelector('canvas');
    const tCtx = thumb.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(state.image, 0, 0, 80, 80);
    if (id !== 'none') {
      const imgData = tCtx.getImageData(0, 0, 80, 80);
      applyFilterToImageData(id, imgData, thumb);
      tCtx.putImageData(imgData, 0, 0);
    }
  });
}

// ── Image Upload ───────────────────────────────────────────────────────────
document.getElementById('imageUpload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      document.getElementById('uploadPrompt').style.display = 'none';
      document.querySelector('.canvas-container').style.display = 'block';
      updateFilterThumbs();
      render();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Adjust Grid Build ─────────────────────────────────────────────────────
function drawRing(canvas, value, min, max) {
  const c = canvas.getContext('2d', { willReadFrequently: true });
  const s = canvas.width;
  const cx = s / 2, cy = s / 2, r = s / 2 - 3;
  c.clearRect(0, 0, s, s);

  // track
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.strokeStyle = '#2e2e2e';
  c.lineWidth = 3;
  c.stroke();

  if (value === 0) return;

  // bipolar: fill from top (12 o'clock) clockwise for positive, counter for negative
  // unipolar: fill from top clockwise
  const pct = Math.abs(value) / (value > 0 ? max : Math.abs(min));
  const start = -Math.PI / 2;
  const sweep = pct * Math.PI * 2;
  const isNeg = value < 0;

  c.beginPath();
  if (isNeg) {
    c.arc(cx, cy, r, start - sweep, start);
  } else {
    c.arc(cx, cy, r, start, start + sweep);
  }
  c.strokeStyle = isNeg ? '#888' : '#fff';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.stroke();
}

function pctLabel(value, min, max) {
  if (min < 0) return (value > 0 ? '+' : '') + value;
  return value + '%';
}

function buildAdjustGrid() {
  const grid = document.getElementById('adjustGrid');
  grid.innerHTML = '';
  ADJUSTMENTS.forEach(adj => {
    const item = document.createElement('div');
    item.className = 'adj-item' + (adj.id === state.activeAdj ? ' active' : '');
    item.dataset.id = adj.id;

    const ring = document.createElement('div');
    ring.className = 'adj-ring';

    const rc = document.createElement('canvas');
    rc.width = 52; rc.height = 52;
    drawRing(rc, state[adj.id], adj.min, adj.max);

    const pct = document.createElement('div');
    pct.className = 'adj-ring-pct';
    pct.id = 'pct-' + adj.id;
    pct.textContent = pctLabel(state[adj.id], adj.min, adj.max);

    ring.appendChild(rc);
    ring.appendChild(pct);

    const icon = document.createElement('div');
    icon.className = 'adj-icon';
    icon.innerHTML = SVG[adj.id] || '';

    const label = document.createElement('div');
    label.className = 'adj-label';
    label.textContent = adj.label;

    item.appendChild(ring);
    item.appendChild(icon);
    item.appendChild(label);

    item.addEventListener('click', () => {
      state.activeAdj = adj.id;
      document.querySelectorAll('.adj-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      syncDialToActive();
    });

    grid.appendChild(item);
  });
}

function syncDialToActive() {
  const adj = ADJUSTMENTS.find(a => a.id === state.activeAdj);
  if (!adj) return;
  const val = state[adj.id];

  // update slider
  const slider = document.getElementById('activeSlider');
  slider.min = adj.min;
  slider.max = adj.max;
  slider.value = val;

  // update dial labels
  document.getElementById('dialValue').textContent = pctLabel(val, adj.min, adj.max);
  document.getElementById('dialName').textContent = adj.label;
  document.querySelector('.dial-slider-min').textContent = adj.min;
  document.querySelector('.dial-slider-max').textContent = (adj.max > 0 ? '+' : '') + adj.max;

  // redraw big dial
  drawDialBig(val, adj.min, adj.max);
}

function drawDialBig(value, min, max) {
  const dc = document.getElementById('dialCanvas');
  const dctx = dc.getContext('2d', { willReadFrequently: true });
  const s = dc.width;
  const cx = s / 2, cy = s / 2, r = s / 2 - 8;
  dctx.clearRect(0, 0, s, s);

  // track
  dctx.beginPath();
  dctx.arc(cx, cy, r, 0, Math.PI * 2);
  dctx.strokeStyle = '#2a2a2a';
  dctx.lineWidth = 7;
  dctx.stroke();

  if (value === 0) return;

  const pct = Math.abs(value) / (value > 0 ? max : Math.abs(min));
  const start = -Math.PI / 2;
  const sweep = pct * Math.PI * 2;
  const isNeg = value < 0;

  const grad = dctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, isNeg ? '#666' : '#fff');
  grad.addColorStop(1, isNeg ? '#444' : '#aaa');

  dctx.beginPath();
  if (isNeg) {
    dctx.arc(cx, cy, r, start - sweep, start);
  } else {
    dctx.arc(cx, cy, r, start, start + sweep);
  }
  dctx.strokeStyle = grad;
  dctx.lineWidth = 7;
  dctx.lineCap = 'round';
  dctx.stroke();
}

// active slider
document.getElementById('activeSlider').addEventListener('input', e => {
  const val = parseInt(e.target.value);
  state[state.activeAdj] = val;
  const adj = ADJUSTMENTS.find(a => a.id === state.activeAdj);

  document.getElementById('dialValue').textContent = pctLabel(val, adj.min, adj.max);
  drawDialBig(val, adj.min, adj.max);

  // update mini ring
  const item = document.querySelector(`.adj-item[data-id="${state.activeAdj}"]`);
  if (item) {
    drawRing(item.querySelector('canvas'), val, adj.min, adj.max);
    document.getElementById('pct-' + state.activeAdj).textContent = pctLabel(val, adj.min, adj.max);
  }
  render();
});

// ── Rotate / Flip ──────────────────────────────────────────────────────────
function rotateImage(deg) {
  state.rotation = (state.rotation + deg + 360) % 360;
  render();
}

function flipImage(dir) {
  if (dir === 'h') state.flipH = !state.flipH;
  else state.flipV = !state.flipV;
  render();
}

// ── Crop Ratio ─────────────────────────────────────────────────────────────
function setCrop(ratio) {
  state.cropRatio = ratio;
  render();
}

// ── Text Editing ───────────────────────────────────────────────────────────
const overlay = document.getElementById('textOverlayContainer');

document.getElementById('addTextBtn').addEventListener('click', () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;

  const node = document.createElement('div');
  node.className = 'text-node';
  node.textContent = text;
  node.style.left = '20px';
  node.style.top = '20px';
  node.style.fontSize = document.getElementById('fontSize').value + 'px';
  node.style.color = document.getElementById('fontColor').value;
  node.style.fontFamily = document.getElementById('fontFamily').value;
  node.style.textAlign = document.getElementById('textAlign').value;
  node.style.fontWeight = document.getElementById('textBold').checked ? 'bold' : 'normal';
  node.style.fontStyle = document.getElementById('textItalic').checked ? 'italic' : 'normal';
  node.style.opacity = document.getElementById('textOpacity').value / 100;

  makeDraggable(node);
  node.addEventListener('click', e => {
    e.stopPropagation();
    if (state.selectedText === node) {
      node.remove();
      state.selectedText = null;
    } else {
      document.querySelectorAll('.text-node').forEach(n => n.classList.remove('selected'));
      node.classList.add('selected');
      state.selectedText = node;
      document.getElementById('fontSize').value    = parseInt(node.style.fontSize);
      document.getElementById('fontColor').value   = rgbToHex(node.style.color);
      document.getElementById('fontFamily').value  = node.style.fontFamily.replace(/['"]*/g, '');
      document.getElementById('textAlign').value   = node.style.textAlign || 'left';
      document.getElementById('textBold').checked  = node.style.fontWeight === 'bold';
      document.getElementById('textItalic').checked = node.style.fontStyle === 'italic';
      document.getElementById('textOpacity').value = Math.round((parseFloat(node.style.opacity) || 1) * 100);
    }
  });

  overlay.appendChild(node);
  document.getElementById('textInput').value = '';
});

function makeDraggable(el) {
  let ox, oy, startX, startY;
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    ox = el.offsetLeft; oy = el.offsetTop;
    const onMove = ev => {
      el.style.left = (ox + ev.clientX - startX) + 'px';
      el.style.top  = (oy + ev.clientY - startY) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // touch support
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    ox = el.offsetLeft; oy = el.offsetTop;
    const onMove = ev => {
      const tt = ev.touches[0];
      el.style.left = (ox + tt.clientX - startX) + 'px';
      el.style.top  = (oy + tt.clientY - startY) + 'px';
    };
    const onEnd = () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
    el.addEventListener('touchmove', onMove);
    el.addEventListener('touchend', onEnd);
  });
}

// ── Live-update selected text ──────────────────────────────────────────────
function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m) return '#ffffff';
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function applyToSelected() {
  const node = state.selectedText;
  if (!node) return;
  node.style.fontSize   = document.getElementById('fontSize').value + 'px';
  node.style.color      = document.getElementById('fontColor').value;
  node.style.fontFamily = document.getElementById('fontFamily').value;
  node.style.textAlign  = document.getElementById('textAlign').value;
  node.style.fontWeight = document.getElementById('textBold').checked   ? 'bold'   : 'normal';
  node.style.fontStyle  = document.getElementById('textItalic').checked ? 'italic' : 'normal';
  node.style.opacity    = document.getElementById('textOpacity').value / 100;
}

['fontSize', 'fontColor', 'fontFamily', 'textAlign', 'textOpacity'].forEach(id => {
  document.getElementById(id).addEventListener('input', applyToSelected);
  document.getElementById(id).addEventListener('change', applyToSelected);
});
['textBold', 'textItalic'].forEach(id => {
  document.getElementById(id).addEventListener('change', applyToSelected);
});

// ── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── Reset ──────────────────────────────────────────────────────────────────
function resetAll() {
  state.rotation = 0; state.flipH = false; state.flipV = false;
  state.activeFilter = 'none'; state.cropRatio = 'free';
  ADJUSTMENTS.forEach(a => { state[a.id] = 0; });
  state.activeAdj = 'brightness';

  buildAdjustGrid();
  syncDialToActive();

  document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
  document.querySelector('.filter-item[data-id="none"]').classList.add('active');

  overlay.innerHTML = '';
  render();
}

// ── Download ───────────────────────────────────────────────────────────────
function downloadImage() {
  if (!state.image) return;

  // flatten text onto a temp canvas
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tCtx = tmp.getContext('2d', { willReadFrequently: true });
  tCtx.drawImage(canvas, 0, 0);

  // draw text nodes
  const containerRect = overlay.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;

  document.querySelectorAll('.text-node').forEach(node => {
    const nodeRect = node.getBoundingClientRect();
    const x = (nodeRect.left - canvasRect.left) * scaleX;
    const y = (nodeRect.top  - canvasRect.top)  * scaleY;

    tCtx.save();
    tCtx.globalAlpha = parseFloat(node.style.opacity) || 1;
    tCtx.font = `${node.style.fontStyle} ${node.style.fontWeight} ${parseFloat(node.style.fontSize) * scaleX}px ${node.style.fontFamily}`;
    tCtx.fillStyle = node.style.color;
    tCtx.textBaseline = 'top';
    tCtx.fillText(node.textContent, x, y);
    tCtx.restore();
  });

  const a = document.createElement('a');
  a.download = 'edited-post.png';
  a.href = tmp.toDataURL('image/png');
  a.click();
}

// ── Init ───────────────────────────────────────────────────────────────────
buildFilterGrid();
buildAdjustGrid();
syncDialToActive();

// ── postMessage bridge ─────────────────────────────────────────────────────
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'LOAD_IMAGE') {
    const img = new Image();
    img.onload = function() {
      state.image = img;
      document.getElementById('uploadPrompt').style.display = 'none';
      document.querySelector('.canvas-container').style.display = 'block';
      updateFilterThumbs();
      render();
    };
    img.src = event.data.imageData;
  }
});

function sendToParent() {
  if (!state.image) return;

  // flatten text onto a temp canvas, capped at 1080px wide
  const MAX = 1080;
  const scale = Math.min(1, MAX / canvas.width);
  const outW = Math.round(canvas.width * scale);
  const outH = Math.round(canvas.height * scale);

  const tmp = document.createElement('canvas');
  tmp.width = outW;
  tmp.height = outH;
  const tCtx = tmp.getContext('2d', { willReadFrequently: true });
  tCtx.drawImage(canvas, 0, 0, outW, outH);

  // draw text nodes scaled
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = outW / canvasRect.width;
  const scaleY = outH / canvasRect.height;
  document.querySelectorAll('.text-node').forEach(function(node) {
    const nodeRect = node.getBoundingClientRect();
    const x = (nodeRect.left - canvasRect.left) * scaleX;
    const y = (nodeRect.top  - canvasRect.top)  * scaleY;
    tCtx.save();
    tCtx.globalAlpha = parseFloat(node.style.opacity) || 1;
    tCtx.font = node.style.fontStyle + ' ' + node.style.fontWeight + ' ' + (parseFloat(node.style.fontSize) * scaleX) + 'px ' + node.style.fontFamily;
    tCtx.fillStyle = node.style.color;
    tCtx.textBaseline = 'top';
    tCtx.fillText(node.textContent, x, y);
    tCtx.restore();
  });

  const imageData = tmp.toDataURL('image/jpeg', 0.88);
  window.parent.postMessage({ type: 'SAVE_IMAGE', imageData: imageData }, '*');
}

// Signal ready to parent
window.parent.postMessage({ type: 'EDITOR_READY' }, '*');
