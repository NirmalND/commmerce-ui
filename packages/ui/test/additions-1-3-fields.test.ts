// 1.3 additions for the CRM rebuild (field app): icons, camera capture and the single-photo tile, the colour field.
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string, attrs = ''): Promise<T> => {
  document.body.innerHTML = `<div id="away" style="height:40px"></div><div id="box" ${attrs} style="width:360px;padding:16px;background:var(--cm-bg-surface)">${markup}</div>`;
  await userEvent.hover(document.getElementById('away')!);
  const el = document.getElementById('box')!.firstElementChild as T;
  await (el as any).updateComplete;
  await Promise.all([...el.querySelectorAll('*'), ...(el.shadowRoot?.querySelectorAll('*') ?? [])].map((c) => (c as any).updateComplete));
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  return el;
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(() => { document.body.innerHTML = ''; });

describe('@commmerce/icons 1.3: field app icons', () => {
  const added = ['camera', 'image', 'id-card', 'navigation', 'wifi-off'];
  it('every new icon exists and draws inside the 24px grid with the standard stroke', async () => {
    const { icons } = await import('@commmerce/icons');
    document.body.innerHTML = added.map((n) => `<cm-icon name="${n}" size="24"></cm-icon>`).join('');
    const els = [...document.querySelectorAll('cm-icon')] as any[];
    await Promise.all(els.map((e) => e.updateComplete));
    for (const [i, el] of els.entries()) {
      const d = (icons as Record<string, string>)[added[i]];
      expect(d, added[i]).toBeTruthy();
      const svg = el.shadowRoot.querySelector('svg')!;
      expect(svg.getAttribute('stroke-width')).toBe('1.6');
      expect(svg.querySelector('path')!.getAttribute('d')).toBe(d);
      const box = (svg.querySelector('path') as SVGPathElement).getBBox();
      expect(box.x, added[i]).toBeGreaterThanOrEqual(2);
      expect(box.y, added[i]).toBeGreaterThanOrEqual(2);
      expect(box.x + box.width, added[i]).toBeLessThanOrEqual(22);
      expect(box.y + box.height, added[i]).toBeLessThanOrEqual(22);
      expect(box.width * box.height, added[i]).toBeGreaterThan(150);
    }
  });
  it('none of them is mirrored in right-to-left text (navigation points at a place on the map, not along the line)', async () => {
    document.body.innerHTML = `<div dir="rtl">${added.map((n) => `<cm-icon name="${n}"></cm-icon>`).join('')}</div>`;
    const els = [...document.querySelectorAll('cm-icon')] as any[];
    await Promise.all(els.map((e) => e.updateComplete));
    for (const el of els) expect(getComputedStyle(el.shadowRoot.querySelector('svg')).transform, el.name).toBe('none');
  });
});

describe('cm-file-upload 1.3: capture and the single-photo tile', () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  const sh = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
  const settle = async (el: any) => { await el.updateComplete; await el.updateComplete; };

  it('default rendering is unchanged: no variant, no capture', async () => {
    const el = await mount<any>('<cm-file-upload label="Invoice"></cm-file-upload>');
    expect(el.hasAttribute('variant')).toBe(false);
    expect(el.hasAttribute('capture')).toBe(false);
    const input = sh(el, 'input[type=file]') as HTMLInputElement;
    expect(input.hasAttribute('capture')).toBe(false);
    expect(input.hasAttribute('accept')).toBe(false);
    expect(sh(el, '.zone').classList.contains('photo')).toBe(false);
    expect(sh(el, '.zone cm-icon').getAttribute('name')).toBe('upload');
  });
  it('passes capture to the native input in both modes', async () => {
    const a = await mount<any>('<cm-file-upload capture="environment" accept="image/*"></cm-file-upload>');
    expect(sh(a, 'input[type=file]').getAttribute('capture')).toBe('environment');
    const b = await mount<any>('<cm-file-upload variant="photo" capture="user"></cm-file-upload>');
    expect(sh(b, 'input[type=file]').getAttribute('capture')).toBe('user');
  });
  it('photo mode: one tile with a camera icon and the label, named by the label, accepting images by default', async () => {
    const el = await mount<any>('<cm-file-upload variant="photo" label="Shop front photo" hint="max. 5 MB"></cm-file-upload>');
    const input = sh(el, 'input[type=file]') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    expect(input.multiple).toBe(false);
    expect(sh(el, '.zone.photo cm-icon').getAttribute('name')).toBe('camera');
    const named = input.getAttribute('aria-labelledby')!.split(' ').map((id) => sh(el, `#${id}`).textContent).join(' ');
    expect(named).toBe('Shop front photo');
    expect(sh(el, `#${input.getAttribute('aria-describedby')}`).textContent).toBe('max. 5 MB');
    const bare = await mount<any>('<cm-file-upload variant="photo"></cm-file-upload>');
    expect(sh(bare, `#${sh(bare, 'input').getAttribute('aria-labelledby')}`).textContent).toBe('Take a photo');
    const own = await mount<any>('<cm-file-upload variant="photo" accept="image/jpeg"></cm-file-upload>');
    expect((sh(own, 'input') as HTMLInputElement).accept).toBe('image/jpeg');
  });
  it('shows the photo filling the tile with named Retake and Remove buttons; a new photo replaces it', async () => {
    const el = (await mount<any>('<form><cm-file-upload name="shop" variant="photo" label="Shop front photo" multiple></cm-file-upload></form>')).querySelector('cm-file-upload');
    let changes = 0;
    el.addEventListener('change', () => changes++);
    el.addFiles([file('IMG_1.jpg', 'image/jpeg')]); await settle(el);
    const img = sh(el, '.shot img') as HTMLImageElement;
    expect(img.alt).toBe('Shop front photo');
    expect(img.src.startsWith('blob:')).toBe(true);
    const shot = sh(el, '.shot').getBoundingClientRect();
    expect(Math.abs(img.getBoundingClientRect().width - shot.width)).toBeLessThan(3);
    expect(shot.width / shot.height).toBeCloseTo(4 / 3, 1);
    const [retake, remove] = [...el.shadowRoot!.querySelectorAll('.actions button')] as HTMLButtonElement[];
    expect(retake.getAttribute('aria-label')).toBe('Retake Shop front photo');
    expect(retake.textContent!.trim()).toBe('Retake');
    expect(remove.getAttribute('aria-label')).toBe('Remove Shop front photo');
    expect(remove.textContent!.trim()).toBe('Remove');
    expect(sh(el, '.zone')).toBeNull();
    el.addFiles([file('IMG_2.jpg', 'image/jpeg')]); await settle(el);
    expect(el.files.map((f: File) => f.name)).toEqual(['IMG_2.jpg']); // one photo, even with multiple
    expect(changes).toBe(2);
    expect((new FormData(el.closest('form')!).getAll('shop') as File[]).map((f) => f.name)).toEqual(['IMG_2.jpg']);
  });
  it('Retake opens the camera again through the same input; choosing replaces the photo', async () => {
    const el = await mount<any>('<cm-file-upload variant="photo" capture="environment" label="Visiting card"></cm-file-upload>');
    el.addFiles([file('card.jpg', 'image/jpeg')]); await settle(el);
    const input = sh(el, 'input[type=file]') as HTMLInputElement;
    expect(input.hidden).toBe(true);
    expect(input.getAttribute('capture')).toBe('environment');
    let opened = 0;
    input.addEventListener('click', (e) => { opened++; e.preventDefault(); });
    (sh(el, '.retake') as HTMLButtonElement).click();
    expect(opened).toBe(1);
    const dt = new DataTransfer();
    dt.items.add(file('card2.jpg', 'image/jpeg'));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(el.files.map((f: File) => f.name)).toEqual(['card2.jpg']);
  });
  it('Remove clears the photo, fires change and returns focus to the tile', async () => {
    const el = await mount<any>('<cm-file-upload variant="photo" label="Shop front photo"></cm-file-upload>');
    el.addFiles([file('a.jpg', 'image/jpeg')]); await settle(el);
    let changes = 0;
    el.addEventListener('change', () => changes++);
    // A real click, as a user would: it also gives this test's frame window focus in Firefox (issue #2).
    await userEvent.click(el.shadowRoot!.querySelectorAll('.actions button')[1] as HTMLButtonElement);
    await settle(el);
    expect(el.files).toEqual([]);
    expect(changes).toBe(1);
    expect(el.shadowRoot!.activeElement).toBe(sh(el, '.zone.photo input'));
  });
  it('refuses other types and oversize photos with the existing message and cm-reject, keeping the current photo', async () => {
    const el = await mount<any>('<cm-file-upload variant="photo" label="Shop front photo" max-size="100"></cm-file-upload>');
    const refused: string[] = [];
    el.addEventListener('cm-reject', (e: Event) => refused.push(...(e as CustomEvent).detail.files.map((f: File) => f.name)));
    el.addFiles([file('notes.pdf', 'application/pdf')]); await settle(el);
    expect(sh(el, '.msg').textContent).toContain('notes.pdf is not an allowed file type');
    expect(sh(el, '.zone.photo').classList.contains('invalid')).toBe(true);
    el.addFiles([file('ok.jpg', 'image/jpeg')]); await settle(el);
    el.addFiles([file('big.jpg', 'image/jpeg', 500)]); await settle(el);
    expect(refused).toEqual(['notes.pdf', 'big.jpg']);
    expect(el.files.map((f: File) => f.name)).toEqual(['ok.jpg']);
    expect(sh(el, '.msg').getAttribute('role')).toBe('alert');
    expect(sh(el, '.msg').textContent).toContain('big.jpg is larger than');
    expect(sh(el, '.retake').getAttribute('aria-describedby')).toBe(sh(el, '.msg').id);
  });
  it('required blocks the form until a photo is taken; reset clears it; disabled hides the buttons', async () => {
    const el = (await mount<any>('<form><cm-file-upload name="p" variant="photo" label="Shop front photo" required></cm-file-upload></form>')).querySelector('cm-file-upload');
    expect(el.checkValidity()).toBe(false);
    el.addFiles([file('a.jpg', 'image/jpeg')]); await settle(el);
    expect(el.checkValidity()).toBe(true);
    el.disabled = true; await settle(el);
    expect(sh(el, '.actions')).toBeNull();
    el.disabled = false;
    el.closest('form')!.reset(); await settle(el);
    expect(el.files).toEqual([]);
    expect(sh(el, '.zone.photo')).toBeTruthy();
  });
  it('without a label the buttons say "photo"; the text is translatable', async () => {
    const el = await mount<any>('<cm-file-upload variant="photo"></cm-file-upload>');
    el.addFiles([file('a.jpg', 'image/jpeg')]); await settle(el);
    expect(sh(el, '.retake').getAttribute('aria-label')).toBe('Retake photo');
    el.strings = { retake: 'Reprendre', retakeName: 'Reprendre la {name}', photo: 'photo' };
    await settle(el);
    expect(sh(el, '.retake').textContent!.trim()).toBe('Reprendre');
    expect(sh(el, '.retake').getAttribute('aria-label')).toBe('Reprendre la photo');
  });
});

