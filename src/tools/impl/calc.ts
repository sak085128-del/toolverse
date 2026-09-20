import type { ToolImpl } from "../types";
import { formatNumber, node, result, results, toast } from "../../lib/core";
import { CONVERTERS, TEMPS } from "../../lib/data";

const calcTools: Record<string, ToolImpl> = {
  "percentage-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>What is</span><input data-node="v" type="number" value="15"></label></div>
      <div class="col"><label class="field"><span>% of</span><input data-node="t" type="number" value="200"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Calculate</button></div></div>` +
      results(result("Result", `<b data-o="r" class="big-num">—</b>`)) +
      `<div class="mini-grid">
        <button type="button" class="card-mini" data-t="5000|200">Sale event</button>
        <button type="button" class="card-mini" data-t="7|900">Tax</button>
        <button type="button" class="card-mini" data-t="10|250">Discount</button>
        <button type="button" class="card-mini" data-t="50|1000">Half</button>
      </div>`,
    init: (root) => {
      const calc = () => {
        const v = parseFloat(node<HTMLInputElement>(root, "v").value);
        const t = parseFloat(node<HTMLInputElement>(root, "t").value);
        if (Number.isNaN(v) || Number.isNaN(t)) { node(root, "r").textContent = "Enter numbers"; return; }
        node(root, "r").textContent = formatNumber((v / 100) * t, 4) + `  (${formatNumber(v, 0)}% of ${formatNumber(t, 2)})`;
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", calc);
      root.querySelectorAll<HTMLElement>("[data-t]").forEach((b) => b.addEventListener("click", () => {
        const [v, t] = (b.dataset.t || "1|1").split("|");
        node<HTMLInputElement>(root, "v").value = v;
        node<HTMLInputElement>(root, "t").value = t;
        calc();
      }));
    },
  },

  "bmi-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Height (cm)</span><input data-node="h" type="number" value="175" step="0.1"></label></div>
      <div class="col"><label class="field"><span>Weight (kg)</span><input data-node="w" type="number" value="70" step="0.1"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Calculate</button></div></div>
      <div class="bmi-scale"><div class="bmi-marks" data-marks></div><div class="bmi-arrow" data-arrow></div></div>` +
      results(result("BMI", `<b data-o="bmi" class="big-num">—</b>`), result("Category", `<b data-o="cat" class="big-num">—</b>`)),
    init: (root) => {
      const cat = (b: number): { name: string; color: string } => {
        if (b < 18.5) return { name: "Underweight", color: "#f59e0b" };
        if (b < 25) return { name: "Healthy weight", color: "#22c55e" };
        if (b < 30) return { name: "Overweight", color: "#ea580c" };
        return { name: "Obese", color: "#dc2626" };
      };
      const calc = () => {
        const h = parseFloat(node<HTMLInputElement>(root, "h").value) / 100;
        const w = parseFloat(node<HTMLInputElement>(root, "w").value);
        if (!h || !w) { node(root, "bmi").textContent = "—"; return; }
        const bmi = w / (h * h);
        const c = cat(bmi);
        node(root, "bmi").textContent = bmi.toFixed(1);
        node(root, "cat").textContent = c.name;
        node(root, "cat").style.color = c.color;
        const arrow = root.querySelector<HTMLElement>("[data-arrow]");
        const marks = root.querySelector<HTMLElement>("[data-marks]");
        if (arrow && marks) {
          arrow.style.left = `${Math.max(2, Math.min(98, ((bmi - 14) / 27) * 100))}%`;
          arrow.style.background = c.color;
          marks.innerHTML = `<span style="left:17%">18.5</span><span style="left:40%">25</span><span style="left:63%">30</span><span style="left:86%">35+</span>`;
        }
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", calc);
      calc();
    },
  },

  "loan-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Loan amount</span><input data-node="p" type="number" value="20000"></label></div>
      <div class="col"><label class="field"><span>Annual interest (%)</span><input data-node="r" type="number" value="5.5" step="0.1"></label></div>
      <div class="col"><label class="field"><span>Years</span><input data-node="y" type="number" value="5" min="1"></label></div></div>
      <button type="button" class="btn primary" data-node="go">Calculate</button>` +
      results(result("Monthly payment", `<b data-o="m" class="big-num">—</b>`), result("Total paid", `<b data-o="tp">—</b>`), result("Total interest", `<b data-o="ti">—</b>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const p = parseFloat(node<HTMLInputElement>(root, "p").value);
        const r = parseFloat(node<HTMLInputElement>(root, "r").value) / 100 / 12;
        const n = parseFloat(node<HTMLInputElement>(root, "y").value) * 12;
        if (!p || !n || Number.isNaN(r)) { node(root, "m").textContent = "—"; return; }
        const m = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        node(root, "m").textContent = "$" + formatNumber(m, 2);
        node(root, "tp").textContent = "$" + formatNumber(m * n, 2);
        node(root, "ti").textContent = "$" + formatNumber(m * n - p, 2);
      });
    },
  },

  "age-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Date of birth</span><input data-node="dob" type="date"></label></div>
      <div class="col"><label class="field"><span>At date</span><input data-node="at" type="date"></label></div></div>
      <button type="button" class="btn primary" data-node="go">Calculate age</button>` +
      results(result("Age", `<b data-o="a" class="big-num">—</b>`), result("Total days", `<b data-o="d">—</b>`), result("Next birthday in", `<b data-o="nb">—</b>`)),
    init: (root) => {
      const el = node<HTMLInputElement>(root, "dob");
      const at = node<HTMLInputElement>(root, "at");
      const today = new Date();
      at.value = at.value || today.toISOString().slice(0, 10);
      const cal = () => {
        if (!el.value) { toast("Pick a date of birth"); return; }
        const birth = new Date(el.value);
        const on = at.value ? new Date(at.value) : today;
        if (on < birth) { node(root, "a").textContent = "Future DOB?"; return; }
        let y = on.getFullYear() - birth.getFullYear();
        let m = on.getMonth() - birth.getMonth();
        let d = on.getDate() - birth.getDate();
        if (d < 0) { m--; d += new Date(on.getFullYear(), on.getMonth(), 0).getDate(); }
        if (m < 0) { y--; m += 12; }
        const days = Math.floor((on.getTime() - birth.getTime()) / 86400000);
        node(root, "a").textContent = `${y} years, ${m} months, ${d} days`;
        node(root, "d").textContent = formatNumber(days, 0);
        let nb = new Date(birth.getFullYear() + y, birth.getMonth(), birth.getDate());
        if (nb <= on) nb = new Date(birth.getFullYear() + y + 1, birth.getMonth(), birth.getDate());
        const left = Math.ceil((nb.getTime() - on.getTime()) / 86400000);
        node(root, "nb").textContent = `${formatNumber(left, 0)} days`;
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", cal);
      cal();
    },
  },

  "discount-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Original price</span><input data-node="op" type="number" value="120"></label></div>
      <div class="col"><label class="field"><span>Discount (%)</span><input data-node="dp" type="number" value="25"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="go">Calculate</button></div></div>` +
      results(result("You save", `<b data-o="s" class="big-num">$—</b>`), result("Final price", `<b data-o="f" class="big-num">$—</b>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const op = parseFloat(node<HTMLInputElement>(root, "op").value);
        const dp = parseFloat(node<HTMLInputElement>(root, "dp").value);
        if (Number.isNaN(op)) return;
        const save = (op * dp) / 100;
        node(root, "s").textContent = "$" + formatNumber(save, 2);
        node(root, "f").textContent = "$" + formatNumber(op - save, 2);
      });
    },
  },

  "tip-calculator": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Bill total</span><input data-node="bill" type="number" value="86.40" step="0.01"></label></div>
      <div class="col"><label class="field"><span>Tip (%)</span><input data-node="tip" type="number" value="18"></label></div>
      <div class="col"><label class="field"><span>People</span><input data-node="ppl" type="number" value="3" min="1"></label></div></div>
      <div class="mini-grid">
        <button type="button" class="card-mini" data-t="10">10%</button><button type="button" class="card-mini" data-t="15">15%</button>
        <button type="button" class="card-mini" data-t="18">18%</button><button type="button" class="card-mini" data-t="20">20%</button></div>
      <button type="button" class="btn primary" data-node="go">Calculate</button>` +
      results(result("Tip per person", `<b data-o="tipAmt">—</b>`), result("Total per person", `<b data-o="per">—</b>`), result("Grand total", `<b data-o="total">—</b>`)),
    init: (root) => {
      const cal = () => {
        const bill = parseFloat(node<HTMLInputElement>(root, "bill").value);
        const tip = parseFloat(node<HTMLInputElement>(root, "tip").value);
        const ppl = Math.max(1, parseInt(node<HTMLInputElement>(root, "ppl").value) || 1);
        if (Number.isNaN(bill)) return;
        const tipAmt = (bill * tip) / 100;
        node(root, "tipAmt").textContent = "$" + formatNumber(tipAmt / ppl, 2);
        node(root, "per").textContent = "$" + formatNumber((bill + tipAmt) / ppl, 2);
        node(root, "total").textContent = "$" + formatNumber(bill + tipAmt, 2);
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", cal);
      root.querySelectorAll<HTMLElement>("[data-t]").forEach((b) => b.addEventListener("click", () => {
        node<HTMLInputElement>(root, "tip").value = b.dataset.t || "18"; cal();
      }));
      cal();
    },
  },

  "unit-converter": {
    markup: () => `<div class="row">
      <div class="col"><label class="field"><span>Category</span><select data-node="cat">${Object.entries(CONVERTERS).map(([id, c]) => `<option value="${id}">${c.label}</option>`).join("")}<option value="temperature">Temperature</option></select></label></div>
      <div class="col"><label class="field"><span>Value</span><input data-node="v" type="number" value="1"></label></div>
      <div class="col"><button type="button" class="btn primary btn-btm" data-node="swap">⇅ Swap</button></div></div>
      <div class="row">
        <div class="col"><label class="field"><span>From</span><select data-node="from"></select></label></div>
        <div class="col"><label class="field"><span>To</span><select data-node="to"></select></label></div>
      </div>
      <button type="button" class="btn primary" data-node="go">Convert</button>` +
      results(result("Result", `<b data-o="r" class="big-num">—</b>`)),
    init: (root) => {
      const cat = node<HTMLSelectElement>(root, "cat");
      const from = node<HTMLSelectElement>(root, "from");
      const to = node<HTMLSelectElement>(root, "to");
      const unitOptions = (): string => {
        const c = CONVERTERS[cat.value];
        if (cat.value === "temperature") return TEMPS.map((t) => `<option value="${t.code}">${t.label}</option>`).join("");
        return c.units.map(([n]) => `<option value="${n}">${n}</option>`).join("");
      };
      const populate = () => {
        from.innerHTML = unitOptions();
        if (cat.value === "temperature") { from.value = "c"; to.innerHTML = unitOptions(); to.value = "f"; }
        else { to.innerHTML = from.innerHTML; const s = from.value; if ([...to.options].some((o) => o.value === s)) to.value = s; else to.selectedIndex = Math.min(1, to.options.length - 1); }
      };
      cat.addEventListener("change", populate);
      const conv = () => {
        const v = parseFloat(node<HTMLInputElement>(root, "v").value);
        const c = CONVERTERS[cat.value];
        if (!c || !v || !isFinite(v)) { node(root, "r").textContent = "—"; return; }
        let out: number;
        if (cat.value === "temperature") {
          const toC = (code: string, val: number): number => code === "c" ? val : code === "f" ? (val - 32) * 5 / 9 : val - 273.15;
          const fromC = (code: string, val: number): number => code === "c" ? val : code === "f" ? val * 9 / 5 + 32 : val + 273.15;
          out = fromC(to.value, toC(from.value, v));
        } else if (cat.value === "fuel") {
          const toL100 = (u: string, val: number): number =>
            u === "Liters per 100km" ? val : u === "Miles per gallon (US)" ? 235.214583 / val : 100 / val;
          out = toL100(to.value, toL100(from.value, v));
        } else {
          const a = c.units.find(([n]) => n === from.value)?.[1];
          const b = c.units.find(([n]) => n === to.value)?.[1];
          if (a == null || b == null) return;
          out = (v * a) / b;
        }
        node(root, "r").textContent = formatNumber(out, 6);
      };
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", conv);
      root.querySelector<any>("[data-node='swap']")?.addEventListener("click", () => { const t = from.value; from.value = to.value; to.value = t; conv(); });
      populate();
    },
  },

  "triangle-calculator": {
    markup: () => `<p class="hint">For a right-angled triangle, enter two values (legs, or leg + hypotenuse).</p>
      <div class="row">
        <div class="col"><label class="field"><span>Side a</span><input data-node="a" type="number" value="3"></label></div>
        <div class="col"><label class="field"><span>Side b</span><input data-node="b" type="number" value="4"></label></div>
        <div class="col"><label class="field"><span>Hypotenuse c (optional)</span><input data-node="c" type="number"></label></div>
      </div>
      <button type="button" class="btn primary" data-node="go">Calculate</button>` +
      results(result("Area", `<b data-o="area">—</b>`), result("Perimeter", `<b data-o="peri">—</b>`), result("Hypotenuse / third side", `<b data-o="hyp">—</b>`), result("Angles", `<b data-o="ang">—</b>`)),
    init: (root) => {
      root.querySelector<any>("[data-node='go']")?.addEventListener("click", () => {
        const a = parseFloat(node<HTMLInputElement>(root, "a").value);
        const b = parseFloat(node<HTMLInputElement>(root, "b").value);
        const c = parseFloat(node<HTMLInputElement>(root, "c").value);
        if ((Number.isNaN(a) || Number.isNaN(b)) && Number.isNaN(c)) { toast("Enter complete values"); return; }
        let A = a, B = b, C = c;
        if (Number.isNaN(A)) { A = Math.sqrt(C * C - B * B); }
        if (Number.isNaN(B)) { B = Math.sqrt(C * C - A * A); }
        if (Number.isNaN(C)) { C = Math.sqrt(A * A + B * B); }
        if (A <= 0 || B <= 0 || C <= 0 || C <= 0) { toast("Invalid triangle"); return; }
        node(root, "area").textContent = formatNumber((A * B) / 2, 4);
        node(root, "peri").textContent = formatNumber(A + B + C, 4);
        node(root, "hyp").textContent = formatNumber(C, 4);
        const opposite = Math.asin(A / C) * 180 / Math.PI;
        node(root, "ang").textContent = `${formatNumber(opposite, 1)}° / ${formatNumber(90, 0)}° / ${formatNumber(90 - opposite, 1)}°`;
      });
    },
  },
};

export default calcTools;