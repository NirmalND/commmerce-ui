/**
 * Moving an item between groups without dragging: pick it up, choose a group and a position with the arrow keys,
 * drop it or cancel, with every step announced through a live region.
 *
 * It holds no DOM of its own beyond the live region and knows nothing about boards: a group is a board column
 * today and a calendar day (or hour) later. The component tells it how many groups there are and how many
 * positions each one offers; it calls back when the target changes (draw a placeholder, scroll it into view) and
 * on drop or cancel (commit or restore), and asks the component for the words to announce, so all text stays
 * translatable in the component's own string table.
 *
 * Keys (the default `navigate`, used by `cm-board`): Left/Right the previous/next group (pass the key through
 * `logicalKey()` first, so they follow the reading direction), Up/Down the previous/next position, Home/End the
 * first/last position, Space or Enter drop, Escape cancels. Tab cancels and lets focus move on.
 */

/** A place an item can be dropped: a group (board column, calendar day) and a position in it, both from 0. */
export interface MovePlace {
  group: number;
  index: number;
}

export interface MoveModelOptions {
  /** How many groups there are now. */
  groupCount(): number;
  /**
   * How many positions a group offers the moving item: the items already in it (not counting the moving item)
   * plus one. A group the item can't go into returns 0 and is skipped.
   */
  slotCount(group: number): number;
  /**
   * Where a key takes the item from `at`: a place, or `null` when the key does nothing. Defaults to
   * `listNavigation` (groups side by side, positions top to bottom). A calendar month grid would map Up/Down to the
   * same weekday a week before/after instead.
   */
  navigate?(key: string, at: MovePlace, model: MoveModel): MovePlace | null;
  /** The target changed (also called on pick up, and with `null` when the move ends): draw the placeholder. */
  onTarget?(at: MovePlace | null): void;
  /** Dropped on a place: commit the move. Called with the starting place and the chosen one, also when they are the same. */
  onDrop(from: MovePlace, to: MovePlace): void;
  /** Cancelled (Escape, Tab, focus left, `cancel()`): the item stays where it was. */
  onCancel?(from: MovePlace): void;
  /** Words to announce, in the component's language. */
  messages: {
    /** Just picked up, at its starting place. */
    pickedUp(at: MovePlace): string;
    /** Moved over a new place. */
    over(at: MovePlace): string;
    /** Cancelled: back where it started. */
    cancelled(from: MovePlace): string;
  };
  /** Speaks a message: usually `Announcer.announce`. */
  announce(text: string): void;
}

/** Groups side by side (Left/Right), positions top to bottom (Up/Down, Home/End). Groups with no positions are skipped. */
export function listNavigation(key: string, at: MovePlace, model: MoveModel): MovePlace | null {
  const slots = (g: number) => model.slotCount(g);
  const last = (g: number) => Math.max(0, slots(g) - 1);
  const step = (dir: number) => {
    for (let g = at.group + dir; g >= 0 && g < model.groupCount(); g += dir) {
      if (slots(g) > 0) return { group: g, index: Math.min(at.index, last(g)) };
    }
    return { ...at };
  };
  switch (key) {
    case 'ArrowRight': return step(1);
    case 'ArrowLeft': return step(-1);
    case 'ArrowDown': return { group: at.group, index: Math.min(at.index + 1, last(at.group)) };
    case 'ArrowUp': return { group: at.group, index: Math.max(at.index - 1, 0) };
    case 'Home': return { group: at.group, index: 0 };
    case 'End': return { group: at.group, index: last(at.group) };
    default: return null;
  }
}

/** The keyboard move of one item at a time. */
export class MoveModel {
  #o: MoveModelOptions;
  #from: MovePlace | null = null;
  #to: MovePlace | null = null;

  constructor(options: MoveModelOptions) {
    this.#o = options;
  }

