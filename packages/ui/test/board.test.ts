import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { page, userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { resetStrings, MoveModel, Announcer, listNavigation } from '../src/index.js';
import type { CmBoard, CmBoardColumn, CmBoardCard, BoardMoveDetail, MovePlace } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const frames = (n = 2) => new Promise<void>((r) => {
  const step = (k: number) => (k <= 0 ? r() : requestAnimationFrame(() => step(k - 1)));
  step(n);
});
const settle = async (board: CmBoard) => {
  await new Promise((r) => setTimeout(r));
  await board.updateComplete;
  await Promise.all(board.columns.map((c) => c.updateComplete));
  await Promise.all(board.columns.flatMap((c) => c.cards.map((k) => k.updateComplete)));
};

const card = (value: string, name: string, extra = '') => `<cm-board-card value="${value}" heading="${name}" ${extra}><span>Owner: Asha</span></cm-board-card>`;
const MARKUP = `<cm-board label="Merchants by status" style="height:480px">
  <cm-board-column value="new" heading="New" total="5">${card('m1', 'Ravi Stores')}${card('m2', 'Asha Textiles')}</cm-board-column>
  <cm-board-column value="contacted" heading="Contacted">${card('m3', 'Blue Pottery')}${card('m4', 'Kiran Foods')}${card('m5', 'Delhi Spices')}</cm-board-column>
  <cm-board-column value="demo" heading="Demo booked"></cm-board-column>
</cm-board>`;

async function mount(markup = MARKUP): Promise<CmBoard> {
  document.body.innerHTML = markup;
  const board = document.querySelector('cm-board') as CmBoard;
  await settle(board);
  await frames();
  return board;
}
const col = (b: CmBoard, v: string) => b.column(v)!;
const names = (c: CmBoardColumn) => c.cards.map((k) => k.heading);
const handle = (c: CmBoardCard) => shadow(c, '.handle');
const onHandle = (c: CmBoardCard) => c.shadowRoot!.activeElement === handle(c);

/** Waits for the live region to say something matching. */
async function announced(board: CmBoard, re: RegExp) {
  await vi.waitFor(() => expect(board.announcement).toMatch(re), { timeout: 1000, interval: 20 });
}

const pointer = (type: string, target: EventTarget, x: number, y: number, pointerType = 'mouse', pointerId = 1) => {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y, pointerId, pointerType, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
  }));
};
const centre = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

