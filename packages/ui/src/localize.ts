import { LitElement, type PropertyDeclaration } from 'lit';

/** Lit property declarations, plus `string: 'key'` for properties whose default is a built-in string. */
export type LocalizedPropertyDeclarations = Record<string, PropertyDeclaration & { string?: string }>;

/**
 * Built-in text and number formatting for every component.
 *
 * Each component that shows its own text (button labels, accessible names, status messages) reads it from a
 * string table here instead of hard-coding English. Three layers, first match wins:
 *   1. the component's own properties (`close-label`, `save-label`, …) and its `strings` property;
 *   2. strings the app set with `configure()` / `setStrings()` (per language or for every language);
 *   3. the English defaults each component registers with `defineStrings()`.
 *
 * The namespace of a component is its tag name without `cm-`, in camelCase: `cm-resource-list` → `resourceList`.
 * Keys in the `common` namespace (close, dismiss, loading…) apply to every component that uses them, unless the
 * component's own namespace sets the same key.
 */

/** Values substituted into a message: `{name}` placeholders. Numbers are formatted for the locale. */
export type MessageVars = Record<string, string | number>;

/** Plural forms, picked with `Intl.PluralRules` from the `count` value. `other` is required. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/**
 * One translatable string:
 * - text with `{placeholders}`: `'Page {page} of {total}'` (numbers are formatted for the locale);
 * - plural forms, chosen by `count`: `{ one: '{count} review', other: '{count} reviews' }`;
 * - a function that gets the raw values and returns the text: `({ count }) => …`.
 */
export type Message = string | PluralMessage | ((vars: MessageVars) => string);

/** A namespace's strings: key → message. */
export type StringTable = Record<string, Message>;

/**
 * Every namespace and its keys. Components add theirs with module augmentation, next to `defineStrings()`:
 * `declare module '../localize.js' { interface CmStrings { pagination: typeof paginationStrings } }`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CmStrings {
  common: typeof commonStrings;
}

/** Strings an app passes in: any namespace, any subset of its keys. */
export type CmStringsInput = {
  [N in keyof CmStrings]?: { [K in keyof CmStrings[N]]?: Message };
};

/** Shared by several components. A component's own namespace can override any of them. */
const commonStrings = {
  /** Close buttons of Modal, Side panel, Filter panel, Bottom sheet and Notification panel. */
  close: 'Close',
  /** Dismiss buttons of Banner and Toast. */
  dismiss: 'Dismiss',
  /** Loading states: Spinner, Skeleton display, Combobox. */
  loading: 'Loading',
  /** Sort direction in sort announcements (Data table, Table header). */
  ascending: 'ascending',
  descending: 'descending',
};

const defaults: Record<string, StringTable> = { common: { ...commonStrings } };
const global: Record<string, StringTable> = {};
const byLocale: Record<string, Record<string, StringTable>> = {};
let configuredLocale: string | undefined;

/**
 * Registers a component's English defaults under its namespace. Call it once at module level in the component's
 * file. Returns the table, so `typeof` gives the keys for the `CmStrings` augmentation.
 */
export function defineStrings<T extends StringTable>(namespace: string, table: T): T {
  defaults[namespace] = { ...defaults[namespace], ...table };
  return table;
}

/** The English defaults of every loaded component, by namespace. A copy: changing it changes nothing. */
export function getDefaultStrings(): Record<string, Record<string, Message>> {
  return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, { ...v }]));
}

function merge(target: Record<string, StringTable>, input: CmStringsInput) {
  for (const [ns, table] of Object.entries(input ?? {})) {
    if (table && typeof table === 'object') target[ns] = { ...target[ns], ...(table as StringTable) };
  }
}

/**
 * Replaces built-in text, for every component on the page. Merges with what was set before.
 * With `locale`, the strings apply only to components whose language (see `configure`) is that locale
 * or starts with it: strings for `fr` apply to `fr-CA` too.
 * @example setStrings({ pagination: { previous: 'Page précédente' }, common: { close: 'Fermer' } }, 'fr');
 */
