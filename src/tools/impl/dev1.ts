import type { ToolImpl } from "../types";
import { btn, btnRow, copyBtn, escHtml, node, textarea, toast } from "../../lib/core";
import {
  minifyCss, formatHtml, minifyHtml, minifyJs, formatSql,
  minifyJson, formatJson, highlightJson,
} from "../../lib/code";
import { base64Decode, base64Encode, jsonToCsv } from "../../lib/file";

const devTools1: Record<string, ToolImpl> = {
  "json-formatter": {
    markup: () => textarea("in", "Paste JSON", '{"name":"ToolVerse","tools":76,"free":true,"features":["fast","private"]}', 10) +
      btnRow(btn("Format", "fmt", true), btn("Minify", "min"), btn("Validate", "val"), btn("To CSV", "csv")) +
      `<div class="code-view" data-put></div>` +
      btnRow(copyBtn("Copy", ""), btn("Clear", "clear")) +
      statusBox("st"),
    init: (root) => {
      const put = root.querySelector<HTMLElement>("[data-put]");
      const st = () => node<HTMLElement>(root, "st");
      const run = (fn: () => string) => {
        if (!put) return;
        const out = fn();
        if (out.startsWith("⚠")) { st().textContent = out; put.textContent = node<HTMLTextAreaElement>(root, "in").value; return; }
        put.innerHTML = highlightJson(escHtml(out));
        st().textContent = "Done — " + out.length + " characters.";
      };
      root.querySelector<any>("[data-node='fmt']")?.addEventListener("click", () => run(() => formatJson(node<HTMLTextAreaElement>(root, "in").value)));
      root.querySelector<any>("[data-node='min']")?.addEventListener("click", () => run(() => minifyJson(node<HTMLTextAreaElement>(root, "in").value)));
      root.querySelector<any>("[data-node='val']")?.addEventListener("click", () => {
        try { JSON.parse(node<HTMLTextAreaElement>(root, "in").value); st().textContent = "✓ Valid JSON"; } catch (e) { st().textContent = "✗ Invalid JSON — " + (e instanceof Error ? e.message : ""); }
      });
      root.querySelector<any>("[data-node='csv']")?.addEventListener("click", () => {
        try { const csv = jsonToCsv(node<HTMLTextAreaElement>(root, "in").value); if (put) put.textContent = csv; st().textContent = "CSV (" + csv.length + " chars)."; } catch { st().textContent = "JSON must be an array of objects for CSV."; }
      });
      root.querySelector<any>("[data-node='clear']")?.addEventListener("click", () => { if (put) put.innerHTML = ""; node<HTMLTextAreaElement>(root, "in").value = ""; });
    },
  },

  "json-vs-yaml": {
    markup: () => `<div class="row"><div class="col"><label class="field"><span>Direction</span><select data-node="dir">
      <option value="y2j">JSON → YAML</option><option value="j2y">YAML → JSON</option></select></label></div></div>` +
      textarea("in", "Source", '{\n  "name": "ToolVerse",\n  "tools": 76,\n  "tags": ["free", "web"],\n  "nested": { "on": true }\n}', 10) +
      btnRow(btn("Convert", "go", true)) +
      `<div class="code-view" data-put></div>` + btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const dir = (root.querySelector("[data-node='dir']") as HTMLSelectElement).value;
        const input = node<HTMLTextAreaElement>(root, "in").value;
        const put = root.querySelector<HTMLElement>("[data-put]");
        const st = () => node<HTMLElement>(root, "st");
        try {
          const out = dir === "y2j" ? jsonToYaml(JSON.parse(input)) : JSON.stringify(parseYaml(input), null, 2);
          if (put) put.textContent = out;
          st().textContent = "Converted.";
        } catch (e) { st().textContent = "Conversion failed — " + (e instanceof Error ? e.message : "check your input."); }
      });
    },
  },

  "html-minifier": {
    markup: () => textarea("in", "Paste HTML", '<!doctype html>\n<html>\n  <head>\n    <title>  Hello  </title>\n    <!-- comment -->\n    <link rel="stylesheet" href="a.css">\n  </head>\n  <body><p>Hi</p></body>\n</html>', 10) +
      btnRow(btn("Minify", "min", true), btn("Pretty print", "fmt")) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      const run = (fn: () => string) => {
        const out = fn();
        node<HTMLTextAreaElement>(root, "put").value = out;
        node(root, "st").textContent = `${out.length} characters (input: ${node<HTMLTextAreaElement>(root, "in").value.length}).`;
      };
      root.querySelector<any>("[data-node='min']")?.addEventListener("click", () => run(() => minifyHtml(node<HTMLTextAreaElement>(root, "in").value)));
      root.querySelector<any>("[data-node='fmt']")?.addEventListener("click", () => run(() => formatHtml(node<HTMLTextAreaElement>(root, "in").value)));
    },
  },

  "css-minifier": {
    markup: () => textarea("in", "Paste CSS", "/* header */\n.header {\n  color: #333;\n  margin: 0 auto;\n}\n", 9) +
      btnRow(btn("Minify", "go", true)) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const out = minifyCss(node<HTMLTextAreaElement>(root, "in").value);
        node<HTMLTextAreaElement>(root, "put").value = out;
        node(root, "st").textContent = `${out.length} characters (saved ${node<HTMLTextAreaElement>(root, "in").value.length - out.length}).`;
      });
    },
  },

  "js-minifier": {
    markup: () => textarea("in", "Paste JavaScript", "// add two numbers\nfunction add(a, b) {\n  // sum them\n  return a + b;\n}\nconst x = add(1, 2); // call it", 10) +
      btnRow(btn("Minify", "go", true)) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const out = minifyJs(node<HTMLTextAreaElement>(root, "in").value);
        node<HTMLTextAreaElement>(root, "put").value = out;
        node(root, "st").textContent = `${out.length} characters (saved ${node<HTMLTextAreaElement>(root, "in").value.length - out.length}).`;
      });
    },
  },

  "sql-formatter": {
    markup: () => textarea("in", "Paste SQL", "select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=1 group by u.id,u.name order by orders desc;", 8) +
      btnRow(btn("Format", "go", true), btn("Uppercase keywords", "uc")) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const src = node<HTMLTextAreaElement>(root, "in").value;
        node<HTMLTextAreaElement>(root, "put").value = formatSql((root.querySelector("[data-node='uc']") as HTMLButtonElement)?.dataset.forced === "1" ? src.toUpperCase().replace(/^(SELECT|FROM|WHERE|GROUP|ORDER|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|LIMIT|VALUES|INSERT|INTO|UPDATE|SET|CREATE|TABLE|ALTER|DROP|HAVING|UNION|AS|DISTINCT)\b/gi, (m) => m) : src);
      });
      root.querySelector<any>("[data-node='uc']")?.addEventListener("click", () => {
        const out = formatSql(node<HTMLTextAreaElement>(root, "in").value.toUpperCase());
        node<HTMLTextAreaElement>(root, "put").value = out;
      });
    },
  },

  "url-encoder": {
    markup: () => `<div class="row"><div class="col"><label class="field"><span>Mode</span><select data-node="mode">
      <option value="comp">encodeURIComponent / decodeURIComponent</option>
      <option value="uri">encodeURI / decodeURI</option>
      <option value="form">Form encoding (space → +)</option></select></label></div></div>` +
      textarea("in", "Value", "Hello World & welcome to ToolVerse?name=al&x=1", 4) +
      btnRow(btn("Encode", "enc", true), btn("Decode", "dec")) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      const run = (dir: "enc" | "dec") => {
        const mode = (root.querySelector("[data-node='mode']") as HTMLSelectElement).value;
        const s = node<HTMLTextAreaElement>(root, "in").value;
        const st = () => node<HTMLElement>(root, "st");
        try {
          let out = "";
          const comp = (x: string) => dir === "enc" ? encodeURIComponent(x) : decodeURIComponent(x);
          const uri = (x: string) => dir === "enc" ? encodeURI(x) : decodeURI(x);
          if (mode === "comp") out = comp(s);
          else if (mode === "uri") out = uri(s);
          else out = dir === "enc" ? s.split(" ").map(encodeURIComponent).join("+").replace(/%20/g, "+") : s.replace(/\+/g, " ").split("&").map((p) => decodeURIComponent(p)).join("&");
          node<HTMLTextAreaElement>(root, "put").value = out;
          st().textContent = "OK.";
        } catch { st().textContent = "Decode failed — malformed input."; }
      };
      root.querySelector<any>("[data-node='enc']")?.addEventListener("click", () => run("enc"));
      root.querySelector<any>("[data-node='dec']")?.addEventListener("click", () => run("dec"));
    },
  },

  "url-parser": {
    markup: () => textarea("in", "Full URL", "https://user:pass@toolverse-rose.vercel.app:443/path/to/page?slug=demo&v=2#section", 3) +
      btnRow(btn("Parse", "go", true)) +
      `<div class="results" data-put></div>`,
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const s = node<HTMLTextAreaElement>(root, "in").value.trim();
        const put = root.querySelector<HTMLElement>("[data-put]");
        let u: URL;
        try { u = new URL(s); } catch { if (put) put.textContent = ""; toast("Invalid URL — add protocol (https://)."); return; }
        const params = [...u.searchParams.entries()].map(([k, v]) => `${escHtml(k)} = ${escHtml(v)}`).join("\n") || "(none)";
        if (!put) return;
        put.innerHTML =
          resultRows({
            Protocol: u.protocol, Host: u.hostname, Port: u.port || "(default)", Path: u.pathname,
            Hash: u.hash || "(none)", Username: u.username || "(none)", Password: u.password ? "••••" : "(none)",
          }) +
          `<div class="result"><span class="label">Query params</span><pre class="value mono">${params}</pre></div>`;
      });
    },
  },
};

