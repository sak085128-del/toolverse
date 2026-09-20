import "./styles.css";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { applyTheme, cycleTheme, getTheme, pushRecent, isFavorite, toggleFavorite } from "./lib/store";
import { initAnalytics, track, trackToolViews } from "./lib/track";
import { copyText, toast } from "./lib/core";
import { adSlot, favoriteStar } from "./lib/ui";
import { CATEGORIES, TOOL_META, categoryLabel, toolsByCategory, searchTools, loadTool } from "./tools/registry";

injectSpeedInsights();
initAnalytics();
trackToolViews(TOOL_META.map((t) => ({ slug: t.slug, title: t.title })));

const page = document.body.dataset.page || "home";
const root = document.getElementById("app");

applyTheme();
wireTheme();

function wireTheme(): void {
  const btn = document.querySelector<HTMLElement>("[data-theme-btn]");
  if (!btn) return;
  const setLabel = () => btn.setAttribute("title", `Theme: ${getTheme()}`);
  btn.addEventListener("click", () => { cycleTheme(); setLabel(); });
  setLabel();
}

document.addEventListener("click", (e) => {
  const btn = (e.target as Element | null)?.closest?.<HTMLElement>("[data-copy]");
  if (!btn) return;
  const explicit = btn.getAttribute("data-copy") || "";
  if (explicit.trim() !== "") { void copyText(explicit, "Copied!"); return; }
  const scope = document.getElementById("app") ?? document;
  let text = "";
  const put = scope.querySelector<HTMLInputElement>("[data-put]");
  if (put) {
    text = typeof put.value === "string" ? put.value : "";
  }
  if (!text) {
    const out = scope.querySelector<HTMLElement>("[data-out]") ?? put;
    if (out) {
      text = out.dataset.txt || out.dataset.data || (out instanceof HTMLInputElement || out instanceof HTMLTextAreaElement ? out.value : "") || out.textContent || "";
    }
  }
  if (text.trim() !== "") void copyText(text, "Copied!");
  else toast("Nothing to copy yet");
});

document.querySelectorAll<HTMLElement>("[data-fav]").forEach(wireFav);

function wireFav(el: HTMLElement): void {
  const slug = el.getAttribute("data-fav") || "";
  const setOn = () => el.classList.toggle("on", isFavorite(slug));
  el.addEventListener("click", () => { toggleFavorite(slug); setOn(); });
  setOn();
}

track("page_view", { page, path: location.pathname });

if (page === "tool") void initTool();
else if (page === "home") initHome();
else if (page === "category") initCategory();
else if (page === "favorites") initFavorites();
else if (page === "tools") initAllTools();
initSearch();

async function initTool(): Promise<void> {
  const slug = document.body.dataset.tool || "";
  if (!root) return;
  const meta = TOOL_META.find((t) => t.slug === slug);
  if (meta) document.title = `${meta.title} — ToolVerse`;
  const heading = document.querySelector<HTMLElement>("[data-tool-title]");
  if (heading) heading.textContent = meta?.title || slug;
  const favInsert = document.querySelector<HTMLElement>("[data-fav-insert]");
  if (favInsert) { favInsert.innerHTML = favoriteStar(slug); wireFav(favInsert.firstElementChild as HTMLElement); }

  pushRecent(slug);

  try {
    const tool = await loadTool(slug);
    if (!tool || !tool.markup) {
      root.innerHTML = `<div class="empty"><h2>Tool not found</h2><p>This tool may have moved. Use search to find it.</p></div>`;
      return;
    }
    root.innerHTML = tool.markup();
    try {
      tool.init(root);
    } catch (e) {
      root.insertAdjacentHTML("beforeend", `<div class="status err">Init failed: ${e instanceof Error ? e.message : "unknown"}</div>`);
    }
    track("tool_view", { slug });
  } catch (e) {
    root.innerHTML = `<div class="empty"><h2>Something went wrong</h2><p>${e instanceof Error ? e.message : "Unknown error"}</p></div>`;
  }

  if (meta) {
    const rel = toolsByCategory(meta.category).filter((t) => t.slug !== slug).slice(0, 4);
    if (rel.length) {
      const wrap = document.createElement("div");
      wrap.className = "related";
      wrap.innerHTML = `<h3 class="sec-title">You might like</h3><div class="grid tools-grid">${rel
        .map((t) => `<a class="card tool-card" href="/tool/${t.slug}/"><h4>${t.title}</h4><p>${t.desc}</p></a>`)
        .join("")}</div>`;
      root.appendChild(wrap);
    }
    root.insertAdjacentHTML("beforeend", adSlot("tool-bottom"));
  }
}

function catSection(catId: string): string {
  const tools = toolsByCategory(catId);
  if (!tools.length) return "";
  return `<section class="cat" id="cat-${catId}"><div class="cat-head"><h2>${categoryLabel(catId)}</h2><a href="/category/${catId}/">View all</a></div>
    <div class="grid tools-grid">${tools.map(toolCard).join("")}</div></section>`;
}

