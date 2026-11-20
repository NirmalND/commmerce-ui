// 1.14: every field shows its own message under itself. Leaving a changed field shows a format, range or length
// problem (not "required"); a failed submit shows every invalid field, required ones too, instead of the browser's
// bubble, and focuses the first; the message follows the value and goes once it is valid; the app's `error` wins;
// silent checks (checkValidity) show nothing. Driven with focus() and dispatched events only, never the real pointer
// or keyboard: those are shared with test files running beside this one, and keys typed here reached a calendar test
// in another file (see also toast-undo.test.ts).
import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index.js';

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const msg = (el: Element) => el.shadowRoot!.querySelector('.error')?.textContent?.trim() ?? '';
const settle = async () => { await Promise.all([...document.querySelectorAll('*')].map((e) => (e as any).updateComplete)); await tick(); };
const mount = async (fields: string) => {
  document.body.innerHTML = `<form onsubmit="return false">${fields}<button id="save">Save</button></form>`;
  await settle();
  return document.querySelector('form') as HTMLFormElement;
};
const $ = <T = any>(id: string) => document.getElementById(id) as T;
/**
 * Press Save: a click on the submit button (dispatched, so the real pointer stays put) submits the form, and a failed
 * submit fires `invalid` on each invalid field. Returns the ids whose `invalid` was cancelled (no browser bubble).
 */
const submit = async () => {
  const prevented: string[] = [];
  // Listeners on the fields run after the field's own (added when it was created), so defaultPrevented is final.
  const late = (e: Event) => { if (e.defaultPrevented) prevented.push((e.target as HTMLElement).id); };
  const fields = [...document.querySelectorAll('form [id]')];
  fields.forEach((el) => el.addEventListener('invalid', late));
  $<HTMLButtonElement>('save').focus();
  $<HTMLButtonElement>('save').click();
  await settle();
  fields.forEach((el) => el.removeEventListener('invalid', late));
  return prevented;
};
/** Focus the field's input and type into it (the input event a keystroke sends), staying in the field. */
const type = async (el: HTMLElement, text: string, sel = 'input') => {
  const input = el.shadowRoot!.querySelector(sel) as HTMLInputElement;
  input.focus();
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  await settle();
  return input;
};
/** Type, commit (change) and leave the field for the Save button, as Tab would. */
const typeAndLeave = async (el: HTMLElement, text: string, sel = 'input') => {
  const input = await type(el, text, sel);
  input.dispatchEvent(new Event('change', { bubbles: true }));
  $<HTMLButtonElement>('save').focus();
  await settle();
};

