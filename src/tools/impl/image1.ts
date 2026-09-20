import type { ToolImpl } from "../types";
import { btn, btnRow, download, humanSize, node, results, result, selectField, sliderField, statusBox, toast } from "../../lib/core";
import { canvasToBlob, canvasToBmp, imageFileToCanvas, loadImage } from "../../lib/image";
import { wireDropzone, dropzone, privacyNote } from "../../lib/ui";

const image1: Record<string, ToolImpl> = {
  "image-compressor": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop an image to compress" }) +
      sliderField("q", "Quality", 10, 100, 70, "%") +
      selectField("fmt", "Output format", [["image/jpeg", "JPG"], ["image/png", "PNG"], ["image/webp", "WEBP"]]) +
      btnRow(btn("Compress & download", "go", true)) +
      results(result("Original", `<b data-o="orig">—</b>`), result("Compressed", `<b data-o="new">—</b>`), result("Saved", `<b data-o="saved">—</b>`)) +
      statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => {
        file = files[0] ?? null;
        if (file) { node(root, "orig").textContent = humanSize(file.size); node(root, "st").textContent = `Loaded ${file.name}`; }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop an image first"); return; }
        const q = parseInt(node<HTMLInputElement>(root, "q").value, 10) / 100;
        const fmt = (root.querySelector("[data-node='fmt']") as HTMLSelectElement).value as "image/jpeg" | "image/png" | "image/webp";
        node(root, "st").textContent = "Compressing…";
        try {
          const canvas = await imageFileToCanvas(file);
          if (!canvas) return;
          const blend = await blendAlpha(canvas, fmt);
          const blob = await canvasToBlob(blend.canvas, fmt, fmt === "image/png" ? undefined : q);
          node(root, "new").textContent = humanSize(blob.size);
          const saved = file.size - blob.size;
          node(root, "saved").textContent = saved > 0 ? `−${humanSize(saved)} (${Math.round((saved / file.size) * 100)}%)` : "+" + humanSize(-saved);
          const base = file.name.replace(/\.[^.]+$/, "");
          download(`${base}-compressed.${fmt === "image/png" ? "png" : fmt === "image/webp" ? "webp" : "jpg"}`, blob);
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Compression failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "image-converter": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop an image to convert" }) +
      selectField("fmt", "Output format", [["image/png", "PNG"], ["image/jpeg", "JPG"], ["image/webp", "WEBP"], ["image/bmp", "BMP"]]) +
      sliderField("q", "Quality (lossy only)", 10, 100, 90, "%") +
      btnRow(btn("Convert & download", "go", true)) +
      results(result("Original", `<b data-o="orig">—</b>`), result("Converted", `<b data-o="new">—</b>`)) +
      statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => {
        file = files[0] ?? null;
        if (file) { node(root, "orig").textContent = humanSize(file.size) + (file.type ? ` · ${file.type}` : ""); }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop an image first"); return; }
        const fmt = (root.querySelector("[data-node='fmt']") as HTMLSelectElement).value as "image/png" | "image/jpeg" | "image/webp" | "image/bmp";
        const q = parseInt(node<HTMLInputElement>(root, "q").value, 10) / 100;
        node(root, "st").textContent = "Converting…";
        try {
          const canvas = await imageFileToCanvas(file);
          const { canvas: out } = await blendAlpha(canvas, fmt);
          const blob = fmt === "image/bmp" ? canvasToBmp(out) : await canvasToBlob(out, fmt, fmt === "image/png" ? undefined : q);
          const base = file.name.replace(/\.[^.]+$/, "");
          const ext = fmt.split("/")[1] === "jpeg" ? "jpg" : fmt.split("/")[1];
          download(`${base}.${ext}`, blob);
          node(root, "new").textContent = humanSize(blob.size);
          node(root, "st").textContent = "Converted.";
        } catch (e) { node(root, "st").textContent = "Conversion failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "image-resizer": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop an image to resize" }) +
      `<div class="row">
        <div class="col"><label class="field"><span>Width (px)</span><input data-node="w" type="number" value="800" min="1"></label></div>
        <div class="col"><label class="field"><span>Height (px)</span><input data-node="h" type="number" value="600" min="1"></label></div>
        <div class="col"><label class="check field-block"><input data-node="lock" type="checkbox" checked> Keep aspect</label></div></div>
      <div class="checks"><label class="check block"><input data-node="best" type="checkbox" checked> Fit inside (letterbox free)</label>
      <label class="check"><input data-node="enlarge" type="checkbox"> Allow upscaling</label></div>` +
      btnRow(btn("Resize & download", "go", true)) +
      results(result("Original", `<b data-o="orig">—</b>`), result("New size", `<b data-o="new">—</b>`)) +
      statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      let ratio = 1;
      wireDropzone(root, async (files) => {
        file = files[0] ?? null;
        if (file) {
          node(root, "orig").textContent = humanSize(file.size);
          const img = await loadImage(file);
          ratio = img.naturalWidth / img.naturalHeight;
          if ((root.querySelector("[data-node='lock']") as HTMLInputElement)?.checked) {
            node<HTMLInputElement>(root, "w").value = String(img.naturalWidth);
            node<HTMLInputElement>(root, "h").value = String(img.naturalHeight);
          }
        }
      });
      root.querySelector<any>("[data-node='lock']")?.addEventListener("change", () => {
        if ((root.querySelector("[data-node='lock']") as HTMLInputElement).checked) {
          node<HTMLInputElement>(root, "h").value = String(Math.round(parseInt(node<HTMLInputElement>(root, "w").value) / ratio));
        }
      });
      root.querySelector<any>("[data-node='w']")?.addEventListener("input", () => {
        if ((root.querySelector("[data-node='lock']") as HTMLInputElement).checked && file) {
          node<HTMLInputElement>(root, "h").value = String(Math.max(1, Math.round(parseInt(node<HTMLInputElement>(root, "w").value || "1", 10) / ratio)));
        }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop an image first"); return; }
        node(root, "st").textContent = "Resizing…";
        try {
          const canvas = await imageFileToCanvas(file, 8192);
          const w = Math.max(1, parseInt(node<HTMLInputElement>(root, "w").value, 10) || 1);
          const h = Math.max(1, parseInt(node<HTMLInputElement>(root, "h").value, 10) || 1);
          const lock = (root.querySelector("[data-node='lock']") as HTMLInputElement).checked;
          const best = (root.querySelector("[data-node='best']") as HTMLInputElement).checked;
          const enlarge = (root.querySelector("[data-node='enlarge']") as HTMLInputElement).checked;
          const ar = canvas.width / canvas.height;
          let nw: number, nh: number;
          if (best) {
            let sc = Math.min(w / canvas.width, h / canvas.height);
            if (!enlarge) sc = Math.min(sc, 1);
            nw = Math.max(1, Math.round(canvas.width * sc));
            nh = Math.max(1, Math.round(canvas.height * sc));
          } else {
            nw = w;
            nh = lock ? Math.max(1, Math.round(nw / ar)) : h;
            if (!enlarge) {
              const sc = Math.min(1, canvas.width / nw, canvas.height / nh);
              nw = Math.max(1, Math.round(nw * sc));
              nh = Math.max(1, Math.round(nh * sc));
            }
          }
          const out = document.createElement("canvas");
          out.width = nw; out.height = nh;
          out.getContext("2d")?.drawImage(canvas, 0, 0, nw, nh);
          const blob = await canvasToBlob(out, "image/png");
          const base = file.name.replace(/\.[^.]+$/, "");
          download(`${base}-${nw}x${nh}.png`, blob);
          node(root, "new").textContent = `${nw}×${nh} · ${humanSize(blob.size)}`;
          node(root, "st").textContent = "Resized.";
        } catch (e) { node(root, "st").textContent = "Failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "webp-converter": {
    markup: () => dropzone(() => {}, { accept: "image/*", multiple: true, label: "Drop one or more images", sub: "Batch convert to or from WEBP — all done locally." }) +
      selectField("dir", "Direction", [["to-webp", "Convert TO WEBP"], ["from-webp", "Convert FROM WEBP (→ PNG/JPG)"]]) +
      sliderField("q", "WEBP quality", 10, 100, 85, "%") +
      btnRow(btn("Convert all", "go", true)) +
      `<div class="file-list" data-list></div>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const files: File[] = [];
      wireDropzone(root, (all) => {
        files.length = 0;
        files.push(...all);
        const list = root.querySelector<HTMLElement>("[data-list]");
        if (list) list.textContent = "";
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!files.length) { toast("Drop images first"); return; }
        const dir = (root.querySelector("[data-node='dir']") as HTMLSelectElement).value;
        const q = parseInt(node<HTMLInputElement>(root, "q").value, 10) / 100;
        node(root, "st").textContent = "Converting " + files.length + " file(s)…";
        const outFmt: "image/png" | "image/jpeg" | "image/webp" = dir === "to-webp" ? "image/webp" : "image/png";
        for (const f of files) {
          try {
            const canvas = await imageFileToCanvas(f);
            const { canvas: bl } = await blendAlpha(canvas, outFmt);
            const blob = await canvasToBlob(bl, outFmt, outFmt === "image/webp" ? q : undefined);
            const base = f.name.replace(/\.[^.]+$/, "");
            const ext = outFmt === "image/webp" ? "webp" : "png";
            download(`${base}.${ext}`, blob);
          } catch { node(root, "st").textContent = `Failed on ${f.name}`; break; }
        }
        node(root, "st").textContent = "All done.";
      });
    },
  },

  "image-diff": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Image A (original)</span><input data-node="fa" type="file" accept="image/*"></label></div>
        <div class="col"><label class="field"><span>Image B (changed)</span><input data-node="fb" type="file" accept="image/*"></label></div></div>
        <div class="row"><div class="col"><label class="field"><span>View</span><select data-node="view"><option value="slide">Side by side</option><option value="overlay">Overlay</option><option value="diff">Differences</option></select></label></div></div>
      <div class="diff-canvas"><canvas data-cv width="800" height="400"></canvas></div>
      <div class="stats" data-stats></div>` + statusBox("st") + privacyNote(),
    init: (root) => {
      let a: HTMLImageElement | null = null;
      let b: HTMLImageElement | null = null;
      const cv = root.querySelector<HTMLCanvasElement>("[data-cv]");
      const load = (input: HTMLInputElement): Promise<HTMLImageElement | null> =>
        new Promise((resolve) => {
          const f = input.files?.[0];
          if (!f) { resolve(null); return; }
          const img = new Image();
          const url = URL.createObjectURL(f);
          img.onload = () => { url && URL.revokeObjectURL(url); resolve(img); };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      const render = async () => {
        if (!cv) return;
        a = (await load(node<HTMLInputElement>(root, "fa"))) ?? a;
        b = (await load(node<HTMLInputElement>(root, "fb"))) ?? b;
        if (!a || !b) { toast("Load two images"); return; }
        const view = (root.querySelector("[data-node='view']") as HTMLSelectElement).value;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        const W = 800, H = 400;
        cv.width = W; cv.height = H;
        const fit = (img: HTMLImageElement): { w: number; h: number } => {
          const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
          return { w: Math.round(img.naturalWidth * s), h: Math.round(img.naturalHeight * s) };
        };
        const { w: wa, h: ha } = fit(a);
        const { w: wb, h: hb } = fit(b);
        if (view === "slide") {
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(a, 0, (H - ha) / 2, wa, ha);
          ctx.drawImage(b, W / 2, (H - hb) / 2, wb, hb);
          ctx.strokeStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
          ctx.fillStyle = "#0f172a"; ctx.font = "700 24px system-ui"; ctx.textAlign = "left";
          ctx.fillText("A", 8, 28);
          ctx.textAlign = "right"; ctx.fillText("B", W - 8, 28);
        } else {
          const s = Math.min(W / a.naturalWidth, H / a.naturalHeight);
          const w = Math.round(a.naturalWidth * s), h = Math.round(a.naturalHeight * s);
          const offX = (W - w) / 2, offY = (H - h) / 2;
          const ca = document.createElement("canvas"); ca.width = a.naturalWidth; ca.height = a.naturalHeight;
          ca.getContext("2d")?.drawImage(a, 0, 0);
          const cb = document.createElement("canvas"); cb.width = b.naturalWidth; cb.height = b.naturalHeight;
          cb.getContext("2d")?.drawImage(b, 0, 0);
          const sa = ca.getContext("2d")!.getImageData(0, 0, ca.width, ca.height);
          const sb = cb.getContext("2d")!.getImageData(0, 0, cb.width, cb.height);
          if (view === "overlay") {
            ctx.drawImage(a, offX, offY, w, h);
            ctx.globalAlpha = 0.5;
            ctx.drawImage(b, offX, offY, w, h);
            ctx.globalAlpha = 1;
          } else {
            const out = document.createElement("canvas");
            out.width = a.naturalWidth; out.height = a.naturalHeight;
            const octx = out.getContext("2d")!;
            const oimg = octx.createImageData(a.naturalWidth, a.naturalHeight);
            const da = sa.data, db = sb.data;
            let changed = 0;
            for (let i = 0; i < da.length; i += 4) {
              const dx = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
              if (dx > 30) {
                oimg.data[i] = 255; oimg.data[i + 1] = 0; oimg.data[i + 2] = 0; oimg.data[i + 3] = 255;
                changed++;
              } else { oimg.data[i] = da[i]; oimg.data[i + 1] = da[i + 1]; oimg.data[i + 2] = da[i + 2]; oimg.data[i + 3] = 255; }
            }
            octx.putImageData(oimg, 0, 0);
            ctx.drawImage(out, offX, offY, w, h);
            const pct = (changed / (a.naturalWidth * a.naturalHeight)) * 100;
            const stats = root.querySelector<HTMLElement>("[data-stats]");
            if (stats) stats.textContent = `Changed pixels: ${changed.toLocaleString()} (${pct.toFixed(2)}%) — shown in red.`;
          }
        }
      };
      node<HTMLInputElement>(root, "fa").addEventListener("change", render);
      node<HTMLInputElement>(root, "fb").addEventListener("change", render);
      (root.querySelector("[data-node='view']") as HTMLElement).addEventListener("change", render);
    },
  },
};

export default image1;

async function blendAlpha(canvas: HTMLCanvasElement, fmt: string): Promise<{ canvas: HTMLCanvasElement }> {
  const lossy = fmt === "image/jpeg" || fmt === "image/bmp";
  if (!lossy) return { canvas };
  const out = document.createElement("canvas");
  out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return { canvas };
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return { canvas: out };
}