beforeAll(async () => {
  const end = Date.now() + 10_000; // tokens.css waits for its font import in Firefox and WebKit
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(async () => { document.body.innerHTML = ''; resetStrings(); await page.viewport(1280, 800); });
afterAll(async () => { resetStrings(); await page.viewport(414, 896); });

describe('cm-board: semantics', () => {
  it('board is a named group; each column a region named by its heading and count, with a list of cards', async () => {
    const b = await mount();
    expect(shadow(b, '.board').getAttribute('role')).toBe('group');
    expect(shadow(b, '.board').getAttribute('aria-label')).toBe('Merchants by status');
    const c = col(b, 'new');
    const section = shadow(c, 'section');
    const heading = shadow(c, '[role="heading"]');
    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.getAttribute('aria-level')).toBe('3');
    // The visible count is `total` (5), more than the 2 cards loaded; screen readers hear it after the heading.
    expect(heading.textContent!.replace(/\s+/g, ' ').trim()).toBe('New, 5 cards');
    expect(shadow(c, '.count').textContent).toBe('5');
    expect(shadow(c, '.count').getAttribute('aria-hidden')).toBe('true');
    const ul = shadow(c, 'ul');
    expect(ul.getAttribute('role')).toBe('list');
    expect(ul.getAttribute('aria-labelledby')).toBe(heading.id);
    const lis = ul.querySelectorAll(':scope > li');
    expect(lis).toHaveLength(2);
    lis.forEach((li, i) => expect((li.querySelector('slot') as HTMLSlotElement).assignedElements()).toEqual([c.cards[i]]));
    // Unknown children are not shown.
    c.insertAdjacentHTML('beforeend', '<p>stray</p>');
    await settle(b);
    expect(document.querySelector('p')!.getBoundingClientRect().height).toBe(0);
  });

  it('each card is one focusable handle: a button with a role description, its name and the instructions; no aria-grabbed', async () => {
    const b = await mount();
    const k = b.card('m1')!;
    const h = handle(k);
    expect(h.getAttribute('role')).toBe('button');
    expect(h.getAttribute('tabindex')).toBe('0');
    expect(h.getAttribute('aria-roledescription')).toBe('movable card');
    expect(h.getAttribute('aria-label')).toBe('Ravi Stores');
    const help = k.shadowRoot!.getElementById(h.getAttribute('aria-describedby')!)!;
    expect(help.textContent).toMatch(/^Press Space to pick up\. Then use the arrow keys/);
    expect(document.body.innerHTML + b.shadowRoot!.innerHTML).not.toContain('aria-grabbed');
    expect(k.shadowRoot!.innerHTML).not.toContain('aria-grabbed');
    // card.focus() lands on the handle (delegatesFocus).
    k.focus();
    expect(onHandle(k)).toBe(true);
  });

  it('a card with href: the title is a link, Enter on the card opens it, and the instructions say so', async () => {
    const b = await mount(`<cm-board><cm-board-column heading="New">${card('m1', 'Ravi Stores', 'href="#ravi"')}</cm-board-column></cm-board>`);
    const k = b.card('m1')!;
    const a = shadow(k, '.title a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('#ravi');
    expect(a.tabIndex).toBe(-1); // one Tab stop per card: the handle
    expect(k.shadowRoot!.getElementById(handle(k).getAttribute('aria-describedby')!)!.textContent).toMatch(/^Press Enter to open\. Press Space/);
    const clicked = vi.fn((e: Event) => e.preventDefault());
    a.addEventListener('click', clicked);
    k.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(b.heldCard).toBeNull();
  });

  it('a locked card has no handle and can\'t be picked up or dragged', async () => {
    const b = await mount(`<cm-board><cm-board-column heading="A">${card('m1', 'Ravi Stores', 'locked')}</cm-board-column><cm-board-column heading="B"></cm-board-column></cm-board>`);
    const k = b.card('m1')!;
    expect(k.shadowRoot!.querySelector('.handle')).toBeNull();
    expect(b.pickUp(k)).toBe(false);
    const moves = vi.fn();
    b.addEventListener('cm-move', moves);
    const p = centre(k), t = centre(b.columns[1]);
    pointer('pointerdown', k, p.x, p.y);
    pointer('pointermove', k, t.x, t.y);
    pointer('pointerup', k, t.x, t.y);
    expect(moves).not.toHaveBeenCalled();
    expect(b.dragging).toBe(false);
  });
});

describe('cm-board: keyboard move', () => {
  it('Space picks up, arrows choose column and position, Enter drops: cm-move, the card moves, totals follow, focus stays', async () => {
    const b = await mount();
    const moves: BoardMoveDetail[] = [];
    b.addEventListener('cm-move', (e) => moves.push((e as CustomEvent<BoardMoveDetail>).detail));
    const k = b.card('m1')!;
    col(b, 'contacted').total = 9;
    k.focus();
    await userEvent.keyboard(' ');
    await announced(b, /^Picked up Ravi Stores\. Column New, position 1 of 2\.$/);
    expect(k.moving).toBe(true);
    expect(b.heldCard).toBe(k);
    await userEvent.keyboard('{ArrowRight}');
    await announced(b, /^Column Contacted, position 1 of 4\.$/);
    await userEvent.keyboard('{ArrowDown}');
    await announced(b, /^Column Contacted, position 2 of 4\.$/);
    // The placeholder shows where it will land, named after the card, hidden from screen readers.
    await settle(b);
    const drop = shadow(col(b, 'contacted'), 'li.drop');
    expect(drop.getAttribute('aria-hidden')).toBe('true');
    expect(drop.textContent!.trim()).toBe('Ravi Stores');
    const lis = [...col(b, 'contacted').shadowRoot!.querySelectorAll('ul > li')];
    expect(lis.indexOf(drop)).toBe(1);
    await userEvent.keyboard('{Enter}');
    await settle(b);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ value: 'm1', from: 'new', to: 'contacted', fromIndex: 0, toIndex: 1, source: 'keyboard' });
    expect(moves[0].card).toBe(k);
    expect(moves[0].fromColumn).toBe(col(b, 'new'));
    expect(names(col(b, 'contacted'))).toEqual(['Blue Pottery', 'Ravi Stores', 'Kiran Foods', 'Delhi Spices']);
    expect(names(col(b, 'new'))).toEqual(['Asha Textiles']);
    expect(col(b, 'new').total).toBe(4);
    expect(col(b, 'contacted').total).toBe(10);
    await announced(b, /^Moved Ravi Stores to Contacted, position 2 of 4\.$/);
    expect(k.moving).toBe(false);
    expect(onHandle(k)).toBe(true);
    expect(col(b, 'contacted').shadowRoot!.querySelector('li.drop')).toBeNull();
  });

  it('reorders within a column with Up/Down, Home and End', async () => {
    const b = await mount();
    const k = b.card('m3')!;
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{End}');
    await announced(b, /position 3 of 3/);
    await userEvent.keyboard('{ArrowDown}'); // already last: stays
    await announced(b, /position 3 of 3/);
    await userEvent.keyboard(' ');
    await settle(b);
    expect(names(col(b, 'contacted'))).toEqual(['Kiran Foods', 'Delhi Spices', 'Blue Pottery']);
    await announced(b, /^Moved Blue Pottery to Contacted, position 3 of 3\.$/);
  });

  it('moves into an empty column, and dropping where it started fires nothing', async () => {
    const b = await mount();
    const moves = vi.fn();
    b.addEventListener('cm-move', moves);
    const k = b.card('m2')!;
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Enter}');
    await announced(b, /^Asha Textiles dropped where it started\.$/);
    expect(moves).not.toHaveBeenCalled();
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await announced(b, /^Column Demo booked, position 1 of 1\.$/);
    await userEvent.keyboard('{ArrowRight}'); // no column further: stays
    await announced(b, /^Column Demo booked, position 1 of 1\.$/);
    await userEvent.keyboard('{Enter}');
    await settle(b);
    expect(names(col(b, 'demo'))).toEqual(['Asha Textiles']);
    expect(moves).toHaveBeenCalledTimes(1);
  });

  it('Escape cancels: no event, the card stays, the move is announced as cancelled', async () => {
    const b = await mount();
    const moves = vi.fn();
    b.addEventListener('cm-move', moves);
    const k = b.card('m1')!;
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Escape}');
    await settle(b);
    expect(moves).not.toHaveBeenCalled();
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Asha Textiles']);
    await announced(b, /^Move cancelled\. Ravi Stores is back in New\.$/);
    expect(k.moving).toBe(false);
    expect(b.heldCard).toBeNull();
    expect(onHandle(k)).toBe(true);
  });

  it('focus leaving the held card cancels the move', async () => {
    const b = await mount(MARKUP + '<button id="out">Elsewhere</button>');
    const k = b.card('m1')!;
    k.focus();
    await userEvent.keyboard(' ');
    expect(b.heldCard).toBe(k);
    (document.getElementById('out') as HTMLButtonElement).focus();
    await vi.waitFor(() => expect(b.heldCard).toBeNull());
    expect(k.moving).toBe(false);
    await announced(b, /^Move cancelled/);
  });

  it('arrow keys without picking up move focus between cards (no move)', async () => {
    const b = await mount();
    b.card('m1')!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onHandle(b.card('m2')!)).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    expect(onHandle(b.card('m4')!)).toBe(true);
    await userEvent.keyboard('{ArrowUp}');
    expect(onHandle(b.card('m3')!)).toBe(true);
    expect(b.heldCard).toBeNull();
  });

  it('a "Move" menu item can pick the card up with pickUp(); focus ends on the card even after the menu returns it', async () => {
    const b = await mount(`<cm-board><cm-board-column heading="A" value="a">
      <cm-board-card value="m1" heading="Ravi Stores"><cm-action-menu slot="actions" icon-only label="Actions for Ravi Stores"><cm-menu-item value="move">Move</cm-menu-item></cm-action-menu></cm-board-card>
    </cm-board-column><cm-board-column heading="B" value="b"></cm-board-column></cm-board>`);
    const k = b.card('m1')!;
    const menu = k.querySelector('cm-action-menu')!;
    menu.addEventListener('cm-select', () => b.pickUp(k));
    await menu.updateComplete;
    shadow(menu, '.trigger').click();
    await menu.updateComplete;
    (shadow(menu, '[role="menuitem"]')).click();
    await frames(3);
    expect(b.heldCard).toBe(k);
    expect(onHandle(k)).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    await settle(b);
    expect(b.column('b')!.cards).toEqual([k]);
  });
});

