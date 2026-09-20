import { $$, escHtml } from "./core";
import { toggleFavorite, isFavorite } from "./store";

export interface DroppedFile { file: File; el: HTMLElement }

export function dropzone(
  _inner: (zone: HTMLElement) => void,
  opts: { accept?: string; multiple?: boolean; label?: string; sub?: string } = {}
): string {
  opts.accept = opts.accept || "";
  opts.label = opts.label || "Drop files here or click to browse";
  opts.sub = opts.sub || "Your files never leave this device.";
  return `
  <div class="dropzone" data-drop data-multi="${opts.multiple ? "1" : "0"}" data-accept="${escHtml(opts.accept ?? "")}">
    <div class="dz-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg></div>
    <p class="dz-main">${escHtml(opts.label)}</p>
    <p class="dz-sub">${escHtml(opts.sub)}</p>
    <input type="file" data-file hidden ${opts.multiple ? "multiple" : ""} ${opts.accept ? `accept="${escHtml(opts.accept)}"` : ""}>
  </div>
  <div class="dz-files" data-files></div>`;
}

export function wireDropzone(
  root: HTMLElement,
  onFiles: (files: File[]) => void,
  onAdd?: (file: File) => void,
  onRemove?: (file: File) => void,
  maxSizeMB = 50
): void {
  const zone = root.querySelector<HTMLElement>("[data-drop]");
  const input = zone?.querySelector<HTMLInputElement>("[data-file]");
  const listEl = root.querySelector<HTMLElement>("[data-files]");
  if (!zone || !input || !listEl) return;
  const accept = (zone.dataset.accept || "").split(",").filter(Boolean);
  const multiple = zone.dataset.multi === "1";

  const filesStore: { file: File; el: HTMLElement }[] = [];

  const valid = (f: File): string | null => {
    if (f.size > maxSizeMB * 1024 * 1024) return `"${f.name}" is larger than ${maxSizeMB} MB — too big for in-browser processing.`;
    if (accept.length && !accept.some((a) => {
      const t = a.trim().toLowerCase();
      if (t.startsWith(".")) return f.name.toLowerCase().endsWith(t);
      return f.type.toLowerCase() === t || (t.includes("*") && f.type.toLowerCase().startsWith(t.replace("*", "")));
    })) {
      return `"${f.name}" is not a supported file type.`;
    }
    return null;
  };

  const addFiles = (files: File[]): void => {
    files.forEach((f) => {
      const err = valid(f);
      if (err) { const e = document.createElement("p"); e.setAttribute("role", "alert"); e.className = "status err"; e.textContent = err; listEl.appendChild(e); return; }
      const row = document.createElement("div");
      row.className = "file-row";
      row.innerHTML = `<span class="file-name">${escHtml(f.name)}</span><span class="file-size"></span><button type="button" class="btn mini" data-rm>Remove</button>`;
      row.querySelector("[data-rm]")?.addEventListener("click", () => {
        row.remove();
        const idx = filesStore.findIndex((x) => x.file === f);
        if (idx >= 0) filesStore.splice(idx, 1);
        onRemove?.(f);
        onFiles(filesStore.map((x) => x.file));
      });
      listEl.appendChild(row);
      filesStore.push({ file: f, el: row });
      onAdd?.(f);
    });
    onFiles(filesStore.map((x) => x.file));
  };

  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { if (input.files) { addFiles(multiple ? [...input.files] : [input.files[0]]); input.value = ""; } });
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag");
    if (e.dataTransfer) addFiles(multiple ? [...e.dataTransfer.files] : [e.dataTransfer.files[0]]);
  });
}

export function adSlot(slot: string): string {
  return `<div class="ad-slot" data-slot="${escHtml(slot)}" aria-hidden="true"></div>`;
}

export function favoriteStar(slug: string, lg = false): string {
  return `<button type="button" class="fav-btn${lg ? " lg" : ""}" data-fav="${escHtml(slug)}" aria-pressed="${isFavorite(slug) ? "true" : "false"}" aria-label="Favorite"
    title="${isFavorite(slug) ? "Remove from favorites" : "Add to favorites"}">
    <svg width="${lg ? "22" : "16"}" height="${lg ? "22" : "16"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.9 8.9 8.2l-5.8.85 4.2 4.1-.99 5.8 5.2-2.74 5.2 2.74-.99-5.8 4.2-4.1-5.8-.85-2.6-5.3Z"/></svg>
  </button>`;
}

export function favoriteStars(): void {
  $$("[data-fav]").forEach((btn) => {
    const slug = btn.dataset.fav;
    if (!slug) return;
    btn.addEventListener("click", () => {
      const fav = toggleFavorite(slug);
      btn.setAttribute("aria-pressed", fav ? "true" : "false");
      btn.title = fav ? "Remove from favorites" : "Add to favorites";
      btn.classList.toggle("on", fav);
    });
    btn.classList.toggle("on", isFavorite(slug));
  });
}

export function privacyNote(mode: "local" | "server" = "local"): string {
  const inner =
    mode === "local"
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-3.6 8-10V5.5L12 2 4 5.5V12c0 6.4 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg> <b>Your data stays on your device.</b> Everything is processed locally in your browser — nothing is uploaded to any server.'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> <b>Requires a server.</b> This tool needs server-side processing for some operations; keep that in mind before sharing sensitive files.';
  return `<div class="privacy-note">${inner}</div>`;
}

export function spinner(): string {
  return '<div class="spinner" role="status"><span class="sr-only">Working…</span></div>';
}