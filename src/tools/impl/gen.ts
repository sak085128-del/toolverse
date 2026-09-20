import type { ToolImpl } from "../types";
import { btn, btnRow, node, toast } from "../../lib/core";
import { USER_ADJ, USER_ANIMALS, hslToRgb, rgbToHex, hexToRgb, rgbToHsl } from "../../lib/data";
import { downloadText } from "../../lib/core";

const genTools: Record<string, ToolImpl> = {
  "favicon-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Letter or emoji</span><input data-node="glyph" type="text" value="T" maxlength="2"></label></div>
        <div class="col"><label class="field"><span>Background</span><input data-node="bg" type="color" value="#6366f1"></label></div>
        <div class="col"><label class="field"><span>Text</span><input data-node="fg" type="color" value="#ffffff"></label></div></div>
        <div class="row"><div class="col"><label class="field"><span>Size (px)</span><input data-node="size" type="number" value="64" min="16" max="512" step="16"></label></div>
        <div class="col"><label class="check field-block"><input data-node="rounded" type="checkbox" checked> Rounded corners</label></div></div>
      <div class="qr-wrap"><canvas data-canvas width="128" height="128"></canvas></div>
      <div class="mini-grid">
        <button type="button" class="card-mini" data-size="16">16</button><button type="button" class="card-mini" data-size="32">32</button>
        <button type="button" class="card-mini" data-size="48">48</button><button type="button" class="card-mini" data-size="64">64</button>
        <button type="button" class="card-mini" data-size="128">128</button><button type="button" class="card-mini" data-size="180">180</button>
        <button type="button" class="card-mini" data-size="192">192</button><button type="button" class="card-mini" data-size="512">512</button></div>` +
      btn("Download PNG", "dl") + statusBoxShort("st"),
    init: (root) => {
      const canvas = root.querySelector<HTMLCanvasElement>("[data-canvas]");
      const draw = () => {
        if (!canvas) return;
        const s = Math.max(16, Math.min(512, parseInt(node<HTMLInputElement>(root, "size").value) || 64));
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const bg = node<HTMLInputElement>(root, "bg").value;
        const fg = node<HTMLInputElement>(root, "fg").value;
        const glyph = node<HTMLInputElement>(root, "glyph").value || "T";
        const rad = (root.querySelector("[data-node='rounded']") as HTMLInputElement).checked;
        ctx.save();
        if (rad) { ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.closePath(); ctx.clip(); }
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = fg;
        ctx.font = "900 178px system-ui, -apple-system, 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(glyph.slice(0, 2), 128, 130);
        ctx.restore();
        (canvas as HTMLCanvasElement & { dataset: Record<string, string> }).dataset.size = String(s);
      };
      root.querySelectorAll<HTMLInputElement>("[data-node='glyph'],[data-node='bg'],[data-node='fg'],[data-node='size'],[data-node='rounded']").forEach((i) => i.addEventListener("input", draw));
      root.querySelectorAll<HTMLElement>("[data-size]").forEach((b) => b.addEventListener("click", () => { node<HTMLInputElement>(root, "size").value = b.dataset.size || "64"; draw(); }));
      root.querySelector<any>("[data-node='dl']")?.addEventListener("click", () => {
        if (!canvas) return;
        const s = parseInt((canvas as HTMLCanvasElement & { dataset: Record<string, string> }).dataset.size || "64", 10);
        const out = document.createElement("canvas");
        out.width = s; out.height = s;
        out.getContext("2d")?.drawImage(canvas, 0, 0, s, s);
        const a = document.createElement("a");
        a.href = out.toDataURL("image/png");
        a.download = `favicon-${s}x${s}.png`;
        a.click();
        toast("Downloaded!");
      });
      draw();
    },
  },

  "username-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Style</span><select data-node="style"><option value="adj" selected>Adjective + Animal</option><option value="cc">camelCase</option><option value="num">Adjective + Number</option><option value="emoji">Animal + Number</option></select></label></div>
        <div class="col"><label class="field"><span>Count</span><input data-node="n" type="number" value="8" min="1" max="50"></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>
      <div class="username-list" data-put></div>` +
      btnRow(btn("Copy all", "copy"), btn("Save .txt", "save")),
    init: (root) => {
      const make = (style: string): string => {
        const a = USER_ADJ[Math.floor(Math.random() * USER_ADJ.length)];
        const b = USER_ANIMALS[Math.floor(Math.random() * USER_ANIMALS.length)];
        const num = Math.floor(Math.random() * 999);
        const sep = Math.random() < 0.5 ? "_" : "-";
        switch (style) {
          case "cc": return a + b + (Math.random() < 0.4 ? num : "");
          case "num": return a + sep + num;
          case "emoji": return b + num;
          default: return a + sep + b + (Math.random() < 0.5 ? sep + num : "");
        }
      };
      const gen = () => {
        const style = (root.querySelector("[data-node='style']") as HTMLSelectElement).value;
        const n = Math.max(1, Math.min(50, parseInt(node<HTMLInputElement>(root, "n").value) || 8));
        const list = root.querySelector<HTMLElement>("[data-put]");
        if (!list) return;
        const seen = new Set<string>();
        const all: string[] = [];
        while (all.length < n) {
          const u = make(style);
          if (!seen.has(u)) { seen.add(u); all.push(u); }
        }
        list.innerHTML = all.map((u) => `<div class="uname"><code>${escapeHtml(u)}</code><button type="button" class="btn mini" data-c="1">Copy</button></div>`).join("");
        list.querySelectorAll<HTMLElement>("[data-c]").forEach((b, i) => b.addEventListener("click", () => {
          void navigator.clipboard.writeText(all[i]).then(() => toast("Copied!"));
        }));
        return all.join("\n");
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", gen);
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", () => {
        const items = [...(root.querySelectorAll<HTMLElement>("[data-put] code"))].map((c) => c.textContent).join("\n");
        void navigator.clipboard.writeText(items).then(() => toast("Copied!"));
      });
      root.querySelector<any>("[data-node='save']")?.addEventListener("click", () => {
        const items = [...(root.querySelectorAll<HTMLElement>("[data-put] code"))].map((c) => c.textContent).join("\n");
        downloadText("usernames.txt", items);
      });
      gen();
    },
  },

  "color-palette-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Base colour</span><input data-node="base" type="color" value="#6366f1"></label></div>
        <div class="col"><label class="field"><span>Harmony</span><select data-node="harm"><option value="analogous">Analogous</option><option value="complementary">Complementary</option><option value="triadic">Triadic</option><option value="tetradic">Tetradic</option><option value="mono">Monochromatic</option></select></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>
      <div class="palette" data-put></div>
      <div class="btn-row"><button type="button" class="btn mini" data-copyhex>Copy HEX</button><button type="button" class="btn mini" data-dl>Download CSS</button></div>`,
    init: (root) => {
      const gen = (hex: string, harm: string): string[] => {
        const base = hexToRgb(hex);
        if (!base) return [];
        const [h, s] = rgbToHsl(base[0], base[1], base[2]);
        const hues: number[] = {
          analogous: [h, (h + 30) % 360, (h + 60) % 360, (h - 30 + 360) % 360, (h - 60 + 360) % 360],
          complementary: [h, (h + 180) % 360, (h + 195) % 360, (h + 165) % 360, (h + 60) % 360],
          triadic: [h, (h + 120) % 360, (h + 240) % 360, (h + 140) % 360, (h + 260) % 360],
          tetradic: [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360, (h + 45) % 360],
          mono: [h, h, h, h, h],
        }[harm] ?? [h, h, h, h, h];
        const lums = harm === "mono" ? [58, 40, 70, 50, 62] : [52, 60, 45, 65, 40];
        return hues.map((hu, i) => rgbToHex(...hslToRgb(Math.round(hu), Math.round(Math.max(35, Math.min(80, s))), lums[i])));
      };
      const render = () => {
        const base = node<HTMLInputElement>(root, "base").value;
        const harm = (root.querySelector("[data-node='harm']") as HTMLSelectElement).value;
        const put = root.querySelector<HTMLElement>("[data-put]");
        if (!put) return;
        const palette = gen(base, harm);
        put.dataset.palette = JSON.stringify(palette);
        put.innerHTML = palette.map((c) => `<div class="swatch"><i style="background:${c}"></i><span>${c}</span></div>`).join("");
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", render);
      root.querySelector<any>("[data-copyhex]")?.addEventListener("click", () => {
        const p = JSON.parse(root.querySelector<HTMLElement>("[data-put]")?.dataset.palette || "[]") as string[];
        void navigator.clipboard.writeText(p.join(", ")).then(() => toast("HEX values copied"));
      });
      root.querySelector<any>("[data-dl]")?.addEventListener("click", () => {
        const p = JSON.parse(root.querySelector<HTMLElement>("[data-put]")?.dataset.palette || "[]") as string[];
        const css = p.map((c, i) => `--color-${i + 1}: ${c};`).join("\n");
        downloadText("palette.css", css);
      });
      render();
    },
  },

  "css-background-patterns": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Pattern</span><select data-node="pattern">
          <option value="stripes">Diagonal stripes</option><option value="dots">Dots</option>
          <option value="checker">Checkerboard</option><option value="grid">Grid lines</option>
          <option value="zigzag">Zig-zag</option><option value="moire">Moire rings</option></select></label></div>
        <div class="col"><label class="field"><span>Colour A</span><input data-node="a" type="color" value="#6366f1"></label></div>
        <div class="col"><label class="field"><span>Colour B</span><input data-node="b" type="color" value="#0ea5e9"></label></div></div>
        <div class="row"><div class="col"><label class="field"><span>Size</span><input data-node="size" type="range" min="8" max="120" value="32"></label></div></div>
      <div class="pattern-preview" data-prev></div>
      <div class="result"><span class="label">CSS</span><pre class="value mono" data-out></pre></div>` +
      btn("Copy CSS", "copy") + statusBoxShort("st"),
    init: (root) => {
      const render = () => {
        const p = (root.querySelector("[data-node='pattern']") as HTMLSelectElement).value;
        const a = node<HTMLInputElement>(root, "a").value;
        const b = node<HTMLInputElement>(root, "b").value;
        const size = parseInt(node<HTMLInputElement>(root, "size").value, 10);
        let css = "";
        let prev = "";
        switch (p) {
          case "stripes":
            css = `background: repeating-linear-gradient(\n  45deg,\n  ${a} 0px,\n  ${a} ${size / 2}px,\n  ${b} ${size / 2}px,\n  ${b} ${size}px\n);`;
            prev = css; break;
          case "dots":
            css = `background: radial-gradient(${b} 30%, transparent 31%); background-size: ${size}px ${size}px; background-color: ${a};`;
            prev = css; break;
          case "checker":
            css = `background: conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0); background-size: ${size * 2}px ${size * 2}px;`;
            prev = css; break;
          case "grid":
            css = `background:\n  linear-gradient(${b} 1px, transparent 1px),\n  linear-gradient(90deg, ${b} 1px, transparent 1px),\n  linear-gradient(${a} 0 100%) 0 0 / 100% 100%;\nbackground-size: ${size}px ${size}px, ${size}px ${size}px, ${size}px ${size}px;`;
            prev = css; break;
          case "zigzag":
            css = `background: linear-gradient(135deg, ${a} 25%, transparent 25%) -${size}px 0 / ${size * 2}px ${size * 2}px, linear-gradient(225deg, ${a} 25%, transparent 25%) -${size}px 0 / ${size * 2}px ${size * 2}px, linear-gradient(315deg, ${a} 25%, transparent 25%) ${size}px 0 / ${size * 2}px ${size * 2}px, linear-gradient(45deg, ${a} 25%, ${b} 25%) ${size}px 0 / ${size * 2}px ${size * 2}px;`;
            prev = css; break;
          case "moire":
            css = `background: repeating-radial-gradient(circle, ${a} 0 ${size / 4}px, ${b} ${size / 4}px ${size}px);`;
            prev = css; break;
        }
        const out = root.querySelector<HTMLElement>("[data-out]");
        const prevEl = root.querySelector<HTMLElement>("[data-prev]");
        if (out) { out.textContent = css; }
        if (prevEl) { prevEl.style.background = prev; prevEl.style.backgroundSize = `${size * 2}px ${size * 2}px`; }
      };
      root.querySelectorAll<HTMLElement>("[data-node='pattern'],[data-node='a'],[data-node='b'],[data-node='size']").forEach((el) => el.addEventListener("input", render));
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", () => void navigator.clipboard.writeText(root.querySelector<HTMLElement>("[data-out]")?.textContent || "").then(() => toast("Copied!")));
      render();
    },
  },

  "calendar-year-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>Year</span><input data-node="year" type="number" value="${new Date().getFullYear()}" min="1900" max="2200"></label></div>
        <div class="col"><label class="field"><span>View</span><select data-node="view"><option value="months">Month grid</option><option value="year">Year overview</option></select></label></div>
        <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Generate</button></div></div>
      <div class="calendar" data-put></div>` + btn("Print / Save", "print"),
    init: (root) => {
      const render = () => {
        const year = Math.max(1900, Math.min(2200, parseInt(node<HTMLInputElement>(root, "year").value) || new Date().getFullYear()));
        const view = (root.querySelector("[data-node='view']") as HTMLSelectElement).value;
        const put = root.querySelector<HTMLElement>("[data-put]");
        if (!put) return;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (view === "year") {
          put.innerHTML = `<div class="year-grid">${months.map((m, i) => {
            const first = new Date(year, i, 1);
            const days = new Date(year, i + 1, 0).getDate();
            const offset = first.getDay();
            let cells = Array(offset).fill("").map(() => `<span class="cl"></span>`).join("");
            for (let d = 1; d <= days; d++) cells += `<span class="cl${d === 1 ? " first" : ""}">${d}</span>`;
            return `<div class="ymonth"><h4>${m}</h4><div class="ygrid">${cells}</div></div>`;
          }).join("")}</div>`;
        } else {
          put.innerHTML = months.map((m, i) => {
            const first = new Date(year, i, 1);
            const days = new Date(year, i + 1, 0).getDate();
            const offset = first.getDay();
            const wd = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => `<span class="cw">${d}</span>`).join("");
            let cells = Array(offset).fill("").map(() => `<span></span>`).join("");
            for (let d = 1; d <= days; d++) cells += `<span class="${today(year, i, d) ? "today" : ""}">${d}</span>`;
            return `<div class="mth"><h4>${m} ${year}</h4><div class="grid">${wd}${cells}</div></div>`;
          }).join("");
        }
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", render);
      root.querySelector<any>("[data-node='print']")?.addEventListener("click", () => window.print());
      render();
    },
  },

  "random-number-generator": {
    markup: () => `<div class="row">
        <div class="col"><label class="field"><span>From</span><input data-node="min" type="number" value="1"></label></div>
        <div class="col"><label class="field"><span>To</span><input data-node="max" type="number" value="100"></label></div>
        <div class="col"><label class="field"><span>How many</span><input data-node="n" type="number" value="5" min="1" max="100"></label></div></div>
      <div class="checks"><label class="check"><input data-node="unique" type="checkbox" checked> Unique</label><label class="check"><input data-node="sort" type="checkbox"> Sort ascending</label></div>
      <button type="button" class="btn primary" data-node="go">Generate</button>
      <div class="big-nums" data-put></div>`,
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const min = Math.floor(parseFloat(node<HTMLInputElement>(root, "min").value) || 0);
        const max = Math.floor(parseFloat(node<HTMLInputElement>(root, "max").value) || 100);
        const n = Math.max(1, Math.min(100, parseInt(node<HTMLInputElement>(root, "n").value) || 1));
        const uniq = (root.querySelector("[data-node='unique']") as HTMLInputElement).checked;
        const sort = (root.querySelector("[data-node='sort']") as HTMLInputElement).checked;
        const put = root.querySelector<HTMLElement>("[data-put]");
        if (!put) return;
        if (min > max) { toast("Min must be <= max"); return; }
        if (uniq && max - min + 1 < n) { toast("Range too small for unique values"); return; }
        const set = new Set<number>();
        while (set.size < n) set.add(min + Math.floor(Math.random() * (max - min + 1)));
        const arr = [...set];
        if (sort) arr.sort((a, b) => a - b);
        put.textContent = arr.join("  ");
      });
    },
  },

  "event-countdown-generator": {
    markup: () => `<div class="row">
        <div class="col col-wide"><label class="field"><span>Event date &amp; time</span><input data-node="dt" type="datetime-local"></label></div>
        <div class="col"><label class="field"><span>Label</span><input data-node="label" type="text" value="Launch"></label></div></div>
      <div class="count-wrap" data-put></div>
      <div class="btn-row"><button type="button" class="btn mini" data-cp>Copy link</button></div>`,
    init: (root) => {
      const el = node<HTMLInputElement>(root, "dt");
      const fromUrl = new URLSearchParams(location.search).get("until") || "";
      if (fromUrl) el.value = new Date(Number(fromUrl)).toISOString().slice(0, 16);
      else el.value = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 16);
      const render = () => {
        const put = root.querySelector<HTMLElement>("[data-put]");
        if (!put) return;
        const t = new Date(el.value).getTime();
        if (Number.isNaN(t)) { put.textContent = "Set a date."; return; }
        const diff = t - Date.now();
        const abs = Math.abs(diff);
        const d = Math.floor(abs / 86400000);
        const h = Math.floor((abs % 86400000) / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        const s = Math.floor((abs % 60000) / 1000);
        const past = diff < 0;
        put.innerHTML = `<div class="count"><b>${node<HTMLInputElement>(root, "label").value || "Countdown"}</b>
          <div class="cnum">${pad(d)}<i>days</i></div><div class="cnum">${pad(h)}<i>hrs</i></div><div class="cnum">${pad(m)}<i>min</i></div><div class="cnum">${pad(s)}<i>sec</i></div>
          <p>${past ? "Time has passed!" : "Countdown live"}</p></div>`;
      };
      el.addEventListener("change", render);
      root.querySelector<any>("[data-cp]")?.addEventListener("click", () => {
        const t = new Date(el.value).getTime();
        const url = `${location.origin}${location.pathname}?until=${t}`;
        void navigator.clipboard.writeText(url).then(() => toast("Countdown link copied"));
      });
      setInterval(render, 1000);
      render();
    },
  },
};

export default genTools;

function statusBoxShort(id: string, msg = "Ready."): string {
  return `<div class="status" data-node="${id}">${msg}</div>`;
}
function today(y: number, m: number, d: number): boolean {
  const n = new Date();
  return n.getFullYear() === y && n.getMonth() === m && n.getDate() === d;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}