describe('cm-board: the app decides', () => {
  it('preventDefault() on cm-move keeps the card where it was and says so', async () => {
    const b = await mount();
    b.addEventListener('cm-move', (e) => e.preventDefault());
    const k = b.card('m1')!;
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    await settle(b);
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Asha Textiles']);
    expect(col(b, 'new').total).toBe(5);
    await announced(b, /^Ravi Stores can't be moved to Contacted\.$/);
    expect(onHandle(k)).toBe(true);
  });

  it('waitUntil(): the card is pending while saving; a rejected save puts it back, restores totals and announces it', async () => {
    const b = await mount();
    let fail!: (e: Error) => void;
    b.addEventListener('cm-move', (e) => (e as CustomEvent<BoardMoveDetail>).detail.waitUntil(new Promise((_, rej) => { fail = rej; })));
    const k = b.card('m1')!;
    expect(b.moveCard(k, 'demo')).toBe(true);
    await settle(b);
    expect(names(col(b, 'demo'))).toEqual(['Ravi Stores']);
    expect(col(b, 'new').total).toBe(4);
    expect(k.pending).toBe(true);
    await k.updateComplete;
    expect(k.hasAttribute('pending')).toBe(true);
    expect(handle(k).getAttribute('aria-label')).toBe('Ravi Stores, Saving');
    expect(b.pickUp(k)).toBe(false); // can't move again while saving
    fail(new Error('Network'));
    await vi.waitFor(() => expect(k.pending).toBe(false));
    await settle(b);
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Asha Textiles']);
    expect(col(b, 'new').total).toBe(5);
    await announced(b, /^Couldn't move Ravi Stores\. It is back in New\.$/);
  });

  it('a resolved save clears pending and keeps the move; revert() after that does nothing', async () => {
    const b = await mount();
    b.addEventListener('cm-move', (e) => (e as CustomEvent<BoardMoveDetail>).detail.waitUntil(Promise.resolve()));
    const k = b.card('m3')!;
    b.moveCard('m3', 'new', 0);
    await vi.waitFor(() => expect(k.pending).toBe(false));
    expect(names(col(b, 'new'))).toEqual(['Blue Pottery', 'Ravi Stores', 'Asha Textiles']);
    expect(b.revert(k)).toBe(false);
  });

  it('revert() puts the last move back (e.g. the server said no later)', async () => {
    const b = await mount();
    const k = b.card('m4')!;
    b.moveCard(k, 'new', 1);
    await settle(b);
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Kiran Foods', 'Asha Textiles']);
    expect(b.revert('m4')).toBe(true);
    await settle(b);
    expect(names(col(b, 'contacted'))).toEqual(['Blue Pottery', 'Kiran Foods', 'Delhi Spices']);
    expect(col(b, 'new').total).toBe(5);
    expect(b.revert('m4')).toBe(false);
  });

  it('controlled: cm-move fires but the board leaves the DOM and totals to the app, and refocuses the re-rendered card', async () => {
    const b = await mount(MARKUP.replace('<cm-board ', '<cm-board controlled '));
    const moves: BoardMoveDetail[] = [];
    b.addEventListener('cm-move', (e) => {
      const d = (e as CustomEvent<BoardMoveDetail>).detail;
      moves.push(d);
      // The app re-renders: a new element for the card in the new column, the old one removed.
      setTimeout(() => {
        d.card.remove();
        d.toColumn.insertAdjacentHTML('afterbegin', card(d.value, 'Ravi Stores'));
      }, 20);
    });
    const k = b.card('m1')!;
    k.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    expect(moves).toHaveLength(1);
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Asha Textiles']); // untouched until the app moves it
    expect(col(b, 'new').total).toBe(5);
    await vi.waitFor(() => expect(col(b, 'contacted').cards[0].value).toBe('m1'));
    const fresh = col(b, 'contacted').cards[0];
    await vi.waitFor(() => expect(onHandle(fresh)).toBe(true));
    expect(b.revert(fresh)).toBe(false);
  });
});

describe('cm-board: pointer drag', () => {
  it('mouse: drags past a small threshold, shows a ghost and a placeholder, drops in the column and position under the pointer', async () => {
    const b = await mount();
    const moves: BoardMoveDetail[] = [];
    b.addEventListener('cm-move', (e) => moves.push((e as CustomEvent<BoardMoveDetail>).detail));
    const k = b.card('m1')!;
    const start = centre(k);
    pointer('pointerdown', k, start.x, start.y);
    pointer('pointermove', document, start.x + 2, start.y + 1); // under the threshold: nothing yet
    expect(b.dragging).toBe(false);
    const target = b.card('m4')!; // second card in Contacted: drop on its top half -> before it
    const r = target.getBoundingClientRect();
    pointer('pointermove', document, r.left + r.width / 2, r.top + 4);
    expect(b.dragging).toBe(true);
    expect(k.moving).toBe(true);
    const ghost = document.body.querySelector(':scope > cm-board-card[ghost]') as HTMLElement;
    expect(ghost).toBeTruthy();
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    await settle(b);
    const c = col(b, 'contacted');
    const lis = [...c.shadowRoot!.querySelectorAll('ul > li')];
    expect(lis.findIndex((li) => li.classList.contains('drop'))).toBe(1);
    await announced(b, /^Column Contacted, position 2 of 4\.$/);
    pointer('pointerup', document, r.left + r.width / 2, r.top + 4);
    // The click that follows the drag doesn't reach the page.
    const clicks = vi.fn();
    document.addEventListener('click', clicks);
    k.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    document.removeEventListener('click', clicks);
    expect(clicks).not.toHaveBeenCalled();
    await settle(b);
    expect(b.dragging).toBe(false);
    expect(document.body.querySelector(':scope > cm-board-card[ghost]')).toBeNull();
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ value: 'm1', from: 'new', to: 'contacted', fromIndex: 0, toIndex: 1, source: 'pointer' });
    expect(names(c)).toEqual(['Blue Pottery', 'Ravi Stores', 'Kiran Foods', 'Delhi Spices']);
    expect(c.shadowRoot!.querySelector('li.drop')).toBeNull();
  });

  it('mouse: a plain click is not a drag; Escape during a drag cancels it', async () => {
    const b = await mount();
    const moves = vi.fn();
    b.addEventListener('cm-move', moves);
    const k = b.card('m1')!;
    const p = centre(k);
    pointer('pointerdown', k, p.x, p.y);
    pointer('pointerup', document, p.x, p.y);
    expect(b.dragging).toBe(false);
    const t = centre(b.columns[2]);
    pointer('pointerdown', k, p.x, p.y);
    pointer('pointermove', document, t.x, t.y);
    expect(b.dragging).toBe(true);
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    expect(b.dragging).toBe(false);
    pointer('pointerup', document, t.x, t.y);
    expect(moves).not.toHaveBeenCalled();
    expect(names(col(b, 'new'))).toEqual(['Ravi Stores', 'Asha Textiles']);
    await announced(b, /^Move cancelled/);
  });

  it('touch: press and hold picks up, then the card follows the finger; a quick swipe is left to scrolling', async () => {
    const b = await mount();
    const moves = vi.fn();
    b.addEventListener('cm-move', moves);
    const k = b.card('m1')!;
    const p = centre(k), t = centre(b.columns[2]);
    // Swipe: moves before the hold time.
    pointer('pointerdown', k, p.x, p.y, 'touch', 7);
    pointer('pointermove', document, p.x + 30, p.y, 'touch', 7);
    await new Promise((r) => setTimeout(r, 380));
    expect(b.dragging).toBe(false);
    pointer('pointerup', document, p.x + 30, p.y, 'touch', 7);
    // Hold, then move.
    pointer('pointerdown', k, p.x, p.y, 'touch', 8);
    await new Promise((r) => setTimeout(r, 380));
    expect(b.dragging).toBe(true);
    pointer('pointermove', document, t.x, t.y, 'touch', 8);
    pointer('pointerup', document, t.x, t.y, 'touch', 8);
    await settle(b);
    expect(moves).toHaveBeenCalledTimes(1);
    expect(names(col(b, 'demo'))).toEqual(['Ravi Stores']);
  });

  it('auto-scrolls the board sideways near its edge, and the column near its bottom', async () => {
    const many = Array.from({ length: 14 }, (_, i) => card(`c${i}`, `Card ${i}`)).join('');
    const b = await mount(`<cm-board style="width:620px;height:360px">
      <cm-board-column value="a" heading="A">${card('m1', 'Ravi Stores')}</cm-board-column>
      <cm-board-column value="b" heading="B">${many}</cm-board-column>
      <cm-board-column value="c" heading="C"></cm-board-column><cm-board-column value="d" heading="D"></cm-board-column>
    </cm-board>`);
    const scroller = shadow(b, '.columns');
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    const k = b.card('m1')!;
    const p = centre(k);
    pointer('pointerdown', k, p.x, p.y);
    const sr = scroller.getBoundingClientRect();
    pointer('pointermove', document, sr.right - 4, sr.top + 100);
    await vi.waitFor(() => expect(scroller.scrollLeft).toBeGreaterThan(20), { timeout: 2000 });
    // Back over column B, near its bottom edge: B scrolls down.
    const list = col(b, 'b').scrollElement!;
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    const lr = list.getBoundingClientRect();
    pointer('pointermove', document, lr.left + lr.width / 2, lr.bottom - 4);
    await vi.waitFor(() => expect(list.scrollTop).toBeGreaterThan(20), { timeout: 2000 });
    pointer('pointerup', document, lr.left + lr.width / 2, lr.bottom - 4);
    await settle(b);
    // Dropped near the bottom of B: after the cards above the pointer.
    expect(col(b, 'b').cards).toContain(k);
  });
});

