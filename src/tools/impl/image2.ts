import type { ToolImpl } from "../types";
import { btn, btnRow, download, humanSize, node, results, result, selectField, sliderField, statusBox, toast } from "../../lib/core";
import { imageFileToCanvas, canvasToBlob } from "../../lib/image";
import { wireDropzone, dropzone, privacyNote } from "../../lib/ui";
import { encodeGif, quantizeFrame, buildPalette } from "../../lib/gif";

const image2: Record<string, ToolImpl> = {
  "image-cropper": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop an image to crop" }) +
      selectField("ratio", "Aspect ratio", [["free", "Free"], ["1:1", "1:1"], ["4:3", "4:3"], ["16:9", "16:9"], ["3:2", "3:2"], ["21:9", "21:9"], ["2:3", "2:3"], ["9:16", "9:16"]]) +
      `<div class="crop-wrap"><canvas data-cv width="800" height="500"></canvas></div>
      <div class="row"><div class="col"><label class="field"><span>Crop X</span><input data-node="x" type="number" min="0"></label></div>
      <div class="col"><label class="field"><span>Crop Y</span><input data-node="y" type="number" min="0"></label></div>
      <div class="col"><label class="field"><span>Width</span><input data-node="cw" type="number" min="1"></label></div>
      <div class="col"><label class="field"><span>Height</span><input data-node="ch" type="number" min="1"></label></div></div>` +
      btnRow(btn("Crop & download", "go", true), btn("Reset", "reset")) +
      results(result("Result", `<b data-o="dim">—</b>`)) +
      `<div class="preview"><canvas data-prev hidden></canvas></div>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const cv = root.querySelector<HTMLCanvasElement>("[data-cv]");
      const ctx = cv?.getContext("2d");
      let source: HTMLImageElement | null = null;
      const img = new Image();
      let rect = { x: 0, y: 0, w: 0, h: 0 };
      let dragging = false;
      let startX = 0, startY = 0;
      const SC = 800;
      const ratioOf = () => {
        const r = (root.querySelector("[data-node='ratio']") as HTMLSelectElement).value;
        return r === "free" ? 0 : parseFloat(r);
      };
      const s = () => (source && cv ? cv.width / source.width : 1);
      const draw = () => {
        if (!cv || !ctx || !source) return;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, cv.width, cv.height);
        const k = s();
        ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, source.width * k, source.height * k);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x * k, rect.y * k, rect.w * k, rect.h * k);
        ctx.fillStyle = "rgba(34,211,238,.15)";
        ctx.fillRect(rect.x * k, rect.y * k, rect.w * k, rect.h * k);
        node<HTMLInputElement>(root, "x").value = String(Math.round(rect.x));
        node<HTMLInputElement>(root, "y").value = String(Math.round(rect.y));
        node<HTMLInputElement>(root, "cw").value = String(Math.round(rect.w));
        node<HTMLInputElement>(root, "ch").value = String(Math.round(rect.h));
      };
      wireDropzone(root, async (files) => {
        const f = files[0];
        if (!f) return;
        const c = await imageFileToCanvas(f, 4096);
        img.src = c.toDataURL("image/png");
        await new Promise<void>((res) => { img.onload = () => res(); });
        source = img;
        cv!.width = SC;
        cv!.height = Math.max(180, Math.round(SC * (source.height / source.width)));
        rect = { x: 0, y: 0, w: source.width, h: source.height };
        draw();
      });
      const onMove = (e: PointerEvent) => {
        if (!dragging || !cv || !source) return;
        const box = cv.getBoundingClientRect();
        const mx = ((e.clientX - box.left) * (cv.width / box.width)) / s();
        const my = ((e.clientY - box.top) * (cv.height / box.height)) / s();
        const sx = Math.max(0, Math.min(source.width, mx));
        const sy = Math.max(0, Math.min(source.height, my));
        let x = Math.min(startX, sx);
        let y = Math.min(startY, sy);
        let w = Math.max(1, Math.abs(sx - startX));
        let h = Math.max(1, Math.abs(sy - startY));
        const rat = ratioOf();
        if (rat) {
          if (w / h > rat) h = w / rat; else w = h * rat;
          w = Math.round(w); h = Math.round(h);
          if (x + w > source.width) { w = source.width - x; h = Math.round(w / rat); }
          if (y + h > source.height) { h = source.height - y; w = Math.round(h * rat); }
        }
        rect.x = Math.round(Math.max(0, Math.min(source.width - 1, x)));
        rect.y = Math.round(Math.max(0, Math.min(source.height - 1, y)));
        rect.w = Math.round(Math.max(1, Math.min(source.width - rect.x, w)));
        rect.h = Math.round(Math.max(1, Math.min(source.height - rect.y, h)));
        draw();
      };
      cv?.addEventListener("pointerdown", (e) => {
        if (!cv) return;
        const box = cv.getBoundingClientRect();
        startX = ((e.clientX - box.left) * (cv.width / box.width)) / s();
        startY = ((e.clientY - box.top) * (cv.height / box.height)) / s();
        dragging = true;
        cv.setPointerCapture(e.pointerId);
      });
      cv?.addEventListener("pointermove", onMove);
      cv?.addEventListener("pointerup", () => { dragging = false; });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!source) { toast("Drop an image first"); return; }
        const out = document.createElement("canvas");
        out.width = Math.round(rect.w) || 1;
        out.height = Math.round(rect.h) || 1;
        out.getContext("2d")?.drawImage(source, Math.round(rect.x), Math.round(rect.y), out.width, out.height, 0, 0, out.width, out.height);
        const blob = await canvasToBlob(out, "image/png");
        node(root, "dim").textContent = `${out.width}×${out.height}`;
        download("cropped.png", blob);
      });
      root.querySelector<any>("[data-node='reset']")?.addEventListener("click", () => {
        if (source) { rect = { x: 0, y: 0, w: source.width, h: source.height }; draw(); }
      });
    },
  },

  "image-editor": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop an image to edit" }) +
      `<div class="row"><div class="col">${sliderField("bright", "Brightness", -100, 100, 0)}</div></div>` +
      `<div class="row"><div class="col">${sliderField("contrast", "Contrast", -100, 100, 0)}</div>
      <div class="col">${sliderField("sat", "Saturation", -100, 100, 0)}</div></div>` +
      `<div class="row"><div class="col">${sliderField("blur", "Blur", 0, 10, 0, "px")}</div>
      <div class="col">${sliderField("rot", "Rotate", 0, 3, 0, " ×90°")}</div></div>` +
      `<div class="checks"><label class="check"><input data-node="fliph" type="checkbox"> Flip horizontal</label>
      <label class="check"><input data-node="flipv" type="checkbox"> Flip vertical</label>
      <label class="check"><input data-node="wm" type="checkbox"> Watermark</label></div>
      <label class="field"><span>Watermark text</span><input data-node="wmtext" type="text" value="© ToolVerse"></label>` +
      `<div class="preview"><canvas data-cv></canvas></div>` +
      btnRow(btn("Download", "go", true), btn("Reset", "reset")) + statusBox("st") + privacyNote(),
    init: (root) => {
      const cv = root.querySelector<HTMLCanvasElement>("[data-cv]");
      let source: HTMLImageElement | null = null;
      wireDropzone(root, async (files) => {
        const f = files[0];
        if (!f) return;
        const c = await imageFileToCanvas(f, 1600);
        source = new Image();
        source.src = c.toDataURL("image/png");
        cv!.width = c.width;
        cv!.height = c.height;
        render();
      });
      const render = () => {
        const ctx2 = cv?.getContext("2d");
        if (!source || !cv || !ctx2) return;
        const bright = parseInt(node<HTMLInputElement>(root, "bright").value, 10);
        const contrast = parseInt(node<HTMLInputElement>(root, "contrast").value, 10);
        const sat = parseInt(node<HTMLInputElement>(root, "sat").value, 10);
        const blur = parseInt(node<HTMLInputElement>(root, "blur").value, 10);
        const rot = parseInt(node<HTMLInputElement>(root, "rot").value, 10);
        const fh = (root.querySelector("[data-node='fliph']") as HTMLInputElement).checked;
        const fv = (root.querySelector("[data-node='flipv']") as HTMLInputElement).checked;
        const wm = (root.querySelector("[data-node='wm']") as HTMLInputElement).checked;
        const filters: string[] = [];
        if (bright) filters.push(`brightness(${1 + bright / 100})`);
        if (contrast) filters.push(`contrast(${1 + contrast / 100})`);
        if (sat) filters.push(`saturate(${1 + sat / 100})`);
        if (blur) filters.push(`blur(${blur}px)`);
        ctx2.filter = filters.join(" ");
        ctx2.clearRect(0, 0, cv.width, cv.height);
        const was = rot % 2 === 1;
        if (was) {
          const temp = cv.width;
          cv.width = cv.height;
          cv.height = temp;
        }
        ctx2.save();
        ctx2.translate(cv.width / 2, cv.height / 2);
        ctx2.rotate((rot * Math.PI) / 2);
        ctx2.scale(fh ? -1 : 1, fv ? -1 : 1);
        ctx2.drawImage(source, -cv.width / 2, -cv.height / 2, cv.width, cv.height);
        ctx2.restore();
        ctx2.filter = "none";
        if (wm) {
          ctx2.font = `600 ${Math.max(14, cv.width * 0.05)}px system-ui`;
          ctx2.fillStyle = "rgba(255,255,255,.8)";
          ctx2.shadowColor = "rgba(0,0,0,.6)";
          ctx2.shadowBlur = 6;
          ctx2.textAlign = "right";
          ctx2.fillText(node<HTMLInputElement>(root, "wmtext").value || "© ToolVerse", cv.width - 16, cv.height - 16);
        }
      };
      root.querySelectorAll<HTMLElement>("[data-node='bright'],[data-node='contrast'],[data-node='sat'],[data-node='blur'],[data-node='rot'],[data-node='fliph'],[data-node='flipv'],[data-node='wm'],[data-node='wmtext']").forEach((el) => el.addEventListener("input", render));
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        if (!cv) return;
        cv.toBlob((blob) => { if (blob) download("edited.png", blob); }, "image/png");
      });
      root.querySelector<any>("[data-node='reset']")?.addEventListener("click", () => {
        root.querySelectorAll<HTMLInputElement>("[data-node='bright'],[data-node='contrast'],[data-node='sat'],[data-node='blur'],[data-node='rot']").forEach((i) => { i.value = "0"; });
        (root.querySelector("[data-node='fliph']") as HTMLInputElement).checked = false;
        (root.querySelector("[data-node='flipv']") as HTMLInputElement).checked = false;
        (root.querySelector("[data-node='wm']") as HTMLInputElement).checked = false;
        render();
      });
    },
  },

  "memes": {
    markup: () => dropzone(() => {}, { accept: "image/*", label: "Drop the meme base image" }) +
      `<div class="row"><div class="col"><label class="field"><span>Top text</span><input data-node="top" type="text" value="WHEN THE TOOL" spellcheck="false"></label></div>
      <div class="col"><label class="field"><span>Bottom text</span><input data-node="bot" type="text" value="JUST WORKS" spellcheck="false"></label></div></div>` +
      sliderField("fs", "Font size", 20, 140, 80, "px") +
      btnRow(btn("Render & download", "go", true)) +
      `<div class="preview"><canvas data-cv></canvas></div>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const cv = root.querySelector<HTMLCanvasElement>("[data-cv]");
      let source: HTMLCanvasElement | null = null;
      wireDropzone(root, async (files) => {
        const f = files[0];
        if (!f) return;
        source = await imageFileToCanvas(f, 1200);
        render();
      });
      const render = () => {
        if (!source || !cv) return;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        const W = source.width, H = source.height;
        cv.width = W; cv.height = H;
        ctx.drawImage(source, 0, 0);
        const fs = parseInt(node<HTMLInputElement>(root, "fs").value, 10);
        const top = node<HTMLInputElement>(root, "top").value.toUpperCase();
        const bot = node<HTMLInputElement>(root, "bot").value.toUpperCase();
        const size = Math.max(12, Math.round(W / 10 * (fs / 80)));
        ctx.font = `900 ${size}px Impact, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.lineWidth = Math.max(2, size / 8);
        ctx.strokeStyle = "rgba(0,0,0,.9)";
        ctx.fillStyle = "#ffffff";
        const drawText = (text: string, y: number) => {
          const maxW = W * 0.9;
          const words = text.trim().split(/\s+/);
          const lines: string[] = [];
          let cur = "";
          for (const w of words) {
            const test = cur ? cur + " " + w : w;
            if (ctx.measureText(test).width > maxW && cur) {
              lines.push(cur);
              cur = w;
            } else cur = test;
          }
          if (cur) lines.push(cur);
          const count = Math.min(lines.length, 3);
          const startY = y < H / 2 ? size * 0.2 : H - size * 0.4 - (count - 1) * (size * 0.95);
          lines.slice(0, 3).forEach((l, i) => {
            ctx.strokeText(l, W / 2, startY + i * size * 0.95);
            ctx.fillText(l, W / 2, startY + i * size * 0.95);
          });
        };
        drawText(top, size * 0.2);
        ctx.textBaseline = "bottom";
        drawText(bot, H - size * 0.4);
      };
      root.querySelectorAll<HTMLElement>("[data-node='top'],[data-node='bot'],[data-node='fs']").forEach((el) => el.addEventListener("input", render));
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        if (!cv) return;
        cv.toBlob((blob) => { if (blob) download("meme.png", blob); }, "image/png");
      });
    },
  },

  "animated-gif-maker": {
    markup: () => dropzone(() => {}, { accept: "image/*", multiple: true, label: "Drop images (in order = frame order)", sub: "Add 2+ images to build a looping GIF." }) +
      sliderField("delay", "Frame delay", 20, 500, 100, "ms") +
      btnRow(btn("Make GIF", "go", true)) +
      `<div class="status" data-node="st">Ready.</div>` +
      results(result("Frames", `<b data-o="n">0</b>`), result("GIF size", `<b data-o="size">—</b>`)) + privacyNote(),
    init: (root) => {
      const files: File[] = [];
      wireDropzone(root, (all) => {
        files.length = 0;
        files.push(...all);
        node(root, "n").textContent = String(files.length);
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (files.length < 2) { toast("Add at least two images"); return; }
        const delay = Math.max(20, Math.min(500, parseInt(node<HTMLInputElement>(root, "delay").value, 10) || 100));
        const st = () => node<HTMLElement>(root, "st");
        st().textContent = "Reading frames…";
        const maxW = 480;
        const imgs: HTMLImageElement[] = [];
        for (const f of files) {
          try {
            const c = await imageFileToCanvas(f, maxW);
            const img = new Image();
            img.src = c.toDataURL("image/png");
            await new Promise<void>((res) => { img.onload = () => res(); });
            imgs.push(img);
          } catch { st().textContent = `Could not read ${f.name}`; return; }
        }
        const W = maxW, H = Math.max(1, Math.round((imgs[0].naturalHeight / imgs[0].naturalWidth) * maxW));
        st().textContent = "Quantizing colors…";
        const palette = buildPalette(imgs, W, H);
        const frames = imgs.map((img) => ({ indices: quantizeFrame(img, W, H, palette), delayCs: Math.round(delay / 10) }));
        st().textContent = "Encoding GIF…";
        const blob = await new Promise<Blob>((res) => setTimeout(() => res(encodeGif(frames, W, H, palette)), 0));
        node(root, "size").textContent = humanSize(blob.size);
        download("animated.gif", blob);
        st().textContent = "Done.";
      });
    },
  },
};

export default image2;