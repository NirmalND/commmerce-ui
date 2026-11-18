import { css, html, nothing, type TemplateResult } from 'lit';

/**
 * The floating list under a text box, shared by `cm-combobox` and `cm-global-search`: `.pop` sits 10px under its
 * positioned parent (`.wrap`), full width, over the content below; `.message` is its "Loading" / "No results"
 * line and `.vh` hides live-region text visually.
 */
export const popoverStyles = css`
  .pop {
    position: absolute; z-index: 20; inset-block-start: calc(100% + var(--cm-space-4)); inset-inline: 0;
    background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
    border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md); overflow: hidden;
  }
  .pop[hidden] { display: none; }
  .message { display: flex; align-items: center; gap: var(--cm-space-8); margin: 0; padding: var(--cm-space-12) var(--cm-space-20); font-size: 14px; color: var(--cm-text-tertiary); }
  .vh {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
`;

/** Calls `close` when a pointer goes down outside `host` (through shadow roots). Returns the function that stops listening. */
export function closeOnOutsidePointer(host: HTMLElement, isOpen: () => boolean, close: () => void): () => void {
  const listener = (e: Event) => { if (isOpen() && !e.composedPath().includes(host)) close(); };
  document.addEventListener('pointerdown', listener, true);
  return () => document.removeEventListener('pointerdown', listener, true);
}

/**
 * Group headings inside a listbox, shared by `cm-global-search`, `cm-select` and `cm-combobox`: each group is a
 * `role="group"` element labelled (`aria-labelledby`) by its `.gh` heading, which is `role="presentation"` so it
 * is never an option. Groups after another group, or after an ungrouped option, get a line above them.
 */
export const groupStyles = css`
  [role='group'] + [role='group'] { margin-block-start: var(--cm-space-4); padding-block-start: var(--cm-space-4); border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
  [role='option'] + [role='group'], [role='group'] + [role='option'] { margin-block-start: var(--cm-space-4); padding-block-start: var(--cm-space-4); border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
  .gh {
    display: flex; align-items: baseline; gap: var(--cm-space-8); padding: var(--cm-space-8) var(--cm-space-12) var(--cm-space-4);
    font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); font-weight: 500; color: var(--cm-text-tertiary);
  }
  .gh .count { font-weight: 400; color: var(--cm-text-tertiary); }
  .gopts { list-style: none; margin: 0; padding: 0; }
`;

/**
 * Puts options of the same `group` together, in the order the groups first appear. Options without a group stay
 * where they are (as in a native select, where options can come before or after an `<optgroup>`). Returns the
 * same array when no option has a group.
 */
export function sortByGroup<T extends { group?: string }>(items: T[]): T[] {
  if (!items.some((o) => o.group)) return items;
  const buckets: Array<{ key: string; items: T[] }> = [];
  const byKey = new Map<string, T[]>();
  for (const o of items) {
    if (o.group) {
      const b = byKey.get(o.group);
      if (b) b.push(o);
      else { const n = [o]; byKey.set(o.group, n); buckets.push({ key: o.group, items: n }); }
    } else {
      const last = buckets[buckets.length - 1];
      if (last && !last.key) last.items.push(o);
      else buckets.push({ key: '', items: [o] });
    }
  }
  return buckets.flatMap((b) => b.items);
}

/** Splits rows (already in group order) into runs: `group` is '' for options outside any group. `index` is the row's position. */
export function groupRuns<T extends { group?: string }>(rows: T[]): Array<{ group: string; rows: Array<{ row: T; index: number }> }> {
  const runs: Array<{ group: string; rows: Array<{ row: T; index: number }> }> = [];
  rows.forEach((row, index) => {
    const g = row.group || '';
    const last = runs[runs.length - 1];
    if (last && last.group === g) last.rows.push({ row, index });
    else runs.push({ group: g, rows: [{ row, index }] });
  });
  return runs;
}

