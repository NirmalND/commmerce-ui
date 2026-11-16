import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

const strings = defineStrings('signatureField', {
  /** Name of the Draw / Type tab list when the field has no label. */
  modes: 'How to sign',
  /** The two tabs. */
  draw: 'Draw',
  type: 'Type',
  /** Accessible name of the drawing area, and the same once something is drawn. */
  pad: 'Signature drawing area',
  padSigned: 'Signature drawing area, signed',
  /** Read with the drawing area: how to draw, and the keyboard alternative. */
  instructions: 'Draw your signature with a mouse, finger or pen. To sign with the keyboard, choose Type.',
  /** Hint above the line while nothing is drawn. */
  signHere: 'Sign here',
  /** Accessible name and placeholder of the box in Type mode. */
  typeLabel: 'Type your full name',
  typePlaceholder: 'Type your full name',
  /** Undo and Clear buttons: visible text and accessible names. */
  undo: 'Undo',
  undoLabel: 'Undo last stroke',
  clear: 'Clear',
  clearLabel: 'Clear signature',
  /** Announced after Clear and Undo. */
  cleared: 'Signature cleared',
  undone: 'Last stroke removed',
  /** Validation message when `required` and nothing is signed. */
  required: 'Please sign here.',
});
declare module '../localize.js' { interface CmStrings { signatureField: typeof strings } }

/** A point of a stroke: x and y as fractions of the pad's width (so a resize scales it), and pen pressure 0-1. */
interface Point { x: number; y: number; p: number }
type Stroke = Point[];

/** Width of the pad over its height. */
const RATIO = 3;
/** Where the signing line sits, as a fraction of the pad's height from the top. */
const BASELINE = 0.7;
/** Stroke width at pressure 0.5, as a fraction of the pad's width (3.3px on a 600px pad). */
const LINE = 0.0055;
/**
 * Ink of the exported image. Always the light theme's `text-default` (black) on transparent, whatever the theme on
 * screen: a signature goes into documents and PDFs, which are light. On screen the ink is `text-default` of the
 * current theme, so it stays visible in dark.
 */
const EXPORT_INK = '#000000';
/** Space around the ink in the exported image, in CSS pixels (doubled with the 2x scale). */
const PADDING = 8;
/** Resolution of the exported image. */
const SCALE = 2;
/** Typing waits this long before `change` / `cm-change`. */
const TYPE_DELAY = 400;

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (a.p + b.p) / 2 });

/**
 * Signature field: sign by drawing with a mouse, finger or pen, or by typing a name that is shown in a handwriting
 * font. Gives a PNG of the signature, cropped to the ink, as a data URL (`value`, `toDataURL()`) or a Blob
 * (`toBlob()`). Participates in native forms: submits the data URL under `name`; `required` blocks submission
 * until something is signed. For e-sign screens ("Sign now") and signing pages.
 *
 * Load `@commmerce/tokens/fonts.css` (the hosted build's fonts.css) for the typed signature's font, Dancing Script;
 * without it, typed signatures use the system's cursive font.
 * @element cm-signature-field
 * @fires cm-change - After a stroke is finished, Undo, Clear, a switch between Draw and Type, or typing stops for 400ms. `detail`: `{ value, empty, mode }`. A plain `change` event (no detail) follows it, for code that treats every form field alike.
 * @csspart label - The label.
 * @csspart tabs - The Draw / Type tab list.
 * @csspart pad - The signing area (both modes).
 * @csspart canvas - The drawing canvas.
 * @csspart input - The text box in Type mode.
 * @csspart undo - The Undo button (Draw mode).
 * @csspart clear - The Clear button.
 * @cssprop --cm-signature-font - Font of typed signatures. Default: Dancing Script, then cursive system fonts.
 */
