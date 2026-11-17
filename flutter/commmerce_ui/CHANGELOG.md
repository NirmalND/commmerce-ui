# Changelog

The Flutter package shares its version number with the Commmerce UI web packages. Full release notes:
https://commmerce.com/blog/commmerceui/#releases

## 1.7.0

* Command palette (web 1.7): `showCmCommandPalette` (grouped records from an async `search`, actions filtered by title and keywords with every word matching, any case or accent, recent items, keycap shortcut hints, loading and empty states, ↑/↓/Home/End/Enter/Esc, results announced; full screen with a close button at 640 or less; 40 box, 44 and 16px text on touch), `CmCommandPaletteShortcut` (mod+K through Shortcuts/Actions, toggles), `cmCommandMatches`, `CmShortcut` and `CmKeys`.
* Undo toasts (web 1.7): `showCmToast(action: CmToastAction(...))`, `closed` completes with `CmToastCloseReason` (`action`, `timeout`, `close`, `removed`; `CmToastDismissReason` stays as an alias), F6 moves focus to the newest toast's action and back (`cmFocusToast`), Esc closes a focused toast, the action's toast is announced with "Press F6 to reach it.", `cmUndoable(context, doIt, undoIt, message:)`.
* The rest of the 1.6 standard: CmDataTable actions columns (`CmDataTableAction`, `onRowAction`, `rowActions`), `resizable` (drag, ←/→ 16px, announced, `onColumnResize`), `columnPicker` and `visible` (`onColumnsChange`), `CmDataTableMobile.priority` with "View all fields", a "Scroll for more" hint, `primary` and `width` on columns; CmStatusTabs `size` (small) and `mobile: select`; CmActionMenu rows 36/32 (`density`)/44 touch with `CmMenuItem.heading` and `shortcut`; CmTooltip 12px, 8x12, max 240, 400ms; CmTag 24/12; CmCombobox `maxTags` with "+N more" and ←/→/Home/End/Backspace/Delete between tags; CmFileUpload 72px empty row ("Drag files here or Browse"), `setDragOver`, `setProgress`/`onCancel`, `setFileError`, 112–140 tiles, empty photo tile up to 120 tall; field text 16px on touch (`cmFieldText`).
* Record page (web 1.7): `CmRecordLayout` (`main` + `aside`; the aside is a 320 column on the end side from 880 of the layout's own width, on the left in RTL; narrower it stacks above, or below with `asidePosition: CmAsidePosition.below`; gap 24, 16 at 640 or less; `stickyAside` keeps it in view while the main column scrolls when it fits the scroll view, `stickyTop`); `CmPageHeader` `onBack` and `backLabel` (a "Back to {label}" arrow at every width) and, on phones, actions under the `description` line; `CmInfoPanel` `variant` (compact) and `layout: CmInfoLayout.rows` (13/18 labels on two fifths, 14/20 medium values); `CmDataTableColumn.lines` (text wraps onto up to N lines, then "…", full value in a tooltip and for screen readers). The example app has a Record page (a CRM lead).
* Changes for existing apps: CmFileUpload's default prompt is now "Drag files here or Browse" (`prompt` is nullable); a toast that is pushed out by newer ones completes `closed` with `removed` (was `close`); the hint of an empty CmFileUpload moved into the zone.

## 1.6.0

* The 1.5 scale and the owner standard (#33): CmControlHeight/CmIconSize/CmMotion tokens, label 13/500 and headingSection type, buttons 36 (40 touch), fields 40 (44 touch, small 32), checkbox 16/18, badge 24, card variants (compact, interactive), compact CmEmptyState (large keeps the old look), CmStatusTabs count pills and scroll fade, CmPage widths and 24/16 padding, CmAppFrame panel, CmSegmentedControl, CmPageHeader description, CmResourceList density and select-all row, CmDataTable standard sizes and cards on narrow widths. Deprecated tokens are annotated and unused.
* Changes for existing apps: side navigation 220 wide (rail 72), card padding 24, page padding 24/16, empty state default is the compact tile.
* Not yet (done in the next version): table row actions, resize, column picker, priority mode; status tab dropdown; menu, tooltip, multi-select and upload sizes.

## 1.5.2

* No Flutter changes (a web calendar fix).

## 1.5.1

* No Flutter changes (a web app frame fix).

## 1.5.0

* Tokens regenerated on the 1.5 scale (4px spacing, radius 4/6/8/12, type 12–30, overlay shadows `CmShadow.sm/md/lg`, border-subtle).
* `CmButton` 40/36/32 with 14px labels and a white secondary; fields 36px (32 small); badges, bottom navigation and menus in sentence case; side navigation and header bar resized. Nothing under 12px.
* Not yet: card, status tab and resource list layout changes; 44px touch fields; control-height and motion tokens.

## 1.4.0

* Catches up with the web 1.1–1.3 additions: `CmAppFrame`, `CmGlobalSearch` (+ `CmHeaderBar.search`, full-screen layer
  on narrow bars), collapsible `CmSideNav` rail, notification panel (mark all read, description, icon, loading, footer),
  `CmButton` icon-only, count and tone, `CmTimeline`, `CmMetric`, inline `CmEmptyState`, `CmDatePicker` time mode,
  card and page header titles wrapping on narrow widths, `CmBoard` with keyboard and drag moves (`CmMoveModel`),
  `CmColorField`, photo mode on `CmFileUpload`, option groups in `CmSelect`/`CmCombobox`, moves between grouped
  `CmNestedList`s, tones on `CmOptionGroup` options, card actions without a heading.
* Not ported: tooltip `visual-only`, text field time types (use the date picker's time mode), table header alignment,
  board `controlled`, the colour field's browser picker, file upload `capture` (the app chooses the camera in `onPick`).
* Web 1.4.0's calendar and signature field have no Flutter widgets yet.

## 1.3.0

* New icons in `CmIcons`: camera, image, idCard, navigation, wifiOff.
* The web-only additions of 1.3.0 (board, colour field, photo tile, option groups, nested list moves) have no Flutter widgets yet.

## 1.2.0

* New icon in `CmIcons`: phone.
* The web-only additions of 1.2.0 (timeline, metric, date and time, button tones, inline empty state) have no Flutter widgets yet.

## 1.1.1

* No Flutter changes (a web Header bar fix).

## 1.1.0

* New icons in `CmIcons`: mail, chat, tag, building, map, note, eye, inbox, handshake, logOut, refresh, tasks.
* The web-only additions of 1.1.0 (app frame, global search, collapsed side navigation, icon-only button with count,
  notification panel options) have no Flutter widgets yet.

## 1.0.0

* First stable release. No API changes since 1.0.0-rc.5.
* Licence: the Commmerce UI Licence 1.0 replaces the draft (`LICENSE`); third-party notices in `THIRD_PARTY_NOTICES.txt`.

## 1.0.0-rc.5

* New: `CmDatePicker`, `CmDateRangePicker` (with presets) and `CmCombobox` (filtering, multi-select chips, server results).
* `CmStrings` and `CmLocalizations`: translate every built-in string once for the app. Right-to-left layout is not checked yet.

## 1.0.0-rc.4

* Version aligned with the web packages (previously 0.5.1), as the 1.0 compatibility policy requires.
* 59 widget classes matching the web components, including the admin shell (`CmAdminScaffold`, `CmSideNav`,
  `CmHeaderBar`), forms, overlays, lists, `CmDataTable`, page layout (`CmPage`, `CmLayout`, `CmGrid`, `CmStack`),
  toasts, tooltips, spinners and progress bars.
* Every announced control can be activated by screen readers; an audit test walks the example app to keep it so.