/**
 * Rows of a grouped results listbox, shared by `cm-global-search` and `cm-command-palette`: options with an
 * optional icon, a title and a grey second line, the highlighted one with a grey fill and a bar on the start
 * edge, "See all" rows (`.all`), and key hints (`kbd`).
 */
export const resultStyles = css`
  [role='listbox'] { padding-block: var(--cm-space-4); }
  [role='listbox'][hidden] { display: none; }
  [role='option'] {
    display: flex; align-items: center; gap: var(--cm-space-8); min-height: var(--cm-control-height-md); padding: var(--cm-space-8) var(--cm-space-12);
    font-size: 14px; line-height: 20px; color: var(--cm-text-default); text-decoration: none; cursor: pointer;
  }
  [role='option'].active { background: var(--cm-bg-hover); box-shadow: inset 2px 0 0 var(--cm-border-strong); }
  [role='option'].active:dir(rtl) { box-shadow: inset -2px 0 0 var(--cm-border-strong); }
  [role='option'] cm-icon { flex: none; color: var(--cm-icon-selected); }
  .text { flex: 1; min-width: 0; }
  .title, .desc { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .desc { font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); }
  .all { font-size: var(--cm-font-size-13); text-decoration: underline; }
  .gh { padding-inline: var(--cm-space-12); }
  kbd {
    flex: none; min-width: 20px; padding: 0 var(--cm-space-4); font: inherit; font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); text-align: center;
    color: var(--cm-text-tertiary); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-xs);
  }
`;

/** What a result row shows: `cm-global-search` and `cm-command-palette` items. */
export interface ResultContent { title: string; description?: string; icon?: string }

/** A group heading for a grouped listbox (see `groupStyles`), with an optional count read as `countLabel`. */
export function resultGroupHeading(id: string, label: string, count?: string, countLabel?: string) {
  return html`<div role="presentation" class="gh" id=${id}><span>${label}</span>${count !== undefined
    ? html`<span class="count" aria-hidden="true">${count}</span><span class="vh">, ${countLabel}</span>` : nothing}</div>`;
}

/** Icon, title and second line of a result, then `after` (e.g. key hints). The second line is read after a comma. */
export function resultContent(it: ResultContent, after: unknown = nothing) {
  return html`${it.icon ? html`<cm-icon name=${it.icon} size="16"></cm-icon>` : nothing}<span class="text"><span class="title">${it.title}</span>${it.description ? html`<span class="vh">, </span><span class="desc">${it.description}</span>` : nothing}</span>${after}`;
}

/**
 * One option of a results listbox: a link when it has an `href` (choosing it follows the link unless `cm-select`
 * is cancelled), otherwise a plain option for an action your app runs.
 */
export function resultOption(o: {
  id: string; active: boolean; href?: string; cls?: string; keyshortcuts?: string;
  onHover: () => void; onChoose: (e: MouseEvent) => void;
}, content: unknown): TemplateResult {
  const cls = `${o.cls ?? ''}${o.active ? ' active' : ''}`;
  return o.href
    ? html`<a role="option" id=${o.id} class=${cls} href=${o.href} tabindex="-1" aria-selected=${o.active ? 'true' : 'false'}
        aria-keyshortcuts=${o.keyshortcuts || nothing} @pointerenter=${o.onHover} @click=${o.onChoose}>${content}</a>`
    : html`<div role="option" id=${o.id} class=${cls} tabindex="-1" aria-selected=${o.active ? 'true' : 'false'}
        aria-keyshortcuts=${o.keyshortcuts || nothing} @pointerenter=${o.onHover} @click=${o.onChoose}>${content}</div>`;
}

/** The next highlighted row for a step (wrapping), or -1 when there are no rows. */
export function moveActive(active: number, step: number, count: number): number {
  if (!count) return -1;
  if (active < 0) return step > 0 ? 0 : count - 1;
  return (active + step + count) % count;
}