describe('field messages (1.14)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('text field: leaving a changed field shows a format problem; tabbing past an empty required field shows nothing', async () => {
    await mount('<cm-text-field id="name" label="Name" required></cm-text-field><cm-text-field id="email" label="Email" type="email"></cm-text-field>');
    $('name').focus(); $<HTMLButtonElement>('save').focus(); await settle();
    expect(msg($('name'))).toBe('');
    expect($('name').hasAttribute('data-cm-invalid')).toBe(false);
    await typeAndLeave($('email'), 'nope');
    expect(msg($('email'))).toBe('Enter an email address like name@example.com.');
    expect($('email').hasAttribute('data-cm-invalid')).toBe(true);
    const input = $('email').shadowRoot!.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('-err');
    // Typing a required field and clearing it again is still "required and empty": nothing on leaving.
    await typeAndLeave($('name'), 'R');
    await typeAndLeave($('name'), '');
    expect(msg($('name'))).toBe('');
  });

  it('a failed submit shows every invalid field, required ones too, with no browser bubble, and focuses the first', async () => {
    await mount(`<cm-text-field id="name" label="Name" required></cm-text-field>
      <cm-select id="stage" label="Stage" required options='[{"value":"new","label":"New"},{"value":"won","label":"Won"}]'></cm-select>
      <cm-combobox id="owner" label="Owner" required options='[{"value":"ravi","label":"Ravi"}]'></cm-combobox>
      <cm-checkbox id="terms" label="I agree" required></cm-checkbox>
      <cm-option-group id="kind" label="Kind" required><option value="a">A</option><option value="b">B</option></cm-option-group>
      <cm-date-range-picker id="range" label="Dates" locale="en-IN" required></cm-date-range-picker>
      <cm-date-picker id="due" label="Due" locale="en-IN" required></cm-date-picker>`);
    const ids = ['name', 'stage', 'owner', 'terms', 'kind', 'range', 'due'];
    const prevented = await submit();
    for (const id of ids) {
      expect(msg($(id)), id).not.toBe('');
      expect(prevented, id).toContain(id);
    }
    expect(msg($('name'))).toBe('Please fill in this field.');
    expect($('name').matches(':focus-within')).toBe(true); // the first invalid field
  });

  it('once shown, the message follows the value and goes when it is valid', async () => {
    await mount(`<cm-text-field id="name" label="Name" required></cm-text-field>
      <cm-select id="stage" label="Stage" required options='[{"value":"new","label":"New"}]'></cm-select>
      <cm-combobox id="owner" label="Owner" required options='[{"value":"ravi","label":"Ravi"}]'></cm-combobox>
      <cm-checkbox id="terms" label="I agree" required></cm-checkbox>
      <cm-option-group id="kind" label="Kind" required><option value="a">A</option><option value="b">B</option></cm-option-group>`);
    await submit();
    // Typing into the focused field clears its message straight away.
    await type($('name'), 'Ravi');
    expect(msg($('name'))).toBe('');
    $('stage').value = 'new';
    $('owner').value = 'ravi';
    await settle();
    expect(msg($('stage'))).toBe('');
    expect(msg($('owner'))).toBe('');
    ($('terms').shadowRoot!.querySelector('input') as HTMLInputElement).click(); await settle();
    expect($('terms').checked).toBe(true);
    expect(msg($('terms'))).toBe('');
    ($('kind').shadowRoot!.querySelector('button[tabindex="0"]') as HTMLElement).focus();
    document.activeElement!.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
    await settle();
    expect(msg($('kind'))).toBe('');
    // Emptying the name again brings "required" back while typing, since its message is shown.
    await typeAndLeave($('name'), '');
    expect(msg($('name'))).toBe('Please fill in this field.');
  });

  it("the app's error always wins, and clearing it falls back to the field's own message", async () => {
    await mount('<cm-text-field id="email" label="Email" type="email"></cm-text-field>');
    await typeAndLeave($('email'), 'nope');
    $('email').error = 'This email is already used.'; await settle();
    expect(msg($('email'))).toBe('This email is already used.');
    $('email').error = ''; await settle();
    expect(msg($('email'))).toBe('Enter an email address like name@example.com.');
  });

  it('a silent check by the app shows nothing and keeps focus where it is', async () => {
    const form = await mount('<cm-text-field id="name" label="Name" required></cm-text-field><cm-text-field id="note" label="Note"></cm-text-field>');
    $('note').focus();
    expect(form.checkValidity()).toBe(false);
    await settle();
    expect(msg($('name'))).toBe('');
    expect($('note').matches(':focus-within')).toBe(true);
  });

  it("the field's own reportValidity() shows its message instead of the bubble", async () => {
    await mount('<cm-text-field id="name" label="Name" required></cm-text-field>');
    expect($('name').reportValidity()).toBe(false);
    await settle();
    expect(msg($('name'))).toBe('Please fill in this field.');
  });

  it('a form reset hides the messages again', async () => {
    const form = await mount('<cm-text-field id="name" label="Name" required></cm-text-field>');
    await submit();
    expect(msg($('name'))).not.toBe('');
    form.reset(); await settle();
    expect(msg($('name'))).toBe('');
  });

  it('an app error on every field settles: no endless re-rendering', async () => {
    await mount(`<cm-file-upload id="f" label="Photo" error="Too big"></cm-file-upload>
      <cm-color-field id="c" label="Colour" error="Pick another"></cm-color-field>
      <cm-signature-field id="s" label="Sign" error="Sign again"></cm-signature-field>
      <cm-checkbox id="k" label="OK"></cm-checkbox>`);
    let updates = 0;
    for (const id of ['f', 'c', 's', 'k']) {
      const el = $(id);
      const orig = el.requestUpdate.bind(el);
      el.requestUpdate = (...a: unknown[]) => { updates++; return orig(...a); };
    }
    await tick(200);
    expect(updates).toBe(0);
    expect($('f').hasAttribute('data-cm-invalid')).toBe(true);
  });

  it('date range picker: unreadable typed text shows on leaving', async () => {
    await mount('<cm-date-range-picker id="range" label="Dates" locale="en-IN"></cm-date-range-picker>');
    await typeAndLeave($('range'), 'zzzz');
    expect(msg($('range'))).toBe('Enter a start date like dd/mm/yyyy.');
    expect($('range').hasAttribute('data-cm-invalid')).toBe(true);
  });

  it('date picker: a date after max shows on leaving; both boxes are marked only for whole-field messages', async () => {
    await mount('<cm-date-picker id="due" label="Due" locale="en-IN" max="2026-11-30"></cm-date-picker>');
    await typeAndLeave($('due'), '05/12/2026');
    expect(msg($('due'))).toContain("or earlier.");
    expect($('due').shadowRoot!.querySelector('.box')!.classList.contains('invalid')).toBe(true);
  });
});

