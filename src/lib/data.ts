export interface UnitDef { label: string; units: Record<string, number> }
export interface UnitCat { label: string; defs: UnitDef[]; t?: Record<string, number> }

type UnitEntry = [string, number][];
const L: UnitEntry = [
  ["Nanometers", 1e-9], ["Micrometers", 1e-6], ["Millimeters", 0.001], ["Centimeters", 0.01],
  ["Meters", 1], ["Kilometers", 1000], ["Inches", 0.0254], ["Feet", 0.3048],
  ["Yards", 0.9144], ["Miles", 1609.344], ["Nautical miles", 1852],
];
const W: UnitEntry = [
  ["Milligrams", 1e-6], ["Grams", 0.001], ["Kilograms", 1], ["Tons (metric)", 1000],
  ["Ounces", 0.028349523], ["Pounds", 0.45359237], ["Stones", 6.35029318],
];
const DAT: UnitEntry = [
  ["Bits", 0.125], ["Bytes", 1], ["Kilobytes (KB)", 1000], ["Megabytes (MB)", 1e6],
  ["Gigabytes (GB)", 1e9], ["Terabytes (TB)", 1e12], ["Petabytes (PB)", 1e15],
  ["Kibibytes (KiB)", 1024], ["Mebibytes (MiB)", 1048576], ["Gibibytes (GiB)", 1073741824],
  ["Tebibytes (TiB)", 1099511627776],
];
const SPD: UnitEntry = [
  ["Meters/second", 1], ["Kilometers/hour", 0.277778], ["Miles/hour", 0.44704],
  ["Feet/second", 0.3048], ["Knots", 0.514444], ["Mach (sea level)", 340.29],
];
const TIM: UnitEntry = [
  ["Milliseconds", 0.001], ["Seconds", 1], ["Minutes", 60], ["Hours", 3600],
  ["Days", 86400], ["Weeks", 604800],
];
const VOL: UnitEntry = [
  ["Milliliters", 0.000001], ["Liters", 0.001], ["Teaspoons", 4.92892e-6],
  ["Tablespoons", 1.47868e-5], ["Fluid ounces", 2.95735e-5], ["Cups", 0.000236588],
  ["Pints", 0.000473176], ["Quarts", 0.000946353], ["Gallons", 0.00378541],
];
const AREA: UnitEntry = [
  ["Square meters", 1], ["Square kilometers", 1e6], ["Square feet", 0.092903],
  ["Square yards", 0.836127], ["Square miles", 2589988.1], ["Acres", 4046.856],
  ["Hectares", 10000],
];
const FUEL: UnitEntry = [
  ["Miles per gallon (US)", 1], ["Kilometers per liter", 0.425144], ["Liters per 100km", 1],
];

export interface TempDef { label: string; conv: (v: number) => number; code: "c" | "f" | "k" }
export const TEMPS: TempDef[] = [
  { label: "Celsius", code: "c", conv: (v) => v },
  { label: "Fahrenheit", code: "f", conv: (v) => v * 9 / 5 + 32 },
  { label: "Kelvin", code: "k", conv: (v) => v + 273.15 },
];

export const CONVERTERS: Record<string, { label: string; units: UnitEntry }> = {
  length: { label: "Length", units: L },
  weight: { label: "Weight & mass", units: W },
  data: { label: "Data storage", units: DAT },
  speed: { label: "Speed", units: SPD },
  time: { label: "Time", units: TIM },
  volume: { label: "Volume", units: VOL },
  area: { label: "Area", units: AREA },
  fuel: { label: "Fuel economy", units: FUEL },
};

