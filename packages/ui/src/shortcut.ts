/**
 * Keyboard shortcuts for components that listen on the whole page (`cm-command-palette`, `cm-global-search`).
 * A shortcut is written `mod+k`, `ctrl+shift+p`, `alt+n` or `/`: modifiers joined to the key with `+`.
 * `mod` is Cmd on macOS and iOS and Ctrl everywhere else. Several keys pressed one after the other (a hint like
 * `g t`) are separated by spaces; they are only shown, never listened for.
 */

/** True on Apple platforms, where `mod` means Cmd. */
export function isApplePlatform(): boolean {
  const nav = typeof navigator === 'undefined' ? undefined : navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav?.userAgentData?.platform || nav?.platform || '');
}

interface Parsed { key: string; ctrl: boolean; meta: boolean; alt: boolean; shift: boolean }

const ALIASES: Record<string, string> = { esc: 'escape', return: 'enter', space: ' ', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', plus: '+' };

function parse(spec: string, apple: boolean): Parsed | null {
  const parts = spec.trim().toLowerCase().split('+').map((p) => p.trim());
  // "mod++" is mod and the plus key.
  if (parts.length > 1 && parts[parts.length - 1] === '' && parts[parts.length - 2] === '') parts.splice(-2, 2, '+');
  const key = parts.pop();
  if (!key) return null;
  const p: Parsed = { key: ALIASES[key] ?? key, ctrl: false, meta: false, alt: false, shift: false };
  for (const m of parts) {
    if (m === 'mod') { if (apple) p.meta = true; else p.ctrl = true; }
    else if (m === 'ctrl' || m === 'control') p.ctrl = true;
    else if (m === 'meta' || m === 'cmd' || m === 'command') p.meta = true;
    else if (m === 'alt' || m === 'option' || m === 'opt') p.alt = true;
    else if (m === 'shift') p.shift = true;
    else return null;
  }
  return p;
}

/** Whether a shortcut holds Ctrl, Cmd or Alt (Shift alone doesn't count: Shift+letter types a letter). */
export function shortcutHasModifier(spec: string, apple = isApplePlatform()): boolean {
  const p = parse(spec, apple);
  return !!p && (p.ctrl || p.meta || p.alt);
}

/** Whether a key press is the shortcut. Modifiers must match exactly; Shift is ignored for symbol keys (`?`, `/`). */
export function matchesShortcut(e: KeyboardEvent, spec: string, apple = isApplePlatform()): boolean {
  const p = parse(spec, apple);
  if (!p || !e.key) return false;
  if (e.ctrlKey !== p.ctrl || e.metaKey !== p.meta || e.altKey !== p.alt) return false;
  const letterOrDigit = /^[a-z0-9]$/.test(p.key);
  if ((letterOrDigit || p.key.length > 1) && e.shiftKey !== p.shift) return false;
  if (e.key.toLowerCase() === p.key) return true;
  // Alt (Option on a Mac) changes the character typed: fall back to the physical key.
  if (letterOrDigit) return e.code === (/\d/.test(p.key) ? `Digit${p.key}` : `Key${p.key.toUpperCase()}`);
  return false;
}

/** Whether a key press happened while typing in a field (input, textarea, select or editable text), through shadow roots. */
export function isTypingTarget(e: Event): boolean {
  const t = e.composedPath()[0] as HTMLElement | undefined;
  return !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.localName ?? ''));
}

const APPLE_NAMES: Record<string, string> = { meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧' };
const OTHER_NAMES: Record<string, string> = { meta: 'Win', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' };
const KEY_NAMES: Record<string, string> = {
  escape: 'Esc', enter: '↵', ' ': 'Space', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
  backspace: '⌫', delete: 'Del', tab: 'Tab', pageup: 'PgUp', pagedown: 'PgDn', home: 'Home', end: 'End',
};
const keyName = (k: string) => KEY_NAMES[k] ?? (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));

/**
 * The keys of a shortcut as they are printed on keycaps, one entry per `<kbd>`: `mod+shift+n` is ⌘ ⇧ N on a Mac
 * and Ctrl Shift N elsewhere; `g t` is G T. Text that isn't a shortcut is returned as one entry.
 */
export function shortcutKeys(spec: string, apple = isApplePlatform()): string[] {
  const out: string[] = [];
  for (const step of spec.trim().split(/\s+/).filter(Boolean)) {
    const p = parse(step, apple);
    if (!p) return [spec.trim()];
    const names = apple ? APPLE_NAMES : OTHER_NAMES;
    // Apple's order is Ctrl Alt Shift Cmd; elsewhere Ctrl Win Alt Shift.
    const order: Array<keyof typeof names> = apple ? ['ctrl', 'alt', 'shift', 'meta'] : ['ctrl', 'meta', 'alt', 'shift'];
    for (const m of order) if (p[m as 'ctrl']) out.push(names[m]);
    out.push(keyName(p.key));
  }
  return out;
}

/** The shortcut in `aria-keyshortcuts` form (`Meta+K`, `Control+Shift+N`), or '' for a key sequence or text. */
export function ariaKeyShortcut(spec: string, apple = isApplePlatform()): string {
  if (/\s/.test(spec.trim())) return '';
  const p = parse(spec, apple);
  if (!p) return '';
  // aria-keyshortcuts uses KeyboardEvent.key names: K, Space, Escape, ArrowUp, PageDown.
  const k = p.key === ' ' ? 'Space' : p.key.length === 1 ? p.key.toUpperCase()
    : p.key.replace(/^(arrow|page)?(\w)/, (_, pre: string | undefined, c: string) => pre ? `${pre[0].toUpperCase()}${pre.slice(1)}${c.toUpperCase()}` : c.toUpperCase());
  return [p.ctrl && 'Control', p.meta && 'Meta', p.alt && 'Alt', p.shift && 'Shift', k].filter(Boolean).join('+');
}
