import type { ToolImpl } from "../types";
import { btn, btnRow, copyBtn, node, textarea, toast, formatNumber } from "../../lib/core";
import { uuidv4, uuidv7, sha256, sha1, md5, md5FromBytes } from "../../lib/file";
import qrcodeFactory from "../../lib/qrcode.js";
import { ean13Bars, drawBarcode } from "../../lib/barcode";

const devTools2: Record<string, ToolImpl> = {
  "uuid-generator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Version</span><select data-node="v"><option value="4">v4 (random)</option><option value="7">v7 (time-ordered)</option></select></label></div>
      <div class="col"><label class="field"><span>Count</span><input data-node="n" type="number" value="5" min="1" max="100"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>
      <div class="checks"><label class="check"><input data-node="upper" type="checkbox"> UPPERCASE</label>
      <label class="check"><input data-node="nodash" type="checkbox"> No dashes</label></div>
      <div class="code-view" data-put></div>` +
      btnRow(copyBtn("Copy all", "") , btn("Copy one", "one")),
    init: (root) => {
      const put = root.querySelector<HTMLElement>("[data-put]");
      const gen = () => {
        const v = (root.querySelector("[data-node='v']") as HTMLSelectElement).value;
        const n = Math.max(1, Math.min(100, parseInt(node<HTMLInputElement>(root, "n").value) || 1));
        const upper = (root.querySelector("[data-node='upper']") as HTMLInputElement).checked;
        const nodash = (root.querySelector("[data-node='nodash']") as HTMLInputElement).checked;
        let out: string[] = [];
        for (let i = 0; i < n; i++) out.push(v === "7" ? uuidv7() : uuidv4());
        if (upper) out = out.map((x) => x.toUpperCase());
        if (nodash) out = out.map((x) => x.replace(/-/g, ""));
        if (put) put.textContent = out.join("\n");
        return out;
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", gen);
      root.querySelector<any>("[data-node='one']")?.addEventListener("click", () => {
        const all = gen();
        void navigator.clipboard.writeText(all[0] || "").then(() => toast("First UUID copied"));
      });
      gen();
    },
  },

  "password-generator": {
    markup: () => `<div class="row">
        <div class="col col-wide"><label class="field"><span>Generated password</span><input data-node="out" type="text" value="" readonly spellcheck="false"></label></div>
        <div class="col"><button type="button" class="btn mini btn-btm" data-node="copy">Copy</button></div></div>
      <label class="field"><span>Length</span><input data-node="len" type="range" min="4" max="64" value="16"></label>
      <div class="checks">
        <label class="check"><input data-node="lower" type="checkbox" checked> Lowercase</label>
        <label class="check"><input data-node="upper" type="checkbox" checked> Uppercase</label>
        <label class="check"><input data-node="digits" type="checkbox" checked> Numbers</label>
        <label class="check"><input data-node="symbols" type="checkbox" checked> Symbols</label>
        <label class="check"><input data-node="exclude" type="checkbox"> Exclude similar (1lIO0O)</label>
      </div>
      <div class="field"><div class="field-head"><span>Strength</span><b data-node="strength">Strong</b></div><div class="meter"><div class="meter-fill" data-node="meter"></div></div></div>
      <button type="button" class="btn primary" data-node="go">Generate</button>` +
      results(result("Entropy", `<b data-o="ent">—</b>`), result("Might be cracked in", `<b data-o="time">—</b>`)),
    init: (root) => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?";
      const similar = /[1lIO0O]/;
      const gen = () => {
        const len = Math.max(4, Math.min(64, parseInt(node<HTMLInputElement>(root, "len").value) || 16));
        const sets = [(root.querySelector("[data-node='lower']") as HTMLInputElement).checked ? chars.slice(0, 26) : "",
          (root.querySelector("[data-node='upper']") as HTMLInputElement).checked ? chars.slice(26, 52) : "",
          (root.querySelector("[data-node='digits']") as HTMLInputElement).checked ? chars.slice(52, 62) : "",
          (root.querySelector("[data-node='symbols']") as HTMLInputElement).checked ? chars.slice(62) : ""];
        const pool = sets.join("");
        const excl = (root.querySelector("[data-node='exclude']") as HTMLInputElement).checked;
        const effective = excl ? [...pool].filter((c) => !similar.test(c)).join("") : pool;
        if (!effective) { toast("Enable at least one set"); return; }
        const arr = new Uint32Array(len);
        crypto.getRandomValues(arr);
        let pw = "";
        for (let i = 0; i < len; i++) {
          const set = sets.filter(Boolean)[i % sets.length];
          const lset = excl ? [...set].filter((c) => !similar.test(c)).join("") : set;
          const src = i < sets.filter(Boolean).length && lset ? lset : effective;
          pw += src[arr[i] % src.length];
        }
        node<HTMLInputElement>(root, "out").value = pw;
        const entropy = Math.log2(effective.length) * len;
        node(root, "ent").textContent = formatNumber(entropy, 1) + " bits";
        node(root, "time").textContent = crackTime(entropy);
        node(root, "strength").textContent = entropy >= 100 ? "Strong" : entropy >= 60 ? "Good" : entropy >= 40 ? "Weak" : "Avoid";
        const fill = root.querySelector<HTMLElement>("[data-node='meter']");
        if (fill) { fill.style.width = `${Math.min(100, (entropy / 200) * 100)}%`; fill.style.background = entropy >= 70 ? "#22c55e" : entropy >= 40 ? "#f59e0b" : "#dc2626"; }
      };
      (root.querySelector("[data-node='len']") as HTMLElement).addEventListener("input", gen);
      root.querySelectorAll<HTMLInputElement>(".check input").forEach((i) => i.addEventListener("change", gen));
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", gen);
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", () => {
        const v = node<HTMLInputElement>(root, "out").value;
        if (v) void navigator.clipboard.writeText(v).then(() => toast("Copied password"));
      });
      gen();
    },
  },

  "crypto-hash": {
    markup: () => `<div class="row"><div class="col"><label class="field"><span>Source</span><select data-node="src"><option value="text">Text</option><option value="file">File</option></select></label></div>
      <div class="col"><label class="field"><span>Algorithm</span><select data-node="algo"><option>MD5</option><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></label></div></div>` +
      `<div data-field-text>${textarea("in", "Text to hash", "ToolVerse", 3)}</div>` +
      `<div data-field-file hidden><div class="dropzone" data-drop data-multi="0">
        <p class="dz-main">Drop a file to hash</p><input type="file" data-file hidden></div></div>` +
      btnRow(btn("Hash it", "go", true)) +
      results(result("Hex", `<textarea readonly data-node="hex" rows="3"></textarea>`, true), result("SHA-256 (GitHub style)", `<textarea readonly data-node="gh" rows="2"></textarea>`, true), result("Base64", `<input readonly data-node="b64">`)) +
      statusBox("st"),
    init: (root) => {
      const src = root.querySelector<HTMLSelectElement>("[data-node='src']");
      let file: File | null = null;
      src?.addEventListener("change", () => {
        (root.querySelector("[data-field-text]") as HTMLElement).hidden = src.value !== "text";
        (root.querySelector("[data-field-file]") as HTMLElement).hidden = src.value !== "file";
      });
      root.querySelector("[data-drop]")?.addEventListener("click", () => (root.querySelector<HTMLInputElement>("[data-file]"))?.click());
      root.querySelector<any>("[data-file]")?.addEventListener("change", (e: Event) => { file = (e.target as HTMLInputElement).files?.[0] ?? null; });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const algo = (root.querySelector("[data-node='algo']") as HTMLInputElement).value;
        const st = () => node<HTMLElement>(root, "st");
        try {
          let hex: string;
          let b64: string;
          if (src?.value === "file") {
            if (!file) { toast("Pick a file first"); return; }
            const buf = await file.arrayBuffer();
            hex = algo === "MD5" ? await md5(buf) : algo === "SHA-1" ? await sha1(buf) : await sha256(new Blob([buf]));
            b64 = btoa(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(hex))));
          } else {
            const text = node<HTMLTextAreaElement>(root, "in").value;
            const bytes = new TextEncoder().encode(text);
            hex = algo === "MD5" ? await md5FromBytes(bytes) : algo === "SHA-1" ? await sha1(toBuf(bytes)) : await sha256(new Blob([toBuf(bytes)]));
            b64 = btoa(hex.replace(/(..)/g, (m) => String.fromCharCode(parseInt(m, 16))));
          }
          node<HTMLTextAreaElement>(root, "hex").value = hex;
          node<HTMLTextAreaElement>(root, "gh").value = algo === "SHA-256" ? `sha256:${hex}\nSHA256: ${hex}` : hex;
          node<HTMLInputElement>(root, "b64").value = b64;
          st().textContent = "Hashed locally — file never uploaded.";
        } catch { st().textContent = "Hashing failed in this browser."; }
      });
    },
  },

  "qr-code-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Type</span><select data-node="kind"><option value="text">Text / URL</option><option value="wifi">WiFi</option><option value="vcard">vCard</option></select></label></div>
        <div class="col col-wide"><label class="field"><span>Content</span><input data-node="txt" type="text" value="https://toolverse-phi.vercel.app" spellcheck="false"></label></div></div>
      <div class="row" data-wifi hidden>
        <div class="col"><label class="field"><span>SSID</span><input data-node="ssid" type="text"></label></div>
        <div class="col"><label class="field"><span>Key</span><input data-node="key" type="text"></label></div>
        <div class="col"><label class="field"><span>Encryption</span><select data-node="sec"><option>WPA</option><option>WEP</option><option value="nopass">None</option></select></label></div></div>
      <button type="button" class="btn primary" data-node="go">Generate</button>
      <div class="qr-wrap"><canvas data-canvas width="290" height="290"></canvas><div class="qr-out" data-out></div></div>` +
      btnRow(btn("Save PNG", "save"), copyBtn("Copy data", "")),
    init: (root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
      const kind = root.querySelector<HTMLSelectElement>("[data-node='kind']");
      kind?.addEventListener("change", () => { (root.querySelector("[data-wifi]") as HTMLElement).hidden = kind.value !== "wifi"; });
      const build = () => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let content = node<HTMLInputElement>(root, "txt").value;
        if (kind?.value === "wifi") {
          const ssid = node<HTMLInputElement>(root, "ssid").value;
          const key = node<HTMLInputElement>(root, "key").value;
          const sec = (root.querySelector("[data-node='sec']") as HTMLSelectElement).value;
          content = sec === "nopass" ? `WIFI:T:nopass;S:${ssid};;` : `WIFI:T:${sec};S:${ssid};P:${key};;`;
        } else if (kind?.value === "vcard") {
          const raw = node<HTMLInputElement>(root, "txt").value;
          content = `BEGIN:VCARD\nVERSION:3.0\nFN:${raw}\nN:${raw};;;\nEND:VCARD`;
        }
        const out = root.querySelector<HTMLElement>("[data-out]");
        try {
          const qr = qrcodeFactory(0, "M");
          qr.addData(content, "Byte");
          qr.make();
          const size = 290;
          canvas.width = size; canvas.height = size;
          if (ctx) {
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
            const count = qr.getModuleCount();
            const px = size / count;
            ctx.fillStyle = "#111";
            for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (qr.isDark(r, c)) ctx.fillRect(c * px, r * px, px, px);
          }
          if (out) { out.textContent = ""; out.dataset.data = content; }
        } catch (e) { if (out) out.textContent = "Cannot encode: " + (e instanceof Error ? e.message : "too long"); }
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", build);
      root.querySelector<any>("[data-node='save']")?.addEventListener("click", () => {
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "qr-code.png";
        a.click();
        toast("Saved!");
      });
      build();
    },
  },

  "barcode-generator": {
    markup: () => `<div class="row">
        <div class="col col-wide"><label class="field"><span>Number (up to 12 digits, or 13 with check)</span><input data-node="txt" type="text" value="590123412345" spellcheck="false" inputmode="numeric"></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>
      <div class="qr-wrap"><canvas data-canvas width="360" height="140"></canvas></div>` +
      btn("Save PNG", "save") + statusBox("st"),
    init: (root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
      const build = () => {
        const txt = node<HTMLInputElement>(root, "txt").value;
        const { bars, text } = ean13Bars(txt);
        if (canvas && canvas.getContext("2d")) {
          const ctx = canvas.getContext("2d")!;
          const h = canvas.height;
          drawBarcode(canvas, bars);
          ctx.fillStyle = "#222";
          ctx.font = `${Math.round(h * 0.14)}px ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.fillText(text, canvas.width / 2, h - 12);
        }
        node<HTMLElement>(root, "st").textContent = "EAN-13 generated (check digit added).";
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", build);
      root.querySelector<any>("[data-node='save']")?.addEventListener("click", () => {
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "barcode.png";
        a.click();
        toast("Saved!");
      });
      build();
    },
  },

  "number-base-converter": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Input base</span><select data-node="ibase"><option value="2">Binary (2)</option><option value="8">Octal (8)</option><option value="10" selected>Decimal (10)</option><option value="16">Hex (16)</option></select></label></div>
        <div class="col"><label class="field"><span>Value</span><input data-node="v" type="text" value="255" spellcheck="false"></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Convert</button></div></div>` +
      results(
        result("Binary", `<input readonly data-node="b2">`),
        result("Octal", `<input readonly data-node="o8">`),
        result("Decimal", `<input readonly data-node="d10">`),
        result("Hexadecimal", `<input readonly data-node="x16">`),
        result("Padded (0x00 style)", `<input readonly data-node="pad">`),
      ) + statusBox("st"),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const lang = parseInt((root.querySelector("[data-node='ibase']") as HTMLSelectElement).value, 10);
        const v = node<HTMLInputElement>(root, "v").value.trim();
        const st = () => node<HTMLElement>(root, "st");
        const re = lang === 16 ? /^[0-9a-f]+$/i : lang === 2 ? /^[01]+$/ : new RegExp(`^[0-${lang - 1}]+$`);
        if (v === "" || (lang !== 10 && !re.test(v))) { st().textContent = "Invalid digit for selected base."; return; }
        const dec = lang === 10 ? parseInt(v, 10) : parseInt(v, lang);
        if (!Number.isFinite(dec) || dec < 0) { st().textContent = "Out of range."; return; }
        node<HTMLInputElement>(root, "b2").value = dec.toString(2);
        node<HTMLInputElement>(root, "o8").value = dec.toString(8);
        node<HTMLInputElement>(root, "d10").value = dec.toString(10);
        node<HTMLInputElement>(root, "x16").value = dec.toString(16).toUpperCase();
        node<HTMLInputElement>(root, "pad").value = "0b" + dec.toString(2).padStart(8, "0") + "  0x" + dec.toString(16).toUpperCase().padStart(2, "0");
        st().textContent = `Decimal value: ${dec}.`;
      });
    },
  },

  "diff-checker": {
    markup: () => `<div class="md-grid md-2grid">
        <div><span class="field-head label">Original</span><textarea data-node="a" spellcheck="false">line one
line two
keep me
old text</textarea></div>
        <div><span class="field-head label">Changed</span><textarea data-node="b" spellcheck="false">line one
line two updated
keep me erased?
new text</textarea></div></div>` +
      btnRow(btn("Compare", "go", true)) +
      `<div class="diff-view" data-put></div>`,
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const a = node<HTMLTextAreaElement>(root, "a").value.split("\n");
        const b = node<HTMLTextAreaElement>(root, "b").value.split("\n");
        const put = root.querySelector<HTMLElement>("[data-put]");
        if (!put) return;
        const ops = diffLines(a, b);
        put.innerHTML = ops.map((op) => {
          const cls = op.t === "=" ? "same" : op.t === "+" ? "add" : "del";
          const sign = op.t === "=" ? " " : op.t === "+" ? "+" : "−";
          return `<div class="diffline ${cls}"><span class="dsign">${sign}</span><code>${escapeHtml(op.text || "")}</code></div>`;
        }).join("");
      });
    },
  },

  "ip-lookup": {
    markup: () => `<div class="row">
        <div class="col col-wide"><label class="field"><span>IP address or CIDR</span><input data-node="ip" type="text" value="192.168.1.0/24" spellcheck="false"></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Look up</button></div></div>
      <div class="results" data-put></div>` + statusBox("st"),
    init: (root) => {
      const ipV4Info = (ip: string, prefix: number): Record<string, string> => {
        const oct = ip.split(".").map(Number);
        if (oct.length !== 4 || oct.some((n) => n < 0 || n > 255 || Number.isNaN(n))) return { "Validity": "Invalid IPv4 address" };
        const int = oct.reduce((acc, n) => acc * 256 + n, 0) >>> 0;
        const mask = prefix >= 32 ? 0xffffffff : ~((1 << (32 - prefix)) - 1) >>> 0;
        const network = int & mask;
        const broadcast = network | ~mask;
        const hosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, 2 ** (32 - prefix) - 2);
        const fmt = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
        let cls = "Unknown or private";
        if (oct[0] === 10 || (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) || (oct[0] === 192 && oct[1] === 168)) cls = "Private (RFC1918)";
        else if (oct[0] === 127) cls = "Loopback";
        else if (oct[0] >= 224) cls = "Multicast / reserved";
        else cls = "Public";
        return {
          Version: "IPv4", "Validity": "Valid", Class: cls, Network: fmt(network), Broadcast: fmt(broadcast),
          Mask: fmt(mask), "Hosts": prefix >= 32 ? "—" : formatNumber(hosts, 0),
          ["Total in /" + prefix]: formatNumber(2 ** Math.max(0, 32 - prefix), 0),
        };
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const input = node<HTMLInputElement>(root, "ip").value.trim();
        const put = root.querySelector<HTMLElement>("[data-put]");
        const st = () => node<HTMLElement>(root, "st");
        if (!input) return;
        const [addr, pre] = input.split("/");
        if (pre !== undefined && /^\d{1,2}$/.test(pre) && parseInt(pre, 10) <= 32) {
          const info = ipV4Info(addr, parseInt(pre, 10));
          if (put) { put.innerHTML = rows(info); st().textContent = ""; }
          return;
        }
        if (/^[\da-fA-F:]+$/.test(addr) && addr.includes(":")) {
          const segs = addr.split("::").flatMap((s) => s.split(":"));
          const valid = addr.includes("::") ? segs.length <= 8 && segs.filter(Boolean).every((s) => /^[\da-fA-F]{0,4}$/.test(s)) : segs.length === 8 && segs.every((s) => /^[\da-fA-F]{1,4}$/.test(s));
          if (!valid) { if (put) put.innerHTML = rows({ Version: "IPv6", Validity: "Invalid" }); return; }
          if (put) put.innerHTML = rows({ Version: "IPv6", Validity: "Valid", "Compressed": addr, "Expanded": expandV6(addr) });
          st().textContent = "";
          return;
        }
        const info = ipV4Info(addr, 32);
        if (put) put.innerHTML = rows(info);
        st().textContent = "";
      });
    },
  },

  "server-status-checker": {
    markup: () => `<div class="row">
        <div class="col col-wide"><label class="field"><span>Website URL</span><input data-node="url" type="text" value="https://toolverse-phi.vercel.app" spellcheck="false"></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Check</button></div></div>
      <div class="results" data-put></div>` + statusBox("st") + privacyNoteServer(),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const url = node<HTMLInputElement>(root, "url").value.trim();
        const put = root.querySelector<HTMLElement>("[data-put]");
        const st = () => node<HTMLElement>(root, "st");
        if (!/^https?:\/\/\S+$/i.test(url)) { toast("Enter a full URL with https://"); return; }
        if (put) put.innerHTML = "";
        st().textContent = "Checking…";
        try {
          const ctrl = new AbortController();
          const timer = window.setTimeout(() => ctrl.abort(), 15000);
          const started = performance.now();
          const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal, cache: "no-store", mode: "cors" });
          clearTimeout(timer);
          const ms = Math.round(performance.now() - started);
          const ok = res.ok;
          if (put) put.innerHTML = rows({
            Status: ok ? "✓ Online" : "Responded", "HTTP code": String(res.status),
            "Response time": ms + " ms", "Final URL": res.url || url,
            "Content type": res.headers.get("content-type") || "—",
            "Server header": res.headers.get("server") || "—",
          });
          st().textContent = ok ? "The site is up." : "The server responded with an error status.";
        } catch {
          const note = "Could not reach the URL from your browser. Many sites block cross-origin requests (CORS), even when they are online. Try opening it directly.";
          if (put) put.innerHTML = rows({ "Reachable from browser": "No / blocked by CORS" });
          st().textContent = note;
        }
      });
    },
  },
};

