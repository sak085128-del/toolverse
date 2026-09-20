import type { ToolImpl } from "../types";
import { btn, btnRow, checkRow, copyText, escAttr, escHtml, node, statusBox, toast } from "../../lib/core";
import { privacyNote } from "../../lib/ui";

export const web1: Record<string, ToolImpl> = {
  "meta-tag-generator": {
    markup: () =>
      `<div class="row"><div class="col"><label class="field"><span>Page title</span><input data-node="title" type="text" value="My Page"></label></div>
      <div class="col"><label class="field"><span>Description</span><input data-node="desc" type="text" placeholder="A short summary"></label></div></div>
      <div class="row"><div class="col"><label class="field"><span>Keywords</span><input data-node="kw" type="text" placeholder="one, two, three"></label></div>
      <div class="col"><label class="field"><span>Canonical URL</span><input data-node="canon" type="text" placeholder="https://example.com/page"></label></div></div>
      <div class="row"><div class="col"><label class="field"><span>Open Graph image</span><input data-node="ogimg" type="text" placeholder="https://example.com/og.png"></label></div>
      <div class="col"><label class="field"><span>Twitter card</span><select data-node="tw"><option value="">(none)</option><option>summary</option><option>summary_large_image</option><option>app</option><option>player</option></select></label></div></div>
      <div class="fix-row">
        <label class="field"><span>Favicon URL</span><input data-node="fav" type="text" placeholder="https://example.com/favicon.ico"></label></div>
      <div class="checks">${checkRow("og", "Open Graph tags", true)}${checkRow("twitter", "Twitter card tags", true)}</div>` +
      btnRow(btn("Generate", "go", true), btn("Copy", "copy")) +
      `<pre class="mono" data-out></pre>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const gen = (): string => {
        const t = node<HTMLInputElement>(root, "title").value.trim();
        const d = node<HTMLInputElement>(root, "desc").value.trim();
        const k = node<HTMLInputElement>(root, "kw").value.trim();
        const c = node<HTMLInputElement>(root, "canon").value.trim();
        const oi = node<HTMLInputElement>(root, "ogimg").value.trim();
        const fav = node<HTMLInputElement>(root, "fav").value.trim();
        const tw = (root.querySelector("[data-node='tw']") as HTMLSelectElement).value;
        const og = root.querySelector<HTMLInputElement>("[data-node='og']")!.checked;
        const twc = root.querySelector<HTMLInputElement>("[data-node='twitter']")!.checked;
        const lines: string[] = [];
        if (t) lines.push(`<title>${escHtml(t)}</title>`);
        if (d) lines.push(`<meta name="description" content="${escAttr(d)}">`);
        if (k) lines.push(`<meta name="keywords" content="${escAttr(k)}">`);
        if (fav) lines.push(`<link rel="icon" href="${escAttr(fav)}">`);
        if (c) lines.push(`<link rel="canonical" href="${escAttr(c)}">`);
        if (og) {
          lines.push(`<meta property="og:type" content="website">`);
          if (t) lines.push(`<meta property="og:title" content="${escAttr(t)}">`);
          if (d) lines.push(`<meta property="og:description" content="${escAttr(d)}">`);
          if (c) lines.push(`<meta property="og:url" content="${escAttr(c)}">`);
          if (oi) lines.push(`<meta property="og:image" content="${escAttr(oi)}">`);
        }
        if (twc) {
          if (tw) lines.push(`<meta name="twitter:card" content="${escAttr(tw)}">`);
          if (t) lines.push(`<meta name="twitter:title" content="${escAttr(t)}">`);
          if (d) lines.push(`<meta name="twitter:description" content="${escAttr(d)}">`);
          if (oi) lines.push(`<meta name="twitter:image" content="${escAttr(oi)}">`);
        }
        const out = lines.length ? lines.join("\n") : "<!-- start typing to generate meta tags -->";
        node(root, "out").textContent = out;
        return out;
      };
      root.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => el.addEventListener("input", gen));
      root.querySelectorAll<HTMLSelectElement>("[data-node='tw']").forEach((el) => el.addEventListener("change", gen));
      root.querySelector<HTMLInputElement>("[data-node='og']")!.addEventListener("change", gen);
      root.querySelector<HTMLInputElement>("[data-node='twitter']")!.addEventListener("change", gen);
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", async () => {
        const text = gen();
        if (text.startsWith("<!--")) { toast("Fill in the fields first"); return; }
        await copyText(text, "Meta tags copied");
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => { gen(); toast("Generated"); });
    },
  },

  "ssl-checker": {
    markup: () =>
      `<label class="field"><span>Domain (no scheme)</span><input data-node="domain" type="text" placeholder="example.com"></label>
      <div class="checks">${checkRow("loose", "Report TLS failures instead of hiding them", false)}</div>` +
      btnRow(btn("Check", "go", true)) +
      `<pre class="mono" data-out></pre>` + statusBox("st") +
      `<details class="tips"><summary>How this works</summary>Checks run from your browser, which itself negotiates TLS to reach any https URL. Full chain/certificate detail checks need a server-side test — this shows what your browser can observe.</details>` + privacyNote(),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const domain = node<HTMLInputElement>(root, "domain").value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) { toast("Enter a valid domain"); return; }
        node(root, "st").textContent = `Connecting to ${domain}…`;
        const out = node(root, "out");
        try {
          const res = await fetch(`https://${domain}`, { method: "HEAD", mode: "cors" });
          const lines = [`Domain    ${domain}`, `TLS       OK (connected over HTTPS)`];
          if (res.statusText) lines.push(`Status    ${res.status} ${res.statusText}`);
          for (const k of ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"]) {
            lines.push(`${k.padEnd(12)} ${res.headers.get(k) ? "present" : "missing"}`);
          }
          const semi = lines.slice(2).filter((l) => l.includes("missing"));
          if (semi.length === 0 && lines.length <= 3) lines.push("Security headers: (none observable from CORS)");
          out.textContent = lines.join("\n");
          node(root, "st").textContent = "Connected securely.";
        } catch {
          const loose = root.querySelector<HTMLInputElement>("[data-node='loose']")!.checked;
          out.textContent =
            `Domain  ${domain}\nTLS     handshake failed from the browser.\n` +
            (loose
              ? "The server may block browser requests, lack SNI support,\nor have an invalid/expired certificate.\nUse a server-side checker for full chain details."
              : "An https connection could not be established.");
          node(root, "st").textContent = "HTTPS check failed.";
        }
      });
    },
  },
};export default web1;
