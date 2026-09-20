import { escHtml } from "./core";

export function minifyCss(code: string): string {
  let s = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>~+])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
  return s;
}

export function minifyHtml(code: string): string {
  let s = code
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s;
}

export function formatHtml(code: string): string {
  const tokens = code.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><");
  const out: string[] = [];
  let indent = 0;
  const voidTags = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
  const tagRe = /<\/?[a-zA-Z][^>]*>/g;
  let last = 0;
  const pushText = (t: string) => {
    t = t.trim();
    if (t) out.push("  ".repeat(indent) + t);
  };
  for (const m of tokens.matchAll(tagRe)) {
    const pos = m.index ?? 0;
    pushText(tokens.slice(last, pos));
    const tag = m[0];
    const name = tag.match(/^<(\/?)([a-zA-Z]+)/)?.[2] ?? "";
    const closing = tag.startsWith("</");
    if (!closing && !tag.endsWith("/>") && !voidTags.has(name.toLowerCase())) {
      out.push("  ".repeat(indent) + tag);
      indent++;
    } else if (closing) {
      indent = Math.max(0, indent - 1);
      out.push("  ".repeat(indent) + tag);
    } else {
      out.push("  ".repeat(indent) + tag);
    }
    last = pos + tag.length;
  }
  pushText(tokens.slice(last));
  return out.join("\n");
}

export const SAFE_STRING = "\u2603S\u2603";

export function minifyJs(code: string): string {
  const { s, restore } = tokenizeSafe(code);
  let inStr: string | boolean = false, i = 0;
  let o = "";
  let prev = "";
  const next = () => s[i] ?? "";
  while (i < s.length) {
    const c = s[i];
    if (inStr) { o += c; if (c === inStr) inStr = false; i++; continue; }
    if (c === '"' || c === "'" || c === "`") {
      if (next() === c && (prev === "" || /[\\{\\[(,=:]/.test(prev))) {
        o += c + c; i += 2; continue;
      }
      inStr = c; o += c; i++; continue;
    }
    if (c === "/" && (next() === "/" || next() === "*")) {
      const isBlock = next() === "*";
      const end = isBlock ? "*/" : "\n";
      let j = i + 2;
      while (j < s.length && !(isBlock ? s.startsWith(end, j) : s[j] === end)) j++;
      i = isBlock ? j + 2 : j + 1;
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    o += c;
    prev = c;
    i++;
  }
  return restore(o);
}

function tokenizeSafe(code: string): { s: string; restore: (raw: string) => string } {
  const items: string[] = [];
  const s = code.replace(/["'`][^"'`]*["'`]/g, (m) => {
    items.push(m);
    return SAFE_STRING;
  });
  return {
    s,
    restore: (raw) =>
      raw
        .split(SAFE_STRING)
        .map((part, idx) => (idx < items.length ? part + items[idx] : part))
        .join(""),
  };
}

export function formatJs(code: string): string {
  const out: string[] = [];
  let indent = 0;
  const { s, restore } = tokenizeSafe(code);
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (SAFE_STRING.startsWith(s.slice(i, i + SAFE_STRING.length))) { out.push(s.slice(i, i + SAFE_STRING.length)); i += SAFE_STRING.length; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) { if (s[j] === "\\") j++; j++; }
      out.push(s.slice(i, j + 1)); i = j + 1; continue;
    }
    if (c === "{") { out.push("{\n" + "  ".repeat(++indent)); i++; continue; }
    if (c === "}") { out.push("\n" + "  ".repeat(--indent) + "}"); i++; continue; }
    if (c === ";" && i + 1 < s.length) { out.push(";\n" + "  ".repeat(indent)); i++; continue; }
    out.push(c); i++;
  }
  return restore(out.join(""));
}

export function formatSql(code: string): string {
  const keywords = new Set(["select","from","where","insert","into","values","update","set","delete","join","left","right","inner","outer","on","and","or","order","by","group","having","limit","offset","union","create","table","alter","drop","index","primary","foreign","key","references","as","distinct","between","like","in","exists","not","null","case","when","then","else","end"]);
  const out: string[] = [];
  let indent = 0;
  const push = (line: string) => out.push("  ".repeat(indent) + line);
  let cur = "";
  const s = code;
  let i = 0;
  const addWord = (w: string) => {
    const kw = w.toLowerCase();
    if (kw === "(") { push(cur.trim()); push("("); indent++; cur = ""; return; }
    if (kw === ")") { if (cur.trim()) push(cur.trim()); indent = Math.max(0, indent - 1); push(")"); cur = ""; return; }
    if (kw === ",") { cur += ","; push(cur.trim()); cur = ""; return; }
    if (keywords.has(kw)) {
      if (cur.trim()) push(cur.trim());
      cur = kw.toUpperCase() + " ";
      if (["from","where","join","on","left","right","inner","outer","order","group","having","limit","union","values","set"].includes(kw)) {
        cur = "";
      }
      push(w.toUpperCase());
      return;
    }
    cur += (cur && !cur.endsWith("(") && !cur.endsWith(" ") ? " " : "") + w;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "'" || c === '"') {
      let j = i + 1; while (j < s.length && s[j] !== c) { if (s[j] === "\\") j++; j++; }
      cur += s.slice(i, j + 1); i = j + 1; continue;
    }
    if (/[\s]/.test(c)) { if (cur) addWord(cur); cur = ""; i++; continue; }
    if (/[(),;]/.test(c)) { if (cur) addWord(cur); cur = ""; addWord(c); i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) push(cur.trim());
  return out.join("\n");
}

export function markdownToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
        const url = href.trim();
        if (/^(https?:|mailto:)/i.test(url) && !/\s/.test(url)) {
          return `<a href="${esc(url)}" rel="noopener" target="_blank">${label}</a>`;
        }
        return label;
      });
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: string[] | null = null;
  let inCode = false;
  let codeBuf: string[] = [];
  for (const ln of lines) {
    if (/^```/.test(ln)) {
      if (inCode) { out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`); codeBuf = []; }
      inCode = !inCode; continue;
    }
    if (inCode) { codeBuf.push(ln); continue; }
    const h = ln.match(/^(#{1,4})\s+(.*)/);
    if (h) { flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = ln.match(/^\s*[-*+]\s+(.*)/);
    if (li) { if (!list) list = []; list.push(inline(li[1])); continue; }
    flushList();
    if (ln.trim() === "") continue;
    out.push(`<p>${inline(ln)}</p>`);
  }
  flushList();
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
  function flushList() { if (list) { out.push(`<ul>${list!.map((x) => `<li>${x}</li>`).join("")}</ul>`); list = null; } }
  return out.join("\n");
}

export function minifyJson(code: string): string {
  try { return JSON.stringify(JSON.parse(code)); }
  catch { return "\u26a0 Invalid JSON"; }
}
export function formatJson(code: string): string {
  try { return JSON.stringify(JSON.parse(code), null, 2); }
  catch { return "\u26a0 Invalid JSON"; }
}

export function highlightJson(code: string): string {
  return escHtml(code)
    .replace(/(&quot;)([^&]*)(&quot;)(\s*:)/g, '<span class="k">$1$2$3</span>$4')
    .replace(/(&quot;)(-?[0-9.eE+]+)(&quot;)/g, '<span class="n">$1$2$3</span>')
    .replace(/\b(true|false)\b/g, '<span class="b">$1</span>')
    .replace(/\bnull\b/g, '<span class="x">null</span>');
}