export class CmSignatureField extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    hint: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    mode: { reflect: true },
    typedName: { attribute: 'typed-name' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _announce: { state: true },
  };

  /** Visible label above the field, e.g. "Your signature". Without one, give the element an `aria-label`. */
  label = '';
  /** Lowercase bracketed note after the label. */
  hint = '';
  /** One sentence under the field in text-tertiary, e.g. what the signer agrees to. */
  helpText = '';
  /** Error message from your own validation; turns the pad's border critical and is announced. */
  error = '';
  /** Form field name. */
  name = '';
  /**
   * The signature as a PNG data URL (`data:image/png;base64,…`), cropped to the ink, or empty when nothing is
   * signed. Updated after every stroke and keystroke. Set it to a PNG or SVG data URL (or any image URL the page
   * may read) to show a saved signature in Draw mode; set it to `''` to clear both modes.
   */
  value = '';
  /** The selected tab: `draw` (pointer, touch, pen) or `type` (keyboard). Each keeps its own signature. */
  mode: 'draw' | 'type' = 'draw';
  /** The name typed in Type mode. Set it to prefill the box with the signer's name. */
  typedName = '';
  /** Shows a red asterisk and blocks form submission until something is signed. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;

  /** @internal Text in the polite status region. */
  _announce = '';

  #internals = this.attachInternals();
  #id = nextId('cm-sig');
  #defaultValue = '';
  #defaultTyped = '';
  #strokes: Stroke[] = [];
  /** The stroke being drawn and its pointer. */
  #active?: { id: number; stroke: Stroke };
  /** A saved signature shown under the strokes (from `value`). */
  #image?: HTMLImageElement;
  /** The value this element produced itself; any other value set from outside is loaded as an image. */
  #own = '';
  #frame = 0;
  #typeTimer?: ReturnType<typeof setTimeout>;
  /** The value when the current burst of typing started. */
  #typeFrom = '';
  #resize?: ResizeObserver;
  /** Last laid-out width of the pad, so exports from a hidden pad keep their size. */
  #width = 0;

  static styles = [
    base,
    css`
      :host { display: block; }
      .field { display: flex; flex-direction: column; gap: var(--cm-space-8); }
      .label { font-size: var(--cm-type-label-size); color: var(--cm-text-default); }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .hint { margin-inline-start: var(--cm-space-8); font-size: 12px; color: var(--cm-text-tertiary); text-transform: lowercase; }
      .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--cm-space-8); }
      .tabs { display: flex; gap: var(--cm-space-20); }
      .tab {
        position: relative; min-height: var(--cm-control-height-sm); padding: 0 2px; font: inherit; font-size: var(--cm-font-size-14); font-weight: 500;
        color: var(--cm-text-tertiary); background: none; border: 0; cursor: pointer;
      }
      .tab::after { content: ''; position: absolute; inset-inline: 0; bottom: 2px; height: 2px; border-radius: var(--cm-radius-full); background: transparent; }
      .tab:hover:not(:disabled), .tab[aria-selected='true'] { color: var(--cm-text-default); }
      .tab[aria-selected='true']::after { background: var(--cm-border-strong); }
      .tab:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: var(--cm-radius-xs); }
      .tab:disabled { color: var(--cm-text-secondary); cursor: not-allowed; }
      .actions { display: flex; gap: var(--cm-space-8); margin-inline-start: auto; }
      /* Secondary slim Button (32px): the pad's own small actions. */
      .act {
        display: inline-flex; align-items: center; height: var(--cm-control-height-sm); padding: 0 var(--cm-space-12);
        font: inherit; font-size: var(--cm-font-size-13); font-weight: 500; line-height: 1; white-space: nowrap; cursor: pointer;
        background: var(--cm-bg-hover); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-sm);
      }
      .act:hover:not(:disabled) { background: var(--cm-bg-surface); }
      .act:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .act:disabled { background: var(--cm-action-disabled); border-color: var(--cm-action-disabled); color: var(--cm-action-disabled-text); cursor: not-allowed; }
      .panel:focus { outline: none; }
      .pad {
        position: relative; width: 100%; aspect-ratio: ${RATIO} / 1; overflow: hidden; container-type: inline-size;
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      .panel:focus-visible .pad, .pad:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      :host([error]:not([error=''])) .pad { border-color: var(--cm-border-critical); }
      canvas {
        position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair;
        /* The ink: read in script. The transition makes a theme change fire transitionend, which repaints the ink. */
        color: var(--cm-text-default); transition-property: color; transition-duration: 1ms; /* scale-exempt: not motion; a 1ms colour transition makes a theme change fire transitionend so the ink repaints */
      }
      .line {
        position: absolute; inset-inline: var(--cm-space-12); top: ${BASELINE * 100}%; height: 0;
        border-top: var(--cm-border-1) dashed var(--cm-border-input); pointer-events: none;
      }
      .here {
        position: absolute; inset-inline-start: var(--cm-space-12); bottom: calc(${(1 - BASELINE) * 100}% + 4px);
        font-size: 12px; color: var(--cm-text-tertiary); pointer-events: none; user-select: none;
      }
      .typed {
        position: absolute; inset-inline: var(--cm-space-12); bottom: calc(${(1 - BASELINE) * 100}% - 0.18em);
        width: calc(100% - 2 * var(--cm-space-12)); padding: 0; margin: 0;
        font-family: var(--cm-signature-font, 'Dancing Script', 'Segoe Script', 'Bradley Hand', 'Snell Roundhand', 'Brush Script MT', cursive);
        font-size: clamp(24px, 9cqi, 48px); font-weight: 400; line-height: 1.25; text-align: center; /* scale-exempt: a typed signature scales with the pad, like handwriting */
        color: var(--cm-text-default); background: transparent; border: 0; outline: none;
      }
      .typed::placeholder {
        font-family: var(--cm-font-sans, 'Poppins', system-ui, sans-serif); font-size: 14px; color: var(--cm-text-tertiary);
      }
      :host([disabled]) .pad { background: var(--cm-bg-input-filled); border-color: var(--cm-border-subtle); }
      :host([disabled]) canvas, :host([disabled]) .typed { cursor: not-allowed; }
      :host([disabled]) .typed { color: var(--cm-text-secondary); }
      .help { margin: 0; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); }
      .error { margin: 0; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-critical); }
      @media (pointer: coarse) { .act, .tab { min-height: var(--cm-control-height-touch); } }

      .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) {
      this.#defaultValue = this.value;
      this.#defaultTyped = this.typedName;
    } else this.#observe(); // moved or re-added: watch the pad's size again
  }

  /** Repaints whenever the pad changes size. */
  #observe() {
    const pad = this.renderRoot.querySelector<HTMLElement>('.panel-draw .pad');
    if (!pad || this.#resize) return;
    this.#resize = new ResizeObserver(() => this.#fit());
    this.#resize.observe(pad);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.#resize = undefined;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    if (this.#typeTimer) { clearTimeout(this.#typeTimer); this.#typeTimer = undefined; }
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }

  formResetCallback() {
    this.#strokes = [];
    this.#active = undefined;
    this.#image = undefined;
    if (this.#typeTimer) { clearTimeout(this.#typeTimer); this.#typeTimer = undefined; }
    this.typedName = this.#defaultTyped;
    if (this.#defaultValue) { this.#own = ''; this.value = this.#defaultValue; }
    else this.updateComplete.then(() => this.#sync(false));
    this.#draw();
  }
  formDisabledCallback(d: boolean) { this.disabled = d; }
  formStateRestoreCallback(state: string) { this.value = state; }

  /** True when the current mode has nothing signed: no strokes (or saved image) in Draw, no text in Type. */
  get empty(): boolean {
    return this.mode === 'type' ? !this.typedName.trim() : !this.#strokes.length && !this.#image;
  }

  /**
   * The signature as a PNG data URL: black ink on transparent at 2x the pad's size, cropped to the ink with 8px
   * (16 image pixels) around it. Empty string when nothing is signed.
   */
  toDataURL(): string {
    return this.#export()?.toDataURL('image/png') ?? '';
  }

  /** The same PNG as `toDataURL()` as a Blob, for uploading. `null` when nothing is signed. */
  toBlob(): Promise<Blob | null> {
    const c = this.#export();
    return c ? new Promise((resolve) => c.toBlob(resolve, 'image/png')) : Promise.resolve(null);
  }

  /** Removes the current mode's signature (Draw: every stroke and any saved image; Type: the text). */
  clear() {
    if (this.mode === 'type') this.typedName = '';
    else { this.#strokes = []; this.#active = undefined; this.#image = undefined; this.#draw(); }
    this.#sync(true);
  }

  /** Removes the last stroke in Draw mode (then the saved image, if one was loaded). */
  undo() {
    if (this.mode !== 'draw') return;
    if (this.#strokes.length) this.#strokes.pop();
    else this.#image = undefined;
    this.#active = undefined;
    this.#draw();
    this.#sync(true);
  }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') && (this.value ?? '') !== this.#own) {
      // Set from outside: '' clears both modes; anything else is a saved signature, shown in Draw.
      const v = this.value ?? '';
      this.#own = v;
      this.#strokes = [];
      this.#active = undefined;
      if (!v) { this.#image = undefined; if (this.hasUpdated) this.typedName = ''; }
      else {
        const img = new Image();
        img.onload = () => { if (this.#image === img) this.#draw(); };
        img.src = v;
        this.#image = img;
        this.mode = 'draw';
      }
      this.#draw();
    } else if (this.hasUpdated && (changed.has('mode') || (changed.has('typedName') && this.mode === 'type'))) {
      // Another tab, or a name set in code: the value follows (events are fired by the user actions only).
      const next = this.empty ? '' : this.toDataURL();
      this.#own = next;
      this.value = next;
    }
  }

  firstUpdated() {
    this.#observe();
    // A typed signature exported before the font arrives would use the fallback font: load it now.
    if (this.typedName && !this.value) this.updateComplete.then(() => this.#sync(false));
    this.#loadFont();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('mode') && this.mode === 'type') this.#loadFont();
    this.#internals.setFormValue(this.value || null, this.value);
    const anchor = (this.mode === 'type'
      ? this.renderRoot.querySelector<HTMLElement>('.typed')
      : this.renderRoot.querySelector<HTMLElement>('.tab[aria-selected="true"]')) ?? undefined;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, anchor);
    else if (this.required && this.empty) this.#internals.setValidity({ valueMissing: true }, this.t('required'), anchor);
    else this.#internals.setValidity({});
  }

  /* ---------- Drawing ---------- */

  get #canvas() { return this.renderRoot.querySelector<HTMLCanvasElement>('canvas'); }

  /** Sizes the canvas to the pad at the screen's resolution and repaints from the strokes (never a stretched bitmap). */
  #fit() {
    const canvas = this.#canvas;
    if (!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    this.#width = w;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    this.#paint();
  }

  /** Repaints on the next frame. */
  #draw() {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => { this.#frame = 0; this.#paint(); });
  }

  #paint() {
    const canvas = this.#canvas;
    if (!canvas || !canvas.width) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth || this.#width;
    if (!w) return;
    const scale = canvas.width / w;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const ink = getComputedStyle(canvas).color || EXPORT_INK;
    this.#render(ctx, w, ink, true);
  }

  /** Draws the saved image and the strokes for a pad `w` CSS pixels wide (the context is already scaled). */
  #render(ctx: CanvasRenderingContext2D, w: number, ink: string, screen: boolean) {
    const h = w / RATIO;
    const img = this.#image;
    if (img?.complete && img.naturalWidth) {
      const k = Math.min((w * 0.9) / img.naturalWidth, (h * 0.9) / img.naturalHeight);
      const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      const x = (w - iw) / 2, y = (h - ih) / 2;
      if (screen && !sameColor(ink, EXPORT_INK)) {
        // Dark theme: show the saved (dark) ink in the screen's ink colour, so it stays visible.
        const tmp = document.createElement('canvas');
        tmp.width = Math.max(1, Math.round(iw * 2)); tmp.height = Math.max(1, Math.round(ih * 2));
        const t = tmp.getContext('2d')!;
        t.drawImage(img, 0, 0, tmp.width, tmp.height);
        t.globalCompositeOperation = 'source-in';
        t.fillStyle = ink;
        t.fillRect(0, 0, tmp.width, tmp.height);
        ctx.drawImage(tmp, x, y, iw, ih);
      } else ctx.drawImage(img, x, y, iw, ih);
    }
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of this.#strokes) drawStroke(ctx, s, w);
  }

  #point(e: PointerEvent, rect: DOMRect): Point {
    // Pressure only from pens: mice report a fixed 0.5 and many touch screens 0 or 1.
    const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5;
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.width, p };
  }

  #onDown(e: PointerEvent) {
    if (this.disabled || this.#active || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const canvas = e.currentTarget as HTMLCanvasElement;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
    const stroke: Stroke = [this.#point(e, canvas.getBoundingClientRect())];
    this.#active = { id: e.pointerId, stroke };
    this.#strokes.push(stroke);
    this.#draw();
  }

  #onMove(e: PointerEvent) {
    const a = this.#active;
    if (!a || e.pointerId !== a.id) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e]) {
      const pt = this.#point(ev, rect);
      const last = a.stroke[a.stroke.length - 1];
      // Skip points under 1.5 CSS px apart: they add noise, not shape.
      if (Math.hypot(pt.x - last.x, pt.y - last.y) * rect.width < 1.5) continue;
      a.stroke.push(pt);
    }
    this.#draw();
  }

  #onUp(e: PointerEvent) {
    const a = this.#active;
    if (!a || e.pointerId !== a.id) return;
    if (e.type === 'pointerup') this.#onMove(e);
    this.#active = undefined;
    try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    this.#draw();
    this.#sync(true);
  }

  /* ---------- Typing ---------- */

  get #fontFamily() {
    const input = this.renderRoot.querySelector<HTMLInputElement>('.typed');
    return (input && getComputedStyle(input).fontFamily) || 'cursive';
  }

  #loadFont() {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts || !this.isConnected) return;
    const font = `400 40px ${this.#fontFamily}`;
    let ready = true;
    try { ready = fonts.check(font, this.typedName || 'Signature'); } catch { /* invalid font string: use what there is */ }
    if (ready) return;
    fonts.load(font, this.typedName || 'Signature').then(() => {
      // Re-export once the font is in, so the PNG matches what the signer sees.
      if (this.mode === 'type' && this.typedName.trim()) this.#sync(false);
    }, () => {});
  }

  #onType(e: Event) {
    e.stopPropagation();
    // The value follows in willUpdate, so the form value never lags; the events wait until typing stops.
    if (!this.#typeTimer) this.#typeFrom = this.value;
    else clearTimeout(this.#typeTimer);
    this.typedName = (e.target as HTMLInputElement).value;
    this.#typeTimer = setTimeout(() => this.#typed(), TYPE_DELAY);
    this.#loadFont();
  }

  /** Typing stopped (or the box was left): fire the events if the value moved since typing started. */
  #typed() {
    if (!this.#typeTimer) return;
    clearTimeout(this.#typeTimer);
    this.#typeTimer = undefined;
    if (this.value !== this.#typeFrom) this.#emit();
  }

  #onTypeChange(e: Event) {
    // The native change of the inner box doesn't cross the shadow boundary on its own; ours is fired by #emit.
    e.stopPropagation();
    this.updateComplete.then(() => this.#typed());
  }

  /* ---------- Value ---------- */

  /** Recomputes `value` from the current mode, then, when `emit`, fires the events if it changed. */
  #sync(emit: boolean) {
    const next = this.empty ? '' : this.toDataURL();
    const changed = next !== this.value;
    if (changed) { this.#own = next; this.value = next; }
    this.requestUpdate();
    if (emit && changed) this.#emit();
  }

  #emit() {
    const detail = { value: this.value, empty: this.empty, mode: this.mode };
    this.dispatchEvent(new CustomEvent('cm-change', { detail, bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /** The signature at 2x on a transparent canvas, cropped to the ink with padding; undefined when empty. */
  #export(): HTMLCanvasElement | undefined {
    if (this.empty) return undefined;
    const w = Math.max(this.#canvas?.clientWidth || this.#width || 600, 300);
    const h = w / RATIO;
    const full = document.createElement('canvas');
    full.width = Math.round(w * SCALE);
    full.height = Math.round(h * SCALE);
    const ctx = full.getContext('2d', { willReadFrequently: true })!;
    ctx.scale(SCALE, SCALE);
    if (this.mode === 'type') {
      let size = Math.min(h * 0.45, 64);
      const family = this.#fontFamily;
      ctx.font = `400 ${size}px ${family}`;
      const text = this.typedName.trim();
      const max = w - 2 * PADDING;
      const measured = ctx.measureText(text).width;
      if (measured > max) { size *= max / measured; ctx.font = `400 ${size}px ${family}`; }
      ctx.direction = getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = EXPORT_INK;
      ctx.fillText(text, w / 2, h * BASELINE);
    } else this.#render(ctx, w, EXPORT_INK, false);
    return crop(full, PADDING * SCALE);
  }

  /* ---------- Tabs ---------- */

  #select(mode: 'draw' | 'type', focus: boolean) {
    if (this.disabled) return;
    if (focus) this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`#${this.#id}-tab-${mode}`)?.focus());
    if (mode === this.mode) return;
    const before = this.value;
    this.mode = mode;
    this.updateComplete.then(() => {
      if (mode === 'draw') this.#fit();
      if (this.value !== before) this.#emit();
    });
  }

  #onTabKey(e: KeyboardEvent) {
    const key = logicalKey(e, this);
    let next: 'draw' | 'type' | undefined;
    if (key === 'ArrowRight' || key === 'ArrowLeft') next = this.mode === 'draw' ? 'type' : 'draw';
    else if (e.key === 'Home') next = 'draw';
    else if (e.key === 'End') next = 'type';
    else return;
    e.preventDefault();
    this.#select(next, true);
  }

  #say(key: 'cleared' | 'undone') {
    this.#announce(this.t(key));
  }
  #announce(text: string) {
    // Empty first, so the same message twice in a row is read again.
    this._announce = '';
    this.updateComplete.then(() => { this._announce = text; });
  }

  /** After Undo or Clear: if the button that had focus is now disabled, move focus to the tab or the text box. */
  #keepFocus(hadFocus: boolean) {
    this.updateComplete.then(() => {
      const active = this.shadowRoot?.activeElement as (HTMLElement & { disabled?: boolean }) | null;
      if (!hadFocus || (active && !active.disabled)) return;
      const target = this.mode === 'type'
        ? this.renderRoot.querySelector<HTMLElement>('.typed')
        : this.renderRoot.querySelector<HTMLElement>('.tab[aria-selected="true"]');
      target?.focus();
    });
  }

  #onUndo() {
    if (this.disabled || this.mode !== 'draw' || this.empty) return;
    const hadFocus = this.matches(':focus-within');
    this.undo();
    this.#say('undone');
    this.#keepFocus(hadFocus);
  }

  #onClear() {
    if (this.disabled || this.empty) return;
    const hadFocus = this.matches(':focus-within');
    this.clear();
    this.#say('cleared');
    this.#keepFocus(hadFocus);
  }

  render() {
    const id = this.#id;
    const hostLabel = this.getAttribute('aria-label');
    const message = this.error;
    const describedBy = [message && `${id}-err`, this.helpText && `${id}-help`].filter(Boolean).join(' ');
    const empty = this.empty;
    const drawEmpty = !this.#strokes.length && !this.#image;
    const tab = (mode: 'draw' | 'type') => html`<button type="button" role="tab" class="tab" id="${id}-tab-${mode}"
      aria-selected=${this.mode === mode ? 'true' : 'false'} aria-controls="${id}-panel-${mode}"
      tabindex=${this.mode === mode ? '0' : '-1'} ?disabled=${this.disabled}
      @click=${() => this.#select(mode, true)} @keydown=${this.#onTabKey}>${this.t(mode)}</button>`;
    return html`<div class="field">
      ${this.label
        ? html`<span class="label" id="${id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}${this.hint ? html`<span class="hint">[${this.hint}]</span>` : nothing}</span>`
        : nothing}
      <div class="bar">
        <div class="tabs" role="tablist" part="tabs"
          aria-labelledby=${this.label ? `${id}-l` : nothing}
          aria-label=${this.label ? nothing : hostLabel || this.t('modes')}>${tab('draw')}${tab('type')}</div>
        <div class="actions">
          ${this.mode === 'draw'
            ? html`<button type="button" class="act" part="undo" aria-label=${this.t('undoLabel')} ?disabled=${this.disabled || drawEmpty} @click=${this.#onUndo}>${this.t('undo')}</button>`
            : nothing}
          <button type="button" class="act" part="clear" aria-label=${this.t('clearLabel')} ?disabled=${this.disabled || empty} @click=${this.#onClear}>${this.t('clear')}</button>
        </div>
      </div>
      <div class="panel panel-draw" role="tabpanel" id="${id}-panel-draw" aria-labelledby="${id}-tab-draw"
        tabindex=${this.disabled ? '-1' : '0'} ?hidden=${this.mode !== 'draw'}>
        <div class="pad" part="pad">
          <span class="line" aria-hidden="true"></span>
          ${drawEmpty ? html`<span class="here" aria-hidden="true">${this.t('signHere')}</span>` : nothing}
          <canvas part="canvas" role="img" aria-label=${drawEmpty ? this.t('pad') : this.t('padSigned')}
            aria-describedby=${[`${id}-instr`, describedBy].filter(Boolean).join(' ')}
            @pointerdown=${this.#onDown} @pointermove=${this.#onMove} @pointerup=${this.#onUp} @pointercancel=${this.#onUp}
            @lostpointercapture=${this.#onUp} @transitionend=${() => this.#paint()}></canvas>
        </div>
        <span class="vh" id="${id}-instr">${this.t('instructions')}</span>
      </div>
      <div class="panel panel-type" role="tabpanel" id="${id}-panel-type" aria-labelledby="${id}-tab-type" ?hidden=${this.mode !== 'type'}>
        <div class="pad" part="pad">
          <span class="line" aria-hidden="true"></span>
          <input class="typed" part="input" type="text" autocomplete="name" spellcheck="false" maxlength="80"
            .value=${live(this.typedName ?? '')} placeholder=${this.t('typePlaceholder')}
            aria-label=${this.label ? `${this.label}: ${this.t('typeLabel')}` : this.t('typeLabel')}
            aria-required=${this.required ? 'true' : nothing} aria-invalid=${message ? 'true' : nothing}
            aria-describedby=${describedBy || nothing} ?disabled=${this.disabled}
            @input=${this.#onType} @change=${this.#onTypeChange} />
        </div>
      </div>
      ${message ? html`<p class="error" id="${id}-err" role="alert">${message}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${id}-help">${this.helpText}</p>` : nothing}
      <div class="vh" role="status" aria-live="polite">${this._announce}</div>
    </div>`;
  }
}

/** Draws one stroke through the midpoints of its points (quadratic smoothing), each piece as wide as its pressure. */
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number) {
  const width = (p: number) => w * LINE * (0.35 + p * 1.3);
  if (s.length === 1) {
    ctx.beginPath();
    ctx.arc(s[0].x * w, s[0].y * w, width(s[0].p) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const P = (q: Point): [number, number] => [q.x * w, q.y * w];
  let start = s[0];
  for (let i = 1; i < s.length - 1; i++) {
    const end = mid(s[i], s[i + 1]);
    ctx.beginPath();
    ctx.moveTo(...P(start));
    ctx.quadraticCurveTo(...P(s[i]), ...P(end));
    ctx.lineWidth = width(s[i].p);
    ctx.stroke();
    start = end;
  }
  const last = s[s.length - 1];
  ctx.beginPath();
  ctx.moveTo(...P(start));
  ctx.lineTo(...P(last));
  ctx.lineWidth = width(last.p);
  ctx.stroke();
}

/** A copy of the canvas cut to its non-transparent pixels plus `pad` pixels each side; undefined if it is blank. */
function crop(c: HTMLCanvasElement, pad: number): HTMLCanvasElement | undefined {
  const { width, height } = c;
  const data = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data;
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        bottom = y;
      }
    }
  }
  if (right < 0) return undefined;
  const out = document.createElement('canvas');
  out.width = right - left + 1 + 2 * pad;
  out.height = bottom - top + 1 + 2 * pad;
  out.getContext('2d')!.drawImage(c, left, top, right - left + 1, bottom - top + 1, pad, pad, right - left + 1, bottom - top + 1);
  return out;
}

/** Whether two CSS colours (as computed: `rgb(…)`, or hex) are the same. */
function sameColor(a: string, b: string) {
  const norm = (c: string) => {
    const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
    if (m) { const n = parseInt(m[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
    return (/\d+\s*,\s*\d+\s*,\s*\d+/.exec(c)?.[0] ?? c).replace(/\s/g, '');
  };
  return norm(a) === norm(b);
}

define('cm-signature-field', CmSignatureField);

declare global { interface HTMLElementTagNameMap { 'cm-signature-field': CmSignatureField } }
