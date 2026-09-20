export function ean13Bars(data: string): { bars: number[]; text: string } {
  const L: Record<string, string> = {
    "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101", "4": "0100011",
    "5": "0110001", "6": "0101111", "7": "0111011", "8": "0110111", "9": "0001011",
  };
  const G: Record<string, string> = {
    "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001", "4": "0011101",
    "5": "0111001", "6": "0000101", "7": "0010001", "8": "0001001", "9": "0010111",
  };
  const R: Record<string, string> = {
    "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010", "4": "1011100",
    "5": "1001110", "6": "1010000", "7": "1000100", "8": "1001000", "9": "1110100",
  };
  const parity: Record<string, string> = {
    "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL", "4": "LGLLGG",
    "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG", "8": "LGLGGL", "9": "LGGLGL",
  };

  const clean = data.replace(/\D/g, "");
  let digits = clean.slice(0, 12).padEnd(12, "0");
  let check = 0;
  for (let i = 0; i < 12; i++) check += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  check = (10 - (check % 10)) % 10;
  digits += String(check);

  const p = parity[digits[0]] ?? "LLLLLL";
  let modules = "101";
  for (let i = 0; i < 6; i++) modules += (p[i] === "L" ? L : G)[digits[i + 1]];
  modules += "01010";
  for (let i = 6; i < 12; i++) modules += R[digits[i + 1]];
  modules += "101";

  const bars: number[] = [];
  for (const m of modules) bars.push(m === "1" ? 1 : 0);
  return {
    bars,
    text: `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7, 13)}`,
  };
}

export function drawBarcode(canvas: HTMLCanvasElement, bars: number[]): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const scale = (canvas.width - 40) / bars.length;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  bars.forEach((b, i) => {
    if (b === 1) ctx.fillRect(20 + Math.floor(i * scale), 8, Math.max(1, Math.ceil(scale)), canvas.height - 48);
  });
  ctx.fillStyle = "#333";
  ctx.font = `${Math.round(canvas.height * 0.11)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.fillText("", canvas.width / 2, canvas.height - 14);
}