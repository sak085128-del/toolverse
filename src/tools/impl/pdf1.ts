import type { ToolImpl } from "../types";
import { btn, btnRow, download, humanSize, node, results, result, selectField, sliderField, statusBox, toast, toAb } from "../../lib/core";
import { canvasToBlob } from "../../lib/image";
import { dropzone, wireDropzone, privacyNote } from "../../lib/ui";
import { PDFDocument } from "pdf-lib";
import { loadPdfDoc, pageBox, renderPage } from "../../lib/pdf";
import JSZip from "jszip";

const pdf1: Record<string, ToolImpl> = {
  "pdf-merge": {
    markup: () => dropzone(() => {}, { accept: "application/pdf", multiple: true, label: "Drop PDF files to merge", sub: "Files merge in the order you add them." }) +
      `<div class="file-list" data-list></div>` +
      btnRow(btn("Merge PDFs", "go", true)) +
      results(result("Merged", `<b data-o="new">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      const files: File[] = [];
      wireDropzone(root, (all) => {
        files.length = 0;
        files.push(...all);
        const list = root.querySelector<HTMLElement>("[data-list]");
        if (list) list.textContent = "";
        for (const f of files) {
          const d = document.createElement("div");
          d.className = "file-row";
          d.textContent = `${f.name} (${humanSize(f.size)})`;
          list?.appendChild(d);
        }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (files.length < 2) { toast("Add at least two PDFs"); return; }
        node(root, "st").textContent = "Merging…";
        try {
          const out = await PDFDocument.create();
          for (const f of files) {
            const src = await PDFDocument.load(await f.arrayBuffer());
            const pages = await out.copyPages(src, src.getPageIndices());
            pages.forEach((p) => out.addPage(p));
          }
          const bytes = await out.save();
          node(root, "new").textContent = humanSize(bytes.length);
          download("merged.pdf", new Blob([toAb(bytes)], { type: "application/pdf" }));
          node(root, "st").textContent = "Merged.";
        } catch (e) { node(root, "st").textContent = "Merge failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "pdf-split": {
    markup: () => dropzone(() => {}, { accept: "application/pdf", label: "Drop a PDF to split" }) +
      `<label class="field"><span>Pages per group (e.g. "1-3, 5, 8-10"; blank = one page each)</span><input data-node="ranges" type="text" placeholder="1-3, 5, 8-10"></label>` +
      btnRow(btn("Split & zip", "go", true)) +
      results(result("Parts", `<b data-o="n">—</b>`), result("ZIP size", `<b data-o="size">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => { file = files[0] ?? null; });
      const expand = (ranges: string, total: number): number[][] => {
        const groups: number[][] = [];
        if (!ranges.trim()) return Array.from({ length: total }, (_, i) => [i + 1]);
        for (const part of ranges.split(",")) {
          const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
          if (!m) continue;
          const a = parseInt(m[1], 10);
          const b = m[2] ? parseInt(m[2], 10) : a;
          const g: number[] = [];
          for (let i = Math.max(1, Math.min(a, b)); i <= Math.min(total, Math.max(a, b)); i++) g.push(i);
          if (g.length) groups.push(g);
        }
        return groups.length ? groups : Array.from({ length: total }, (_, i) => [i + 1]);
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop a PDF first"); return; }
        node(root, "st").textContent = "Splitting…";
        try {
          const src = await PDFDocument.load(await file.arrayBuffer());
          const total = src.getPageCount();
          const groups = expand(node<HTMLInputElement>(root, "ranges").value, total);
          const zip = new JSZip();
          const base = file.name.replace(/\.pdf$/i, "");
          for (let gi = 0; gi < groups.length; gi++) {
            const out = await PDFDocument.create();
            const pages = await out.copyPages(src, groups[gi].map((p) => p - 1));
            pages.forEach((p) => out.addPage(p));
            const bytes = await out.save();
            zip.file(`${base}-part-${gi + 1}.pdf`, bytes);
          }
          const blob = await zip.generateAsync({ type: "blob" });
          node(root, "n").textContent = String(groups.length);
          node(root, "size").textContent = humanSize(blob.size);
          download(`${base}-parts.zip`, blob);
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Split failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "pdf-compress": {
    markup: () => dropzone(() => {}, { accept: "application/pdf", label: "Drop a PDF to compress" }) +
      sliderField("q", "Output quality", 30, 100, 80, "%") +
      `<div class="checks"><label class="check"><input data-node="wrap" type="checkbox" checked> Rasterize pages (best compression, loses editability)</label></div>` +
      btnRow(btn("Compress", "go", true)) +
      results(result("Original", `<b data-o="orig">—</b>`), result("Compressed", `<b data-o="new">—</b>`), result("Saved", `<b data-o="saved">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => {
        file = files[0] ?? null;
        if (file) node(root, "orig").textContent = humanSize(file.size);
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop a PDF first"); return; }
        node(root, "st").textContent = "Compressing…";
        try {
          const q = parseInt(node<HTMLInputElement>(root, "q").value, 10) / 100;
          const wrap = (root.querySelector("[data-node='wrap']") as HTMLInputElement).checked;
          const data = await file.arrayBuffer();
          let outBytes: Uint8Array;
          if (wrap) {
            const doc = await loadPdfDoc(data);
            const out = await PDFDocument.create();
            const scale = 0.5 + q * 1.3;
            for (let i = 0; i < doc.numPages; i++) {
              node(root, "st").textContent = `Rasterizing page ${i + 1}/${doc.numPages}…`;
              const canvas = await renderPage(doc, i, scale);
              const blob = await canvasToBlob(canvas, "image/jpeg", Math.max(0.2, Math.min(1, q)));
              const img = await out.embedJpg(await blob.arrayBuffer());
              const { w, h } = await pageBox(doc, i);
              const page = out.addPage([w, h]);
              page.drawImage(img, { x: 0, y: 0, width: w, height: h });
            }
            outBytes = await out.save();
          } else {
            const doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
            outBytes = await doc.save();
          }
          const blob = new Blob([toAb(outBytes)], { type: "application/pdf" });
          const saved = file.size - blob.size;
          node(root, "new").textContent = humanSize(blob.size);
          node(root, "saved").textContent = saved > 0 ? `−${humanSize(saved)} (${Math.round((saved / file.size) * 100)}%)` : "+" + humanSize(-saved);
          download("compressed.pdf", blob);
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Compression failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "pdf-to-images": {
    markup: () => dropzone(() => {}, { accept: "application/pdf", label: "Drop a PDF to convert to images" }) +
      selectField("fmt", "Format", [["image/png", "PNG"], ["image/jpeg", "JPG"], ["image/webp", "WEBP"]]) +
      `<div class="row"><div class="col">${sliderField("scale", "Scale", 0.5, 3, 1.6, "×")}</div>
      <div class="col">${sliderField("q", "Quality (lossy)", 30, 100, 90, "%")}</div></div>` +
      btnRow(btn("Convert all & zip", "go", true)) +
      results(result("Pages", `<b data-o="n">—</b>`), result("ZIP size", `<b data-o="size">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => { file = files[0] ?? null; });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop a PDF first"); return; }
        node(root, "st").textContent = "Rendering pages…";
        try {
          const fmt = (root.querySelector("[data-node='fmt']") as HTMLSelectElement).value as "image/png" | "image/jpeg" | "image/webp";
          const scale = parseFloat(node<HTMLInputElement>(root, "scale").value);
          const q = parseInt(node<HTMLInputElement>(root, "q").value, 10) / 100;
          const doc = await loadPdfDoc(await file.arrayBuffer());
          const zip = new JSZip();
          const base = file.name.replace(/\.pdf$/i, "");
          const ext = fmt.split("/")[1] === "jpeg" ? "jpg" : fmt.split("/")[1];
          for (let i = 0; i < doc.numPages; i++) {
            node(root, "st").textContent = `Page ${i + 1}/${doc.numPages}…`;
            const canvas = await renderPage(doc, i, scale);
            const blob = await canvasToBlob(canvas, fmt, fmt === "image/png" ? undefined : q);
            zip.file(`${base}-page-${i + 1}.${ext}`, blob);
          }
          await new Promise<void>((res) => setTimeout(res, 0));
          const zipBlob = await zip.generateAsync({ type: "blob" });
          node(root, "n").textContent = String(doc.numPages);
          node(root, "size").textContent = humanSize(zipBlob.size);
          download(`${base}-images.zip`, zipBlob);
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Conversion failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },
};

export default pdf1;