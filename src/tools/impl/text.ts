import type { ToolImpl } from "../types";
import { btn, btnRow, copyBtn, escHtml, node, textarea, toast } from "../../lib/core";
import { LOREM_WORDS } from "../../lib/data";
import { markdownToHtml } from "../../lib/code";

const textTools: Record<string, ToolImpl> = {
  "case-converter": {
    markup: () => textarea("in", "Your text", "The quick brown fox jumps over the lazy dog.", 8) +
      btnRow(btn("UPPERCASE", "uc"), btn("lowercase", "lc"), btn("Title Case", "tc"), btn("Sentence case", "sc"),
        btn("camelCase", "cc"), btn("PascalCase", "pc"), btn("kebab-case", "kc"), btn("snake_case", "sc2"), btn("CONSTANT", "const")) +
      results(result("Result", `<textarea readonly data-put></textarea>`)) +
      copyBtn("Copy result", "") + `<button type="button" class="btn mini" data-fill>Send to input</button>`,
    init: (root) => {
      const apply = (fn: (s: string) => string) => {
        const out = node<HTMLTextAreaElement>(root, "put");
        out.value = fn(node<HTMLTextAreaElement>(root, "in").value);
      };
      const map: Record<string, (s: string) => string> = {
        uc: (s) => s.toUpperCase(),
        lc: (s) => s.toLowerCase(),
        tc: (s) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()),
        sc: (s) => s.toLowerCase().replace(/^.|(\.\s+|\!\s+|\?\s+)\w/g, (m) => m.toUpperCase()),
        cc: (s) => s.toLowerCase().replace(/(?:^|[\s_\-]+)(\w)/g, (m) => (m.length > 1 ? m.slice(-1).toUpperCase() : m.toLowerCase())),
        pc: (s) => s.toLowerCase().replace(/(?:^|[\s_\-]+)(\w)/g, (m) => m.slice(-1).toUpperCase()),
        kc: (s) => s.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, ""),
        sc2: (s) => s.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, ""),
        const: (s) => s.toUpperCase().replace(/[\s\-]+/g, "_").replace(/[^A-Z0-9_]/g, ""),
      };
      for (const [id, fn] of Object.entries(map)) {
        root.querySelector(`[data-node="${id}"]`)?.addEventListener("click", () => apply(fn));
      }
      root.querySelector("[data-fill]")?.addEventListener("click", () => {
        node<HTMLTextAreaElement>(root, "in").value = node<HTMLTextAreaElement>(root, "put").value;
      });
    },
  },

  "word-counter": {
    markup: () => textarea("in", "Type or paste text here", "", 10) +
      `<div class="results">
        <div class="result"><span class="label">Words</span><b data-o="words">0</b></div>
        <div class="result"><span class="label">Characters (no spaces)</span><b data-o="chars">0</b></div>
        <div class="result"><span class="label">Characters</span><b data-o="allchars">0</b></div>
        <div class="result"><span class="label">Sentences</span><b data-o="sent">0</b></div>
        <div class="result"><span class="label">Paragraphs</span><b data-o="paras">0</b></div>
        <div class="result"><span class="label">Reading time</span><b data-o="read">0s</b></div>
      </div>`,
    init: (root) => {
      const upd = () => {
        const s = node<HTMLTextAreaElement>(root, "in").value;
        const words = (s.trim().match(/\S+/g) || []).length;
        const charsNoSpace = s.replace(/\s/g, "").length;
        const sentences = (s.match(/[.!?]+(?=\s|$)/g) || []).length;
        const paras = s.split(/\n\s*\n/).filter((p) => p.trim()).length;
        const read = Math.ceil(words / 200);
        node(root, "words").textContent = String(words);
        node(root, "chars").textContent = String(charsNoSpace);
        node(root, "allchars").textContent = String(s.length);
        node(root, "sent").textContent = String(sentences || (s.trim() ? 1 : 0));
        node(root, "paras").textContent = String(paras);
        node(root, "read").textContent = read === 0 ? "0s" : read < 1 ? "<1 min" : `${read} min${read > 1 ? "s" : ""}`;
      };
      node<HTMLTextAreaElement>(root, "in").addEventListener("input", upd);
      upd();
    },
  },

  "text-to-speech": {
    markup: () => textarea("in", "Type or paste text to speak", "Hello! This text will be read aloud in your browser.", 8) +
      `<label class="field"><span>Rate</span><input data-node="rate" type="range" min="0.5" max="2" step="0.1" value="1"></label>` +
      `<label class="field"><span>Pitch</span><input data-node="pitch" type="range" min="0" max="2" step="0.1" value="1"></label>` +
      btnRow(btn("▶ Play", "play", true), btn("Stop", "stop")) +
      statusBox("st"),
    init: (root) => {
      const synth = window.speechSynthesis;
      root.querySelector<any>("[data-node='play']")?.addEventListener("click", () => {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(node<HTMLTextAreaElement>(root, "in").value);
        u.rate = parseFloat(node<HTMLInputElement>(root, "rate").value);
        u.pitch = parseFloat(node<HTMLInputElement>(root, "pitch").value);
        u.onstart = () => { node(root, "st").textContent = "Speaking…"; };
        u.onend = () => { node(root, "st").textContent = "Done."; };
        u.onerror = () => { node(root, "st").textContent = "Speech unavailable in this browser."; };
        synth.speak(u);
      });
      root.querySelector<any>("[data-node='stop']")?.addEventListener("click", () => { synth.cancel(); node(root, "st").textContent = "Stopped."; });
    },
  },

  "reverse-text": {
    markup: () => textarea("in", "Your text", "Hello, world!", 6) +
      btnRow(btn("Reverse characters", "rev"), btn("Reverse words", "rw"), btn("Reverse lines", "rl"), btn("Upside down", "ud")) +
      results(result("Result", `<textarea readonly data-put></textarea>`)),
    init: (root) => {
      const OUT = { upside: { a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z", A: "∀", B: "𐐒", C: "Ɔ", D: "ᗡ", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H", I: "I", J: "ſ", K: "ʞ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Q", R: "ᴚ", S: "S", T: "┴", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z", "?": "¿", "!": "¡", ".": "˙", ",": "'", "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "-": "‾", "_": "¯" } };
      const apply = (fn: (s: string) => string) => {
        node<HTMLTextAreaElement>(root, "put").value = fn(node<HTMLTextAreaElement>(root, "in").value);
      };
      root.querySelector<any>("[data-node='rev']")?.addEventListener("click", () => apply((s) => [...s].reverse().join("")));
      root.querySelector<any>("[data-node='rw']")?.addEventListener("click", () => apply((s) => s.split(/\s+/).reverse().join(" ")));
      root.querySelector<any>("[data-node='rl']")?.addEventListener("click", () => apply((s) => s.split("\n").reverse().join("\n")));
      root.querySelector<any>("[data-node='ud']")?.addEventListener("click", () => apply((s) => [...s].map((c) => OUT.upside[c as keyof typeof OUT.upside] ?? c).reverse().join("")));
    },
  },

  "remove-duplicate-lines": {
    markup: () => textarea("in", "Paste lines", "apple\nbanana\napple\ncherry\nbanana", 8) +
      `<label class="check"><input data-node="sort" type="checkbox"> Sort alphabetically</label>` +
      `<label class="check"><input data-node="case-ins" type="checkbox" checked> Ignore case</label>` +
      btnRow(btn("Remove duplicates", "go", true)) +
      results(result("Output", `<textarea readonly data-put></textarea>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const ignoreCase = (root.querySelector("[data-node='case-ins']") as HTMLInputElement).checked;
        let lines = node<HTMLTextAreaElement>(root, "in").value.split("\n");
        const seen = new Set<string>();
        const out: string[] = [];
        for (const l of lines) {
          const key = ignoreCase ? l.trim().toLowerCase() : l;
          if (!seen.has(key)) { seen.add(key); out.push(l); }
        }
        if ((root.querySelector("[data-node='sort']") as HTMLInputElement).checked) out.sort((a, b) => a.localeCompare(b));
        node<HTMLTextAreaElement>(root, "put").value = out.join("\n");
      });
    },
  },

  "text-cleaner": {
    markup: () => textarea("in", "Paste messy text", "", 9) +
      `<div class="checks">` +
      `<label class="check"><input data-node="trim" type="checkbox" checked> Trim each line</label>` +
      `<label class="check"><input data-node="blank" type="checkbox" checked> Remove blank lines</label>` +
      `<label class="check"><input data-node="quotes" type="checkbox" checked> Fix curly quotes</label>` +
      `<label class="check"><input data-node="spaces" type="checkbox"> Collapse double spaces</label>` +
      `<label class="check"><input data-node="nbsp" type="checkbox" checked> Replace nbsp</label>` + `</div>` +
      btnRow(btn("Clean text", "go", true)) +
      results(result("Cleaned", `<textarea readonly data-put></textarea>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        let s = node<HTMLTextAreaElement>(root, "in").value;
        if ((root.querySelector("[data-node='quotes']") as HTMLInputElement).checked) {
          s = s.replace(/[\u201C\u201D\u201E]/g, '"').replace(/[\u2018\u2019\u201A]/g, "'");
        }
        if ((root.querySelector("[data-node='nbsp']") as HTMLInputElement).checked) s = s.replace(/\u00A0/g, " ");
        if ((root.querySelector("[data-node='trim']") as HTMLInputElement).checked) s = s.split("\n").map((l) => l.trim()).join("\n");
        if ((root.querySelector("[data-node='spaces']") as HTMLInputElement).checked) s = s.replace(/ {2,}/g, " ");
        if ((root.querySelector("[data-node='blank']") as HTMLInputElement).checked) s = s.split("\n").filter((l) => l.trim() !== "").join("\n");
        node<HTMLTextAreaElement>(root, "put").value = s;
      });
    },
  },

  "lorem-generator": {
    markup: () => `<div class="row"><div class="col"><label class="field"><span>Paragraphs</span><input data-node="p" type="number" value="3" min="1" max="50"></label></div>` +
      `<div class="col"><label class="field"><span>Type</span><select data-node="type"><option value="lorem">Lorem ipsum</option><option value="words">Random filler</option></select></label></div>` +
      `<div class="col"><label class="field"><span>Max words / paragraph</span><input data-node="n" type="number" value="60" min="5" max="200"></label></div></div>` +
      `<div class="row"><div class="col"><label class="field"><span>Start with</span><select data-node="start"><option value="lorem">Lorem ipsum dolor sit amet</option><option value="random">Random opening</option></select></label></div>` +
      `<div class="col"><label class="field"><span>Paragraph tag</span><select data-node="tag"><option value="none">Plain text</option><option value="p">&lt;p&gt;</option><option value="html">&lt;p&gt; (HTML)</option></select></label></div>` +
      `<div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>` +
      `<div class="output-box"><div class="out" data-put></div></div>` +
      copyBtn("Copy", "") + btn("Download .txt", "dl"),
    init: (root) => {
      const gen = (): string => {
        const p = Math.max(1, parseInt(node<HTMLInputElement>(root, "p").value) || 1);
        const n = Math.max(5, parseInt(node<HTMLInputElement>(root, "n").value) || 60);
        const type = (root.querySelector("[data-node='type']") as HTMLSelectElement).value;
        const start = (root.querySelector("[data-node='start']") as HTMLSelectElement).value;
        const tag = (root.querySelector("[data-node='tag']") as HTMLSelectElement).value;
        const paras: string[] = [];
        for (let i = 0; i < p; i++) {
          const words: string[] = [];
          const count = n + Math.floor(Math.random() * 20) - 10;
          for (let w = 0; w < count; w++) words.push(type === "lorem" ? LOREM_WORDS[w % LOREM_WORDS.length] : pick(LOREM_WORDS));
          let para = words.join(" ");
          if (start === "lorem" && (i === 0 || type === "lorem")) para = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + words.slice(4).join(" ");
          const caps = para.charAt(0).toUpperCase() + para.slice(1);
          if (tag === "none") paras.push(caps + ".");
          else paras.push(`<p>${caps}.</p>`);
        }
        return paras.join(tag === "none" ? "\n\n" : "\n");
      };
      const render = () => {
        const el = root.querySelector<HTMLElement>("[data-put]");
        if (!el) return;
        const out = gen();
        el.dataset.txt = out;
        el.innerHTML = (root.querySelector("[data-node='tag']") as HTMLSelectElement).value === "html" && out.includes("<p>")
          ? out
          : escHtml(out).replace(/\n/g, "<br>");
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", render);
      root.querySelector<any>("[data-node='dl']")?.addEventListener("click", () => {
        const txt = root.querySelector<HTMLElement>("[data-put]")?.dataset.txt || "";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
        a.download = "lorem.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast("Downloaded!");
      });
    },
  },

  "markdown-editor": {
    markup: () => `<div class="md-grid"><textarea data-node="in" spellcheck="false" placeholder="# Heading&#10;&#10;Write **Markdown** here…"># Hello ToolVerse
      
Start with a **bold** idea. This is a _live_ preview.

- Lists work
- Code works \`inline\`

\`\`\`
const greet = () =&gt; "hi";
\`\`\`

[Links](https://toolverse-rose.vercel.app) work too.</textarea><div class="md-preview" data-put></div></div>` +
      btn("Export HTML", "exp") + copyBtn("Copy HTML", ""),
    init: (root) => {
      const render = () => {
        const el = root.querySelector<HTMLElement>("[data-put]");
        if (!el) return;
        const html = markdownToHtml(node<HTMLTextAreaElement>(root, "in").value);
        el.innerHTML = html;
        const cp = root.querySelector<HTMLElement>("[data-copy]");
        if (cp) cp.setAttribute("data-copy", html);
      };
      node<HTMLTextAreaElement>(root, "in").addEventListener("input", render);
      root.querySelector<any>("[data-node='exp']")?.addEventListener("click", () => {
        const html = markdownToHtml(node<HTMLTextAreaElement>(root, "in").value);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        a.download = "markdown.html";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast("Exported!");
      });
      render();
    },
  },

  "slug-url-generator": {
    markup: () => textarea("in", "Title or phrase", "How to Make Delicious Pancakes (2026 Edition)!", 3) +
      `<div class="checks"><label class="check"><input data-node="lower" type="checkbox" checked> lowercase</label>` +
      `<label class="check"><input data-node="sep" type="checkbox" checked> Use dashes (else underscores)</label>` +
      `<label class="check"><input data-node="trim" type="checkbox" checked> Remove stop words</label></div>` +
      btnRow(btn("Generate slug", "go", true)) +
      results(result("Slug", `<input readonly data-put>`)) +
      copyBtn("Copy", ""),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        let s = node<HTMLTextAreaElement>(root, "in").value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if ((root.querySelector("[data-node='trim']") as HTMLInputElement).checked) {
          s = s.replace(/\b(a|an|the|and|or|of|to|in|on|for|with)\b/g, " ");
        }
        const sep = (root.querySelector("[data-node='sep']") as HTMLInputElement).checked ? "-" : "_";
        s = s.replace(/[^a-z0-9]+/g, sep).replace(new RegExp(`^${sep.replace(/-/g, "\\-")}|${sep.replace(/-/g, "\\-")}$`, "g"), "").replace(new RegExp(`${sep.replace(/-/g, "\\-")}{2,}`, "g"), sep);
        node<HTMLInputElement>(root, "put").value = s;
      });
    },
  },

  "ascii-art-generator": {
    markup: () => `<div class="dropzone" data-drop data-multi="0" data-accept=".png,.jpg,.jpeg,.webp,.gif,.bmp">
      <div class="dz-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>
      <p class="dz-main">Drop an image to convert</p>
      <input type="file" data-file hidden></div>
      <div class="row"><div class="col"><label class="field"><span>Width (chars)</span><input data-node="w" type="number" value="80" min="20" max="220"></label></div>
      <div class="col"><label class="field"><span>Charset</span><select data-node="cs"><option value="a">@%#*+=-:. </option><option value="b">#XO. </option><option value="c">█▓▒░ </option></select></label></div></div>` +
      btnRow(btn("Convert", "go", true), btn("Clear", "clr")) +
      `<pre class="ascii-out" data-put></pre>` + copyBtn("Copy art", ""),
    init: (root) => {
      let file: File | null = null;
      root.querySelector<any>("[data-drop]")?.addEventListener("click", () => (root.querySelector<HTMLInputElement>("[data-file]"))?.click());
      root.querySelector<any>("[data-file]")?.addEventListener("change", (e: Event) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) file = f;
      });
      root.querySelector<any>("[data-node='clr']")?.addEventListener("click", () => { file = null; root.querySelector<HTMLInputElement>("[data-file]")!.value = ""; });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const out = root.querySelector<HTMLElement>("[data-put]");
        if (!out || !file) { toast("Pick an image first"); return; }
        out.textContent = "Converting…";
        const chars = (root.querySelector("[data-node='cs']") as HTMLSelectElement).value === "a" ? "@%#*+=-:. " : (root.querySelector("[data-node='cs']") as HTMLSelectElement).value === "b" ? "#XO. " : "█▓▒░ ";
        const w = Math.max(20, Math.min(220, parseInt(node<HTMLInputElement>(root, "w").value) || 80));
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w * 0.5));
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);
          const d = ctx.getImageData(0, 0, w, h).data;
          let s = "";
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) * 4;
              const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
              s += chars[Math.min(chars.length - 1, Math.floor(lum * chars.length))];
            }
            s += "\n";
          }
          out.textContent = s;
          URL.revokeObjectURL(url);
        };
        img.onerror = () => { URL.revokeObjectURL(url); toast("Could not load image"); };
        img.src = url;
      });
    },
  },

  "rich-text-cleaner": {
    markup: () => textarea("in", "Paste HTML from Word, email or the web", "", 9) +
      `<div class="checks"><label class="check"><input data-node="links" type="checkbox" checked> Keep link text</label>` +
      `<label class="check"><input data-node="br" type="checkbox"> Turn line breaks into spaces</label></div>` +
      btnRow(btn("Clean", "go", true)) +
      results(result("Clean text", `<textarea readonly data-put></textarea>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const raw = node<HTMLTextAreaElement>(root, "in").value;
        const doc = new DOMParser().parseFromString(raw, "text/html");
        if ((root.querySelector("[data-node='links']") as HTMLInputElement).checked) {
          doc.querySelectorAll("a").forEach((a) => { a.replaceWith(doc.createTextNode(a.textContent || "")); });
        }
        let text = doc.body?.textContent || "";
        if ((root.querySelector("[data-node='br']") as HTMLInputElement).checked) text = text.replace(/\n{2,}/g, "\n");
        else text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
        node<HTMLTextAreaElement>(root, "put").value = text.replace(/^\s+|\s+$/g, "") + "\n";
      });
    },
  },
};

export default textTools;

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function statusBox(id: string, msg = "Ready."): string {
  return `<div class="status" data-node="${id}">${msg}</div>`;
}
function result(label: string, inner: string): string {
  return `<div class="result"><span class="label">${label}</span><span class="value mono">${inner}</span></div>`;
}
function results(...items: string[]): string {
  return `<div class="results">${items.join("")}</div>`;
}