function resultRows(rows: Record<string, string>): string {
  return Object.entries(rows).map(([k, v]) => `<div class="result"><span class="label">${k}</span><span class="value mono">${v}</span></div>`).join("");
}

const devTools2: Record<string, ToolImpl> = {
  "base64-encoder": {
    markup: () => `<div class="row"><div class="col"><label class="field"><span>Text to encode</span><input data-node="in" type="text" value="Hello, ToolVerse!" spellcheck="false"></label></div></div>` +
      btnRow(btn("Encode", "enc", true), btn("Decode", "dec")) +
      results(result("Output", `<textarea readonly data-put rows="3"></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")) + statusBox("st"),
    init: (root) => {
      const run = (dir: "enc" | "dec") => {
        const s = node<HTMLInputElement>(root, "in").value;
        const st = () => node<HTMLElement>(root, "st");
        try {
          node<HTMLTextAreaElement>(root, "put").value = dir === "enc" ? base64Encode(s) : base64Decode(s);
          st().textContent = "OK.";
        } catch { st().textContent = "Invalid Base64."; }
      };
      root.querySelector<any>("[data-node='enc']")?.addEventListener("click", () => run("enc"));
      root.querySelector<any>("[data-node='dec']")?.addEventListener("click", () => run("dec"));
    },
  },

  "jwt-decoder": {
    markup: () => textarea("in", "Paste a JWT token (eyJ…)",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5NTE2MjM5MDJ9.signature", 4) +
      `<div class="row"><div class="col col-wide">
        <div class="result"><span class="label">Header</span><pre class="value mono" data-h></pre></div>
        <div class="result"><span class="label">Payload</span><pre class="value mono" data-p></pre></div>
      </div></div>` + statusBox("st"),
    init: (root) => {
      node<HTMLTextAreaElement>(root, "in").addEventListener("input", () => {
        const parts = node<HTMLTextAreaElement>(root, "in").value.trim().split(".");
        if (parts.length < 3) { root.querySelector("[data-h]")!.textContent = "(awaiting token)"; root.querySelector("[data-p]")!.textContent = ""; return; }
        const hE = root.querySelector<HTMLElement>("[data-h]");
        const pE = root.querySelector<HTMLElement>("[data-p]");
        try {
          const h = JSON.parse(base64Decode(parts[0]));
          const p = JSON.parse(base64Decode(parts[1]));
          if (hE) hE.textContent = JSON.stringify(h, null, 2);
          if (pE) pE.textContent = JSON.stringify(p, null, 2);
          node(root, "st").textContent = "Not verifying signature — decode only.";
        } catch { if (hE) hE.textContent = "Invalid token format."; }
      });
    },
  },

  "html-entity-encoder": {
    markup: () => textarea("in", "Text to escape", '<div class="hero">Tom & Jerry</div>', 4) +
      btnRow(btn("Escape", "esc", true), btn("Unescape", "unesc")) +
      results(result("Output", `<textarea readonly data-put></textarea>`, true)) +
      btnRow(copyBtn("Copy", "")),
    init: (root) => {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
      root.querySelector<any>("[data-node='esc']")?.addEventListener("click", () => { node<HTMLTextAreaElement>(root, "put").value = esc(node<HTMLTextAreaElement>(root, "in").value); });
      root.querySelector<any>("[data-node='unesc']")?.addEventListener("click", () => { node<HTMLTextAreaElement>(root, "put").value = unesc(node<HTMLTextAreaElement>(root, "in").value); });
    },
  },

  "regex-tester": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Pattern</span><input data-node="pat" type="text" value="\\b(\\w+)@(\\w+\\.\\w+)\\b" spellcheck="false"></label></div>
      <div class="col"><label class="field"><span>Flags</span><input data-node="flags" type="text" value="gm" spellcheck="false"></label></div></div>` +
      textarea("in", "Test text", "email me at john@example.com or sue@blog.co.uk", 5) +
      btnRow(btn("Test", "go", true)) +
      `<div class="regex-out" data-put></div>` + results(result("Matches", `<b data-o="n">0</b>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const pat = node<HTMLInputElement>(root, "pat").value;
        const flags = node<HTMLInputElement>(root, "flags").value;
        const text = node<HTMLTextAreaElement>(root, "in").value;
        const put = root.querySelector<HTMLElement>("[data-put]");
        const st = () => node<HTMLElement>(root, "n");
        try {
          const re = new RegExp(pat, flags);
          const matches = [...text.matchAll(re)];
          node(root, "n").textContent = String(matches.length);
          if (!put) return;
          if (!matches.length) { put.textContent = "No matches found."; return; }
          put.innerHTML = matches.map((m, i) => {
            const groups = m.slice(1).map((g, gi) => g !== undefined ? `<li><code>Group ${gi + 1}</code>: ${escHtml(g)}</li>` : "").join("");
            return `<div class="m"><b>#${i + 1}</b> ${escHtml(m[0])} at ${m.index ?? 0}${groups ? `<ul>${groups}</ul>` : ""}</div>`;
          }).join("");
        } catch (e) { st().textContent = "Invalid regex"; if (put) put.textContent = e instanceof Error ? e.message : "Error"; }
      });
    },
  },
};

