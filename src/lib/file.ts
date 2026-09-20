import { humanSize } from "./core";

export async function readText(file: File): Promise<string> {
  return await file.text();
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

export function formatMime(file: File): string {
  return file.type || "unknown";
}
export { humanSize };

export async function sha256(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(digest);
}
export async function sha1(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return bytesToHex(digest);
}
export async function sha512(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-512", buf);
  return bytesToHex(digest);
}
export async function sha256OfBuffer(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(digest);
}
export function bytesToB64(u8: Uint8Array): string {
  const bin = new Uint8Array(u8.byteLength);
  bin.set(u8);
  let s = "";
  for (let i = 0; i < bin.length; i += 0x8000) {
    s += String.fromCharCode(...bin.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
export function hexToB64(hex: string): string {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytesToB64(out);
}
export async function md5(buf: ArrayBuffer): Promise<string> {
  return md5Bytes(new Uint8Array(buf));
}
export function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  return out;
}
export function md5FromHex(hex: string): Promise<string> {
  return md5FromBytes(hexToBytes(hex));
}
export async function md5FromBytes(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  return md5Bytes(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

function md5Bytes(bytes: Uint8Array): string {
  const len = bytes.length;
  const bitLen = len * 8;
  const n = (((len + 9 + 63) >> 6) << 6);
  const msg = new Uint8Array(n);
  msg.set(bytes);
  msg[len] = 0x80;
  msg[n - 8] = bitLen & 0xff;
  msg[n - 7] = (bitLen >>> 8) & 0xff;
  msg[n - 6] = (bitLen >>> 16) & 0xff;
  msg[n - 5] = (bitLen >>> 24) & 0xff;
  const dv = new DataView(msg.buffer);
  const M = new Int32Array(n / 4);
  for (let i = 0; i < n / 4; i++) M[i] = dv.getInt32(i * 4, true);
  const S = new Int32Array([
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]);
  const K = new Int32Array(64);
  for (let i = 0; i < 64; i++) K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) & 0xffffffff) | 0;
  let a0 = 0x67452301 | 0, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476 | 0;
  for (let off = 0; off < M.length; off += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[off + g]) | 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  let hex = "";
  for (const x of [a0 >>> 0, b0 >>> 0, c0 >>> 0, d0 >>> 0]) {
    hex += (x & 0xff).toString(16).padStart(2, "0")
      + ((x >>> 8) & 0xff).toString(16).padStart(2, "0")
      + ((x >>> 16) & 0xff).toString(16).padStart(2, "0")
      + ((x >>> 24) & 0xff).toString(16).padStart(2, "0");
  }
  return hex;
}

export function uuidv4(): string {
  return crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) | (c === "x" ? 0 : 8);
    return r.toString(16);
  });
}
export function uuidv7(): string {
  const t = BigInt(Date.now());
  const bytes = new Uint8Array(16);
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number((t >> BigInt((5 - i) * 8)) & 0xffn);
  }
  crypto.getRandomValues(bytes.subarray(6));
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes.buffer);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function base64Encode(str: string): string {
  try { return btoa(unescape(encodeURIComponent(str))); }
  catch { return ""; }
}
export function base64Decode(str: string): string {
  try { return decodeURIComponent(escape(atob(str))); }
  catch { return ""; }
}
export function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = r.result as string; resolve(s.split(",")[1] ?? ""); };
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(f);
  });
}

export async function parseJson<T = unknown>(text: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  try { return { ok: true, data: JSON.parse(text) as T }; }
  catch { return { ok: false, error: "Invalid JSON" }; }
}

export async function csvToJson(csv: string, delimiter = ","): Promise<string> {
  const lines = csv.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row.");
  const header = parseCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((l) => {
    const cells = parseCsvLine(l, delimiter);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h.trim()] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return JSON.stringify(rows, null, 2);
}

export function jsonToCsv(json: string, delimiter = ","): string {
  const data = JSON.parse(json) as unknown;
  const arr = Array.isArray(data) ? data : [data];
  if (!arr.length) return "";
  const header = [...new Set(arr.flatMap((r) => (r && typeof r === "object" ? Object.keys(r as object) : [])))];
  const esc = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [header.map(esc).join(delimiter)];
  for (const r of arr) {
    if (!r || typeof r !== "object") continue;
    rows.push(header.map((h) => esc((r as Record<string, unknown>)[h])).join(delimiter));
  }
  return rows.join("\n");
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}