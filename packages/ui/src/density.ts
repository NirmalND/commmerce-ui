/**
 * Row density for tables and lists (since 1.6): `comfortable` (the default) or `compact`.
 *
 * A screen switches every table and list inside it with `data-cm-density="compact"` on any ancestor (`<body>`, a
 * page, a card). The rule below turns that attribute into custom properties, which inherit into the components'
 * shadow roots; a component's own `density` attribute overrides it. Components read the properties with their
 * comfortable value as the fallback, so a page that never sets a density gets comfortable rows.
 *
 *   --cm-table-row-height       data table body rows: 48px comfortable, 40px compact
 *   --cm-resource-row-height    resource list rows: 56px comfortable, 40px compact
 *   --cm-resource-row-padding   resource list rows' padding above and below: 8px / 4px
 *   --cm-resource-media-size    resource list thumbnails: 40px / 32px
 *
 * On touch screens (pointer: coarse) rows stay at least 44px tall (`--cm-control-height-touch`) at either density.
 */
export const DENSITY_CSS = `
[data-cm-density="compact"] { --cm-table-row-height: 40px; --cm-resource-row-height: 40px; --cm-resource-row-padding: 4px; --cm-resource-media-size: 32px; }
[data-cm-density="comfortable"] { --cm-table-row-height: 48px; --cm-resource-row-height: 56px; --cm-resource-row-padding: 8px; --cm-resource-media-size: 40px; }
`;

let sheet: CSSStyleSheet | null = null;
const adopted = new WeakSet<Document | ShadowRoot>();

/**
 * Adds the density rule to the document (or shadow root) the element lives in, once. Inside another component's
 * shadow root the rule is added there too, so an ancestor in that tree can set `data-cm-density`.
 */
export function adoptDensity(el: Element) {
  if (typeof document === 'undefined' || typeof CSSStyleSheet === 'undefined') return;
  const roots: Array<Document | ShadowRoot> = [document];
  const root = el.getRootNode();
  if (root instanceof ShadowRoot) roots.push(root);
  for (const r of roots) {
    if (adopted.has(r)) continue;
    adopted.add(r);
    try {
      if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(DENSITY_CSS); }
      r.adoptedStyleSheets = [...r.adoptedStyleSheets, sheet];
    } catch { /* very old browsers: compact density then comes only from the component's own attribute */ }
  }
}