  /** An item is picked up. */
  get active() { return this.#from !== null; }
  /** Where the item started, while picked up. */
  get from(): MovePlace | null { return this.#from && { ...this.#from }; }
  /** Where it would be dropped now, while picked up. */
  get target(): MovePlace | null { return this.#to && { ...this.#to }; }

  groupCount() { return this.#o.groupCount(); }
  slotCount(group: number) { return group >= 0 && group < this.#o.groupCount() ? this.#o.slotCount(group) : 0; }

  /** Picks up the item at `from` and announces it. A move already under way is cancelled first. */
  pickUp(from: MovePlace) {
    if (this.active) this.cancel();
    this.#from = { ...from };
    this.#to = { ...from };
    this.#o.onTarget?.(this.target);
    this.#o.announce(this.#o.messages.pickedUp(this.target!));
  }

  /** Moves the target to `to` (clamped to the group's positions) and announces it. */
  moveTo(to: MovePlace) {
    if (!this.#to) return;
    const g = Math.max(0, Math.min(to.group, this.#o.groupCount() - 1));
    const n = this.slotCount(g);
    if (n <= 0) return;
    this.#to = { group: g, index: Math.max(0, Math.min(to.index, n - 1)) };
    this.#o.onTarget?.(this.target);
    this.#o.announce(this.#o.messages.over(this.target!));
  }

  /** Drops at the current target. */
  drop() {
    if (!this.#from || !this.#to) return;
    const from = this.#from, to = this.#to;
    this.#from = this.#to = null;
    this.#o.onTarget?.(null);
    this.#o.onDrop(from, to);
  }

  /** Puts the item back without moving it, and announces that. Does nothing when nothing is picked up. */
  cancel(silent = false) {
    if (!this.#from) return;
    const from = this.#from;
    // The words first: the component may forget the item in onCancel.
    const message = silent ? '' : this.#o.messages.cancelled(from);
    this.#from = this.#to = null;
    this.#o.onTarget?.(null);
    this.#o.onCancel?.(from);
    if (message) this.#o.announce(message);
  }

  /**
   * Handles a key while an item is picked up. Pass `logicalKey(e, host)` as `key` so Left/Right follow the
   * reading direction. Returns true when the key was used: call `preventDefault()` then. Tab cancels but returns
   * false, so focus moves on as usual.
   */
  handleKey(e: KeyboardEvent, key: string = e.key): boolean {
    if (!this.active || e.altKey || e.ctrlKey || e.metaKey) return false;
    if (key === ' ' || key === 'Enter') { this.drop(); return true; }
    if (key === 'Escape') { this.cancel(); return true; }
    if (key === 'Tab') { this.cancel(); return false; }
    const next = (this.#o.navigate ?? listNavigation)(key, this.#to!, this);
    if (!next) return false;
    this.moveTo(next);
    return true;
  }
}

/**
 * A visually hidden live region for move announcements. Repeating the same words is announced again (the text is
 * cleared first). `assertive`, because each message answers a key the person just pressed.
 */
export class Announcer {
  readonly element: HTMLElement;
  #timer?: ReturnType<typeof setTimeout>;

  constructor(doc: Document = document, politeness: 'assertive' | 'polite' = 'assertive') {
    const el = doc.createElement('div');
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'cm-announcer';
    Object.assign(el.style, {
      position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0', overflow: 'hidden',
      clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: '0',
    });
    this.element = el;
  }

  /** The last message, as it is (or will be) in the live region. */
  get text() { return this.#pending ?? this.element.textContent ?? ''; }
  #pending?: string;

  /** Speaks `text`. Text set twice in a row is still announced twice. */
  announce(text: string) {
    clearTimeout(this.#timer);
    if (this.element.textContent === text) {
      this.element.textContent = '';
      this.#pending = text;
      this.#timer = setTimeout(() => { this.element.textContent = text; this.#pending = undefined; }, 50);
    } else {
      this.#pending = undefined;
      this.element.textContent = text;
    }
  }
}
