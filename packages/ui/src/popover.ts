import { css } from 'lit';

/**
 * The floating list under a text box, shared by `cm-combobox` and `cm-global-search`: `.pop` sits 10px under its
 * positioned parent (`.wrap`), full width, over the content below; `.message` is its "Loading" / "No results"
 * line and `.vh` hides live-region text visually.
 */
export const popoverStyles = css`
  .pop {
    position: absolute; z-index: 20; inset-block-start: calc(100% + var(--cm-space-10)); inset-inline: 0;
    background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-default);
    border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-100); overflow: hidden;
  }
  .pop[hidden] { display: none; }
  .message { display: flex; align-items: center; gap: var(--cm-space-10); margin: 0; padding: var(--cm-space-15) var(--cm-space-20); font-size: 14px; color: var(--cm-text-tertiary); }
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
  [role='group'] + [role='group'] { margin-block-start: 6px; padding-block-start: 6px; border-top: var(--cm-border-1) solid var(--cm-border-default); }
  [role='option'] + [role='group'], [role='group'] + [role='option'] { margin-block-start: 6px; padding-block-start: 6px; border-top: var(--cm-border-1) solid var(--cm-border-default); }
  .gh {
    display: flex; align-items: baseline; gap: var(--cm-space-10); padding: 6px var(--cm-space-20) 2px;
    font-size: 12px; line-height: 16px; font-weight: 600; color: var(--cm-text-default);
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