describe('cm-board: paging and empty columns', () => {
  it('Load more fires cm-load-more with the column; loading shows a busy button and is announced', async () => {
    const b = await mount();
    const c = col(b, 'new'); // total 5 > 2 loaded: Load more shows
    const btn = () => c.shadowRoot!.querySelector('.more cm-button') as HTMLElement & { loading: boolean };
    expect(btn()).toBeTruthy();
    expect(btn().textContent!.trim()).toBe('Load more');
    expect(col(b, 'contacted').shadowRoot!.querySelector('.more cm-button')).toBeNull();
    const events: CustomEvent[] = [];
    b.addEventListener('cm-load-more', (e) => events.push(e as CustomEvent));
    btn().click();
    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ column: c, value: 'new' });
    c.loading = true;
    await c.updateComplete;
    expect(btn().loading).toBe(true);
    expect(shadow(c, '[role="status"]').textContent).toBe('Loading New');
    expect(shadow(c, 'ul').getAttribute('aria-busy')).toBe('true');
    btn().click();
    expect(events).toHaveLength(1); // not twice while loading
    c.insertAdjacentHTML('beforeend', card('m6', 'Mumbai Mart') + card('m7', 'Pune Paper') + card('m8', 'Goa Gifts'));
    c.loading = false;
    await settle(b);
    expect(c.cards).toHaveLength(5);
    expect(btn()).toBeNull(); // all 5 loaded
    // has-more forces it on without a total.
    const d = col(b, 'contacted');
    d.hasMore = true;
    await d.updateComplete;
    expect(d.shadowRoot!.querySelector('.more cm-button')).toBeTruthy();
  });

  it('an empty column says so (or shows the empty slot) and shows placeholders while loading', async () => {
    const b = await mount(`<cm-board><cm-board-column heading="A"></cm-board-column>
      <cm-board-column heading="B"><p slot="empty">Nothing booked</p></cm-board-column><cm-board-column heading="C" loading></cm-board-column></cm-board>`);
    const [a, bb, c] = b.columns;
    expect(shadow(a, '.empty').textContent!.trim()).toBe('No cards');
    expect((shadow(bb, 'slot.empty') as HTMLSlotElement).assignedElements()[0].textContent).toBe('Nothing booked');
    expect(shadow(c, '.loading')).toBeTruthy();
    expect(shadow(c, '.empty').hidden).toBe(true);
    // Not loaded yet but not empty either (total 4): Load more instead of "No cards".
    a.total = 4;
    await a.updateComplete;
    expect(shadow(a, '.empty').hidden).toBe(true);
    expect(a.shadowRoot!.querySelector('.more cm-button')).toBeTruthy();
  });

  it('hide-empty: empty columns become narrow rails that still take drops, by keyboard and by pointer', async () => {
    const b = await mount(MARKUP.replace('<cm-board ', '<cm-board hide-empty '));
    const demo = col(b, 'demo');
    expect(demo.collapsed).toBe(true);
    expect(demo.hasAttribute('collapsed')).toBe(true);
    expect(demo.getBoundingClientRect().width).toBeLessThan(col(b, 'new').getBoundingClientRect().width / 2);
    // Still a named region with its heading.
    expect(shadow(demo, '[role="heading"]').textContent!.replace(/\s+/g, ' ').trim()).toBe('Demo booked, 0 cards');
    // A column with total > 0 but nothing loaded yet is not empty.
    const c = col(b, 'contacted');
    expect(c.collapsed).toBe(false);
    // Keyboard: the rail is a stop on the way.
    b.card('m3')!.focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    await announced(b, /^Column Demo booked, position 1 of 1\.$/);
    await settle(b);
    expect(shadow(demo, 'section').classList.contains('over')).toBe(true);
    await userEvent.keyboard('{Enter}');
    await settle(b);
    expect(names(demo)).toEqual(['Blue Pottery']);
    expect(demo.collapsed).toBe(false);
    // Pointer: drop Kiran Foods onto the now-empty... first empty the column again and drop on its rail.
    b.revert('m3');
    await settle(b);
    expect(demo.collapsed).toBe(true);
    const k = b.card('m4')!;
    const p = centre(k), t = centre(demo);
    pointer('pointerdown', k, p.x, p.y);
    pointer('pointermove', document, t.x, t.y);
    pointer('pointerup', document, t.x, t.y);
    await settle(b);
    expect(names(demo)).toEqual(['Kiran Foods']);
    // Turning it off expands the rails.
    b.hideEmpty = false;
    b.revert('m4');
    await settle(b);
    expect(demo.collapsed).toBe(false);
  });
});

