import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../src/index.js';
import { configure, setStrings, resetStrings, getDefaultStrings, formatMessage, translate } from '../src/index.js';
import type { CmPagination, CmSaveBar, CmModal, CmSearch, CmResourceList, CmAppCard, CmFileUpload, CmNotificationPanel, CmProgressBar, CmStatusTabs, CmToastRegion, CmDatePicker, CmDateRangePicker, CmCombobox, CmGlobalSearch, CmHeaderBar, CmTextField, CmMetric } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string, sel?: string): Promise<T> => {
  document.body.innerHTML = markup;
  const el = (sel ? document.querySelector(sel) : document.body.firstElementChild) as T;
  await (el as any).updateComplete;
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const settle = async (el: any) => { await new Promise((r) => setTimeout(r)); await el.updateComplete; };

beforeEach(() => { document.body.innerHTML = ''; resetStrings(); });
afterEach(() => { resetStrings(); document.documentElement.removeAttribute('lang'); });

describe('built-in text: English defaults', () => {
  it('pagination, save bar and modal read the same as before', async () => {
    const pg = await mount<CmPagination>('<cm-pagination total="1234" page="2" page-size="20" resource-name="orders"></cm-pagination>');
    expect(shadow(pg, 'nav').getAttribute('aria-label')).toBe('Pagination');
    expect(shadow(pg, '[role="status"]').textContent).toBe('Showing 21–40 of 1,234 orders');
    expect(shadow(pg, '.prev').getAttribute('aria-label')).toBe('Previous page');
    expect(shadow(pg, '.next').getAttribute('aria-label')).toBe('Next page');
    expect(pg.label).toBe('Pagination');
    const pg2 = await mount<CmPagination>('<cm-pagination total="45"></cm-pagination>');
    expect(shadow(pg2, '[role="status"]').textContent).toBe('Showing 1–20 of 45'); // no trailing space without a noun

    const bar = await mount<CmSaveBar>('<cm-save-bar open></cm-save-bar>');
    expect(bar.saveLabel).toBe('Save');
    expect(bar.discardLabel).toBe('Discard');
    expect(bar.message).toBe('Unsaved changes');
    expect([...bar.shadowRoot!.querySelectorAll('cm-button')].map((b) => b.textContent)).toEqual(['Discard', 'Save']);

    const modal = await mount<CmModal>('<cm-modal heading="Delete"></cm-modal>');
    expect(modal.closeLabel).toBe('Close');
    expect(shadow(modal, '.x').getAttribute('aria-label')).toBe('Close');
  });

  it('lists every namespace with its defaults', () => {
    const d = getDefaultStrings();
    expect(d.common.close).toBe('Close');
    expect(d.pagination.previous).toBe('Previous page');
    expect(d.resourceList.selected).toBe('{count} {resource} selected.');
    expect(Object.keys(d).length).toBeGreaterThan(30);
    expect(d.timeline.showMore).toBe('Show more');
    expect(d.timelineItem.hoursAgo).toEqual({ one: '{count} hour ago', other: '{count} hours ago' });
  });
});

describe('built-in text: per component', () => {
  it('existing label properties still win, and an explicit empty string stays empty', async () => {
    const bar = await mount<CmSaveBar>('<cm-save-bar open save-label="Publish" message=""></cm-save-bar>');
    expect(bar.saveLabel).toBe('Publish');
    expect(bar.message).toBe('');
    setStrings({ saveBar: { save: 'Enregistrer', discard: 'Annuler' } });
    await bar.updateComplete;
    expect([...bar.shadowRoot!.querySelectorAll('cm-button')].map((b) => b.textContent)).toEqual(['Annuler', 'Publish']);
    bar.saveLabel = undefined as unknown as string; // back to the built-in string
    await bar.updateComplete;
    expect(bar.saveLabel).toBe('Enregistrer');
  });

  it('side navigation: collapse button text in English, then setStrings and the strings property', async () => {
    const nav = await mount<any>('<cm-side-navigation collapsible><cm-nav-item label="Orders" icon="bag" href="#o"></cm-nav-item></cm-side-navigation>');
    const btn = () => shadow(nav, '[part="collapse-button"]').textContent!.trim();
    expect(btn()).toBe('Collapse menu');
    nav.collapsed = true; await nav.updateComplete;
    expect(btn()).toBe('Expand menu');
    setStrings({ sideNavigation: { collapse: 'Menü einklappen', expand: 'Menü ausklappen' } });
    await nav.updateComplete;
    expect(btn()).toBe('Menü ausklappen');
    nav.strings = { expand: 'Ouvrir le menu' }; await nav.updateComplete;
    expect(btn()).toBe('Ouvrir le menu');
    expect(getDefaultStrings().sideNavigation.collapse).toBe('Collapse menu');
  });

  it('the strings attribute replaces any key, including templates', async () => {
    const pg = await mount<CmPagination>(`<cm-pagination total="45" page="1" strings='{"previous":"Page précédente","next":"Page suivante","summary":"{from}–{to} sur {total}","page":"Page","of":"sur {count}"}'></cm-pagination>`);
    expect(shadow(pg, '.prev').getAttribute('aria-label')).toBe('Page précédente');
    expect(shadow(pg, '.next').getAttribute('aria-label')).toBe('Page suivante');
    expect(shadow(pg, '[role="status"]').textContent).toBe('1–20 sur 45');
    expect(shadow(pg, '#' + shadow(pg, 'input').getAttribute('aria-describedby')).textContent).toBe('sur 3');
  });

  it('the strings property takes functions', async () => {
    const list = await mount<CmResourceList>(`<cm-resource-list selectable resource-name="product">
      <cm-resource-item value="a" selected>A</cm-resource-item><cm-resource-item value="b">B</cm-resource-item></cm-resource-list>`);
    list.strings = { selected: ({ count, resource }) => `${resource} × ${count}` };
    list.selectPage(true);
    await list.updateComplete;
    expect(shadow(list, '[role="status"]').textContent!.trim()).toBe('products × 2');
  });
});

describe('built-in text: button count', () => {
  it('count wording follows the language, with numbers formatted for it', async () => {
    setStrings({ button: { labelWithCount: { one: '{label}, {count} non lue', other: '{label}, {count} non lues' }, count: '{count} non lues' } }, 'fr');
    document.documentElement.lang = 'fr';
    const el = await mount<HTMLElement & { count: number; updateComplete: Promise<unknown> }>('<cm-button icon-only icon="bell" label="Notifications" count="1"></cm-button>');
    const b = shadow(el, 'button');
    expect(b.getAttribute('aria-label')).toBe('Notifications, 1 non lue');
    el.count = 1200; await el.updateComplete;
    expect(b.getAttribute('aria-label')).toBe(`Notifications, ${new Intl.NumberFormat('fr').format(1200)} non lues`);
    expect(shadow(el, '.count').textContent).toBe('99+');
    setStrings({ button: { countOverflow: '+{max}' } }, 'fr');
    await el.updateComplete;
    expect(shadow(el, '.count').textContent).toBe('+99');
  });
});

describe('built-in text: globally', () => {
  it('setStrings re-renders components already on the page', async () => {
    const search = await mount<CmSearch>('<cm-search value="shirt"></cm-search>');
    expect(shadow(search, '.clear').getAttribute('aria-label')).toBe('Clear search');
    expect(shadow(search, 'input').getAttribute('placeholder')).toBe('Search');
    setStrings({ search: { clear: 'Effacer la recherche', placeholder: 'Rechercher' } });
    await search.updateComplete;
    expect(shadow(search, '.clear').getAttribute('aria-label')).toBe('Effacer la recherche');
    expect(shadow(search, 'input').getAttribute('placeholder')).toBe('Rechercher');
    expect(search.placeholder).toBe('Rechercher');
  });

  it('common keys reach every component that uses them; a component namespace overrides them', async () => {
    document.body.innerHTML = '<cm-modal heading="A"></cm-modal><cm-side-panel heading="B"></cm-side-panel><cm-banner dismissible>Hi</cm-banner><cm-toast message="Saved"></cm-toast>';
    const [modal, panel, banner] = [...document.body.children] as any[];
    setStrings({ common: { close: 'Fermer', dismiss: 'Ignorer' }, sidePanel: { close: 'Fermer le panneau' } });
    await Promise.all([...document.body.children].map((e: any) => e.updateComplete));
    expect(shadow(modal, '.x').getAttribute('aria-label')).toBe('Fermer');
    expect(shadow(panel, '.x').getAttribute('aria-label')).toBe('Fermer le panneau');
    expect(shadow(banner, '.close').getAttribute('aria-label')).toBe('Ignorer');
  });

  it('configure sets the locale for numbers and plural rules', async () => {
    configure({ locale: 'de-DE' });
    const pg = await mount<CmPagination>('<cm-pagination total="12345" page="2" page-size="20"></cm-pagination>');
    expect(shadow(pg, '[role="status"]').textContent).toBe('Showing 21–40 of 12.345');
    const tabs = await mount<CmStatusTabs>('<cm-status-tabs><option value="all" count="1500">All</option></cm-status-tabs>');
    expect(shadow(tabs, '[role="tab"]').textContent!.replace(/\s+/g, ' ')).toContain('1.500');
    const bar = await mount<CmProgressBar>('<cm-progress-bar label="Upload" value="42" show-value></cm-progress-bar>');
    expect(shadow(bar, '[role="progressbar"]').getAttribute('aria-valuetext')).toMatch(/^42\s%$/); // German puts a (no-break) space before %
  });

  it('without configure, numbers follow the nearest lang attribute and update when it changes', async () => {
    document.body.innerHTML = '<div lang="hi-IN"><cm-pagination total="1234567" page="1" page-size="20"></cm-pagination></div>';
    const pg = document.querySelector('cm-pagination') as CmPagination;
    await pg.updateComplete;
    expect(shadow(pg, '[role="status"]').textContent).toBe('Showing 1–20 of 12,34,567');
    pg.parentElement!.setAttribute('lang', 'en-US');
    await settle(pg);
    expect(shadow(pg, '[role="status"]').textContent).toBe('Showing 1–20 of 1,234,567');
  });

  it('strings set for a language apply only where that language is in use', async () => {
    setStrings({ saveBar: { save: 'Enregistrer' } }, 'fr');
    setStrings({ saveBar: { save: 'حفظ' } }, 'ar');
    document.body.innerHTML = `<cm-save-bar></cm-save-bar><div lang="fr-CA"><cm-save-bar></cm-save-bar></div><div lang="ar"><cm-save-bar></cm-save-bar></div>`;
    const bars = [...document.querySelectorAll('cm-save-bar')] as CmSaveBar[];
    await Promise.all(bars.map((b) => b.updateComplete));
    expect(bars.map((b) => b.saveLabel)).toEqual(['Save', 'Enregistrer', 'حفظ']);
  });

  it('configure({ translations }) and the document language pick the strings', async () => {
    configure({ translations: { es: { notificationPanel: { heading: 'Notificaciones', empty: 'Aún no hay notificaciones.' } } } });
    document.documentElement.lang = 'es';
    const panel = await mount<CmNotificationPanel>('<cm-notification-panel open></cm-notification-panel>');
    expect(panel.heading).toBe('Notificaciones');
    expect(shadow(panel, 'h2').textContent).toBe('Notificaciones');
    expect(shadow(panel, '.empty').textContent).toBe('Aún no hay notificaciones.');
    panel.open = false; await panel.updateComplete;
  });

  it('global search, header bar search and notification panel 1.1 strings are translatable', async () => {
    expect(getDefaultStrings().globalSearch).toMatchObject({ label: 'Search', placeholder: 'Search', noResults: 'No results', seeAll: 'See all' });
    setStrings({
      globalSearch: { label: 'Rechercher', placeholder: 'Rechercher partout', noResults: 'Aucun résultat', seeAll: 'Tout voir', results: { one: '{count} résultat', other: '{count} résultats' } },
      headerBar: { search: 'Recherche' },
      notificationPanel: { markAllRead: 'Tout marquer comme lu' },
      common: { loading: 'Chargement' },
    });
    const gs = await mount<CmGlobalSearch>('<cm-global-search value="x"></cm-global-search>');
    gs.results = [{ label: 'Prospects', total: 1200, href: '#all', items: [{ title: 'A', href: '#a' }] }];
    gs.open = true; await gs.updateComplete;
    expect(shadow(gs, 'input').getAttribute('aria-label')).toBe('Rechercher');
    expect(shadow(gs, 'input').getAttribute('placeholder')).toBe('Rechercher partout');
    expect(shadow(gs, '.all').textContent!.trim()).toBe('Tout voir');
    expect(shadow(gs, '.gh .count').textContent).toBe('1,200');
    expect(shadow(gs, '.gh .vh').textContent).toBe(', 1,200 résultats');
    expect(shadow(gs, '[role="status"]').textContent).toBe('1 résultat');
    gs.loading = true; await gs.updateComplete;
    expect(shadow(gs, '[role="status"]').textContent).toBe('Chargement');
    gs.loading = false; gs.results = []; await gs.updateComplete;
    expect(shadow(gs, '.message').textContent).toBe('Aucun résultat');
    const bar = await mount<CmHeaderBar>('<div style="width:500px"><cm-header-bar><cm-global-search slot="search"></cm-global-search></cm-header-bar></div>', 'cm-header-bar');
    await settle(bar); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await bar.updateComplete;
    expect(shadow(bar, '.search-btn').getAttribute('aria-label')).toBe('Recherche');
    const panel = await mount<CmNotificationPanel>('<cm-notification-panel open mark-all-read loading><cm-notification-item unread>A</cm-notification-item></cm-notification-panel>');
    expect(shadow(panel, '[role="status"]').textContent).toBe('Chargement');
    panel.loading = false; await panel.updateComplete;
    expect(shadow(panel, '.mark').textContent).toBe('Tout marquer comme lu');
    panel.open = false; await panel.updateComplete;
  });

  it('plural forms pick by count in the locale', async () => {
    const card = await mount<CmAppCard>('<cm-app-card name="Shiprocket" rating="4.5" reviews="1"></cm-app-card>');
    expect(card.shadowRoot!.textContent).toContain('1 Review');
    card.reviews = 1200; await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain('1,200 Reviews');
    configure({ locale: 'pl' });
    setStrings({ appCard: { reviews: { one: '{count} opinia', few: '{count} opinie', many: '{count} opinii', other: '{count} opinii' } } });
    card.reviews = 3; await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain('3 opinie');
    card.reviews = 5; await card.updateComplete;
    expect(card.shadowRoot!.textContent).toContain('5 opinii');
  });

  it('validation messages are translated too', async () => {
    setStrings({ fileUpload: { required: 'Choisissez un fichier.', tooMany: 'Au plus {max} fichiers' } });
    document.body.innerHTML = '<form><cm-file-upload required multiple max-files="1"></cm-file-upload></form>';
    const up = document.querySelector('cm-file-upload') as CmFileUpload;
    await up.updateComplete;
    expect(up.validationMessage).toBe('Choisissez un fichier.');
    up.addFiles([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]);
    await up.updateComplete;
    expect(shadow(up, '.msg').textContent).toBe('Au plus 1 fichiers');
  });

  it('the toast region keeps its own name in the current language, but not a name the page set', async () => {
    document.body.innerHTML = '<cm-toast-region></cm-toast-region><cm-toast-region aria-label="Messages"></cm-toast-region>';
    const [a, b] = [...document.querySelectorAll('cm-toast-region')] as CmToastRegion[];
    await a.updateComplete;
    setStrings({ toastRegion: { label: 'Benachrichtigungen' } });
    await a.updateComplete; await b.updateComplete;
    expect(a.getAttribute('aria-label')).toBe('Benachrichtigungen');
    expect(b.getAttribute('aria-label')).toBe('Messages');
  });

  it('resetStrings goes back to English', async () => {
    setStrings({ common: { close: 'Fermer' } });
    expect(translate('modal', 'close')).toBe('Fermer');
    resetStrings();
    expect(translate('modal', 'close')).toBe('Close');
  });
});

describe('built-in text: metric', () => {
  it('trend words and the loading announcement are translatable; the figure follows the locale', async () => {
    const el = await mount<CmMetric>('<div lang="fr"><cm-metric label="Prospects" value="1240" change="+12 %" trend="up" loading></cm-metric></div>', 'cm-metric');
    expect(shadow(el, '.change .sr').textContent).toBe('Up +12 %, good');
    expect(shadow(el, '[role="status"]').textContent).toBe('Loading Prospects');
    setStrings({ metric: { up: 'Hausse {change}', good: '{trend}, bon', loadingValue: 'Chargement : {label}' } });
    await settle(el);
    expect(shadow(el, '.change .sr').textContent).toBe('Hausse +12 %, bon');
    expect(shadow(el, '[role="status"]').textContent).toBe('Chargement : Prospects');
    el.strings = { up: 'En hausse de {change}' };
    el.loading = false;
    await el.updateComplete;
    expect(shadow(el, '.change .sr').textContent).toBe('En hausse de +12 %, bon');
    expect(shadow(el, '.value').textContent!.replace(/\s/g, ' ').trim()).toBe('1 240'); // French grouping
    expect(getDefaultStrings().metric.down).toBe('Down {change}');
  });
});

describe('built-in text: pickers', () => {
  it('date picker: English defaults, then setStrings, the strings property and the configured locale', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Ship by" locale="en-IN" required></cm-date-picker>');
    expect(shadow(el, '.trigger').getAttribute('aria-label')).toBe('Choose date for Ship by');
    expect((shadow(el, 'input') as HTMLInputElement).placeholder).toBe('dd/mm/yyyy');
    expect(el.validationMessage).toBe('Enter or choose a date.');
    setStrings({ datePicker: { chooseFor: 'Choisir la date : {label}', previousMonth: 'Mois précédent', patternDay: 'jj', patternYear: 'aaaa', required: 'Saisissez une date.' } });
    await el.updateComplete;
    expect(shadow(el, '.trigger').getAttribute('aria-label')).toBe('Choisir la date : Ship by');
    expect((shadow(el, 'input') as HTMLInputElement).placeholder).toBe('jj/mm/aaaa');
    expect(el.validationMessage).toBe('Saisissez une date.');
    el.show(); await el.updateComplete;
    expect(shadow(el, '.cal-nav').getAttribute('aria-label')).toBe('Mois précédent');
    el.strings = { previousMonth: 'Précédent' }; await el.updateComplete;
    expect(shadow(el, '.cal-nav').getAttribute('aria-label')).toBe('Précédent');
    el.close();
    // Without a locale property the picker follows configure({ locale }), like every other component.
    el.locale = ''; el.value = '2026-11-15';
    configure({ locale: 'fr-FR' });
    await el.updateComplete;
    el.show(); await el.updateComplete;
    expect(shadow(el, '.cal-title').textContent).toBe('novembre 2026');
    expect((shadow(el, 'input') as HTMLInputElement).value).toBe('15/11/2026');
    el.close(); await el.updateComplete;
  });

  it('date picker: validation messages with dates are formatted in the locale', async () => {
    document.documentElement.lang = 'de-DE';
    const el = await mount<CmDatePicker>('<cm-date-picker label="Datum" min="2026-11-10" value="2026-11-01"></cm-date-picker>');
    setStrings({ datePicker: { rangeUnderflow: 'Wählen Sie {date} oder später.' } }, 'de');
    await el.updateComplete;
    expect(el.validationMessage).toBe(`Wählen Sie ${new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(2026, 10, 10))} oder später.`);
  });

  it('date picker with time: time box name, letters and messages are translatable; the clock follows the locale', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Rappel" locale="fr-FR" time value="2026-11-20"></cm-date-picker>');
    const time = () => shadow(el, 'input.time-in') as HTMLInputElement;
    expect(time().getAttribute('aria-label')).toBe('Time for Rappel');
    expect(time().placeholder).toBe('hh:mm');
    expect(el.validationMessage).toBe('Enter a time.');
    setStrings({ datePicker: { timeFor: 'Heure : {label}', patternHour: 'HH', timeMissing: 'Saisissez une heure.', stepMismatch: { one: 'À la minute.', other: 'Par pas de {count} minutes.' } } });
    await el.updateComplete;
    expect(time().getAttribute('aria-label')).toBe('Heure : Rappel');
    expect(time().placeholder).toBe('HH:mm');
    expect(el.validationMessage).toBe('Saisissez une heure.');
    el.step = 30; el.value = '2026-11-20T14:10'; await el.updateComplete;
    expect(time().value).toBe('14:10');
    expect(el.validationMessage).toBe('Par pas de 30 minutes.');
  });

  it('text field: date and time validation messages are translatable and formatted in the locale', async () => {
    document.documentElement.lang = 'de-DE';
    const el = await mount<CmTextField>('<cm-text-field type="datetime-local" label="Termin" min="2026-11-16T10:00" value="2026-11-16T09:00"></cm-text-field>');
    setStrings({ textField: { rangeUnderflow: 'Frühestens {min}.' } }, 'de');
    await el.updateComplete;
    const min = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 10, 16, 10, 0));
    expect(el.validationMessage).toBe(`Frühestens ${min}.`);
  });

  it('date range picker: preset labels, input names and the status line are translatable', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Période" presets="today last-7-days"></cm-date-range-picker>');
    expect(el.startLabel).toBe('Start date');
    setStrings({ dateRangePicker: { today: "Aujourd'hui", last7Days: '7 derniers jours', start: 'Début', chooseStart: 'Choisissez la date de début.' } });
    await el.updateComplete;
    expect(el.startLabel).toBe('Début');
    expect(shadow(el, 'input').getAttribute('aria-label')).toBe('Début');
    el.show(); await el.updateComplete;
    expect([...el.shadowRoot!.querySelectorAll('.preset')].map((b) => b.textContent!.trim())).toEqual(["Aujourd'hui", '7 derniers jours']);
    expect(shadow(el, '.status').textContent).toBe('Choisissez la date de début.');
    el.startLabel = 'Du'; await el.updateComplete;
    expect(shadow(el, 'input').getAttribute('aria-label')).toBe('Du');
    el.close();
  });

  it('combobox: result count with plurals and locale digits, empty text, loading, add and remove labels', async () => {
    const el = await mount<CmCombobox>('<cm-combobox label="Tags" multiple><option value="a" selected>Alpha</option><option value="b">Beta</option></cm-combobox>');
    expect(el.emptyText).toBe('No results');
    expect(el.loadingText).toBe('Loading');
    const input = shadow(el, 'input') as HTMLInputElement;
    input.value = 'a'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); await el.updateComplete;
    expect(shadow(el, '[role=status]').textContent).toBe('2 results');
    configure({ locale: 'ar-EG' });
    setStrings({ combobox: { results: { zero: 'لا نتائج', one: 'نتيجة واحدة', two: 'نتيجتان', few: '{count} نتائج', many: '{count} نتيجة', other: '{count} نتيجة' }, add: 'إضافة "{value}"', remove: 'إزالة {label}' } });
    await el.updateComplete;
    expect(shadow(el, '[role=status]').textContent).toBe('نتيجتان');
    expect(shadow(el, 'cm-tag').getAttribute('remove-label')).toBe('إزالة Alpha');
    el.allowCustom = true;
    input.value = 'Gamma'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); await el.updateComplete;
    expect(shadow(el, '[role=option]').textContent!.trim()).toBe('إضافة "Gamma"');
    resetStrings();
    setStrings({ common: { loading: 'Chargement' }, combobox: { noResults: 'Aucun résultat' } });
    el.loading = true; await el.updateComplete;
    expect(shadow(el, '[role=status]').textContent).toBe('Chargement');
    el.loading = false; el.allowCustom = false; input.value = 'zzz'; input.dispatchEvent(new Event('input', { bubbles: true, composed: true })); await el.updateComplete;
    expect(shadow(el, '.message').textContent!.trim()).toBe('Aucun résultat');
    el.emptyText = 'Rien'; await el.updateComplete;
    expect(shadow(el, '.message').textContent!.trim()).toBe('Rien');
    el.multiple = false; el.values = []; el.required = true; await el.updateComplete;
    setStrings({ combobox: { required: 'Choisissez un élément.' } }); await el.updateComplete;
    expect(el.validationMessage).toBe('Choisissez un élément.');
  });
});

