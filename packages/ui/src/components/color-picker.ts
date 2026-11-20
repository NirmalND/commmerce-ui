import { html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import {
  type ColorFormat, type Gradient, type Hsva, type Rgba,
  colorAt, formatColor, formatGradient, hsvToRgb, parseColor, parseGradient, rgbToHsl, rgbToHsv, sameColor, toHex6, hslToRgb,
} from '../color.js';
import { type ColorSource, type ColorSwatch, localColorSource, pushRecent, MAX_RECENT } from '../color-source.js';
import './icon.js';

const strings = defineStrings('colorPicker', {
  /** Accessible name of the whole picker when it has no `aria-label`. */
  label: 'Colour picker',
  solid: 'Solid',
  gradient: 'Gradient',
  /** Accessible name of the saturation and brightness square, and how its value is read out. */
  area: 'Saturation and brightness',
  areaValue: 'Saturation {s}%, brightness {v}%',
  hue: 'Hue',
  opacity: 'Opacity',
  /** The colour format menu and its options. */
  format: 'Colour format',
  hex: 'Hex',
  rgb: 'RGB',
  hsl: 'HSL',
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  saturation: 'Saturation',
  lightness: 'Lightness',
  /** The browser's eyedropper button (shown only where the browser has one). */
  eyedropper: 'Pick a colour from the screen',
  /** Gradient controls. */
  gradientType: 'Gradient type',
  linear: 'Linear',
  radial: 'Radial',
  angle: 'Angle',
  stops: 'Gradient stops',
  stop: 'Stop {n}, {color} at {position}%',
  addStop: 'Add stop',
  removeStop: 'Remove stop',
  /** Headings of the swatch groups. */
  brand: 'Brand colours',
  recent: 'Recent',
  palette: 'Palette',
  /** Accessible name of a swatch: its name and value, or the value alone. */
  swatch: '{name}, {value}',
});
declare module '../localize.js' { interface CmStrings { colorPicker: typeof strings } }

/** The default palette (the hues of the Commmerce light theme), shared with cm-color-field. */
export const DEFAULT_PALETTE: ColorSwatch[] = [
  '#000000', '#707070', '#c9c9c9', '#de0000', '#ad5500', '#f1a953', '#ffc107', '#81bb47', '#3c7c00', '#5394d9', '#2e6faf', '#446beb',
].map((value) => ({ value }));

const FORMATS: ColorFormat[] = ['hex', 'rgb', 'hsl'];
const toSwatches = (list: Array<string | ColorSwatch> | undefined): ColorSwatch[] =>
  (list ?? []).flatMap((s) => {
    const o = typeof s === 'string' ? { value: s } : s;
    return o && typeof o.value === 'string' && (parseColor(o.value) || parseGradient(o.value)) ? [{ value: o.value.trim(), name: o.name }] : [];
  });

/**
 * Colour picker: a saturation and brightness square, hue and opacity sliders, the value as hex, RGB or HSL, the
 * browser's eyedropper, gradients, and swatches for the store's brand colours, the merchant's recent colours and a
 * palette. Use it inline in a panel, or let cm-color-field open it (`picker`).
 *
 * Brand and recent colours come from `brand-colors` / `recent-colors`, or from a `source`: `app.colors` (App
 * Bridge), `httpColorSource()` (your server, Colour API) or `localColorSource()`. Each committed colour that isn't
 * a brand or palette colour is added to the recents: through `source.addRecentColor`, or kept locally when
 * `recent-key` is set, and announced with `cm-recent-change` either way.
 * @element cm-color-picker
 * @fires input - While the colour changes (dragging, typing a complete value).
 * @fires change - When a colour is committed: a drag ends, a swatch is picked, a box is left or Enter pressed.
 * @fires cm-recent-change - `detail.colors`: the new recent list (newest first) after a commit added to it.
 * @csspart area - The saturation and brightness square.
 * @csspart swatch - Each swatch button.
 */
export class CmColorPicker extends CmLocalizedElement {
  static properties = {
    value: {},
    format: { reflect: true },
    formats: {},
    alpha: { type: Boolean },
    gradient: { type: Boolean },
    swatches: { type: Array },
    brandColors: { type: Array, attribute: 'brand-colors' },
    recentColors: { type: Array, attribute: 'recent-colors' },
    source: { attribute: false },
    recentKey: { attribute: 'recent-key' },
    maxRecent: { type: Number, attribute: 'max-recent' },
    eyedropper: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    _hsva: { state: true },
    _grad: { state: true },
    _stop: { state: true },
    _brand: { state: true },
    _recent: { state: true },
    _drafts: { state: true },
  };

  /** The colour: hex, `rgb()`, `hsl()` or, with `gradient`, a `linear-gradient()` / `radial-gradient()`. Empty for none. */
  value = '';
  /** How the value is written: `hex` (default), `rgb` or `hsl`. Changes when the merchant picks another format. */
  format: ColorFormat = 'hex';
  /** Formats the merchant may switch between, space separated. Default `hex rgb hsl`; one format hides the menu. */
  formats = 'hex rgb hsl';
  /** Shows the opacity slider. A see-through colour is written `#rrggbbaa`, `rgba()` or `hsla()`. */
  alpha = false;
  /** Adds Solid / Gradient tabs: linear or radial gradients with two or more stops. */
  gradient = false;
  /** The palette, as colours or `{ value, name }`. Default: 12 colours from the Commmerce tokens. `[]` hides it. */
  swatches?: Array<string | ColorSwatch>;
  /** The store's brand colours. Wins over `source`. In HTML, pass JSON. */
  brandColors?: Array<string | ColorSwatch>;
  /** Recent colours, newest first. Wins over `source`; update it from `cm-recent-change`. */
  recentColors?: string[];
  /** Where brand and recent colours come from (see the colour picker docs). */
  source?: ColorSource;
  /** Keeps recents in this browser under this key when there is no `source` (a `localColorSource`). */
  recentKey = '';
  /** How many recent colours to show. Default 16. */
  maxRecent = MAX_RECENT;
  /** Shows the eyedropper where the browser has one (Chrome and Edge on desktop). Default on. */
  eyedropper = true;
  /** Blocks interaction. */
  disabled = false;

  _hsva: Hsva = { h: 0, s: 0, v: 0, a: 1 };
  _grad: Gradient | null = null;
  _stop = 0;
  _brand: ColorSwatch[] = [];
  _recent: string[] = [];
  /** Text in a box while it differs from the colour, keyed by box. */
  _drafts: Record<string, string> = {};

  #id = nextId('cm-cp');
  /** The value this element wrote last, so an outside change is told apart from our own. */
  #written?: string;
  #loaded?: ColorSource;
  #local?: ColorSource;
  #drag: 'area' | number | null = null;

  static styles = [
    base,
    css`
      :host { display: block; inline-size: 272px; max-inline-size: 100%; color: var(--cm-text-default); font-size: var(--cm-font-size-13); }
      :host([disabled]) { opacity: 0.5; pointer-events: none; }
      .panel { display: flex; flex-direction: column; gap: var(--cm-space-12); }
      .checker {
        background-color: var(--cm-bg-surface);
        background-image: repeating-conic-gradient(var(--cm-border-subtle) 0 25%, transparent 0 50%);
        background-size: 8px 8px;
      }
      .tabs { display: flex; padding: 2px; gap: 2px; border-radius: var(--cm-radius-sm); background: var(--cm-bg-inset); }
      .tabs button {
        flex: 1; height: 28px; border: 0; border-radius: var(--cm-radius-xs); background: none; font: inherit; color: var(--cm-text-tertiary); cursor: pointer;
      }
      .tabs button[aria-checked='true'] { background: var(--cm-bg-surface); color: var(--cm-text-default); font-weight: 500; box-shadow: var(--cm-shadow-sm); }
      .tabs button:focus-visible, button:focus-visible, select:focus-visible, .area:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .area {
        position: relative; height: 160px; border-radius: var(--cm-radius-sm); touch-action: none; cursor: crosshair;
        background-image: linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent); /* scale-exempt: colour data, not theme */
      }
      .thumb {
        position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: var(--cm-radius-full); pointer-events: none;
        border: 2px solid white; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4), inset 0 0 0 1px rgb(0 0 0 / 0.4); /* scale-exempt: visible on any colour */
      }
      .sliders { display: flex; align-items: center; gap: var(--cm-space-12); }
      .sliders .stack { flex: 1; display: flex; flex-direction: column; gap: var(--cm-space-12); min-width: 0; }
      .preview { position: relative; flex: none; width: 32px; height: 32px; border-radius: var(--cm-radius-full); overflow: hidden; border: var(--cm-border-1) solid var(--cm-border-subtle); }
      .preview span, .sw span { position: absolute; inset: 0; }
      input[type='range'] {
        -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 12px; margin: 0; border-radius: var(--cm-radius-full);
        background: var(--track); cursor: pointer; border: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      input[type='range'].hue { --track: linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red); } /* scale-exempt: hue track */
      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none; width: 16px; height: 16px; border-radius: var(--cm-radius-full);
        border: 2px solid white; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4); background: transparent; /* scale-exempt: visible on any colour */
      }
      input[type='range']::-moz-range-thumb {
        width: 12px; height: 12px; border-radius: var(--cm-radius-full);
        border: 2px solid white; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4); background: transparent; /* scale-exempt: visible on any colour */
      }
      input[type='range']:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .alpha-wrap { position: relative; border-radius: var(--cm-radius-full); }
      .row { display: flex; align-items: center; gap: var(--cm-space-8); }
      .row > * { min-width: 0; }
      select, .box {
        height: 32px; padding: 0 var(--cm-space-8); font: inherit; font-size: var(--cm-font-size-13); font-variant-numeric: tabular-nums;
        color: var(--cm-text-default); background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input);
        border-radius: var(--cm-radius-sm); box-sizing: border-box; outline: none;
      }
      select { flex: none; padding-inline-end: var(--cm-space-4); cursor: pointer; }
      .box { flex: 1; width: 100%; }
      .box.num { padding: 0 var(--cm-space-4); text-align: center; -moz-appearance: textfield; }
      .box::-webkit-inner-spin-button { -webkit-appearance: none; }
      .box:hover:not(:focus), select:hover { border-color: var(--cm-border-strong); }
      .box:focus { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .box[aria-invalid='true'] { border-color: var(--cm-border-critical); }
      .boxes { flex: 1; display: flex; gap: var(--cm-space-4); }
      .icon-btn {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm); background: var(--cm-bg-surface); color: var(--cm-text-default); cursor: pointer;
      }
      .icon-btn:hover { background: var(--cm-bg-inset); }
      .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .bar { position: relative; height: 24px; margin: 0 8px; border-radius: var(--cm-radius-xs); cursor: copy; border: var(--cm-border-1) solid var(--cm-border-subtle); }
      .bar .fill { position: absolute; inset: 0; border-radius: inherit; }
      .handle {
        position: absolute; top: -4px; width: 16px; height: 32px; margin-inline-start: -8px; padding: 0; cursor: grab; touch-action: none;
        border-radius: var(--cm-radius-xs); border: 2px solid var(--cm-bg-surface); box-shadow: 0 0 0 1px var(--cm-border-strong);
      }
      .handle[aria-current='true'] { box-shadow: 0 0 0 2px var(--cm-border-strong); }
      .group { display: flex; flex-direction: column; gap: var(--cm-space-8); }
      .group h3 { margin: 0; font-size: var(--cm-font-size-12); line-height: 16px; font-weight: 500; color: var(--cm-text-tertiary); }
      .sws { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); }
      .sw {
        position: relative; width: 24px; height: 24px; padding: 0; overflow: hidden; cursor: pointer; border-radius: var(--cm-radius-full);
        border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .sw[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--cm-bg-surface), 0 0 0 4px var(--cm-border-strong); }
      .sw:focus-visible { outline-offset: 4px; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#loadSources();
  }

  /** Formats the merchant may choose. */
  get allowedFormats(): ColorFormat[] {
    const list = String(this.formats ?? '').split(/[\s,]+/).filter((f): f is ColorFormat => FORMATS.includes(f as ColorFormat));
    return list.length ? list : ['hex'];
  }
  /** The palette in use. */
  get palette(): ColorSwatch[] { return this.swatches ? toSwatches(this.swatches) : DEFAULT_PALETTE; }
  /** Brand colours in use (`brand-colors`, else from `source`). */
  get brand(): ColorSwatch[] { return this.brandColors ? toSwatches(this.brandColors) : this._brand; }
  /** Recent colours in use (`recent-colors`, else from `source` / `recent-key`), without gradients unless `gradient`. */
  get recent(): string[] {
    const list = (this.recentColors ?? this._recent).filter((c) => parseColor(c) || (this.gradient && parseGradient(c)));
    return list.filter((c) => this.alpha || (parseColor(c)?.a ?? 1) === 1).slice(0, this.maxRecent || MAX_RECENT);
  }

  #store(): ColorSource | undefined {
    if (this.source) return this.source;
    if (!this.recentKey) return undefined;
    return (this.#local ??= localColorSource(this.recentKey));
  }

  async #loadSources() {
    const src = this.#store();
    if (!src || src === this.#loaded) return;
    this.#loaded = src;
    const [brand, recent] = await Promise.allSettled([src.brandColors?.() ?? Promise.resolve([]), src.recentColors?.() ?? Promise.resolve([])]);
    if (this.#loaded !== src) return;
    if (brand.status === 'fulfilled' && Array.isArray(brand.value)) this._brand = toSwatches(brand.value);
    if (recent.status === 'fulfilled' && Array.isArray(recent.value)) this._recent = recent.value.filter((c) => typeof c === 'string');
  }

  willUpdate(changed: PropertyValues<this>) {
    if (changed.has('recentKey')) this.#local = undefined;
    if (changed.has('source') || changed.has('recentKey')) this.#loadSources();
    if (changed.has('format') && !this.allowedFormats.includes(this.format)) this.format = this.allowedFormats[0];
    if (changed.has('value') && this.value !== this.#written) this.#readValue();
  }

  /** Reads `value` into the editing state. */
  #readValue() {
    const v = (this.value ?? '').trim();
    const g = this.gradient ? parseGradient(v) : null;
    if (g) {
      this._grad = g;
      this._stop = Math.min(this._stop, g.stops.length - 1);
      this.#setHsvaFrom(g.stops[this._stop].color);
    } else {
      this._grad = null;
      const c = parseColor(v);
      if (c) this.#setHsvaFrom(c);
    }
    if (/^rgba?\(/i.test(v) && this.allowedFormats.includes('rgb')) this.format = 'rgb';
    else if (/^hsla?\(/i.test(v) && this.allowedFormats.includes('hsl')) this.format = 'hsl';
    this._drafts = {};
  }

  /** Keeps the hue (and saturation) when the colour is grey or black, so the square doesn't jump. */
  #setHsvaFrom(c: Rgba) {
    const n = rgbToHsv(c);
    if (n.s === 0 || n.v === 0) n.h = this._hsva.h;
    if (n.v === 0) n.s = this._hsva.s;
    this._hsva = { ...n, a: this.alpha ? c.a : 1 };
  }

  get #rgba(): Rgba { return hsvToRgb(this._hsva); }

  /** Writes the current state to `value` and fires `input`. */
  #write(emitChange = false) {
    let next: string;
    if (this._grad) {
      const stops = this._grad.stops.map((s, i) => (i === this._stop ? { ...s, color: this.#rgba } : s));
      this._grad = { ...this._grad, stops };
      next = formatGradient(this._grad, this.format);
    } else next = formatColor(this.#rgba, this.format);
    const changed = next !== this.value;
    this.#written = next;
    this.value = next;
    if (changed) this.#emit('input');
    if (emitChange) this.#commit();
  }

  #emit(type: 'input' | 'change') { this.dispatchEvent(new Event(type, { bubbles: true, composed: true })); }

  /** Fires `change` and remembers the colour as recent unless it is a brand or palette colour. */
  #commit() {
    this.#emit('change');
    const v = this.value;
    if (!v || [...this.brand, ...this.palette].some((s) => sameColor(s.value, v))) return;
    const before = this.recentColors ?? this._recent;
    if (before[0] && sameColor(before[0], v)) return;
    const next = pushRecent(before, v, Math.max(this.maxRecent || MAX_RECENT, MAX_RECENT));
    this._recent = next;
    this.dispatchEvent(new CustomEvent('cm-recent-change', { detail: { colors: next }, bubbles: true, composed: true }));
    const add = this.#store()?.addRecentColor?.(v);
    add?.then((list) => { if (Array.isArray(list)) this._recent = list; }).catch(() => { /* keep the local list */ });
  }

  // ---- square
  #areaAt(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const rtl = getComputedStyle(this).direction === 'rtl';
    this._hsva = { ...this._hsva, s: (rtl ? 1 - x : x) * 100, v: (1 - y) * 100 };
    this.#write();
  }
  #onAreaDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
    el.focus();
    this.#drag = 'area';
    this.#areaAt(e);
  }
  #onAreaMove(e: PointerEvent) { if (this.#drag === 'area') this.#areaAt(e); }
  #onUp() {
    if (this.#drag === null) return;
    this.#drag = null;
    this.#commit();
  }
  #onAreaKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let { s, v } = this._hsva;
    if (e.key === 'ArrowRight') s += rtl ? -step : step;
    else if (e.key === 'ArrowLeft') s += rtl ? step : -step;
    else if (e.key === 'ArrowUp') v += step;
    else if (e.key === 'ArrowDown') v -= step;
    else if (e.key === 'Home') s = 0;
    else if (e.key === 'End') s = 100;
    else if (e.key === 'PageUp') v = 100;
    else if (e.key === 'PageDown') v = 0;
    else return;
    e.preventDefault();
    this._hsva = { ...this._hsva, s: Math.min(100, Math.max(0, s)), v: Math.min(100, Math.max(0, v)) };
    this.#write(true);
  }

  // ---- sliders
  #onHue(e: Event, commit: boolean) {
    e.stopPropagation();
    this._hsva = { ...this._hsva, h: Number((e.target as HTMLInputElement).value) };
    this.#write(commit);
  }
  #onAlpha(e: Event, commit: boolean) {
    e.stopPropagation();
    this._hsva = { ...this._hsva, a: Number((e.target as HTMLInputElement).value) / 100 };
    this.#write(commit);
  }

  // ---- boxes
  #onFormat(e: Event) {
    e.stopPropagation();
    this.format = (e.target as HTMLSelectElement).value as ColorFormat;
    this._drafts = {};
    if (this.value) this.#write(true);
  }
  #onBox(e: Event, key: string, commit: boolean) {
    e.stopPropagation();
    const text = (e.target as HTMLInputElement).value;
    const c = this.#fromBoxes(key, text);
    if (!c) { this._drafts = { ...this._drafts, [key]: text }; return; }
    this._drafts = commit ? {} : { ...this._drafts, [key]: text };
    this.#setHsvaFrom(c);
    this.#write(commit);
  }
  /** The colour the boxes describe after `key` changes to `text`, or null while it isn't one. */
  #fromBoxes(key: string, text: string): Rgba | null {
    const cur = this.#rgba;
    if (key === 'hex') {
      const t = text.trim();
      if (!/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t)) return null;
      const c = parseColor(t);
      return c && (this.alpha && /^#?[0-9a-f]{8}$/i.test(t) ? c : { ...c, a: this._hsva.a });
    }
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) return null;
    if (key === 'a') return n >= 0 && n <= 100 ? { ...cur, a: n / 100 } : null;
    if (key === 'r' || key === 'g' || key === 'b') return n >= 0 && n <= 255 ? { ...cur, [key]: Math.round(n) } : null;
    const hsl = rgbToHsl(cur);
    if (key === 'h') return n >= 0 && n <= 360 ? hslToRgb({ ...hsl, h: n % 360, a: cur.a }) : null;
    if (key === 's' || key === 'l') return n >= 0 && n <= 100 ? hslToRgb({ ...hsl, [key]: n, a: cur.a }) : null;
    return null;
  }

  async #onEyedropper() {
    const Dropper = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      const c = parseColor(sRGBHex);
      if (!c) return;
      this.#setHsvaFrom({ ...c, a: this._hsva.a });
      this.#write(true);
    } catch { /* cancelled */ }
  }

  // ---- gradient
  #setMode(gradient: boolean) {
    if (gradient === !!this._grad) return;
    if (gradient) {
      const c = this.#rgba;
      const end = hsvToRgb({ ...this._hsva, h: (this._hsva.h + 60) % 360, s: Math.max(this._hsva.s, 40), v: Math.max(this._hsva.v, 60) });
      this._grad = { type: 'linear', angle: 90, stops: [{ color: c, position: 0 }, { color: end, position: 100 }] };
      this._stop = 0;
    } else {
      this._grad = null;
    }
    this.#write(true);
  }
  #setGrad(patch: Partial<Gradient>, commit = true) {
    if (!this._grad) return;
    this._grad = { ...this._grad, ...patch };
    this.#write(commit);
  }
  #selectStop(i: number) {
    if (!this._grad) return;
    this._stop = i;
    this.#setHsvaFrom(this._grad.stops[i].color);
    this._drafts = {};
  }
  #posAt(e: PointerEvent, bar: HTMLElement) {
    const r = bar.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return Math.round((getComputedStyle(this).direction === 'rtl' ? 1 - x : x) * 100);
  }
  #onBarDown(e: PointerEvent) {
    if (!this._grad || e.button !== 0 || (e.target as HTMLElement).closest('.handle')) return;
    const pos = this.#posAt(e, e.currentTarget as HTMLElement);
    const color = colorAt(this._grad, pos);
    const stops = [...this._grad.stops, { color, position: pos }];
    this._grad = { ...this._grad, stops };
    this.#selectStop(stops.length - 1);
    this.#write(true);
    this.updateComplete.then(() => this.renderRoot.querySelectorAll<HTMLElement>('.handle')[stops.length - 1]?.focus());
  }
  #onHandleDown(e: PointerEvent, i: number) {
    if (e.button !== 0) return;
    e.stopPropagation();
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
    this.#selectStop(i);
    this.#drag = i;
  }
  #onHandleMove(e: PointerEvent, i: number) {
    if (this.#drag !== i || !this._grad) return;
    const bar = this.renderRoot.querySelector<HTMLElement>('.bar')!;
    this.#moveStop(i, this.#posAt(e, bar), false);
  }
  #moveStop(i: number, position: number, commit: boolean) {
    if (!this._grad) return;
    const stops = this._grad.stops.map((s, j) => (j === i ? { ...s, position: Math.min(100, Math.max(0, position)) } : s));
    this.#setGrad({ stops }, commit);
  }
  #removeStop(i: number) {
    if (!this._grad || this._grad.stops.length <= 2) return;
    const stops = this._grad.stops.filter((_, j) => j !== i);
    this._grad = { ...this._grad, stops };
    this.#selectStop(Math.min(i, stops.length - 1));
    this.#write(true);
    this.updateComplete.then(() => this.renderRoot.querySelectorAll<HTMLElement>('.handle')[this._stop]?.focus());
  }
  #onHandleKey(e: KeyboardEvent, i: number) {
    if (!this._grad) return;
    const step = e.shiftKey ? 10 : 1;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const p = this._grad.stops[i].position;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') this.#moveStop(i, p + (rtl && e.key === 'ArrowRight' ? -step : step), true);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') this.#moveStop(i, p - (rtl && e.key === 'ArrowLeft' ? -step : step), true);
    else if (e.key === 'Home') this.#moveStop(i, 0, true);
    else if (e.key === 'End') this.#moveStop(i, 100, true);
    else if (e.key === 'Delete' || e.key === 'Backspace') this.#removeStop(i);
    else return;
    e.preventDefault();
  }

  // ---- swatches
  #pickSwatch(value: string) {
    const g = parseGradient(value);
    if (g && this.gradient) {
      this._grad = g;
      this._stop = 0;
      this.#setHsvaFrom(g.stops[0].color);
    } else {
      const c = parseColor(value);
      if (!c) return;
      this._grad = null;
      this.#setHsvaFrom(c);
    }
    this._drafts = {};
    this.#write(true);
  }

  #swatchGroup(title: string, list: ColorSwatch[]) {
    if (!list.length) return nothing;
    const id = `${this.#id}-${title}`;
    return html`<div class="group" role="group" aria-labelledby=${id}>
      <h3 id=${id}>${this.t(title as 'brand')}</h3>
      <div class="sws">${list.map((s) => {
        const label = s.name ? this.t('swatch', { name: s.name, value: s.value }) : s.value;
        const on = !!this.value && sameColor(s.value, this.value);
        return html`<button type="button" class="sw checker" part="swatch" aria-pressed=${on ? 'true' : 'false'} aria-label=${label} title=${s.name || s.value}
          @click=${() => this.#pickSwatch(s.value)}><span style="background:${s.value}"></span></button>`;
      })}</div>
    </div>`;
  }

  #boxes() {
    const c = this.#rgba, d = this._drafts, f = this.format;
    const box = (key: string, label: string, value: string | number, num = true) => html`<input class="box ${num ? 'num' : ''}"
      type="text" inputmode=${num ? 'numeric' : 'text'} autocomplete="off" spellcheck="false" aria-label=${label}
      .value=${live(d[key] ?? String(value))} aria-invalid=${d[key] !== undefined && !this.#fromBoxes(key, d[key]) ? 'true' : nothing}
      @input=${(e: Event) => this.#onBox(e, key, false)} @change=${(e: Event) => this.#onBox(e, key, true)}
      @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.#onBox(e, key, true); }} />`;
    const hsl = rgbToHsl(c);
    return html`<div class="boxes">
      ${f === 'hex' ? box('hex', this.t('hex'), toHex6(c), false) : nothing}
      ${f === 'rgb' ? [box('r', this.t('red'), c.r), box('g', this.t('green'), c.g), box('b', this.t('blue'), c.b)] : nothing}
      ${f === 'hsl' ? [box('h', this.t('hue'), Math.round(hsl.h)), box('s', this.t('saturation'), Math.round(hsl.s)), box('l', this.t('lightness'), Math.round(hsl.l))] : nothing}
      ${this.alpha ? box('a', this.t('opacity'), Math.round(this._hsva.a * 100)) : nothing}
    </div>`;
  }

  render() {
    const { h, s, v, a } = this._hsva;
    const rgb = this.#rgba;
    const solid = toHex6(rgb);
    const formats = this.allowedFormats;
    const g = this._grad;
    const rtl = this.matches(':dir(rtl)');
    const hasDropper = this.eyedropper && typeof window !== 'undefined' && 'EyeDropper' in window;
    const gradCss = g ? formatGradient({ ...g, type: 'linear', angle: rtl ? 270 : 90 }) : '';
    return html`<div class="panel" role="group" aria-label=${this.getAttribute('aria-label') || this.t('label')}>
      ${this.gradient
        ? html`<div class="tabs" role="radiogroup" aria-label=${this.t('label')}>
            <button type="button" role="radio" aria-checked=${g ? 'false' : 'true'} tabindex=${g ? '-1' : '0'} @click=${() => this.#setMode(false)}
              @keydown=${(e: KeyboardEvent) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); this.#setMode(true); this.updateComplete.then(() => (this.renderRoot.querySelectorAll<HTMLElement>('.tabs button')[1])?.focus()); } }}>${this.t('solid')}</button>
            <button type="button" role="radio" aria-checked=${g ? 'true' : 'false'} tabindex=${g ? '0' : '-1'} @click=${() => this.#setMode(true)}
              @keydown=${(e: KeyboardEvent) => { if (e.key.startsWith('Arrow')) { e.preventDefault(); this.#setMode(false); this.updateComplete.then(() => (this.renderRoot.querySelectorAll<HTMLElement>('.tabs button')[0])?.focus()); } }}>${this.t('gradient')}</button>
          </div>`
        : nothing}
      ${g
        ? html`<div class="row">
              <select aria-label=${this.t('gradientType')} @change=${(e: Event) => { e.stopPropagation(); this.#setGrad({ type: (e.target as HTMLSelectElement).value as Gradient['type'] }); }}>
                <option value="linear" .selected=${live(g.type === 'linear')}>${this.t('linear')}</option><option value="radial" .selected=${live(g.type === 'radial')}>${this.t('radial')}</option>
              </select>
              ${g.type === 'linear'
                ? html`<input class="box num" type="text" inputmode="numeric" aria-label=${this.t('angle')} .value=${live(this._drafts.angle ?? `${g.angle}°`)}
                    @input=${(e: Event) => { e.stopPropagation(); this._drafts = { ...this._drafts, angle: (e.target as HTMLInputElement).value }; }}
                    @change=${(e: Event) => { e.stopPropagation(); const n = parseFloat((e.target as HTMLInputElement).value); this._drafts = {}; if (Number.isFinite(n)) this.#setGrad({ angle: ((Math.round(n) % 360) + 360) % 360 }); }} />`
                : nothing}
              <button type="button" class="icon-btn" aria-label=${this.t('removeStop')} title=${this.t('removeStop')} ?disabled=${g.stops.length <= 2}
                @click=${() => this.#removeStop(this._stop)}><cm-icon name="trash" size="16"></cm-icon></button>
            </div>
            <div class="bar checker" role="group" aria-label=${this.t('stops')} @pointerdown=${this.#onBarDown}>
              <span class="fill" style="background:${gradCss}"></span>
              ${g.stops.map((st, i) => html`<button type="button" class="handle" role="slider" aria-orientation="horizontal"
                aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(st.position)}
                aria-label=${this.t('stop', { n: i + 1, color: formatColor(st.color, this.format), position: Math.round(st.position) })}
                aria-current=${i === this._stop ? 'true' : 'false'} style="inset-inline-start:${st.position}%;background:${formatColor(st.color)}"
                @pointerdown=${(e: PointerEvent) => this.#onHandleDown(e, i)} @pointermove=${(e: PointerEvent) => this.#onHandleMove(e, i)}
                @pointerup=${this.#onUp} @pointercancel=${this.#onUp} @focus=${() => { if (this._stop !== i) this.#selectStop(i); }}
                @keydown=${(e: KeyboardEvent) => this.#onHandleKey(e, i)}></button>`)}
            </div>`
        : nothing}
      <div class="area" part="area" tabindex="0" role="slider" aria-label=${this.t('area')}
        aria-valuetext=${this.t('areaValue', { s: Math.round(s), v: Math.round(v) })} aria-valuenow=${Math.round(s)} aria-valuemin="0" aria-valuemax="100"
        style="background-color:hsl(${h} 100% 50%)"
        @pointerdown=${this.#onAreaDown} @pointermove=${this.#onAreaMove} @pointerup=${this.#onUp} @pointercancel=${this.#onUp} @keydown=${this.#onAreaKey}>
        <span class="thumb" style="left:${rtl ? 100 - s : s}%;top:${100 - v}%;background:${solid}"></span>
      </div>
      <div class="sliders">
        <span class="preview checker" aria-hidden="true"><span style="background:${g ? formatGradient(g) : formatColor(rgb)}"></span></span>
        <div class="stack">
          <input type="range" class="hue" min="0" max="360" step="1" .value=${live(String(Math.round(h)))} aria-label=${this.t('hue')}
            @input=${(e: Event) => this.#onHue(e, false)} @change=${(e: Event) => this.#onHue(e, true)} />
          ${this.alpha
            ? html`<div class="alpha-wrap checker"><input type="range" min="0" max="100" step="1" .value=${live(String(Math.round(a * 100)))}
                aria-label=${this.t('opacity')} aria-valuetext="${Math.round(a * 100)}%"
                style="--track:linear-gradient(to ${rtl ? 'left' : 'right'}, transparent, ${solid})"
                @input=${(e: Event) => this.#onAlpha(e, false)} @change=${(e: Event) => this.#onAlpha(e, true)} /></div>`
            : nothing}
        </div>
      </div>
      <div class="row">
        ${formats.length > 1
          ? html`<select aria-label=${this.t('format')} @change=${this.#onFormat}>
              ${formats.map((f) => html`<option value=${f} ?selected=${f === this.format} .selected=${live(f === this.format)}>${this.t(f)}</option>`)}
            </select>`
          : nothing}
        ${this.#boxes()}
        ${hasDropper
          ? html`<button type="button" class="icon-btn" aria-label=${this.t('eyedropper')} title=${this.t('eyedropper')} @click=${this.#onEyedropper}>
              <cm-icon name="eyedropper" size="16"></cm-icon></button>`
          : nothing}
      </div>
      ${this.#swatchGroup('brand', this.brand)}
      ${this.#swatchGroup('recent', this.recent.map((value) => ({ value })))}
      ${this.#swatchGroup('palette', this.palette)}
    </div>`;
  }
}
define('cm-color-picker', CmColorPicker);

declare global { interface HTMLElementTagNameMap { 'cm-color-picker': CmColorPicker } }