export function setStrings(strings: CmStringsInput, locale?: string) {
  if (locale) merge((byLocale[locale.toLowerCase()] ??= {}), strings);
  else merge(global, strings);
  refresh();
}

/**
 * Sets the language and text for every component at once.
 * - `locale`: a BCP 47 tag (`fr`, `ar-EG`, `hi-IN`) used for numbers, dates and plural rules, and to pick strings
 *   set for a language. Without it, each component uses the `lang` attribute of its nearest ancestor (usually
 *   `<html lang>`), then the browser's language.
 * - `strings`: the same object as `setStrings()`, for every language.
 * - `translations`: strings per language, `{ fr: {…}, ar: {…} }`, picked by each component's language.
 * @example configure({ locale: 'fr', strings: { saveBar: { save: 'Enregistrer', discard: 'Annuler' } } });
 */
export function configure(options: { locale?: string; strings?: CmStringsInput; translations?: Record<string, CmStringsInput> } = {}) {
  if ('locale' in options) configuredLocale = options.locale || undefined;
  if (options.strings) merge(global, options.strings);
  for (const [loc, s] of Object.entries(options.translations ?? {})) merge((byLocale[loc.toLowerCase()] ??= {}), s);
  refresh();
}

/** Forgets everything set with `configure()` and `setStrings()`: English text, locale from `lang` again. */
export function resetStrings() {
  configuredLocale = undefined;
  for (const k of Object.keys(global)) delete global[k];
  for (const k of Object.keys(byLocale)) delete byLocale[k];
  refresh();
}

/** The locale a component formats with: `configure({ locale })`, else the nearest `lang` attribute, else undefined (the browser's). */
export function localeFor(el?: Element | null): string | undefined {
  if (configuredLocale) return configuredLocale;
  let node: Node | null | undefined = el;
  while (node) {
    if (node instanceof Element && node.hasAttribute('lang') && node.getAttribute('lang')) return node.getAttribute('lang')!;
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
  }
  if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang;
  return undefined;
}

