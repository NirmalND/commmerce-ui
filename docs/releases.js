// Release notes, newest first. Cloud build sessions add an entry here when a batch ships
// (an <h2 id="vX-Y-Z"> heading and a list). Plain HTML; internal links use href="#/path".
export const releaseNotes = `
  <h2 id="v1-0-0-rc-5">v1.0.0-rc.5</h2>
  <ul>
    <li>Fifth release candidate. Pin it with <code>/v/1.0.0-rc.5/cdn.js</code>, <code>/v/1.0.0-rc.5/tokens.css</code>, <code>/v/1.0.0-rc.5/fonts.css</code> and <code>/v/1.0.0-rc.5/app-bridge.js</code>, or <code>npm install @commmerce/ui@next</code>. Nothing that worked in rc.4 changes; everything below is added.</li>
    <li>New components: <a href="#/components/date-picker">Date picker</a>, <a href="#/components/date-range-picker">Date range picker</a> (with presets such as Last 7 days, for order and report filters) and <a href="#/components/combobox">Combobox</a> (type to filter, multi-select tags, results from your server, adding new values). All three submit with forms, follow the WAI-ARIA keyboard patterns and have React wrappers and Flutter widgets.</li>
    <li>Other languages: every built-in string (such as Previous, Next, Close and "3 selected") can be translated once for the whole app with <code>configure()</code> or per element with <code>strings</code>; numbers, dates and plurals follow the locale. Components work right to left: logical CSS, mirrored arrows and arrow keys, side panels open from the correct side. <a href="#/foundations/localisation">Localisation</a></li>
    <li>Tested with more frameworks: starter apps for <a href="#/start/frameworks">Vue 3, Angular, Svelte 5 and Next.js</a>, each on the published packages with browser tests in CI, plus a <a href="#/start/typescript">TypeScript</a> page.</li>
    <li>For app developers: <a href="#/apps/guidelines">App design guidelines</a> and a <a href="#/apps/review-checklist">marketplace review checklist</a>. App Bridge: <code>app.ready</code> now gives the <code>path</code> to open after a reload or from a shared link, and the admin sends <code>path.change</code> on Back and Forward.</li>
    <li>Fixes: Page header actions wrap below the title on narrow phones instead of overflowing; an overlay closed and reopened quickly no longer stays closed.</li>
  </ul>
  <h2 id="v1-0-0-rc-4">v1.0.0-rc.4</h2>
  <ul>
    <li>Fourth release candidate, the same code as 1.0.0-rc.3. Pin it with <code>/v/1.0.0-rc.4/cdn.js</code>, <code>/v/1.0.0-rc.4/tokens.css</code>, <code>/v/1.0.0-rc.4/fonts.css</code> and <code>/v/1.0.0-rc.4/app-bridge.js</code>.</li>
    <li>On npm: <code>npm install @commmerce/ui @commmerce/tokens</code> (React: <code>@commmerce/ui-react</code>; embedded apps: <code>@commmerce/app-bridge</code>). Published from GitHub with npm trusted publishing (no long-lived token). Release candidates go to the <code>next</code> tag: <code>npm install @commmerce/ui@next</code> gets this one.</li>
  </ul>
  <h2 id="v1-0-0-rc-3">v1.0.0-rc.3</h2>
  <ul>
    <li>Third release candidate. Pin it with <code>/v/1.0.0-rc.3/cdn.js</code>, <code>/v/1.0.0-rc.3/tokens.css</code> and <code>/v/1.0.0-rc.3/app-bridge.js</code>. Not yet on npm.</li>
    <li><strong>Change to check when upgrading:</strong> <code>tokens.css</code> no longer loads the Poppins font. Add <code>&lt;link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&amp;display=swap"&gt;</code> before it (or <code>import '@commmerce/tokens/fonts.css'</code>, also hosted at <code>/v/1.0.0-rc.3/fonts.css</code>). Firefox and Safari held back every token until the font stylesheet had loaded; now the colours and spacing apply at once. Without the font link, text falls back to the system font.</li>
    <li>App Bridge: the admin origin can be a pattern such as <code>https://*.commmerce.com</code>, so one app works inside every Commmerce product admin on a subdomain. It matches subdomains only, never the bare domain, look-alike domains, other schemes or ports, and messages still go to the one admin the app runs in. Session tokens and both starter apps accept the same pattern. <a href="#/apps/app-bridge">App Bridge</a></li>
    <li>1.0 <a href="#/releases/stability">compatibility policy</a> published: breaking changes only in major versions, 6 months' notice for deprecations.</li>
    <li>Tested in more browsers: the component suite now runs in Firefox and WebKit on every change, and was run in real Safari 27 on macOS.</li>
  </ul>
  <h2 id="v1-0-0-rc-2">v1.0.0-rc.2</h2>
  <ul>
    <li>Second release candidate. Pin it with <code>/v/1.0.0-rc.2/cdn.js</code>, <code>/v/1.0.0-rc.2/tokens.css</code> and <code>/v/1.0.0-rc.2/app-bridge.js</code>. Not yet on npm.</li>
    <li>Page layout without your own CSS: <a href="#/components/page">Page</a>, <a href="#/components/layout">Layout</a> (two-thirds and one-third columns that stack on narrow screens), <a href="#/components/stack">Stack</a> and <a href="#/components/grid">Grid</a>. The product editor pattern now uses them.</li>
    <li><a href="#/components/data-table">Data table</a>: a real table for reports and stock or order lists, with sortable columns, totals, a sticky header and first column, loading and empty states. It also styles a server-rendered <code>&lt;table&gt;</code>, and sorts it in the browser when a heading has <code>data-sort</code>. Every sort is announced to screen readers.</li>
    <li>Feedback: <a href="#/components/toast">Toast</a> (with <code>showToast()</code>), <a href="#/components/spinner">Spinner</a> and <a href="#/components/progress-bar">Progress bar</a>.</li>
    <li><a href="#/components/tooltip">Tooltip</a>, <a href="#/components/avatar">Avatar</a> and <a href="#/components/thumbnail">Thumbnail</a> (a Resource list row sizes a thumbnail in its <code>media</code> slot). The header bar's user pill now shows the user's initials when there is no photo.</li>
    <li>Resource list: the Select box has a menu (this page, all matching, none). Action menu takes an <code>icon</code> for its icon-only trigger.</li>
    <li>App Bridge: <code>app.autoResize()</code> keeps the admin's frame as tall as your page (new request <code>frame.resize</code>, still protocol version 1). <code>navigate</code> now refuses paths with <code>\\</code> or control characters, which some browsers read as another site. The backend example passes <code>issuer</code> and serves only stores that installed the app. The reference host shows real toasts and the loading bar with Progress bar.</li>
    <li>New: a <a href="#/apps/starter">starter app</a> to copy, in Node or PHP: a plain HTML page, a backend that verifies session tokens and serves only stores that installed the app, and a stand-in admin for local development. The PHP <code>SessionToken::verify()</code> works in any PHP app.</li>
    <li>389 automated tests (182 component, 180 React wrapper, 27 App Bridge) and 128 colour pairs checked. Not done yet: tests in Firefox and WebKit, and with real screen readers.</li>
  </ul>
  <h2 id="v1-0-0-rc-1">v1.0.0-rc.1</h2>
  <ul>
    <li>First release candidate for 1.0. Every package shares the version <code>1.0.0-rc.1</code>; pin it with <code>/v/1.0.0-rc.1/cdn.js</code> and <code>/v/1.0.0-rc.1/tokens.css</code>. Not yet on npm. The API can still change before 1.0.0, and no compatibility policy for 1.0 has been decided yet (<a href="#/releases/stability">Stability</a>).</li>
    <li>React wrappers are now tested: 151 tests with React 18 in Chromium check that every wrapper reaches its element, passes every property, and calls its <code>on…</code> prop for every documented event, plus children, refs, controlled values and handler swaps.</li>
    <li>Accessibility review: an automated audit (axe-core, WCAG 2.0 to 2.2 A and AA) of every component example in light and dark, and a keyboard sweep for visible focus and keyboard traps. Results and what is still to do are on the <a href="#/foundations/accessibility">Accessibility</a> page.</li>
    <li>Fixes from the review: Status tabs now link each tab to the list it filters in a way screen readers can follow (the old <code>aria-controls</code> could not reach out of the component); the Resource list loading spinner is no longer announced as part of the list; Info panel is a list only while it holds info items; resource and nested list rows also carry <code>role="listitem"</code> as an attribute; tinted Badges (information, success, critical, attention) keep AA contrast on grey page backgrounds.</li>
    <li>Not done yet: tests in Firefox (the test browser could not be installed in the build environment) and with real screen readers, and a manual WCAG audit.</li>
  </ul>
  <h2 id="v0-9-0">v0.9.0</h2>
  <ul>
    <li>Two patterns are now working examples: <a href="#/patterns/search-filter-sort">Search, filtering, sorting and bulk actions</a> (status tabs, search, the Filter panel with removable filter tags, sortable columns and a confirmed bulk delete) and <a href="#/patterns/app-layout">Embedded app layout and navigation</a> (a three-screen app in a frame that keeps the admin's address, save bar, modal and toasts in step through App Bridge).</li>
    <li>Two new patterns: <a href="#/patterns/confirm-delete">Confirm before deleting</a> and <a href="#/patterns/unsaved-changes">Unsaved changes when leaving</a>, both built on Modal.</li>
    <li>A States section on 15 component pages, with live examples of the loading, empty, disabled, error, saving and no-results states their examples lacked.</li>
    <li>No component code changed in this release: the hosted build is the same as v0.8.0 apart from its version number.</li>
  </ul>
  <h2 id="v0-8-0">v0.8.0</h2>
  <ul>
    <li>New package: <a href="#/apps/app-bridge">App Bridge</a> (<code>@commmerce/app-bridge</code>, protocol version 1). An app in the admin can show toasts and modals over the whole admin, drive the save bar and a loading bar, open the resource picker, update the admin's address, and get a session token for its backend.</li>
    <li>Load it from the hosted build, pinned: <code>/v/0.8.0/app-bridge.js</code>. Not yet on npm.</li>
    <li>Session tokens are 60-second HS256 JWTs; <code>verifySessionToken</code> checks the algorithm, signature, expiry and audience on your server. The claims are documented on the App Bridge page.</li>
    <li>Every message is checked on both sides: exact origins (never <code>*</code>), the expected window, the protocol version, and the request's contents.</li>
    <li>The App Bridge page has a working example. Before relying on App Bridge in a store, confirm with <a href="mailto:support@commmerce.com">support@commmerce.com</a> that your store's admin is connected.</li>
    <li>25 new browser tests with real same-origin and cross-origin frames (143 in total).</li>
  </ul>
  <h2 id="v0-7-0">v0.7.0</h2>
  <ul>
    <li>Six overlay components: <a href="#/components/modal">Modal</a>, <a href="#/components/side-panel">Side panel</a>, <a href="#/components/filter-panel">Filter panel</a>, <a href="#/components/action-menu">Action menu</a>, <a href="#/components/bottom-sheet">Bottom sheet</a> and <a href="#/components/notification-panel">Notification panel</a>, each with a React wrapper.</li>
    <li>Modal, Side panel, Filter panel, Bottom sheet and Notification panel are native modal dialogs: the page behind is inert, Esc and the backdrop fire a cancelable <code>cm-close</code> with the reason, page scrolling is locked, and focus returns to the button that opened them. Open them with <code>show()</code> or the <code>open</code> attribute.</li>
    <li>Action menu follows the WAI-ARIA menu button pattern: arrow keys, Home/End, typing a letter, Esc to close; its choices are <code>&lt;cm-menu-item&gt;</code>s, which Bottom sheet uses too.</li>
    <li>Filter panel reads and resets a <code>&lt;form&gt;</code> of your fields and fires <code>cm-filter-apply</code> with the values; it is now linked from the search and filtering pattern.</li>
    <li>Notification panel is admin chrome: for Commmerce products only, not for apps.</li>
  </ul>
  <h2 id="v0-6-0">v0.6.0</h2>
  <ul>
    <li>Seven navigation and marketplace components: <a href="#/components/side-navigation">Side navigation</a>, <a href="#/components/header-bar">Header bar</a>, <a href="#/components/bottom-navigation">Bottom navigation</a>, <a href="#/components/mobile-menu">Mobile menu</a>, <a href="#/components/flash-offer-bar">Flash offer bar</a>, <a href="#/components/link-tabs">Link tabs</a> and <a href="#/components/app-card">App card</a>, each with a React wrapper.</li>
    <li>Side navigation, Header bar, Bottom navigation and Mobile menu are the admin's own chrome, built from the live admin: for Commmerce products only, not for apps.</li>
    <li>Navigation takes its items from <code>&lt;cm-nav-item&gt;</code> children or a JSON <code>items</code> property, and fires a cancelable <code>cm-navigate</code> so single-page apps can route themselves.</li>
    <li>Side navigation sections open with Enter, Space or →, and ↑/↓ move between items; the Mobile menu opens sub-items on a second screen and returns focus on Back or Escape.</li>
    <li>New pattern: <a href="#/patterns/admin-dashboard">Admin dashboard and onboarding</a>.</li>
    <li>16 new line icons (57 in total), including <code>pos</code>, <code>website</code>, <code>apps</code>, <code>megaphone</code>, <code>staff</code>, <code>wallet</code> and <code>star</code>.</li>
    <li>New colour token <code>text-on-dark-secondary</code> for unselected items on black; the contrast check now covers 118 colour pairs.</li>
  </ul>
  <h2 id="v0-5-1">v0.5.1</h2>
  <ul>
    <li>The preview build is now versioned. Load <code>/v/0.5.1/tokens.css</code> and <code>/v/0.5.1/cdn.js</code> to pin this release: files under a version never change. <a href="#/start/install">Install</a></li>
    <li>All packages share one version number, and every release raises it.</li>
    <li>The docs are reorganised around building apps for the Commmerce admin: a quickstart that runs, a guide to building an admin app, six patterns, and Ready / In progress / Planned status on everything.</li>
    <li>Embedding apps in the Commmerce admin is live. App Bridge is still planned.</li>
    <li>Support for developers: <a href="mailto:support@commmerce.com">support@commmerce.com</a>.</li>
    <li>Tested in WebKit 18.2, the engine behind Safari, in addition to Chromium.</li>
    <li>Fix: Nested list keeps keyboard focus on the row's handle after a move, so a quick second key press works.</li>
  </ul>
  <h2 id="v0-5-0">v0.5.0 </h2>
  <ul>
    <li>Six list components: <a href="#/components/resource-list">Resource list</a>, <a href="#/components/table-header">Table header</a>, <a href="#/components/pagination">Pagination</a>, <a href="#/components/status-tabs">Status tabs</a>, <a href="#/components/nested-list">Nested list</a> and <a href="#/components/report-tile">Report tile</a>, each with a React wrapper.</li>
    <li>Resource list has bulk selection: select the page, then every match ("Select all 15,000 products"), with bulk actions and a spoken selection count.</li>
    <li>Table header becomes a real header row inside <code>role="table"</code>, with sortable columns (<code>aria-sort</code>) and a select-all box; rows share its grid through <code>--cm-table-columns</code>.</li>
    <li>Nested list rows reorder with drag and drop or the keyboard (↑/↓ on the handle), and moves are announced.</li>
    <li>Status tabs are ARIA tabs with counts; Pagination is a named landmark with a live "Showing 21–40 of 290" summary.</li>
  </ul>
  <h2 id="v0-4-0">v0.4.0</h2>
  <ul>
    <li>Five feedback components: <a href="#/components/empty-state">Empty state</a>, <a href="#/components/skeleton">Skeleton</a>, <a href="#/components/skeleton-display">Skeleton display</a>, <a href="#/components/comment">Comment</a> and <a href="#/components/smart-tip">Smart tip</a>, each with a React wrapper.</li>
    <li>Skeletons are hidden from screen readers and stop pulsing under reduced motion; Skeleton display announces "Loading" once.</li>
    <li>Comment box posts with a button or Ctrl/⌘ + Enter and fires a cancelable <code>cm-submit</code>, so you can keep the text if saving fails.</li>
    <li>Smart tips are whole-card links in a list, with an optional dark tour banner.</li>
    <li>The contrast check now covers 104 colour pairs.</li>
  </ul>
  <h2 id="v0-3-0">v0.3.0</h2>
  <ul>
    <li>Five layout components: <a href="#/components/page-header">Page header</a>, <a href="#/components/save-bar">Save bar</a>, <a href="#/components/action-bar">Action bar</a>, <a href="#/components/info-panel">Info panel</a> and <a href="#/components/accordion">Accordion</a>, each with a React wrapper.</li>
    <li>Page header puts breadcrumbs, the page <code>&lt;h1&gt;</code> and actions in one bar, with optional previous/next record arrows; on phones the breadcrumbs become a back arrow.</li>
    <li>Save bar can watch a form: it opens when a field changes, Save submits the form and Discard resets it. Both events are cancelable.</li>
    <li>Action bar has a critical tone for blocking errors, announced as an alert.</li>
    <li>The contrast check now covers 100 colour pairs (text and the red icon on the error bar).</li>
    <li>The docs build now fails if the component content has a syntax error.</li>
  </ul>
  <h2 id="v0-2-0">v0.2.0</h2>
  <ul>
    <li>Seven form components: <a href="#/components/radio">Radio button</a>, <a href="#/components/toggle">Toggle</a>, <a href="#/components/select">Select</a>, <a href="#/components/search">Search</a>, <a href="#/components/file-upload">File upload</a>, <a href="#/components/option-group">Option group</a> and <a href="#/components/tag">Tag</a>, each with a React wrapper.</li>
    <li>Radio button and Option group behave like native radio groups: one tab stop, arrow keys move and select, and the form gets the selected value.</li>
    <li>Select is a custom listbox, so its open list matches Figma, with native-select keyboard support (arrows, Home/End, typeahead, Enter, Escape).</li>
    <li>Contrast fixes where Figma falls short: outlined toggle track and thumb, <code>border-input</code> edges on Select and Search, <code>text-tertiary</code> placeholders. Each component page lists its differences from Figma.</li>
    <li>The build-time contrast check now covers 96 colour pairs.</li>
    <li>Docs: component pages document child elements (such as <code>cm-radio</code>) and list React props for custom events.</li>
  </ul>
  <h2 id="v0-1-0">v0.1.0</h2>
  <ul>
    <li>First release: Button, Text field, Checkbox, Badge, Card, Banner and Icon.</li>
    <li>Light and dark themes, built from the Figma file's neutrals.</li>
    <li>WCAG AA contrast across 66 colour tokens, checked on every build.</li>
    <li>New tokens: <code>border-input</code>, <code>action-*</code>, <code>text-speciality-on-dark</code>, <code>tracking-caps</code>.</li>
    <li>41 icons in <code>@commmerce/icons</code>.</li>
    <li>React wrappers in <code>@commmerce/ui-react</code>.</li>
  </ul>
`;
