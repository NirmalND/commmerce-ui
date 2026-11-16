# Changelog

The Flutter package shares its version number with the Commmerce UI web packages. Full release notes:
https://commmerce.com/blog/commmerceui/#releases

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