export const STATUS_CODES: Record<string, { title: string; group: string }> = {
  "100": { title: "Continue", group: "1xx Informational" },
  "101": { title: "Switching Protocols", group: "1xx Informational" },
  "102": { title: "Processing", group: "1xx Informational" },
  "103": { title: "Early Hints", group: "1xx Informational" },
  "200": { title: "OK", group: "2xx Success" },
  "201": { title: "Created", group: "2xx Success" },
  "202": { title: "Accepted", group: "2xx Success" },
  "203": { title: "Non-Authoritative Information", group: "2xx Success" },
  "204": { title: "No Content", group: "2xx Success" },
  "205": { title: "Reset Content", group: "2xx Success" },
  "206": { title: "Partial Content", group: "2xx Success" },
  "207": { title: "Multi-Status", group: "2xx Success" },
  "300": { title: "Multiple Choices", group: "3xx Redirection" },
  "301": { title: "Moved Permanently", group: "3xx Redirection" },
  "302": { title: "Found", group: "3xx Redirection" },
  "303": { title: "See Other", group: "3xx Redirection" },
  "304": { title: "Not Modified", group: "3xx Redirection" },
  "307": { title: "Temporary Redirect", group: "3xx Redirection" },
  "308": { title: "Permanent Redirect", group: "3xx Redirection" },
  "400": { title: "Bad Request", group: "4xx Client Error" },
  "401": { title: "Unauthorized", group: "4xx Client Error" },
  "402": { title: "Payment Required", group: "4xx Client Error" },
  "403": { title: "Forbidden", group: "4xx Client Error" },
  "404": { title: "Not Found", group: "4xx Client Error" },
  "405": { title: "Method Not Allowed", group: "4xx Client Error" },
  "406": { title: "Not Acceptable", group: "4xx Client Error" },
  "407": { title: "Proxy Authentication Required", group: "4xx Client Error" },
  "408": { title: "Request Timeout", group: "4xx Client Error" },
  "409": { title: "Conflict", group: "4xx Client Error" },
  "410": { title: "Gone", group: "4xx Client Error" },
  "411": { title: "Length Required", group: "4xx Client Error" },
  "412": { title: "Precondition Failed", group: "4xx Client Error" },
  "413": { title: "Payload Too Large", group: "4xx Client Error" },
  "414": { title: "URI Too Long", group: "4xx Client Error" },
  "415": { title: "Unsupported Media Type", group: "4xx Client Error" },
  "416": { title: "Range Not Satisfiable", group: "4xx Client Error" },
  "417": { title: "Expectation Failed", group: "4xx Client Error" },
  "418": { title: "I'm a teapot", group: "4xx Client Error" },
  "422": { title: "Unprocessable Entity", group: "4xx Client Error" },
  "425": { title: "Too Early", group: "4xx Client Error" },
  "429": { title: "Too Many Requests", group: "4xx Client Error" },
  "431": { title: "Request Header Fields Too Large", group: "4xx Client Error" },
  "451": { title: "Unavailable For Legal Reasons", group: "4xx Client Error" },
  "500": { title: "Internal Server Error", group: "5xx Server Error" },
  "501": { title: "Not Implemented", group: "5xx Server Error" },
  "502": { title: "Bad Gateway", group: "5xx Server Error" },
  "503": { title: "Service Unavailable", group: "5xx Server Error" },
  "504": { title: "Gateway Timeout", group: "5xx Server Error" },
  "505": { title: "HTTP Version Not Supported", group: "5xx Server Error" },
  "507": { title: "Insufficient Storage", group: "5xx Server Error" },
  "508": { title: "Loop Detected", group: "5xx Server Error" },
};

export const LOREM_WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(
  " "
);

export const USER_ADJ =
  "cosmic sleek swift agile zen turbo shadow ruby neon cyber quiet loud velvet frost ember brisk bold smart flash crisp".split(
  " "
);
export const USER_ANIMALS =
  "fox wolf tiger eagle raven panda koala otter falcon lynx cougar sloth gecko heron bison weasel marmot crab".split(
  " "
);

export interface CronPreset { label: string; value: string }
export const CRON_PRESETS: CronPreset[] = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at noon", value: "0 12 * * *" },
  { label: "Weekly on Monday 09:00", value: "0 9 * * 1" },
  { label: "Monthly on the 1st 00:00", value: "0 0 1 * *" },
  { label: "Yearly on Jan 1 00:00", value: "0 0 1 1 *" },
  { label: "Weekdays 9am–5pm (hourly)", value: "0 9-17 * * 1-5" },
  { label: "Every 30 seconds (strict)", value: "*/30 * * * * *" },
];

export function cronDescribe(expr: string): string {
  const p = expr.trim().split(/\s+/);
  if (p.length < 5) return "Invalid cron expression — need 5 fields.";
  const m = p[0] === "*" ? "every minute" : `minute ${p[0]}`;
  const h = p[1] === "*" ? "of every hour" : `at hour ${p[1]}`;
  const d = p[2] === "*" ? "every day" : `only on day ${p[2]} of the month`;
  const mo = p[3] === "*" ? "of every month" : `in month ${p[3]}`;
  const w = p[4] === "*" ? "of the week" : `when weekday is ${p[4]}`;
  return `${cap(m)} ${h}, ${d} ${mo} ${w}.`;
}
function cap(s: string): string { return s[0].toUpperCase() + s.slice(1); }

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
export function luminance(r: number, g: number, b: number): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(L1: number, L2: number): number {
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

export const MD5_NOTE = "";