describe('cm-board: layout', () => {
  it('fixed-width columns side by side that scroll sideways; on a narrow board one column at a time with snapping', async () => {
    const b = await mount(MARKUP.replace('style="height:480px"', 'style="height:400px;width:1000px"'));
    const [a, c] = b.columns.map((x) => x.getBoundingClientRect());
    expect(Math.round(a.width)).toBe(272);
    expect(c.left).toBeGreaterThan(a.right);
    expect(Math.abs(a.top - c.top)).toBeLessThan(1);
    b.style.width = '320px';
    await page.viewport(400, 800);
    await frames();
    const scroller = shadow(b, '.columns');
    expect(getComputedStyle(scroller).scrollSnapType).toMatch(/x mandatory/);
    const w = b.columns[0].getBoundingClientRect().width;
    expect(w).toBeGreaterThan(320 * 0.75);
    expect(w).toBeLessThan(320);
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    // Nothing spills out of the page sideways.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('a board with a height: columns scroll on their own', async () => {
    const many = Array.from({ length: 20 }, (_, i) => card(`c${i}`, `Card ${i}`)).join('');
    const b = await mount(`<cm-board style="height:300px"><cm-board-column heading="A">${many}</cm-board-column></cm-board>`);
    const list = b.columns[0].scrollElement!;
    expect(b.getBoundingClientRect().height).toBeLessThan(320);
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });
});