export default { ...devTools1, ...devTools2 };

function statusBox(id: string, msg = "Ready."): string {
  return `<div class="status" data-node="${id}">${msg}</div>`;
}
function result(label: string, inner: string, mono = true): string {
  return `<div class="result"><span class="label">${label}</span><span class="value${mono ? " mono" : ""}">${inner}</span></div>`;
}
function results(...items: string[]): string {
  return `<div class="results">${items.join("")}</div>`;
}

export function jsonToYaml(obj: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (obj === null) return "null";
  if (Array.isArray(obj)) {
    if (!obj.length) return "[]";
    return obj.map((v) => `${pad}- ${typeof v === "object" ? "\n" + indentYaml(jsonToYaml(v, indent + 1), "  ").trim() : scalar(v)}`).join("\n");
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (!entries.length) return "{}";
    return entries.map(([k, v]) => {
      if (v && typeof v === "object" && !Array.isArray(v)) return `${pad}${key(k)}:\n${jsonToYaml(v, indent + 1)}`;
      if (Array.isArray(v)) {
        if (!v.length) return `${pad}${key(k)}: []`;
        return `${pad}${key(k)}:\n${jsonToYaml(v, indent + 1)}`;
      }
      return `${pad}${key(k)}: ${scalar(v)}`;
    }).join("\n");
  }
  return scalar(obj);
}
function key(k: string): string {
  return /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
}
function scalar(v: unknown): string {
  if (typeof v === "string") {
    if (/[:#\n]|^\s|\s$/.test(v)) return JSON.stringify(v);
    return v;
  }
  return v === null ? "null" : v === true ? "true" : v === false ? "false" : String(v);
}
function indentYaml(s: string, pad: string): string {
  return s.split("\n").map((l, i) => (i === 0 ? l : pad + l)).join("\n");
}

export function parseYaml(src: string): unknown {
  const lines = src.replace(/\t/g, "  ").split("\n");
  let i = 0;
  const countIndent = (s: string): number => s.match(/^ */)?.[0].length ?? 0;
  function parseBlock(indent: number): unknown {
    const isArray = lines[i]?.trim().startsWith("- ");
    const obj: Record<string, unknown> = {};
    const arr: unknown[] = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith("#")) { i++; continue; }
      const ind = countIndent(line);
      if (ind < indent) return isArray ? arr : obj;
      if (isArray) {
        if (!line.trim().startsWith("-")) return arr;
        const rest = line.trim().slice(1).trim();
        if (rest) { arr.push(parseScalar(rest)); i++; }
        else { i++; arr.push(parseBlock(indent + 2)); }
        continue;
      }
      const m = line.trim().match(/^([^:]+):\s*(.*)$/);
      if (!m) { i++; continue; }
      const k = m[1].trim();
      const v = m[2];
      if (v === "") { i++; obj[k] = parseBlock(indent + 2); }
      else if (/\[.*\]|\{.*\}/.test(v)) { obj[k] = parseInline(v); i++; }
      else { obj[k] = parseScalar(v); i++; }
    }
    return isArray ? arr : obj;
  }
  return parseBlock(0);
}
function parseInline(s: string): unknown {
  try { return JSON.parse(s.replace(/'/g, '"')); } catch { return s.slice(1, -1).split(",").map((x) => x.trim()); }
}
function parseScalar(s: string): unknown {
  const t = s.trim();
  if (t === "null" || t === "~") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}