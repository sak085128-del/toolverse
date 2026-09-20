export function $(sel: string, el: ParentNode = document): HTMLElement | null {
  return el.querySelector(sel);
}
export function $$(sel: string, el: ParentNode = document): HTMLElement[] {
  return [...el.querySelectorAll(sel)] as HTMLElement[];
}

let toastTimer = 0;
export function toast(msg: string): void {
  let el = $("#tv-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "tv-toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove("show"), 2200);
}

export function input(id: string, label: string, value = ""): string {
  return `<label class="field"><span>${label}</span><input data-node="${id}" type="text" value="${escAttr(value)}" autocomplete="off" spellcheck="false"></label>`;
}
export function textarea(id: string, label: string, value = "", rows = 6): string {
  return `<label class="field"><span>${label}</span><textarea data-node="${id}" rows="${rows}" spellcheck="false">${escHtml(value)}</textarea></label>`;
}
export function numberField(id: string, label: string, value: string, step = "any"): string {
  return `<label class="field"><span>${label}</span><input data-node="${id}" type="number" value="${escAttr(value)}" step="${escAttr(step)}"></label>`;
}
export function selectField(id: string, label: string, options: [string, string][]): string {
  const opts = options
    .map(([v, l]) => `<option value="${escAttr(v)}">${escHtml(l)}</option>`)
    .join("");
  return `<label class="field"><span>${label}</span><select data-node="${id}">${opts}</select></label>`;
}
export function sliderField(id: string, label: string, min: number, max: number, value: number, suffix = "", showVal = true): string {
  const valNode = showVal ? `<b data-node="${id}-val">${value}${suffix}</b>` : "";
  return `<div class="field"><div class="field-head"><span>${label}</span>${valNode}</div><input data-node="${id}" type="range" min="${min}" max="${max}" value="${value}"></div>`;
}
export function checkRow(id: string, label: string, checked = true): string {
  return `<label class="check"><input data-node="${id}" type="checkbox" ${checked ? "checked" : ""}> ${escHtml(label)}</label>`;
}
export function btn(label: string, id: string, primary = false): string {
  return `<button type="button" class="btn${primary ? " primary" : ""}" data-node="${id}">${escHtml(label)}</button>`;
}
export function btnRow(...buttons: string[]): string {
  return `<div class="btn-row">${buttons.join("")}</div>`;
}
export function result(label: string, value: string, mono = false): string {
  return `<div class="result"><span class="label">${escHtml(label)}</span><span class="value${mono ? " mono" : ""}">${value}</span></div>`;
}
export function results(...boxes: string[]): string {
  return `<div class="results">${boxes.join("")}</div>`;
}
export function copyBtn(title: string, text: string): string {
  return `<button type="button" class="btn mini" data-copy="${escAttr(text)}">${escHtml(title)}</button>`;
}
export function statusBox(id: string, msg = "Ready."): string {
  return `<div class="status" data-node="${id}">${escHtml(msg)}</div>`;
}

export function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
export function escAttr(s: string): string {
  return s.replace(/[&"']/g, (c) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function node<T extends HTMLElement>(root: ParentNode, id: string): T {
  const el =
    $(`[data-node="${id}"]`, root) ??
    $(`[data-o="${id}"]`, root) ??
    (id === "put" ? $("[data-put]", root) : null) ??
    (id === "out" ? $("[data-out]", root) : null);
  if (!el) throw new Error(`Missing node: ${id}`);
  return el as T;
}
export function val(root: ParentNode, id: string): string {
  const el = node<HTMLInputElement>(root, id);
  return el.value;
}

export async function copyText(text: string, msg = "Copied!"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast(msg);
}

export function download(name: string, blob: Blob): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast("Downloaded!");
}

export function downloadText(name: string, text: string, type = "text/plain"): void {
  download(name, new Blob([text], { type }));
}

export const now = (): string => new Date().toLocaleTimeString();

export function toAb(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = -1;
  do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
  return v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2) + " " + units[i];
}

export function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return Number(n.toFixed(digits)).toLocaleString("en-US");
}