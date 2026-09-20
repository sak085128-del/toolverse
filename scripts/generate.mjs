import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const meta = JSON.parse(readFileSync(join(root, "src/tools/meta.json"), "utf8"));
const SITE = "https://toolverse-phi.vercel.app";
const YEAR = new Date().getFullYear();
const ASSET_JS = "/assets/app.js";
const ASSET_CSS = "/assets/app.css";
const ADSENSE = '<meta name="google-adsense-account" content="ca-pub-3202800303748206">';
const GOOGLE_VERIFY = '<meta name="google-site-verification" content="googleb47353d761b6715d">';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function head(title, desc, canonical, jsonld) {
  const ld = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : "";
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
  <meta name="twitter:card" content="summary">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${ADSENSE}
  ${GOOGLE_VERIFY}
  <link rel="stylesheet" href="${ASSET_CSS}">
  ${ld}
</head>`;
}

function header() {
  return `<header class="site-header">
    <div class="header-inner">
      <a class="logo" href="/"><span class="logo-mark">T</span>ToolVerse</a>
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
  return `${head(title, desc, SITE + opts.canonical, opts.jsonld)}
<body${bodyAttrs}>
  ${header()}
  <main class="wrap">
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

const catLabel = (id) => {
  const c = meta.categories.find((x) => x.id === id);
  return c ? c.label : id;
};
const tool = (slug) => meta.tools.find((t) => t.slug === slug);

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
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/tool/{query}`,
          "query-input": "required name=query",
        },
      },
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
  mkdirSync(join(dist, "tool", t.slug), { recursive: true });
  writeFileSync(
    join(dist, "tool", t.slug, "index.html"),
    page(
      `${t.title} — ToolVerse`,
      t.desc,
      ` data-page="tool" data-tool="${t.slug}"`,
      `<nav class="crumbs"><a href="/">Home</a> <span>›</span> <a href="/category/${t.category}/">${esc(cat)}</a></nav>
      <div class="page-title-row">
        <h1 data-tool-title>${esc(t.title)}</h1>
        <span data-fav-insert></span>
      </div>
      <p class="tool-intro">${esc(t.desc)}</p>
      <div class="ad-slot" data-slot="tool-top" aria-hidden="true"></div>
      <div class="tool-shell"><div class="tool-pane" id="app"></div></div>`,
      {
        canonical: path,
        jsonld: {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: t.title,
          description: t.desc,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Any (web)",
          browserRequirements: "Requires JavaScript",
          url: SITE + path,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
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
      `<nav class="crumbs"><a href="/">Home</a> <span>›</span> <span>${esc(c.label)}</span></nav>
      <div class="page-title-row"><h1 data-cat-title>${esc(c.label)}</h1></div>
      <p class="tool-intro">${esc(c.desc || `Free online ${c.label.toLowerCase()} tools. Everything runs locally in your browser.`)}</p>
      <div class="ad-slot" data-slot="cat-top" aria-hidden="true"></div>
      <div class="grid tools-grid" data-tools>${tools.map(toolCard).join("")}</div>`,
      { canonical: `/category/${c.id}/` }
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
    { canonical: `/${slug}/` }
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
    <p>We keep everything free by showing minimal advertising. That's the only trade-off — you see a couple of ads, and in return all 76+ tools stay completely free, with no accounts and no data collection by us.</p>`
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
      <li>Page view statistics via privacy-friendly analytics to understand which tools are used.</li>
    </ul>
    <h3>Third parties</h3>
    <p>Advertising is served by Google AdSense. Google may use cookies and process advertiser data as described in the Google AdSense privacy policy and Google's Privacy & Terms. You can control this via Google's Ads Settings.</p>
    <h3>Contact</h3>
    <p>Questions? Reach out via the contact tool in our GitHub discussions."</p>`
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

console.log(
  `Generated ${meta.tools.length} tool pages, ${meta.categories.length} category pages, ${sitemap.length} URLs total.`
);