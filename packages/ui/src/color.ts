/**
 * Colour maths for cm-color-picker and cm-color-field (since 1.17.0): parse and write CSS colours and simple
 * gradients, convert between RGB, HSV and HSL. No DOM. Channels: r/g/b 0-255, h 0-360, s/v/l 0-100, a 0-1.
 */

export interface Rgba { r: number; g: number; b: number; a: number }
export interface Hsva { h: number; s: number; v: number; a: number }
export interface Hsla { h: number; s: number; l: number; a: number }
/** How the picker writes colours. `hex` is `#rrggbb`, or `#rrggbbaa` when the colour is see-through. */
export type ColorFormat = 'hex' | 'rgb' | 'hsl';
export interface GradientStop { color: Rgba; /** 0-100 */ position: number }
export interface Gradient {
  type: 'linear' | 'radial';
  /** Linear only: degrees, 0 = to top, 90 = to right. */
  angle: number;
  stops: GradientStop[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f; };

/** `#RGB`, `RRGGBB`, `#RRGGBB` (any case, spaces around) -> `#rrggbb`; anything else -> null. */
export function normalizeHex(text: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

function num(token: string, max: number): number | null {
  const m = /^(-?\d*\.?\d+(?:e-?\d+)?)(%)?$/i.exec(token.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] ? (n / 100) * max : n;
}
function hueOf(token: string): number | null {
  const m = /^(-?\d*\.?\d+)(deg|turn|rad|grad)?$/i.exec(token.trim());
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] ?? 'deg').toLowerCase();
  const deg = unit === 'turn' ? n * 360 : unit === 'rad' ? (n * 180) / Math.PI : unit === 'grad' ? n * 0.9 : n;
  return ((deg % 360) + 360) % 360;
}
/** `1 2 3 / 50%` or `1, 2, 3, 0.5` -> four tokens (alpha may be missing). */
function args(inner: string): string[] | null {
  const s = inner.trim();
  let parts: string[];
  if (s.includes(',')) parts = s.split(',').map((p) => p.trim());
  else {
    const [main, alpha] = s.split('/').map((p) => p.trim());
    parts = main.split(/\s+/);
    if (alpha !== undefined) parts.push(alpha);
  }
  return parts.length === 3 || parts.length === 4 ? parts : null;
}

/** Parses hex (3, 4, 6, 8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()` and `transparent`. Other text -> null. */
export function parseColor(text: string): Rgba | null {
  const t = (text ?? '').trim().toLowerCase();
  if (!t) return null;
  if (t === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(t);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 };
  }
  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(t);
  if (!fn) return null;
  const p = args(fn[2]);
  if (!p) return null;
  const a = p[3] === undefined ? 1 : num(p[3], 1);
  if (a === null) return null;
  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = p.slice(0, 3).map((x) => num(x, 255));
    if (r === null || g === null || b === null) return null;
    return { r: clamp(Math.round(r), 0, 255), g: clamp(Math.round(g), 0, 255), b: clamp(Math.round(b), 0, 255), a: clamp(round(a, 3), 0, 1) };
  }
  const h = hueOf(p[0]);
  const s = num(p[1].endsWith('%') ? p[1] : `${p[1]}%`, 100), l = num(p[2].endsWith('%') ? p[2] : `${p[2]}%`, 100);
  if (h === null || s === null || l === null) return null;
  return { ...hslToRgb({ h, s: clamp(s, 0, 100), l: clamp(l, 0, 100), a: 1 }), a: clamp(round(a, 3), 0, 1) };
}

export function rgbToHsv({ r, g, b, a }: Rgba): Hsva {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: max ? (d / max) * 100 : 0, v: max * 100, a };
}
export function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const S = s / 100, V = v / 100;
  const f = (n: number) => { const k = (n + h / 60) % 6; return V - V * S * Math.max(0, Math.min(k, 4 - k, 1)); };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255), a };
}
export function rgbToHsl({ r, g, b, a }: Rgba): Hsla {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min, l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: rgbToHsv({ r, g, b, a }).h, s: s * 100, l: l * 100, a };
}
export function hslToRgb({ h, s, l, a }: Hsla): Rgba {
  const S = s / 100, L = l / 100, k = (n: number) => (n + h / 30) % 12, A = S * Math.min(L, 1 - L);
  const f = (n: number) => L - A * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a };
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
/** `#rrggbb`, ignoring alpha. */
export const toHex6 = ({ r, g, b }: Rgba) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** Writes a colour: `#rrggbb` / `#rrggbbaa`, `rgb(46, 111, 175)` / `rgba(…, 0.5)`, `hsl(210, 58%, 43%)` / `hsla(…)`. */
export function formatColor(c: Rgba, format: ColorFormat = 'hex'): string {
  const a = round(clamp(c.a, 0, 1), 2), see = a < 1;
  if (format === 'rgb') return see ? `rgba(${c.r}, ${c.g}, ${c.b}, ${a})` : `rgb(${c.r}, ${c.g}, ${c.b})`;
  if (format === 'hsl') {
    const { h, s, l } = rgbToHsl(c);
    const body = `${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%`;
    return see ? `hsla(${body}, ${a})` : `hsl(${body})`;
  }
  return see ? `${toHex6(c)}${hex2(a * 255)}` : toHex6(c);
}

