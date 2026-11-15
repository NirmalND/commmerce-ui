# Changelog

The Flutter package shares its version number with the Commmerce UI web packages. Full release notes:
https://commmerce.com/blog/commmerceui/#releases

## 1.0.0-rc.5

* New: `CmDatePicker`, `CmDateRangePicker` (with presets) and `CmCombobox` (filtering, multi-select chips, server results).
* `CmStrings` and `CmLocalizations`: translate every built-in string once for the app. Right-to-left layout is not checked yet.

## 1.0.0-rc.4

* Version aligned with the web packages (previously 0.5.1), as the 1.0 compatibility policy requires.
* 59 widget classes matching the web components, including the admin shell (`CmAdminScaffold`, `CmSideNav`,
  `CmHeaderBar`), forms, overlays, lists, `CmDataTable`, page layout (`CmPage`, `CmLayout`, `CmGrid`, `CmStack`),
  toasts, tooltips, spinners and progress bars.
* Every announced control can be activated by screen readers; an audit test walks the example app to keep it so.
