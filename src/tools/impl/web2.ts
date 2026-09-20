import type { ToolImpl } from "../types";
import { btn, btnRow, copyText, node, statusBox, textarea, toast } from "../../lib/core";
import { privacyNote } from "../../lib/ui";

export const web2: Record<string, ToolImpl> = {
  "html-headings-extractor": {
    markup: () =>
      textarea("html", "HTML source with headings", "<h1>Site</h1>\n<h2>Projects</h2>\n<h3>ToolVerse</h3>", 8) +
      btnRow(btn("Extract", "go", true), btn("Copy", "copy")) +
      `<pre class="mono" data-out></pre>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const extract = (): string => {
        const html = node<HTMLTextAreaElement>(root, "html").value || "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        const hs = doc.querySelectorAll("h1,h2,h3,h4,h5,h6");
        const lines: string[] = [];
        hs.forEach((h, i) => {
          const lvl = parseInt(h.tagName.charAt(1), 10);
          lines.push(`${"  ".repeat(lvl - 1)}${i + 1}. [h${lvl}] ${(h.textContent || "(empty)").trim().replace(/\s+/g, " ")}`);
        });
        return lines.join("\n");
      };
      node<HTMLTextAreaElement>(root, "html").addEventListener("input", () => {
        node(root, "out").textContent = extract();
      });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const r = extract();
        node(root, "out").textContent = r || "(no headings found)";
        toast(r ? "Extracted " + r.length + " lines" : "No headings");
      });
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", () => {
        const t = node(root, "out").textContent || "";
        if (t && !t.startsWith("(")) copyText(t, "Outline copied");
        else toast("Nothing to copy");
      });
    },
  },

  "sitemap-validator": {
    markup: () =>
      `<label class="field"><span>Sitemap URL (or paste XML below)</span><input data-node="src" type="text" placeholder="https://example.com/sitemap.xml"></label>` +
      textarea("xml", "Sitemap XML (optional)", "", 8) +
      btnRow(btn("Validate", "go", true)) +
      `<pre class="mono" data-out></pre>` + statusBox("st") +
      `<details class="tips"><summary>What is validated</summary>XML well-formedness, the urlset container and xmlns, non-empty loc, valid absolute URLs, and optional lastmod format.</details>` + privacyNote(),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        let xml = node<HTMLTextAreaElement>(root, "xml").value.trim();
        const src = node<HTMLInputElement>(root, "src").value.trim();
        const out = node(root, "out");
        if (!xml && src) {
          node(root, "st").textContent = "Fetching sitemap…";
          try {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            xml = await res.text();
          } catch {
            out.textContent = "Could not fetch the URL (browser CORS or network). Paste the XML instead.";
            node(root, "st").textContent = "Fetch failed.";
            return;
          }
        }
        if (!xml.trim()) { toast("Provide a URL or XML"); return; }
        node(root, "st").textContent = "Validating…";
        try {
          const doc = new DOMParser().parseFromString(xml, "application/xml");
          const err = doc.querySelector("parsererror");
          if (err) {
            out.textContent = "Not well-formed XML:\n" + (err.textContent || "").trim();
            node(root, "st").textContent = "Invalid XML.";
            return;
          }
          const locs = [...doc.querySelectorAll("url > loc")].map((l) => l.textContent || "");
          const urls = [...doc.querySelectorAll("url")];
          const badLoc = locs.filter((l) => !/^https?:\/\/[^\s]+$/i.test(l.trim())).length;
          const emptyLoc = urls.filter((u) => !(u.querySelector("loc")?.textContent || "").trim()).length;
          const badLastmod = urls.filter((u) => {
            const lm = u.querySelector("lastmod")?.textContent || "";
            return lm.trim() && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:?\d{2}|Z)?)?$/i.test(lm.trim());
          }).length;
          const lines = [
            `Well-formed    yes`,
            `Entries        ${urls.length}`,
            `Empty <loc>    ${emptyLoc}`,
            `Invalid <loc>  ${badLoc}`,
            `Bad lastmod    ${badLastmod}`,
            `Namespace      ${doc.documentElement.getAttribute("xmlns") ? "present" : "missing (optional)"}`,
            "",
            "First URLs:",
            ...locs.slice(0, 8).map((l) => "  " + (l || "(empty)")),
          ];
          out.textContent = lines.join("\n");
          node(root, "st").textContent = "Done.";
        } catch (e) {
          out.textContent = "Validation failed: " + (e instanceof Error ? e.message : "unknown");
          node(root, "st").textContent = "Error.";
        }
      });
    },
  },

  "robots-txt-generator": {
    markup: () =>
      `<label class="field"><span>User-agent</span><input data-node="ua" type="text" value="*"></label>
      <label class="field"><span>Disallow paths (one per line)</span><textarea data-node="dis" placeholder="/admin/" rows="3"></textarea></label>
      <label class="field"><span>Allow paths (one per line)</span><textarea data-node="al" placeholder="" rows="2"></textarea></label>
      <div class="row"><div class="col"><label class="field"><span>Sitemap URL</span><input data-node="sitemap" type="text" placeholder="https://example.com/sitemap.xml"></label></div>
      <div class="col"><label class="field"><span>Crawl delay (s, optional)</span><input data-node="delay" type="number" min="0"></label></div></div>` +
      btnRow(btn("Generate", "go", true), btn("Copy", "copy")) +
      `<pre class="mono" data-out></pre>` + statusBox("st") + privacyNote(),
    init: (root) => {
      const gen = (): string => {
        const ua = (node<HTMLInputElement>(root, "ua").value || "*").trim();
        const dis = node<HTMLTextAreaElement>(root, "dis").value.split("\n").map((s) => s.trim()).filter(Boolean);
        const al = node<HTMLTextAreaElement>(root, "al").value.split("\n").map((s) => s.trim()).filter(Boolean);
        const sitemap = node<HTMLInputElement>(root, "sitemap").value.trim();
        const delay = node<HTMLInputElement>(root, "delay").value.trim();
        const lines: string[] = [`User-agent: ${ua}`];
        for (const p of al) lines.push(`Allow: ${p}`);
        for (const p of dis) lines.push(`Disallow: ${p}`);
        if (delay) lines.push(`Crawl-delay: ${delay}`);
        lines.push("");
        if (sitemap) lines.push(`Sitemap: ${sitemap}`);
        const out = lines.join("\n");
        node(root, "out").textContent = out;
        return out;
      };
      root.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => {
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => gen());
      });
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", async () => { await copyText(gen(), "robots.txt copied"); });
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => { gen(); toast("Generated"); });
    },
  },

  "webpage-metadata-extractor": {
    markup: () =>
      `<label class="field"><span>Page URL (or leave blank and paste HTML)</span><input data-node="src" type="text" placeholder="https://example.com"></label>` +
      textarea("html", "HTML source (optional)", "", 8) +
      btnRow(btn("Extract", "go", true), btn("Copy", "copy")) +
      `<pre class="mono" data-out></pre>` + statusBox("st") +
      `<details class="tips"><summary>About remote URLs</summary>Many sites block cross-origin browser fetches. If a URL fails, paste the page's HTML instead — everything else is parsed locally.</details>` + privacyNote(),
    init: (root) => {
      const extract = (html: string): string => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const meta = (name: string): string | null => {
          const el = doc.querySelector(`meta[name="${name}"]`) || doc.querySelector(`meta[property="${name}"]`);
          return el?.getAttribute("content")?.trim() || null;
        };
        const title = doc.querySelector("title")?.textContent?.trim() || null;
        const desc = meta("description");
        const ogTitle = meta("og:title");
        const ogImage = meta("og:image");
        const ogUrl = meta("og:url") || doc.querySelector("link[rel='canonical']")?.getAttribute("href")?.trim() || null;
        const tw = meta("twitter:card");
        const robots = meta("robots");
        const links = doc.querySelectorAll("a[href]").length;
        const imgs = doc.querySelectorAll("img").length;
        const h1s = [...doc.querySelectorAll("h1")].map((x) => x.textContent?.trim()).filter(Boolean);
        const lines: string[] = [];
        const kv = (k: string, v: string | null) => lines.push(`${k.padEnd(12)} ${v ?? "(missing)"}`);
        kv("Title", title);
        kv("Description", desc);
        kv("OG title", ogTitle);
        kv("OG image", ogImage);
        kv("OG/Canonical", ogUrl);
        kv("Twitter card", tw);
        kv("Robots", robots);
        kv("Links", String(links));
        kv("Images", String(imgs));
        kv("H1 count", String(h1s.length));
        if (h1s.length) lines.push("", "H1 headings:", ...h1s.map((x) => "  " + x));
        return lines.join("\n");
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", async () => {
        const html = node<HTMLTextAreaElement>(root, "html").value;
        const src = node<HTMLInputElement>(root, "src").value.trim();
        const out = node(root, "out");
        if (html.trim()) {
          out.textContent = extract(html);
          node(root, "st").textContent = "Parsed local HTML.";
          return;
        }
        if (!/^https?:\/\/.+/i.test(src)) { toast("Provide a URL or paste HTML"); return; }
        node(root, "st").textContent = "Fetching…";
        try {
          const res = await fetch(src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          out.textContent = extract(text);
          node(root, "st").textContent = "Fetched and parsed.";
        } catch {
          out.textContent = "Could not fetch the URL (CORS or network). Paste the page's HTML instead.";
          node(root, "st").textContent = "Fetch failed.";
        }
      });
      root.querySelector<any>("[data-node='copy']")?.addEventListener("click", async () => {
        const t = node(root, "out").textContent || "";
        if (t) await copyText(t, "Output copied");
        else toast("Extract first");
      });
    },
  },
};export default web2;
