import { $$ } from "./core";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full */ }
}

export function isFavorite(slug: string): boolean {
  return read<string[]>("tv:favs", []).includes(slug);
}
export function toggleFavorite(slug: string): boolean {
  const favs = read<string[]>("tv:favs", []);
  const has = favs.includes(slug);
  const next = has ? favs.filter((s) => s !== slug) : [...favs, slug];
  write("tv:favs", next);
  return !has;
}
export function clearFavorites(): void {
  write("tv:favs", []);
}

export function pushRecent(slug: string): void {
  const recents = read<string[]>("tv:recent", []).filter((s) => s !== slug);
  recents.unshift(slug);
  write("tv:recent", recents.slice(0, 12));
}
export function getRecent(): string[] {
  return read<string[]>("tv:recent", []);
}

export type Theme = "auto" | "light" | "dark";
export function getTheme(): Theme {
  return read<Theme>("tv:theme", "auto");
}
export function applyTheme(): void {
  const t = getTheme();
  const dark = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const toggle = document.querySelector<HTMLButtonElement>("[data-theme-btn]");
  if (toggle) toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  document.querySelectorAll<HTMLButtonElement>("[data-theme-btn]").forEach((b) => b.title = dark ? "Switch to light mode" : "Switch to dark mode");
}
export function cycleTheme(): Theme {
  const order: Theme[] = ["auto", "light", "dark"];
  const cur = getTheme();
  const next = order[(order.indexOf(cur) + 1) % order.length];
  write("tv:theme", next);
  applyTheme();
  return next;
}

export function initFavorites(): void {
  $$("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slug = btn.dataset.fav;
      if (!slug) return;
      const on = toggleFavorite(slug);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("on", on);
    });
  });
}