describe('cm-color-field (1.3)', () => {
  const sh = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
  const swatches = (el: Element) => [...el.shadowRoot!.querySelectorAll('.swatch')] as HTMLButtonElement[];
  const settle = async (el: any) => { await el.updateComplete; await el.updateComplete; };
  const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const toHex = (rgb: string) => '#' + rgb.match(/\d+/g)!.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');

  it('a labelled radio group of named swatches from the token palette, with a hex box', async () => {
    const el = await mount<any>('<cm-color-field label="Status colour" value="#2E6FAF"></cm-color-field>');
    expect(el.value).toBe('#2e6faf');
    const group = sh(el, '[role=radiogroup]');
    expect(sh(el, `#${group.getAttribute('aria-labelledby')}`).textContent).toBe('Status colour');
    const s = swatches(el);
    expect(s.length).toBe(12);
    expect(s.every((b) => b.getAttribute('role') === 'radio')).toBe(true);
    expect(s[0].getAttribute('aria-label')).toBe('Black, #000000');
    const blue = s.find((b) => b.getAttribute('aria-checked') === 'true')!;
    expect(blue.getAttribute('aria-label')).toBe('Blue, #2e6faf');
    expect(s.filter((b) => b.tabIndex === 0)).toEqual([blue]);
    const hex = sh(el, '.input') as HTMLInputElement;
    expect(hex.value).toBe('#2e6faf');
    expect(hex.getAttribute('aria-label')).toBe('Status colour, hex code');
    expect(hex.placeholder).toBe('#RRGGBB');
    expect(sh(el, 'input[type=color]')).toBeNull(); // picker is opt-in
  });
  it('the selected swatch shows a check mark (not colour alone) that contrasts with every swatch', async () => {
    const el = await mount<any>('<cm-color-field label="Colour"></cm-color-field>');
    for (const b of swatches(el)) {
      b.click(); await settle(el);
      const icon = b.querySelector('cm-icon') as HTMLElement;
      expect(getComputedStyle(icon).visibility).toBe('visible');
      expect(icon.getAttribute('name')).toBe('check');
      const c = ratio(toHex(getComputedStyle(b).color), toHex(getComputedStyle(b).backgroundColor));
      expect(c, b.getAttribute('aria-label')!).toBeGreaterThanOrEqual(4.5);
      for (const other of swatches(el).filter((o) => o !== b)) expect(getComputedStyle(other.querySelector('cm-icon')!).visibility).toBe('hidden');
    }
  });
  it('arrow keys move and select like radios (wrapping), Home and End jump; events fire', async () => {
    const el = await mount<any>('<cm-color-field label="Colour" value="#000000"></cm-color-field>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    swatches(el)[0].focus();
    await userEvent.keyboard('{ArrowRight}'); await settle(el);
    expect(el.value).toBe('#707070');
    expect(el.shadowRoot!.activeElement).toBe(swatches(el)[1]);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}'); await settle(el);
    expect(el.value).toBe('#446beb'); // wrapped to the last
    await userEvent.keyboard('{Home}'); await settle(el);
    expect(el.value).toBe('#000000');
    await userEvent.keyboard('{End}'); await settle(el);
    expect(el.value).toBe('#446beb');
    expect(events.filter((e) => e === 'change').length).toBe(5);
    expect(events.filter((e) => e === 'input').length).toBe(5);
  });
  it('typing a hex code updates the value; bad text gets a message on commit and makes the field invalid', async () => {
    const el = await mount<any>('<cm-color-field label="Colour"></cm-color-field>');
    const changes: string[] = [];
    el.addEventListener('change', () => changes.push(el.value));
    const hex = sh(el, '.input') as HTMLInputElement;
    await userEvent.click(hex);
    await userEvent.keyboard('5394D9');
    await settle(el);
    expect(el.value).toBe('#5394d9');
    expect(hex.value).toBe('5394D9'); // the box keeps what was typed until it is committed
    expect(swatches(el).find((b) => b.getAttribute('aria-checked') === 'true')!.getAttribute('aria-label')).toBe('Light blue, #5394d9');
    await userEvent.keyboard('{Enter}'); await settle(el);
    expect(hex.value).toBe('#5394d9');
    expect(changes).toEqual(['#5394d9']);
    await userEvent.clear(hex);
    await userEvent.keyboard('#12zz{Enter}'); await settle(el);
    expect(sh(el, '.error').textContent).toBe('Enter a colour as #RRGGBB, for example #2e6faf.');
    expect(sh(el, '.error').getAttribute('role')).toBe('alert');
    expect(hex.getAttribute('aria-invalid')).toBe('true');
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.patternMismatch).toBe(true);
    await userEvent.clear(hex);
    await userEvent.keyboard('#abc{Enter}'); await settle(el);
    expect(el.value).toBe('#aabbcc');
    expect(sh(el, '.error')).toBeNull();
    expect(el.checkValidity()).toBe(true);
  });
  it('the optional picker is a native colour input named after the field', async () => {
    const el = await mount<any>('<cm-color-field label="Colour" value="#de0000" picker="native"></cm-color-field>');
    const pick = sh(el, 'input[type=color]') as HTMLInputElement;
    expect(pick.value).toBe('#de0000');
    expect(pick.getAttribute('aria-label')).toBe('Choose a custom colour for Colour');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    pick.value = '#123456';
    pick.dispatchEvent(new Event('input', { bubbles: true }));
    pick.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(el.value).toBe('#123456');
    expect(events).toEqual(['input', 'change']);
    expect(swatches(el).every((b) => b.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(swatches(el)[0].tabIndex).toBe(0);
  });
  it('custom swatches by property or JSON attribute; invalid ones are left out', async () => {
    const el = await mount<any>(`<cm-color-field label="Colour" swatches='["#ABC", {"value": "#de0000", "name": "Lost"}, "red"]'></cm-color-field>`);
    expect(swatches(el).map((b) => b.getAttribute('aria-label'))).toEqual(['#aabbcc', 'Lost, #de0000']);
    el.swatches = [{ value: '#3c7c00', name: 'Won' }]; await settle(el);
    expect(swatches(el).map((b) => b.title)).toEqual(['Won']);
  });
  it('form-associated: submits the value, required, error, disabled, reset', async () => {
    document.body.innerHTML = '<form><cm-color-field name="colour" label="Colour" required help-text="Shown on the tag"></cm-color-field></form>';
    const el = document.querySelector('cm-color-field') as any;
    await settle(el);
    const form = el.closest('form')!;
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Please choose a colour.');
    expect(sh(el, '.req')).toBeTruthy();
    expect(sh(el, '[role=radiogroup]').getAttribute('aria-required')).toBe('true');
    expect(sh(el, `#${sh(el, '.input').getAttribute('aria-describedby')}`).textContent).toBe('Shown on the tag');
    swatches(el)[3].click(); await settle(el);
    expect(new FormData(form).get('colour')).toBe('#de0000');
    expect(el.checkValidity()).toBe(true);
    el.error = 'Already used by "Won"'; await settle(el);
    expect(el.checkValidity()).toBe(false);
    expect(sh(el, '.error').textContent).toBe('Already used by "Won"');
    el.error = '';
    el.disabled = true; await settle(el);
    expect(swatches(el).every((b) => b.disabled)).toBe(true);
    expect((sh(el, '.input') as HTMLInputElement).disabled).toBe(true);
    el.disabled = false;
    form.reset(); await settle(el);
    expect(el.value).toBe('');
    expect(new FormData(form).get('colour')).toBeNull();
  });
  it('without a label it takes its name from aria-label', async () => {
    const el = await mount<any>('<cm-color-field aria-label="Tag colour" picker></cm-color-field>');
    expect(sh(el, '[role=radiogroup]').getAttribute('aria-label')).toBe('Tag colour');
    expect(sh(el, '.input').getAttribute('aria-label')).toBe('Tag colour, hex code');
  });
});