const cache = new Map<string, Intl.NumberFormat | Intl.PluralRules | Intl.DateTimeFormat>();
function cached<T extends Intl.NumberFormat | Intl.PluralRules | Intl.DateTimeFormat>(kind: string, locale: string | undefined, opts: object, make: (l: string | undefined) => T): T {
  const key = `${kind}|${locale ?? ''}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as T | undefined;
  if (!f) {
    try { f = make(locale); } catch { f = make(undefined); } // an invalid lang attribute falls back to the browser's locale
    cache.set(key, f);
  }
  return f;
}

/** Formats a number for a locale (`Intl.NumberFormat`). */
export function formatNumber(n: number, options: Intl.NumberFormatOptions = {}, locale?: string) {
  return cached('n', locale, options, (l) => new Intl.NumberFormat(l, options)).format(n);
}

/** Formats a date for a locale (`Intl.DateTimeFormat`). */
export function formatDate(d: Date, options: Intl.DateTimeFormatOptions = {}, locale?: string) {
  return cached('d', locale, options, (l) => new Intl.DateTimeFormat(l, options)).format(d);
}

/** The plural category of a number in a locale: `one`, `few`, `other`… */
export function pluralCategory(n: number, locale?: string): Intl.LDMLPluralRule {
  return cached('p', locale, {}, (l) => new Intl.PluralRules(l)).select(n);
}

/** Fills a message with values: picks the plural form, substitutes `{placeholders}`, or calls the function. */
export function formatMessage(message: Message | undefined, vars: MessageVars = {}, locale?: string): string {
  if (message === undefined || message === null) return '';
  if (typeof message === 'function') return String(message(vars));
  let text: string;
  if (typeof message === 'object') {
    const n = Number(vars.count ?? 0);
    text = message[pluralCategory(n, locale)] ?? message.other ?? '';
  } else text = String(message);
  return text.replace(/\{(\w+)\}/g, (all, name: string) => {
    const v = vars[name];
    if (v === undefined) return all;
    return typeof v === 'number' ? formatNumber(v, {}, locale) : String(v);
  });
}

function lookup(ns: string, key: string, locale: string | undefined, own?: Record<string, Message> | null): Message | undefined {
  if (own && own[key] !== undefined) return own[key];
  const tags: string[] = [];
  if (locale) {
    const parts = locale.toLowerCase().split('-');
    for (let i = parts.length; i > 0; i--) tags.push(parts.slice(0, i).join('-'));
  }
  // The component's namespace first (app strings for its language, app strings for all, its English default),
  // then the same for `common`. A component that words a common key its own way keeps its wording.
  for (const n of ns === 'common' ? ['common'] : [ns, 'common']) {
    for (const t of tags) { const v = byLocale[t]?.[n]?.[key]; if (v !== undefined) return v; }
    const v = global[n]?.[key] ?? defaults[n]?.[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

/** The text of `namespace.key` for an element (its language, overrides), filled with `vars`. */
export function translate(ns: string, key: string, vars?: MessageVars, el?: Element | null, own?: Record<string, Message> | null) {
  const locale = localeFor(el);
  return formatMessage(lookup(ns, key, locale, own), vars, locale);
}

/* ---------- Keeping rendered components up to date ---------- */

const hosts = new Set<LitElement>();
let langObserver: MutationObserver | undefined;

function refresh() {
  for (const h of hosts) h.requestUpdate();
}

function watchLang() {
  if (langObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  // A `lang` change anywhere (e.g. a language switcher on <html>) re-renders the components.
  langObserver = new MutationObserver(refresh);
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'], subtree: true });
}

const camel = (tag: string) => tag.replace(/^cm-/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Base class of components with built-in text. Gives them the `strings` property, `t()` for their text in the
 * current language, `formatNumber()` and `locale`, and re-renders them when the app changes strings or language.
 */
export class CmLocalizedElement extends LitElement {
  static properties: LocalizedPropertyDeclarations = {
    strings: { type: Object },
  };

  /**
   * A property declared with `string: 'key'` (e.g. `saveLabel: { attribute: 'save-label', string: 'save' }`) reads
   * as that built-in string until it is set, so `el.saveLabel` is "Save" in English and the translation elsewhere.
   * Setting it overrides the string for this element; setting `undefined` goes back to the built-in one.
   */
  static finalize() {
    // Before Lit creates the properties: give each `string: 'key'` property an accessor that falls back to the
    // built-in string. Lit then wraps it (attributes, requestUpdate) like any accessor written in a class.
    const own = (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k);
    if (!own(this, 'finalized') && own(this, 'properties')) {
      for (const [name, options] of Object.entries(this.properties as LocalizedPropertyDeclarations)) {
        const string = options.string;
        if (!string || own(this.prototype, name)) continue;
        const key = Symbol(name);
        type Self = CmLocalizedElement & Record<PropertyKey, unknown>;
        Object.defineProperty(this.prototype, name, {
          get(this: Self) { return (this[key] as string | undefined | null) ?? this.t(string); },
          set(this: Self, value: unknown) { this[key] = value; },
          configurable: true,
          enumerable: true,
        });
      }
    }
    super.finalize();
  }

  /**
   * Replaces this component's built-in text (labels, accessible names, messages), key by key. In HTML pass JSON:
   * `strings='{"close":"Fermer"}'`. Keys and English defaults are listed under "Built-in text" on the component's
   * page; set text for every component at once with `configure()` or `setStrings()` (see Localisation).
   */
  strings?: Record<string, Message> | null;

  /** The string namespace: the tag name without `cm-`, in camelCase. */
  protected get stringsNamespace() { return camel(this.localName); }

  /** The component's text for `key`, in its language, with `{placeholders}` filled from `vars`. */
  protected t(key: string, vars?: MessageVars) {
    return translate(this.stringsNamespace, key, vars, this, this.strings);
  }

  /** The locale used for numbers, dates and plurals. */
  protected get locale() { return localeFor(this); }

  /** A number formatted for the component's locale. */
  protected formatNumber(n: number, options?: Intl.NumberFormatOptions) { return formatNumber(n, options, this.locale); }

  connectedCallback() {
    super.connectedCallback();
    hosts.add(this);
    watchLang();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    hosts.delete(this);
  }
}
