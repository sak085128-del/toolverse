import type { ToolImpl } from "../types";
import { btn, btnRow, copyBtn, node, results, result, toast } from "../../lib/core";
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrastRatio, luminance } from "../../lib/data";
import { NAMED_COLORS, nearestColor } from "../../lib/image";

const colorTools: Record<string, ToolImpl> = {
  "color-picker": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Pick a color</span><input data-node="pick" type="color" value="#6366f1"></label></div>
      <div class="col"><label class="field"><span>HEX</span><input data-node="hex" type="text" value="#6366f1" spellcheck="false"></label></div>
      <div class="col"><label class="field"><span>Hue</span><input data-node="hue" type="range" min="0" max="360" value="238"></label></div></div>
      <div class="color-preview" data-prev style="background:#6366f1"></div>` +
      results(result("RGB", `<b data-o="rgb">—</b>`), result("HSL", `<b data-o="hsl">—</b>`), result("Closest name", `<b data-o="name">—</b>`)) +
      btnRow(copyBtn("Copy HEX", ""), btn("Random", "rand")),
    init: (root) => {
      const pick = node<HTMLInputElement>(root, "pick");
      const hex = node<HTMLInputElement>(root, "hex");
      const hue = node<HTMLInputElement>(root, "hue");
      const prev = root.querySelector<HTMLElement>("[data-prev]");
      const sync = (rgb?: [number, number, number]) => {
        const c = rgb ?? hexToRgb(hex.value);
        if (!c) return;
        const HX = rgbToHex(c[0], c[1], c[2]);
        hex.value = HX;
        pick.value = HX;
        const hsl = rgbToHsl(c[0], c[1], c[2]);
        hue.value = String(hsl[0]);
        if (prev) {
          prev.style.background = HX;
          prev.style.borderColor = "transparent";
          (prev as HTMLElement).style.boxShadow = `0 0 0 2px ${HX}`;
        }
        node(root, "rgb").textContent = `${c[0]}, ${c[1]}, ${c[2]}`;
        node(root, "hsl").textContent = `${hsl[0]}°, ${hsl[1]}%, ${hsl[2]}%`;
        node(root, "name").textContent = nearestColor(c, NAMED_COLORS);
        const cp = root.querySelector<HTMLElement>("[data-copy]");
        if (cp) cp.setAttribute("data-copy", HX);
      };
      pick.addEventListener("input", () => sync(hexToRgb(pick.value) ?? undefined));
      hex.addEventListener("input", () => sync());
      hue.addEventListener("input", () => {
        const rgb = hslToRgb(parseFloat(hue.value), 80, 50);
        sync(rgb);
      });
      root.querySelector<any>("[data-node='rand']")?.addEventListener("click", () => {
        const rgb = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)] as [number, number, number];
        sync(rgb);
      });
      sync();
    },
  },

  "color-converter": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>HEX</span><input data-node="hex" type="text" value="#663399" spellcheck="false"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Convert</button></div></div>
      <div class="color-preview" data-prev style="background:#663399"></div>` +
      results(result("RGB", `<input readonly data-o="rgb" spellcheck="false">`), result("HSL", `<input readonly data-o="hsl" spellcheck="false">`), result("Known as", `<b data-o="name">—</b>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const hex = node<HTMLInputElement>(root, "hex").value.trim();
        const rgb = hexToRgb(hex);
        if (!rgb) { toast("Invalid HEX value"); return; }
        const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        node<HTMLInputElement>(root, "rgb").value = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        node<HTMLInputElement>(root, "hsl").value = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
        node(root, "name").textContent = nearestColor(rgb, NAMED_COLORS);
        const p = root.querySelector<HTMLElement>("[data-prev]");
        if (p) p.style.background = rgbToHex(rgb[0], rgb[1], rgb[2]);
      });
    },
  },

  "color-mixer": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Color A</span><input data-node="a" type="color" value="#ff6600"></label></div>
      <div class="col"><label class="field"><span>Color B</span><input data-node="b" type="color" value="#0033ff"></label></div>
      <div class="col"><label class="field"><span>Mix</span><input data-node="m" type="range" min="0" max="100" value="50"></label></div></div>
      <div class="color-preview" data-prev></div>` +
      results(result("Blend", `<b data-o="out" class="mono">—</b>`), result("Shade (darken)", `<b data-o="dark" class="mono">—</b>`), result("Tint (lighten)", `<b data-o="light" class="mono">—</b>`)),
    init: (root) => {
      const mix = () => {
        const a = hexToRgb(node<HTMLInputElement>(root, "a").value);
        const b = hexToRgb(node<HTMLInputElement>(root, "b").value);
        const t = parseInt(node<HTMLInputElement>(root, "m").value) / 100;
        if (!a || !b) return;
        const s2l = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const l2s = (v: number) => { const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, c)) * 255); };
        const bl = a.map((v, i) => l2s(s2l(v) + (s2l(b[i]) - s2l(v)) * t)) as [number, number, number];
        const dark = a.map((v) => Math.round(v * 0.6)) as [number, number, number];
        const light = a.map((v) => Math.round(v + (255 - v) * 0.6)) as [number, number, number];
        const out = rgbToHex(bl[0], bl[1], bl[2]);
        const p = root.querySelector<HTMLElement>("[data-prev]");
        if (p) p.style.background = out;
        node(root, "out").textContent = out.toUpperCase();
        node(root, "dark").textContent = rgbToHex(dark[0], dark[1], dark[2]).toUpperCase();
        node(root, "light").textContent = rgbToHex(light[0], light[1], light[2]).toUpperCase();
      };
      root.querySelectorAll<HTMLInputElement>("[data-node='a'],[data-node='b'],[data-node='m']").forEach((i) => i.addEventListener("input", mix));
      mix();
    },
  },

  "color-contrast": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Text color</span><input data-node="fg" type="color" value="#1e293b"></label></div>
      <div class="col"><label class="field"><span>Background</span><input data-node="bg" type="color" value="#ffffff"></label></div></div>
      <div class="color-preview contrast-box" data-prev><span>Sample text</span></div>` +
      results(result("Contrast ratio", `<b data-o="ratio" class="big-num">—</b>`), result("WCAG AA (normal text)", `<b data-o="aa">—</b>`), result("WCAG AAA", `<b data-o="aaa">—</b>`), result("Large text AA", `<b data-o="aal">—</b>`)),
    init: (root) => {
      const calc = () => {
        const fg = hexToRgb(node<HTMLInputElement>(root, "fg").value);
        const bg = hexToRgb(node<HTMLInputElement>(root, "bg").value);
        if (!fg || !bg) return;
        const ratio = contrastRatio(luminance(fg[0], fg[1], fg[2]), luminance(bg[0], bg[1], bg[2]));
        const p = root.querySelector<HTMLElement>("[data-prev]");
        if (p) { p.style.background = node<HTMLInputElement>(root, "bg").value; p.style.color = node<HTMLInputElement>(root, "fg").value; }
        const ok = ratio >= 4.5, okAa = ratio >= 3, okAaa = ratio >= 7;
        setOk(root, "aa", ok);
        setOk(root, "aal", okAa);
        setOk(root, "aaa", okAaa);
        node(root, "ratio").textContent = ratio.toFixed(2) + ":1";
      };
      root.querySelectorAll<HTMLInputElement>("[data-node='fg'],[data-node='bg']").forEach((i) => i.addEventListener("input", calc));
      calc();
    },
  },

  "color-name": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Color (HEX or RGB)</span><input data-node="hex" type="text" value="#e2e8f0" spellcheck="false"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Find name</button></div></div>
      <div class="color-preview" data-prev></div>` +
      results(result("Nearest CSS name", `<b data-o="name" class="big-num">—</b>`), result("Exact HEX", `<b data-o="hexOut" class="mono">—</b>`)) +
      copyBtn("Copy name", ""),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        let v = node<HTMLInputElement>(root, "hex").value.trim();
        const m = v.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        const rgb = m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] as [number, number, number] : hexToRgb(v);
        if (!rgb) { toast("Invalid color"); return; }
        const name = nearestColor(rgb, NAMED_COLORS);
        node(root, "name").textContent = name;
        node(root, "hexOut").textContent = rgbToHex(rgb[0], rgb[1], rgb[2]).toUpperCase();
        const p = root.querySelector<HTMLElement>("[data-prev]");
        if (p) p.style.background = rgbToHex(rgb[0], rgb[1], rgb[2]);
        (root.querySelector("[data-copy]") as HTMLElement).dataset.copy = name;
      });
    },
  },
};

export default colorTools;

function setOk(root: HTMLElement, id: string, ok: boolean): void {
  const el = node<HTMLElement>(root, id);
  el.textContent = ok ? "Pass ✓" : "Fail ✗";
  el.style.color = ok ? "#22c55e" : "#dc2626";
}