function initHome(): void {
  const nav = document.querySelector<HTMLElement>("[data-catnav]");
  if (nav) {
    nav.innerHTML = CATEGORIES.map((c) => `<a class="chip" href="#cat-${c.id}">${categoryLabel(c.id)}</a>`).join("");
  }
  const container = root?.querySelector?.<HTMLElement>("[data-cats]");
  if (container) container.innerHTML = CATEGORIES.map((c) => catSection(c.id)).join("");
}

function initCategory(): void {
  const id = document.body.dataset.cat || "";
  const list = root?.querySelector?.<HTMLElement>("[data-tools]");
  if (list) list.innerHTML = toolsByCategory(id).map(toolCard).join("");
  const h = document.querySelector<HTMLElement>("[data-cat-title]");
  if (h) h.textContent = categoryLabel(id);
}

function initAllTools(): void {
  const list = root?.querySelector?.<HTMLElement>("[data-alltools]");
  const search = root?.querySelector?.<HTMLInputElement>("[data-toolsearch]");
  const sort = root?.querySelector?.<HTMLSelectElement>("[data-toolsort]");
  const chips = root?.querySelector?.<HTMLElement>("[data-toolchips]");
  const count = root?.querySelector?.<HTMLElement>("[data-toolcount]");
  if (!list) return;

  let query = "";
  let category = "";
  let order = "az";

  if (chips) {
    chips.innerHTML = `<button type="button" class="chip active" data-toolfilter="">All</button>` +
      CATEGORIES.map((c) => `<button type="button" class="chip" data-toolfilter="${c.id}">${categoryLabel(c.id)}</button>`).join("");
    chips.querySelectorAll<HTMLElement>("[data-toolfilter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        category = chip.dataset.toolfilter || "";
        chips.querySelectorAll<HTMLElement>("[data-toolfilter]").forEach((c) => c.classList.toggle("active", c === chip));
        render();
      });
    });
  }

  search?.addEventListener("input", () => { query = search.value.toLowerCase(); render(); });
  sort?.addEventListener("change", () => { order = sort.value; render(); });

  const render = () => {
    const terms = query.split(/\s+/).filter(Boolean);
    const hits = TOOL_META.filter((t) => {
      if (category && t.category !== category) return false;
      if (!terms.length) return true;
      const hay = `${t.title} ${t.desc} ${categoryLabel(t.category)}`.toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
    if (order === "za") hits.sort((a, b) => b.title.localeCompare(a.title));
    else if (order === "cat") hits.sort((a, b) => (a.category === b.category ? a.title.localeCompare(b.title) : a.category.localeCompare(b.category)));
    else hits.sort((a, b) => a.title.localeCompare(b.title));
    if (count) {
      count.textContent = category || query
        ? `${hits.length} of ${TOOL_META.length} tools`
        : `${TOOL_META.length} tools`;
    }
    list.innerHTML = hits.length ? hits.map(toolCard).join("") : `<p class="empty-text" style="grid-column:1/-1">Nothing matches your filters.</p>`;
  };
  render();
}

function initFavorites(): void {
  const list = root?.querySelector?.<HTMLElement>("[data-favlist]");
  if (!list) return;
  const clear = root?.querySelector?.<HTMLElement>("[data-clearfavs]");
  const count = root?.querySelector?.<HTMLElement>("[data-favcount]");
  const rebuild = () => {
    const favs = TOOL_META.filter((t) => isFavorite(t.slug));
    if (count) count.textContent = favs.length ? `${favs.length} favorite${favs.length === 1 ? "" : "s"}` : "";
    list.innerHTML = favs.length
      ? favs.map(toolCard).join("")
      : `<p class="empty-text">No favorites yet. Star any tool to keep it here.</p>`;
    if (clear) clear.hidden = favs.length === 0;
  };
  clear?.addEventListener("click", () => {
    TOOL_META.forEach((t) => { if (isFavorite(t.slug)) toggleFavorite(t.slug); });
    rebuild();
  });
  rebuild();
  window.addEventListener("storage", rebuild);
}

function toolCard(t: { slug: string; title: string; desc: string }): string {
  return `<a class="card tool-card" href="/tool/${t.slug}/"><h4>${t.title}</h4><p>${t.desc}</p></a>`;
}

function initSearch(): void {
  const opens = document.querySelectorAll<HTMLElement>("[data-search-open]");
  const modal = document.querySelector<HTMLElement>("[data-search]");
  if (!opens.length || !modal) return;
  const input = modal.querySelector<HTMLInputElement>("input");
  const resultsBox = modal.querySelector<HTMLElement>("[data-results]");
  const render = (q: string) => {
    if (!resultsBox) return;
    const hits = searchTools(q, 12);
    resultsBox.innerHTML = hits.length
      ? hits.map((t) => `<a class="hit" href="/tool/${t.slug}/"><b>${t.title}</b><span>${t.desc}</span></a>`).join("")
      : q
        ? `<p class="empty-text">Nothing for "${q}"</p>`
        : `<p class="empty-text">Type to search ${TOOL_META.length} tools</p>`;
  };
  opens.forEach((open) => open.addEventListener("click", () => {
    modal.classList.add("open");
    if (input) { input.value = ""; input.focus(); }
    render("");
  }));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); opens.forEach((o) => o.click()); }
    if (e.key === "Escape") modal.classList.remove("open");
  });
  input?.addEventListener("input", () => render(input.value));
}