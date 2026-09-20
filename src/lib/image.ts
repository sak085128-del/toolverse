export function loadImage(file: File, maxDim = 4000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });
}

export function imageFileToCanvas(file: File, maxDim = 4000): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
      type,
      quality
    );
  });
}

export function canvasToBmp(canvas: HTMLCanvasElement): Blob {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const img = ctx.getImageData(0, 0, w, h);
  const rowSize = ((24 * w + 31) >> 5) << 2;
  const dataSize = rowSize * h;
  const buf = new ArrayBuffer(54 + dataSize);
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  u8[0] = 0x42; u8[1] = 0x4d;
  dv.setUint32(2, buf.byteLength, true);
  dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true);
  dv.setUint32(30, 0, true);
  dv.setUint32(34, dataSize, true);
  dv.setInt32(38, 3780, true);
  dv.setInt32(42, 3780, true);
  for (let y = 0; y < h; y++) {
    let row = 54 + (h - 1 - y) * rowSize;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      u8[row++] = img.data[i + 2];
      u8[row++] = img.data[i + 1];
      u8[row] = img.data[i];
      row += 1;
    }
  }
  return new Blob([u8], { type: "image/bmp" });
}

export function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let top = h, bottom = 0, left = w, right = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom <= top || right <= left) return canvas;
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")?.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export function nearestColor(rgb: [number, number, number], palette: Record<string, string>): string {
  let best = Object.keys(palette)[0];
  let bestDist = Infinity;
  for (const [name, hex] of Object.entries(palette)) {
    const p = hexToRgb(hex);
    if (!p) continue;
    const d = (rgb[0] - p[0]) ** 2 + (rgb[1] - p[1]) ** 2 + (rgb[2] - p[2]) ** 2;
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const NAMED_COLORS: Record<string, string> = {
  red: "#ff0000", maroon: "#800000", yellow: "#ffff00", olive: "#808000",
  lime: "#00ff00", green: "#008000", aqua: "#00ffff", teal: "#008080",
  blue: "#0000ff", navy: "#000080", fuchsia: "#ff00ff", purple: "#800080",
  silver: "#c0c0c0", gray: "#808080", black: "#000000", white: "#ffffff",
  orange: "#ffa500", brown: "#a52a2a", pink: "#ffc0cb", gold: "#ffd700",
  magenta: "#ff00ff", violet: "#ee82ee", cyan: "#00ffff", indigo: "#4b0082",
  coral: "#ff7f50", crimson: "#dc143c", salmon: "#fa8072", orchid: "#da70d6",
  khaki: "#f0e68c", plum: "#dda0dd", tan: "#d2b48c", thistle: "#d8bfd8",
  wheat: "#f5deb3", beige: "#f5f5dc", ivory: "#fffff0", skyblue: "#87ceeb",
};