describe('move model (shared with the future calendar)', () => {
  it('drives pick up, navigation, drop and cancel over plain groups, with announcements', () => {
    const groups = [3, 0, 2]; // items per group; group 1 can't take the item (0 slots)
    const said: string[] = [];
    const dropped: [MovePlace, MovePlace][] = [];
    const targets: (MovePlace | null)[] = [];
    const m = new MoveModel({
      groupCount: () => groups.length,
      slotCount: (g) => (groups[g] === 0 ? 0 : groups[g] + (g === 0 ? 0 : 1)),
      onTarget: (at) => targets.push(at),
      onDrop: (f, t) => dropped.push([f, t]),
      messages: { pickedUp: (at) => `up ${at.group}:${at.index}`, over: (at) => `over ${at.group}:${at.index}`, cancelled: () => 'cancelled' },
      announce: (t) => said.push(t),
    });
    const key = (k: string) => m.handleKey(new KeyboardEvent('keydown', { key: k }));
    expect(key('ArrowRight')).toBe(false); // nothing picked up
    m.pickUp({ group: 0, index: 2 });
    expect(m.active).toBe(true);
    expect(key('ArrowRight')).toBe(true); // skips group 1
    expect(m.target).toEqual({ group: 2, index: 2 });
    expect(key('ArrowDown')).toBe(true);
    expect(m.target).toEqual({ group: 2, index: 2 }); // 3 slots: 0..2
    key('Home');
    expect(m.target).toEqual({ group: 2, index: 0 });
    expect(key('x')).toBe(false);
    expect(key('Enter')).toBe(true);
    expect(dropped).toEqual([[{ group: 0, index: 2 }, { group: 2, index: 0 }]]);
    expect(said).toEqual(['up 0:2', 'over 2:2', 'over 2:2', 'over 2:0']);
    expect(targets.at(-1)).toBeNull();
    m.pickUp({ group: 2, index: 1 });
    expect(key('Tab')).toBe(false); // cancels, focus moves on
    expect(m.active).toBe(false);
    expect(said.at(-1)).toBe('cancelled');
    // A calendar can bring its own keys: Up/Down a week (7 groups) in a month grid.
    const week = (k: string, at: MovePlace, model: MoveModel) =>
      k === 'ArrowDown' ? { group: Math.min(at.group + 7, model.groupCount() - 1), index: 0 } : listNavigation(k, at, model);
    const cal = new MoveModel({
      groupCount: () => 30, slotCount: () => 1, navigate: week, onDrop: (f, t) => dropped.push([f, t]),
      messages: { pickedUp: () => '', over: () => '', cancelled: () => '' }, announce: () => {},
    });
    cal.pickUp({ group: 3, index: 0 });
    cal.handleKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(cal.target).toEqual({ group: 10, index: 0 });
  });

  it('the announcer repeats identical messages (clears, then sets again)', async () => {
    const a = new Announcer();
    document.body.append(a.element);
    expect(a.element.getAttribute('aria-live')).toBe('assertive');
    a.announce('Column New, position 1 of 1.');
    expect(a.element.textContent).toBe('Column New, position 1 of 1.');
    a.announce('Column New, position 1 of 1.');
    expect(a.element.textContent).toBe('');
    expect(a.text).toBe('Column New, position 1 of 1.');
    await new Promise((r) => setTimeout(r, 80));
    expect(a.element.textContent).toBe('Column New, position 1 of 1.');
  });
});
