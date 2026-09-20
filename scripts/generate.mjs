import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const meta = JSON.parse(readFileSync(join(root, "src/tools/meta.json"), "utf8"));
const SITE = "https://toolverse-rose.vercel.app";
const YEAR = new Date().getFullYear();

function findAsset(basename, ext) {
  try {
    const hit = readdirSync(join(dist, "assets")).find(
      (f) => f.startsWith(basename + ".") && f.endsWith(ext)
    );
    return hit ? "/assets/" + hit : null;
  } catch {
    return null;
  }
}
const ASSET_JS = findAsset("index", ".js") ?? "/assets/index.js";
const ASSET_CSS = findAsset("style", ".css") ?? "/assets/style.css";
const ADSENSE = '<meta name="google-adsense-account" content="ca-pub-3202800303748206">';
const GOOGLE_VERIFY = '<meta name="google-site-verification" content="googleb47353d761b6715d">';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function head(title, desc, canonical, jsonld, ogImage) {
  const scripts = (Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : []).map(
    (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`
  ).join("\n  ");
  const og = ogImage || `${SITE}/og.png`;
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#2563eb">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ToolVerse">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(og)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(og)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${ADSENSE}
  ${GOOGLE_VERIFY}
  <link rel="stylesheet" href="${ASSET_CSS}">
  ${scripts}
</head>`;
}

function header() {
  return `<header class="site-header">
    <div class="header-inner">
      <a class="logo" href="/"><span class="logo-mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs><linearGradient id="lgm" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lgm)"/><path d="M36.9 31.2 26.6 20.9a7.5 7.5 0 0 0-2-7.9 7.6 7.5 0 0 0-8.6-1.5l4.9 4.9-3.3 3.3-4.9-4.9a7.6 7.6 0 0 0 1.5 8.7 7.5 7.5 0 0 0 7.9 2l10.3 10.3a1.6 1.6 0 0 0 2.3 0l2.2-2.3a1.6 1.6 0 0 0 0-2.3Z" fill="#fff"/><circle cx="33" cy="33" r="1.6" fill="url(#lgm)"/></svg></span>ToolVerse</a>
      <nav class="nav-spacer"></nav>
      <nav class="nav-links">
        <a href="/tools/" class="nav-hide">All tools</a>
        <a href="/favorites/" class="nav-hide">Favorites</a>
        <button type="button" class="icon-btn" data-search-open aria-label="Search tools">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <span class="nav-hide">Search</span><kbd class="search-kbd">Ctrl&nbsp;K</kbd>
        </button>
        <button type="button" class="icon-btn" data-theme-btn aria-label="Toggle theme" title="Theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        </button>
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap footer-inner">
      <span>© ${YEAR} ToolVerse — 100% free, forever. Everything runs in your browser.</span>
      <nav class="footer-links">
        <a href="/tools/">All tools</a>
        <a href="/favorites/">Favorites</a>
        <a href="/about/">About</a>
        <a href="/privacy/">Privacy</a>
      </nav>
    </div>
  </footer>`;
}

function searchModal() {
  return `<div class="modal" data-search role="dialog" aria-modal="true" aria-label="Search tools">
    <div class="modal-box">
      <input type="search" placeholder="Search tools… e.g. resize, hash, pdf" autocomplete="off">
      <div class="modal-results" data-results></div>
    </div>
  </div>`;
}

function page(title, desc, bodyAttrs, mainHtml, opts = {}) {
  return `${head(title, desc, SITE + opts.canonical, opts.jsonld, opts.ogImage)}
<body${bodyAttrs}>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header()}
  <main class="wrap" id="main">
    ${mainHtml}
  </main>
  ${footer()}
  ${searchModal()}
  <script type="module" crossorigin src="${ASSET_JS}"></script>
</body>
</html>`;
}

mkdirSync(dist, { recursive: true });

const googleVerify = join(root, "googleb47353d761b6715d.html");
if (readFileSync) {
  try {
    writeFileSync(join(dist, "googleb47353d761b6715d.html"), readFileSync(googleVerify));
  } catch { /* optional */ }
}

/* ---- OG image generator (pure Node, no deps) ---- */
const GLYPH = {
  A: [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  B: [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  C: [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  D: [0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
  E: [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  F: [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  G: [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01111],
  H: [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  I: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
  J: [0b00111,0b00010,0b00010,0b00010,0b00010,0b10010,0b01100],
  K: [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  L: [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  M: [0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
  N: [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  O: [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  P: [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  Q: [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
  R: [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  S: [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  T: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  U: [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  V: [0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
  W: [0b10001,0b10001,0b10001,0b10101,0b10101,0b10101,0b01010],
  X: [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  Y: [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  Z: [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  "0": [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
  "1": [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
  "2": [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
  "3": [0b11110,0b00001,0b00001,0b01110,0b00001,0b00001,0b11110],
  "4": [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  "5": [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  "6": [0b01110,0b10000,0b10000,0b11110,0b10001,0b10001,0b01110],
  "7": [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  "8": [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  "9": [0b01110,0b10001,0b10001,0b01111,0b00001,0b00001,0b01110],
  " ": [0,0,0,0,0,0,0],
  "-": [0,0,0,0b01110,0,0,0],
  "/": [0b00001,0b00010,0b00100,0b01000,0b10000,0x00,0x00],
  ".": [0,0,0,0,0,0b00110,0b00110],
  ",": [0,0,0,0,0,0b00110,0b00100],
  ":": [0,0b00100,0b00100,0,0b00100,0b00100,0],
  "&": [0b01100,0b10010,0b10100,0b01000,0b10101,0b10011,0b01101],
  "'": [0b00100,0b00100,0b00100,0,0,0,0],
  "(": [0b00010,0b00100,0b01000,0b01000,0b01000,0b00100,0b00010],
  ")": [0b01000,0b00100,0b00010,0b00010,0b00010,0b00100,0b01000],
  "+": [0,0b00100,0b00100,0b11111,0b00100,0b00100,0],
  "!": [0b00100,0b00100,0b00100,0b00100,0b00100,0,0b00100],
  "?": [0b01110,0b10001,0b00001,0b00010,0b00100,0,0b00100],
  "#": [0b01010,0b01010,0b11111,0b01010,0b11111,0b01010,0b01010],
  "=": [0,0,0b11111,0,0b11111,0,0],
  ">": [0b01000,0b00100,0b00010,0b00100,0b01000,0,0],
  "<": [0b00010,0b00100,0b01000,0b00100,0b00010,0,0],
  "%": [0b00110,0b01001,0b00010,0b00100,0b01000,0b10010,0b01100],
  "|": [0b00100,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
};
function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = w * 4;
  const raw = Buffer.alloc(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0;
    rgba.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]);
}
function ogBuffer(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const c1 = [99, 102, 241];
  const c2 = [6, 182, 212];
  for (let y = 0; y < h; y++) {
    const k = y / h;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      buf[o] = Math.round(c1[0] * (1 - k) + c2[0] * k);
      buf[o + 1] = Math.round(c1[1] * (1 - k) + c2[1] * k);
      buf[o + 2] = Math.round(c1[2] * (1 - k) + c2[2] * k);
      buf[o + 3] = 255;
    }
  }
  return buf;
}
function textWidth(text, scale) {
  return text.length * 6 * scale - scale;
}
function putText(buf, w, text, x, y, scale, rgb) {
  let cx = x;
  for (const ch of text) {
    const g = GLYPH[ch] || GLYPH[" "];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (((bits >> (4 - col)) & 1) === 0) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = cx + col * scale + dx;
            const py = y + row * scale + dy;
            if (px < 0 || py < 0 || px >= w) continue;
            const o = (py * w + px) * 4;
            buf[o] = rgb[0];
            buf[o + 1] = rgb[1];
            buf[o + 2] = rgb[2];
            buf[o + 3] = 255;
          }
        }
      }
    }
    cx += 6 * scale;
  }
}
function ogImage(title) {
  const w = 1200, h = 630;
  const buf = ogBuffer(w, h);
  const brand = "TOOLVERSE  FREE ONLINE TOOL";
  const tagScale = 13;
  putText(buf, w, brand, Math.round((w - textWidth(brand, tagScale)) / 2), 156, tagScale, [255, 255, 255]);
  for (let x = 220; x < 980; x++) {
    const o = (330 * w + x) * 4;
    buf[o] = 255; buf[o + 1] = 255; buf[o + 2] = 255; buf[o + 3] = 230;
  }
  const upper = String(title || "ToolVerse").toUpperCase().trim();
  let scale = 42;
  while (textWidth(upper, scale) > 1080 && scale > 8) scale -= 2;
  putText(buf, w, upper, Math.round((w - textWidth(upper, scale)) / 2), 392, scale, [255, 255, 255]);
  const foot = "100% FREE  |  NO UPLOADS  |  PRIVATE";
  const footScale = 10;
  putText(buf, w, foot, Math.round((w - textWidth(foot, footScale)) / 2), 506, footScale, [255, 255, 255]);
  return encodePNG(w, h, buf);
}
mkdirSync(join(dist, "og"), { recursive: true });
writeFileSync(join(dist, "og.png"), ogImage("ToolVerse"));
for (const t of meta.tools) writeFileSync(join(dist, "og", `${t.slug}.png`), ogImage(t.title));
/* ---- end OG image generator ---- */

const catLabel = (id) => {
  const c = meta.categories.find((x) => x.id === id);
  return c ? c.label : id;
};
const tool = (slug) => meta.tools.find((t) => t.slug === slug);

function relatedTools(t, count = 4) {
  const words = (s) => (s || "").toLowerCase().replace(/_/g, " ").split(/\W+/).filter(Boolean);
  const mine = new Set(words(t.title).concat(words(t.desc), words(t.slug)));
  const scored = meta.tools
    .filter((x) => x.slug !== t.slug)
    .map((x) => {
      const theirs = words(x.title).concat(words(x.desc), words(x.slug));
      let score = 0;
      if (x.category === t.category) score += 3;
      for (const w of theirs) if (mine.has(w)) score += 1;
      return { x, score };
    })
    .sort((a, b) => b.score - a.score || a.x.title.localeCompare(b.x.title));
  return scored.slice(0, count).map((s) => s.x);
}

function faqSection(t) {
  const faq = t.faq || [];
  if (!faq.length) return "";
  return `<section class="faq" aria-label="Frequently asked questions">
    <h2 class="sec-title">Frequently asked questions</h2>
    ${faq.map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
  </section>`;
}

const toolCard = (t) =>
  `<a class="card tool-card" href="/tool/${t.slug}/"><h4>${esc(t.title)}</h4><p>${esc(t.desc)}</p></a>`;

const catSection = (id) => {
  const tools = meta.tools.filter((t) => t.category === id);
  if (!tools.length) return "";
  return `<section class="cat" id="cat-${id}"><div class="cat-head"><h2>${esc(catLabel(id))}</h2><a href="/category/${id}/">View all</a></div>
    <div class="grid tools-grid">${tools.map(toolCard).join("")}</div></section>`;
};

/* Homepage */
const homeCats = meta.categories.map((c) => catSection(c.id)).join("");
writeFileSync(
  join(dist, "index.html"),
  page(
    "ToolVerse — Free tools that just work",
    "ToolVerse is a collection of free online tools that run entirely in your browser. No sign-up, no uploads, no limits — everything happens locally on your device.",
    ' data-page="home"',
    `<section class="hero">
      <div class="hero-brand">
        <img src="/favicon.svg" alt="" width="56" height="56">
        <span class="hero-name">ToolVerse</span>
      </div>
      <h1>Free tools that just work.</h1>
      <p>Image, text, PDF, developer and generator utilities — all processed locally in your browser. No accounts, no uploads, no limits.</p>
      <div class="quick-search" data-search-open tabindex="0" role="button" aria-label="Search tools">
        <span>Search ${meta.tools.length} tools…</span><kbd>Ctrl K</kbd>
      </div>
    </section>
    <nav class="catnav" data-catnav aria-label="Browse by category"></nav>
    <div class="ad-slot" data-slot="home-top" aria-hidden="true"></div>
    <div data-cats>${homeCats}</div>
    <div class="ad-slot" data-slot="home-bottom" aria-hidden="true"></div>`,
    {
      canonical: "/",
      jsonld: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ToolVerse",
        url: SITE,
        description: "Free online tools that run entirely in your browser.",
      },
      ogImage: `${SITE}/og.png`,
    }
  )
);

/* All tools */
const allToolsHtml = `<section class="cat"><div class="cat-head"><h2>All ${meta.tools.length} tools</h2></div>
  <div class="filter-bar">
    <input data-toolsearch type="search" placeholder="Search tools…" autocomplete="off" aria-label="Search tools">
    <select data-toolsort aria-label="Sort tools">
      <option value="az">A → Z</option>
      <option value="za">Z → A</option>
      <option value="cat">By category</option>
    </select>
  </div>
  <div class="chips" data-toolchips aria-label="Filter by category"></div>
  <p class="tool-count" data-toolcount></p>
  <div class="grid tools-grid" data-alltools>${meta.tools.map(toolCard).join("")}</div></section>`;
writeFileSync(
  join(dist, "tools.html"),
  page(
    `All ${meta.tools.length} tools — ToolVerse`,
    "Browse all free online tools at ToolVerse. Every tool runs locally in your browser with no uploads and no limits.",
    ' data-page="tools"',
    allToolsHtml,
    { canonical: "/tools/" }
  )
);

/* Favorites */
writeFileSync(
  join(dist, "favorites.html"),
  page(
    "Favorites — ToolVerse",
    "Your favorite ToolVerse tools, saved in this browser.",
    ' data-page="favorites"',
    `<section class="cat"><div class="cat-head"><h2>Your favorites</h2><span class="tool-count" data-favcount></span></div>
      <p class="cat-actions"><button type="button" class="btn mini" data-clearfavs hidden>Clear all favorites</button></p>
      <div class="grid tools-grid" data-favlist></div></section>`,
    { canonical: "/favorites/" }
  )
);

/* Tool pages */
for (const t of meta.tools) {
  const cat = catLabel(t.category);
  const path = `/tool/${t.slug}/`;
  const rel = relatedTools(t);
  const ogImage = `${SITE}/og/${t.slug}.png`;
  const faqLd = (t.faq || []).length
    ? [{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: t.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }]
    : [];
  mkdirSync(join(dist, "tool", t.slug), { recursive: true });
  writeFileSync(
    join(dist, "tool", t.slug, "index.html"),
    page(
      `${t.title} — ToolVerse`,
      t.desc,
      ` data-page="tool" data-tool="${t.slug}"`,
      `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>›</span> <a href="/category/${t.category}/">${esc(cat)}</a> <span>›</span> <span aria-current="page">${esc(t.title)}</span></nav>
      <div class="page-title-row">
        <h1 data-tool-title>${esc(t.title)}</h1>
        <span data-fav-insert></span>
      </div>
      <p class="tool-intro">${esc(t.desc)}</p>
      <p class="tool-about">${esc(t.intro || "")}</p>
      <div class="ad-slot" data-slot="tool-top" aria-hidden="true"></div>
      <div class="tool-shell"><div class="tool-pane" id="app"></div></div>
      ${faqSection(t)}
      ${rel.length ? `<section class="related" data-static-related aria-label="Related tools"><h2 class="sec-title">Related tools</h2><div class="grid tools-grid">${rel.map(toolCard).join("")}</div></section>` : ""}
      <div class="ad-slot" data-slot="tool-bottom" aria-hidden="true"></div>`,
      {
        canonical: path,
        ogImage,
        jsonld: [
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: t.title,
            description: ((t.desc + " " + (t.intro || "")).trim()),
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Any (web)",
            browserRequirements: "Requires JavaScript",
            url: SITE + path,
            image: ogImage,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
              { "@type": "ListItem", position: 2, name: cat, item: `${SITE}/category/${t.category}/` },
              { "@type": "ListItem", position: 3, name: t.title, item: SITE + path },
            ],
          },
          ...faqLd,
        ],
      }
    )
  );
}

/* Category pages */
for (const c of meta.categories) {
  const tools = meta.tools.filter((t) => t.category === c.id);
  if (!tools.length) continue;
  mkdirSync(join(dist, "category", c.id), { recursive: true });
  writeFileSync(
    join(dist, "category", c.id, "index.html"),
    page(
      `${c.label} tools — ToolVerse`,
      c.desc || `Free ${c.label.toLowerCase()} tools that run in your browser.`,
      ` data-page="category" data-cat="${c.id}"`,
      `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>›</span> <span aria-current="page">${esc(c.label)}</span></nav>
      <div class="page-title-row"><h1 data-cat-title>${esc(c.label)}</h1></div>
      <p class="tool-intro">${esc(c.desc || `Free online ${c.label.toLowerCase()} tools. Everything runs locally in your browser.`)}</p>
      <div class="ad-slot" data-slot="cat-top" aria-hidden="true"></div>
      <div class="grid tools-grid" data-tools>${tools.map(toolCard).join("")}</div>`,
      {
        canonical: `/category/${c.id}/`,
        jsonld: [
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
              { "@type": "ListItem", position: 2, name: c.label, item: `${SITE}/category/${c.id}/` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${c.label} tools`,
            description: c.desc || `Free ${c.label.toLowerCase()} tools that run in your browser.`,
            url: `${SITE}/category/${c.id}/`,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: tools.length,
              itemListElement: tools.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.title,
                url: `${SITE}/tool/${t.slug}/`,
              })),
            },
          },
        ],
      }
    )
  );
}

/* Static pages */
function staticPage(title, desc, slug, bodyHtml) {
  return page(
    `${title} — ToolVerse`,
    desc,
    ' data-page="static"',
    `<section class="static-page"><h1>${esc(title)}</h1>${bodyHtml}</section>`,
    {
      canonical: `/${slug}/`,
      jsonld: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: title, item: `${SITE}/${slug}/` },
        ],
      },
    }
  );
}

writeFileSync(
  join(dist, "about.html"),
  staticPage(
    "About",
    "About ToolVerse — free online tools that run entirely in your browser.",
    "about",
    `<p>ToolVerse is a growing collection of free online tools covering images, text, PDF, developer utilities, code generation and calculators. Every single tool runs in your browser — your files and data never leave your device.</p>
    <h3>Why we exist</h3>
    <p>Online tools are usually riddled with upload requirements, signup walls, file size limits and paywalls. ToolVerse does away with all of that. Open a tool, use it, and go. There's nothing to install, nothing to sign up for, and nothing to pay.</p>
    <h3>How the site makes money</h3>
    <p>We keep everything free by showing minimal advertising. That's the only trade-off — you see a couple of ads, and in return all 76 tools stay completely free, with no accounts and no data collection by us.</p>`
  )
);

writeFileSync(
  join(dist, "privacy.html"),
  staticPage(
    "Privacy",
    "ToolVerse privacy policy — your data stays on your device.",
    "privacy",
    `<h3>Short version</h3>
    <p>We can't see your data, because we never receive it. All tools process files and text locally in your browser. Nothing you upload to a tool is sent to any ToolVerse server — there are no tool servers.</p>
    <h3>What we do store</h3>
    <ul>
      <li>A few harmless preferences in your browser (theme, favorites) using localStorage.</li>
      <li>Nothing else — we do not run our own analytics or tracking scripts.</li>
    </ul>
    <h3>Third parties</h3>
    <p>Advertising is served by Google AdSense. Google may use cookies and process advertiser data as described in the Google AdSense privacy policy and Google's Privacy & Terms. You can control this via Google's Ads Settings. The site also loads the Inter web font from Google Fonts, which may log an IP address in its standard logs.</p>
    <h3>Contact</h3>
    <p>Questions? Reach out via our GitHub discussions.</p>`
  )
);

/* robots + sitemap */
const sitemap = [];
for (const t of meta.tools) sitemap.push(`${SITE}/tool/${t.slug}/`);
for (const c of meta.categories) if (meta.tools.some((t) => t.category === c.id)) sitemap.push(`${SITE}/category/${c.id}/`);
for (const p of ["", "tools/", "favorites/", "about/", "privacy/"]) sitemap.push(SITE + "/" + p);

writeFileSync(
  join(dist, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
);
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`
);

/* 404 page (Vercel serves this for any unknown route) */
writeFileSync(
  join(dist, "404.html"),
  page(
    "Page not found — ToolVerse",
    "The page you were looking for does not exist. Browse all free online tools at ToolVerse.",
    ' data-page="static"',
    `<section class="static-page not-found"><h1>404 — page not found</h1>
    <p>Sorry, that page doesn't exist or has moved.</p>
    <p><a class="btn" href="/">Back to the home page</a> <a class="btn ghost" href="/tools/">Browse all tools</a></p></section>`,
    { jsonld: [] }
  )
);

console.log(
  `Generated ${meta.tools.length} tool pages, ${meta.categories.length} category pages, ${sitemap.length} URLs total (incl. custom 404 page).`
);