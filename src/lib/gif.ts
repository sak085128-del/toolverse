export function encodeGif(frames: { indices: Uint8Array; delayCs: number }[], width: number, height: number, palette: number[][]): Blob {
  const bytes: number[] = [];
  const push = (b: number) => bytes.push(b & 0xff);
  const push16 = (n: number) => { push(n); push(n >> 8); };
  const pushStr = (s: string) => { for (const c of s) bytes.push(c.charCodeAt(0)); };

  pushStr("GIF89a");
  push16(width); push16(height);
  push(0xf7); push(0); push(0);
  for (let i = 0; i < 256; i++) {
    const c = palette[i] ?? [0, 0, 0];
    push(c[0]); push(c[1]); push(c[2]);
  }

  for (const frame of frames) {
    push(0x21); push(0xf9); push(4);
    push(0x04); push16(frame.delayCs); push(0); push(0);
    push(0x2c);
    push16(0); push16(0); push16(width); push16(height);
    push(0x00);
    push(8);
    const data = lzw(frame.indices, 8);
    for (let i = 0; i < data.length; i += 255) bytes.push(Math.min(255, data.length - i), ...data.slice(i, i + 255));
    push(0);
  }
  push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

function lzw(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const CLEAR = 1 << minCodeSize;
  const EOI = CLEAR + 1;
  let codeSize = minCodeSize + 1;
  const dict = new Map<string, number>();
  let next = EOI + 1;
  const reset = () => {
    dict.clear();
    for (let i = 0; i < CLEAR; i++) dict.set(String.fromCharCode(i), i);
    next = EOI + 1;
    codeSize = minCodeSize + 1;
  };
  reset();

  const out: number[] = [];
  let buf = 0, nbits = 0;
  const writeCode = (code: number) => {
    buf |= code << nbits;
    nbits += codeSize;
    while (nbits >= 8) {
      out.push(buf & 0xff);
      buf >>>= 8;
      nbits -= 8;
    }
  };
  const flush = () => { while (nbits > 0) { out.push(buf & 0xff); buf >>>= 8; nbits = Math.max(0, nbits - 8); } };

  writeCode(CLEAR);
  let prefix = "";
  for (let i = 0; i < indices.length; i++) {
    const c = String.fromCharCode(indices[i]);
    const key = prefix + c;
    if (dict.has(key)) { prefix = key; continue; }
    writeCode(dict.get(prefix) ?? CLEAR);
    if (next < 4095) {
      dict.set(key, next++);
      if (next === 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      writeCode(CLEAR);
      reset();
    }
    prefix = c;
  }
  if (prefix.length) writeCode(dict.get(prefix) ?? CLEAR);
  writeCode(EOI);
  flush();
  return new Uint8Array(out);
}

export function quantizeFrame(img: HTMLImageElement, width: number, height: number, palette: number[][]): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Uint8Array(width * height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const d = ctx.getImageData(0, 0, width, height).data;
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    out[p] = nearest(palette, d[i], d[i + 1], d[i + 2]);
  }
  return out;
}

export function buildPalette(imgs: HTMLImageElement[], width: number, height: number): number[][] {
  const counts = new Map<number, number>();
  for (const img of imgs) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const d = ctx.getImageData(0, 0, width, height).data;
    for (let i = 0; i < d.length; i += 4) {
      const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 255);
  const palette: number[][] = [];
  for (const [key] of sorted) {
    palette.push([((key >> 10) & 31) << 3, ((key >> 5) & 31) << 3, (key & 31) << 3]);
  }
  while (palette.length < 256) palette.push([255, 255, 255]);
  return palette;
}

function nearest(palette: number[][], r: number, g: number, b: number): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const d = (r - p[0]) * (r - p[0]) + (g - p[1]) * (g - p[1]) + (b - p[2]) * (b - p[2]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}