describe('formatMessage', () => {
  it('timeline: list name, Show more, loading and relative times are translatable', async () => {
    setStrings({ timeline: { label: 'Activité', showMore: 'Afficher plus', loading: 'Chargement' }, timelineItem: { hoursAgo: { one: 'il y a {count} heure', other: 'il y a {count} heures' }, showAll: 'Tout afficher' } }, 'fr');
    const el = await mount<HTMLElement>(`<div lang="fr"><cm-timeline has-more loading><cm-timeline-item heading="E-mail" lines="1" style="width:200px"
      datetime="${new Date(Date.now() - 3 * 3600_000 - 60_000).toISOString()}">${'Bonjour Asha, merci pour votre temps. '.repeat(10)}</cm-timeline-item></cm-timeline></div>`, 'cm-timeline');
    const item = el.querySelector('cm-timeline-item') as any;
    await settle(item); await settle(el); await new Promise((r) => requestAnimationFrame(r)); await item.updateComplete;
    expect(shadow(el, 'ol').getAttribute('aria-label')).toBe('Activité');
    expect(shadow(el, '.more cm-button').textContent!.trim()).toBe('Afficher plus');
    expect(shadow(el, '[role="status"]').textContent).toBe('Chargement');
    expect(item.relativeTime).toBe('il y a 3 heures');
    expect(shadow(item, '.toggle').textContent!.trim()).toBe('Tout afficher');
  });

  it('fills placeholders, formats numbers, leaves unknown ones and calls functions', () => {
    expect(formatMessage('Page {page} of {total}', { page: 2, total: 12000 }, 'en')).toBe('Page 2 of 12,000');
    expect(formatMessage('{missing} stays', {})).toBe('{missing} stays');
    expect(formatMessage(({ count }) => `n=${count}`, { count: 3 })).toBe('n=3');
    expect(formatMessage({ one: 'one item', other: '{count} items' }, { count: 1 }, 'en')).toBe('one item');
    expect(formatMessage({ one: 'one item', other: '{count} items' }, { count: 0 }, 'en')).toBe('0 items');
  });
});
