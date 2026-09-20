import type { ToolImpl } from "../types";
import { btn, btnRow, download, humanSize, node, results, result, selectField, sliderField, statusBox, textarea, toast, toAb, val } from "../../lib/core";
import { textToPdf, imagesToPdf } from "../../lib/gendocs";
import { sha256, sha1, md5, formatMime } from "../../lib/file";
import { dropzone, wireDropzone, privacyNote } from "../../lib/ui";
import JSZip from "jszip";

const pdf2: Record<string, ToolImpl> = {
  "text-to-pdf": {
    markup: () => textarea("txt", "Text", "Hello world!\n\nThis text will be converted to a PDF.", 10) +
      `<div class="row"><div class="col">${sliderField("fs", "Font size", 10, 24, 12, "pt")}</div>
      <div class="col">${sliderField("mg", "Margin", 10, 60, 40, "pt")}</div>
      <div class="col"><label class="field"><span>Page size</span><select data-node="page"><option value="A4">A4</option><option value="letter">Letter</option><option value="A5">A5</option></select></label></div></div>` +
      btnRow(btn("Create PDF", "go", true)) +
      results(result("PDF size", `<b data-o="size">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const text = val(root, "txt");
        if (!text.trim()) { toast("Enter some text first"); return; }
        node(root, "st").textContent = "Building PDF…";
        try {
          const fs = parseInt(node<HTMLInputElement>(root, "fs").value, 10);
          const mg = parseInt(node<HTMLInputElement>(root, "mg").value, 10);
          const page = (root.querySelector("[data-node='page']") as HTMLSelectElement).value as "A4" | "letter" | "A5";
          const bytes = await textToPdf(text, { fontSize: Math.max(8, Math.min(48, fs)), margin: Math.max(6, Math.min(120, mg)), page });
          node(root, "size").textContent = humanSize(bytes.length);
          download("document.pdf", new Blob([toAb(bytes)], { type: "application/pdf" }));
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "images-to-pdf": {
    markup: () => dropzone(() => {}, { accept: "image/*", multiple: true, label: "Drop images (in order = page order)", sub: "Each image becomes a page, centered, fitted." }) +
      `<div class="file-list" data-list></div>` +
      btnRow(btn("Create PDF", "go", true)) +
      results(result("Pages", `<b data-o="n">—</b>`), result("PDF size", `<b data-o="size">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      const files: File[] = [];
      const list = root.querySelector<HTMLElement>("[data-list]");
      wireDropzone(root, (all) => {
        files.length = 0;
        files.push(...all);
        if (list) list.textContent = "";
        for (const f of files) {
          const d = document.createElement("div");
          d.className = "file-row";
          d.textContent = `${f.name} (${humanSize(f.size)})`;
          list?.appendChild(d);
        }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!files.length) { toast("Drop images first"); return; }
        node(root, "st").textContent = "Building PDF…";
        try {
          const bytes = await imagesToPdf(files);
          node(root, "n").textContent = String(files.length);
          node(root, "size").textContent = humanSize(bytes.length);
          download("images.pdf", new Blob([toAb(bytes)], { type: "application/pdf" }));
          node(root, "st").textContent = "Done.";
        } catch (e) { node(root, "st").textContent = "Failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "zip-compressor": {
    markup: () => dropzone(() => {}, { multiple: true, label: "Drop any files to bundle into a ZIP", sub: "Compression level is adjustable. Files zip as-is — nothing is encoded." }) +
      `<div class="file-list" data-list></div>` +
      selectField("level", "Compression level", [["0", "Store (fast, no compression)"], ["6", "Default"], ["9", "Maximum"]]) +
      btnRow(btn("Create ZIP", "go", true)) +
      results(result("Files", `<b data-o="n">—</b>`), result("ZIP size", `<b data-o="size">—</b>`)) + statusBox("st") + privacyNote(),
    init: (root) => {
      const files: File[] = [];
      const list = root.querySelector<HTMLElement>("[data-list]");
      wireDropzone(root, (all) => {
        files.length = 0;
        files.push(...all);
        if (list) list.textContent = "";
        for (const f of files) {
          const d = document.createElement("div");
          d.className = "file-row";
          d.textContent = `${f.name} (${humanSize(f.size)})`;
          list?.appendChild(d);
        }
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!files.length) { toast("Drop files first"); return; }
        node(root, "st").textContent = "Zipping…";
        const zip = new JSZip();
        for (const f of files) zip.file(f.name, f);
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: parseInt((root.querySelector("[data-node='level']") as HTMLSelectElement).value, 10) } });
        node(root, "n").textContent = String(files.length);
        node(root, "size").textContent = humanSize(blob.size);
        download("archive.zip", blob);
        node(root, "st").textContent = "Done.";
      });
    },
  },

  "file-hash-checker": {
    markup: () => dropzone(() => {}, { label: "Drop a file to hash" }) +
      `<label class="field"><span>Compare hash (optional)</span><input data-node="cmp" type="text" placeholder="Paste a hash to compare" spellcheck="false"></label>` +
      btnRow(btn("Hash file", "go", true)) +
      `<pre class="mono hash-out"><span data-o="out"></span></pre>` + statusBox("st") + privacyNote(),
    init: (root) => {
      let file: File | null = null;
      wireDropzone(root, (files) => { file = files[0] ?? null; });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        if (!file) { toast("Drop a file first"); return; }
        node(root, "st").textContent = "Hashing…";
        try {
          const buf = await file.arrayBuffer();
          const [s256, s1, m5] = await Promise.all([sha256(file), sha1(buf), md5(buf)]);
          const out = `SHA-256  ${s256}\nSHA-1    ${s1}\nMD5      ${m5}`;
          node(root, "out").textContent = out;
          const cmp = node<HTMLInputElement>(root, "cmp").value.trim().toLowerCase();
          node(root, "st").textContent = cmp ? `Comparison: ${[s256, s1, m5].some((h) => h === cmp) ? "matches ✓" : "no match ✗"}` : "Done.";
        } catch (e) { node(root, "st").textContent = "Failed: " + (e instanceof Error ? e.message : "unknown"); }
      });
    },
  },

  "file-metadata": {
    markup: () => dropzone(() => {}, { label: "Drop a file to inspect" }) +
      `<table class="meta-table"><tbody data-rows></tbody></table>` +
      `<details class="tips"><summary>About this tool</summary>All metadata is read locally in your browser. Nothing is uploaded.</details>` + privacyNote(),
    init: (root) => {
      const rows = root.querySelector<HTMLElement>("[data-rows]");
      wireDropzone(root, async (files) => {
        const f = files[0];
        if (!f || !rows) return;
        const h = await sha256(f);
        const entries: [string, string][] = [
          ["Name", f.name],
          ["Size", `${humanSize(f.size)} (${f.size.toLocaleString()} bytes)`],
          ["MIME type", formatMime(f) || "unknown"],
          ["Modified", new Date(f.lastModified).toLocaleString()],
          ["SHA-256", h],
          ["Directory?", f.webkitRelativePath ? f.webkitRelativePath : "n/a"],
        ];
        rows.textContent = "";
        for (const [k, v] of entries) {
          const tr = document.createElement("tr");
          const th = document.createElement("th");
          th.textContent = k;
          const td = document.createElement("td");
          td.textContent = v;
          tr.append(th, td);
          rows.appendChild(tr);
        }
      });
    },
  },
};

export default pdf2;