export default devTools2;

function privacyNoteServer(): string {
  return `<div class="privacy-note"><b>Note:</b> this check is made from your browser. Heavily protected sites may return CORS errors, so a failure does not always mean the site is down.</div>`;
}
function rows(r: Record<string, string>): string {
  return Object.entries(r).map(([k, v]) => `<div class="result"><span class="label">${k}</span><span class="value mono">${v}</span></div>`).join("");
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function diffLines(a: string[], b: string[]): Array<{ t: "+" | "-" | "="; text: string }> {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const out: Array<{ t: "+" | "-" | "="; text: string }> = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: "=", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "-", text: a[i] }); i++; }
    else { out.push({ t: "+", text: b[j] }); j++; }
  }
  while (i < n) { out.push({ t: "-", text: a[i] }); i++; }
  while (j < m) { out.push({ t: "+", text: b[j] }); j++; }
  return out;
}
function expandV6(addr: string): string {
  const withZero = addr.includes("::") ? addr.replace("::", ":" + Array(8 - addr.split(":").filter(Boolean).length + 1).join("0:")) : addr;
  const parts = withZero.split(":").filter(Boolean);
  return parts.map((p) => p.padStart(4, "0")).join(":");
}
function toBuf(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}
function crackTime(bits: number): string {
  const sec = 2 ** Math.max(0, bits) / 1e10;
  if (sec < 1) return "<1 second";
  const units: [number, string][] = [
    [3600 * 24 * 365, "years"],
    [3600 * 24, "days"],
    [3600, "hours"],
    [60, "minutes"],
    [1, "seconds"],
  ];
  for (const [v, u] of units) {
    if (sec >= v) {
      const n = sec / v;
      return n > 1e6 ? n.toExponential(1) + " " + u : Math.round(n).toLocaleString() + " " + u;
    }
  }
  return "<1 second";
}

function statusBox(id: string, msg = "Ready."): string {
  return `<div class="status" data-node="${id}">${msg}</div>`;
}
function result(label: string, inner: string, mono = true): string {
  return `<div class="result"><span class="label">${label}</span><span class="value${mono ? " mono" : ""}">${inner}</span></div>`;
}
function results(...items: string[]): string {
  return `<div class="results">${items.join("")}</div>`;
}