/** Splits on commas that aren't inside brackets. */
function topLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) { out.push(s.slice(start, i).trim()); start = i + 1; }
  }
  out.push(s.slice(start).trim());
  return out;
}
const SIDES: Record<string, number> = {
  'to top': 0, 'to top right': 45, 'to right top': 45, 'to right': 90, 'to bottom right': 135, 'to right bottom': 135,
  'to bottom': 180, 'to bottom left': 225, 'to left bottom': 225, 'to left': 270, 'to top left': 315, 'to left top': 315,
};

/**
 * Parses `linear-gradient(…)` and `radial-gradient(…)` with colours this file understands, an optional angle or
 * `to <side>` (linear) and an optional shape (radial, read as a circle from the centre). Stops without a position are
 * spread evenly. Returns null for anything else (repeating gradients, colour hints, two positions per stop).
 */
export function parseGradient(text: string): Gradient | null {
  const m = /^(linear|radial)-gradient\((.*)\)$/i.exec((text ?? '').trim());
  if (!m) return null;
  const type = m[1].toLowerCase() as Gradient['type'];
  const parts = topLevel(m[2]);
  let angle = 180;
  const first = parts[0]?.toLowerCase().replace(/\s+/g, ' ') ?? '';
  if (type === 'linear') {
    const deg = hueOf(first);
    if (deg !== null && /[a-z]/.test(first)) { angle = deg; parts.shift(); }
    else if (first in SIDES) { angle = SIDES[first]; parts.shift(); }
  } else if (/^(circle|ellipse|closest|farthest|at )/.test(first) && !parseColor(first.split(' ')[0])) parts.shift();
  const raw = parts.map((p) => {
    const sp = /^(.*?)(?:\s+(-?\d*\.?\d+)%)?$/.exec(p)!;
    return { color: parseColor(sp[1]), position: sp[2] === undefined ? undefined : clamp(parseFloat(sp[2]), 0, 100) };
  });
  if (raw.length < 2 || raw.some((s) => !s.color)) return null;
  const stops = raw.map((s, i) => ({ color: s.color!, position: s.position ?? round((i / (raw.length - 1)) * 100, 1) }));
  return { type, angle: Math.round(angle), stops };
}

/** Writes a gradient with stops sorted by position, e.g. `linear-gradient(90deg, #2e6faf 0%, #de0000 100%)`. */
export function formatGradient(g: Gradient, format: ColorFormat = 'hex'): string {
  const stops = [...g.stops].sort((a, b) => a.position - b.position)
    .map((s) => `${formatColor(s.color, format)} ${round(s.position, 1)}%`).join(', ');
  return g.type === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${Math.round(g.angle)}deg, ${stops})`;
}

/** The colour at `position` (0-100) along the gradient's stops, for a stop added by clicking the bar. */
export function colorAt(g: Gradient, position: number): Rgba {
  const s = [...g.stops].sort((a, b) => a.position - b.position);
  if (position <= s[0].position) return { ...s[0].color };
  for (let i = 1; i < s.length; i++) {
    if (position <= s[i].position) {
      const A = s[i - 1], B = s[i], t = (position - A.position) / ((B.position - A.position) || 1);
      const mix = (x: number, y: number) => x + (y - x) * t;
      return { r: Math.round(mix(A.color.r, B.color.r)), g: Math.round(mix(A.color.g, B.color.g)), b: Math.round(mix(A.color.b, B.color.b)), a: round(mix(A.color.a, B.color.a), 2) };
    }
  }
  return { ...s[s.length - 1].color };
}

/** Same colour (ignoring how it is written)? Gradients compare by their written form. */
export function sameColor(x: string, y: string): boolean {
  const a = parseColor(x), b = parseColor(y);
  if (a && b) return a.r === b.r && a.g === b.g && a.b === b.b && Math.abs(a.a - b.a) < 0.005;
  const ga = parseGradient(x), gb = parseGradient(y);
  return !!ga && !!gb && formatGradient(ga) === formatGradient(gb);
}

/** True for any value the picker can show: a colour or a gradient this file parses. */
export const isColorValue = (text: string) => !!parseColor(text) || !!parseGradient(text);