describe('cm-text-field pattern, minlength and maxlength (1.14)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('pattern: pattern-message when set, a general message otherwise; an empty value is left to required', async () => {
    await mount(`<cm-text-field id="pin" label="PIN" pattern="[0-9]{6}" pattern-message="Enter the 6-digit PIN."></cm-text-field>
      <cm-text-field id="code" label="Code" pattern="[A-Z]{3}"></cm-text-field>`);
    expect($('pin').checkValidity()).toBe(true);
    await typeAndLeave($('pin'), '12ab');
    expect($('pin').validity.patternMismatch).toBe(true);
    expect(msg($('pin'))).toBe('Enter the 6-digit PIN.');
    await typeAndLeave($('pin'), '560001');
    expect(msg($('pin'))).toBe('');
    expect($('pin').checkValidity()).toBe(true);
    await typeAndLeave($('code'), 'ab');
    expect(msg($('code'))).toBe('Enter a value in the requested format.');
  });

  it('minlength: "Enter at least {min} characters." on leaving; the native input gets the attribute', async () => {
    await mount('<cm-text-field id="pw" label="Password" type="password" minlength="8"></cm-text-field>');
    expect($('pw').shadowRoot!.querySelector('input')!.getAttribute('minlength')).toBe('8');
    await typeAndLeave($('pw'), 'short');
    expect($('pw').validity.tooShort).toBe(true);
    expect(msg($('pw'))).toBe('Enter at least 8 characters.');
  });

  it('maxlength: the browser stops typing at the maximum; a longer value set by code is invalid and shows on submit', async () => {
    await mount('<cm-text-field id="code" label="Code" maxlength="4"></cm-text-field>');
    expect($('code').shadowRoot!.querySelector('input')!.getAttribute('maxlength')).toBe('4');
    $('code').value = 'ABCD'; await settle();
    expect($('code').checkValidity()).toBe(true);
    $('code').value = 'ABCDEFG'; await settle();
    expect($('code').validity.tooLong).toBe(true);
    expect(msg($('code'))).toBe(''); // not shown until a submit
    await submit();
    expect(msg($('code'))).toBe('Enter 4 characters or fewer.');
  });

  it('multiline: minlength and maxlength apply to the textarea too', async () => {
    await mount('<cm-text-field id="note" label="Note" multiline minlength="10" maxlength="200"></cm-text-field>');
    const ta = $('note').shadowRoot!.querySelector('textarea')!;
    expect(ta.getAttribute('maxlength')).toBe('200');
    await typeAndLeave($('note'), 'Too short', 'textarea');
    expect(msg($('note'))).toBe('Enter at least 10 characters.');
  });
});
