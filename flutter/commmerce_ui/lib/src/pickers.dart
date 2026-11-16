import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'display.dart';
import 'forms.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Material date picker colours from Commmerce tokens: black selection, `bgAttentionSoft` range band,
/// dark panel header. [CmTheme.light] and [CmTheme.dark] already include it; the pickers also apply it themselves.
DatePickerThemeData cmDatePickerTheme(CmColors c) => DatePickerThemeData(
  backgroundColor: c.bgSurface,
  surfaceTintColor: Colors.transparent,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.md)),
  headerBackgroundColor: c.bgPanelHeader,
  headerForegroundColor: c.textOnDark,
  headerHeadlineStyle: CmType.headingSm.copyWith(color: c.textOnDark),
  headerHelpStyle: CmType.bodySm.copyWith(color: c.textOnDark),
  weekdayStyle: CmType.bodySm.copyWith(color: c.textTertiary),
  dayStyle: CmType.bodyMd,
  dayForegroundColor: WidgetStateProperty.resolveWith(
    (s) => s.contains(WidgetState.disabled)
        ? c.textSecondary
        : s.contains(WidgetState.selected)
        ? c.actionPrimaryText
        : c.textDefault,
  ),
  dayBackgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.actionPrimary : null),
  dayShape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.sm))),
  todayForegroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.actionPrimaryText : c.textDefault),
  todayBackgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.actionPrimary : null),
  todayBorder: BorderSide(color: c.borderStrong),
  yearForegroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.actionPrimaryText : c.textDefault),
  yearBackgroundColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? c.actionPrimary : null),
  rangePickerBackgroundColor: c.bgSurface,
  rangePickerHeaderBackgroundColor: c.bgPanelHeader,
  rangePickerHeaderForegroundColor: c.textOnDark,
  rangeSelectionBackgroundColor: c.bgAttentionSoft,
  dividerColor: c.borderDefault,
  cancelButtonStyle: TextButton.styleFrom(foregroundColor: c.textDefault),
  confirmButtonStyle: TextButton.styleFrom(foregroundColor: c.textDefault),
);

Widget _themed(BuildContext context, Widget? child) {
  final c = CmTheme.colorsOf(context);
  return Theme(
    data: Theme.of(context).copyWith(datePickerTheme: cmDatePickerTheme(c)),
    child: child!,
  );
}

/// The read-only box both date pickers show: the formatted value (or placeholder) and a calendar icon.
/// Tap, Enter or Space opens the picker; it is announced as a button with the label and the value.
class _DateBox extends StatelessWidget {
  const _DateBox({
    required this.label,
    required this.text,
    this.placeholder,
    required this.onOpen,
    this.helpText,
    this.error,
    this.required = false,
    this.semanticValue,
    this.side,
  });
  final String label;
  final String? text, placeholder, helpText, error, semanticValue;
  final VoidCallback? onOpen;
  final bool required;

  /// Shown next to the box (the time box of a [CmDatePicker] with `time`).
  final Widget? side;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final enabled = onOpen != null;
    final hasError = error != null && error!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: label,
                  style: CmText.of(context).label.copyWith(color: c.textDefault),
                ),
                if (required)
                  TextSpan(
                    text: ' *',
                    style: TextStyle(color: c.textCritical),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: CmSpace.s10),
        if (side == null) _box(context, c, enabled, hasError) else Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: _box(context, c, enabled, hasError)),
          const SizedBox(width: CmSpace.s10),
          side!,
        ]),
      ],
    );
  }

  Widget _box(BuildContext context, CmColors c, bool enabled, bool hasError) {
    return Semantics(
          button: true,
          enabled: enabled,
          label: '$label${required ? CmStrings.of(context).requiredSuffix : ''}',
          value: semanticValue ?? (text ?? CmStrings.of(context).notSet),
          hint: hasError ? error : helpText,
          excludeSemantics: true,
          onTap: onOpen,
          child: InkWell(
            onTap: onOpen,
            borderRadius: BorderRadius.circular(CmRadius.sm),
            child: InputDecorator(
              isEmpty: text == null,
              decoration: InputDecoration(
                enabled: enabled,
                isDense: true,
                hintText: placeholder,
                constraints: const BoxConstraints(minHeight: 42),
                fillColor: enabled ? c.bgSurface : c.bgInputFilled,
                suffixIcon: Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: CmIcon(CmIcons.calendar, size: 18, color: enabled ? c.iconSelected : c.textSecondary),
                ),
                suffixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                errorText: hasError ? error : null,
                errorStyle: CmType.bodySm.copyWith(color: c.textCritical),
                helperText: hasError ? null : helpText,
                helperStyle: CmType.bodySm.copyWith(color: c.textTertiary),
                helperMaxLines: 3,
              ),
              child: Text(text ?? '', style: CmText.of(context).bodyLg.copyWith(color: enabled ? c.textDefault : c.textSecondary)),
            ),
          ),
        );
  }
}

/// The time box of a [CmDatePicker] with `time`: the time in the locale's clock, or the hh:mm pattern.
class _TimeBox extends StatelessWidget {
  const _TimeBox({required this.name, required this.text, required this.placeholder, required this.onOpen, this.required = false});
  final String name, placeholder;
  final String? text;
  final VoidCallback? onOpen;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final enabled = onOpen != null;
    return SizedBox(
      width: 150,
      child: Semantics(
        button: true,
        enabled: enabled,
        label: '$name${required ? CmStrings.of(context).requiredSuffix : ''}',
        value: text ?? CmStrings.of(context).notSet,
        excludeSemantics: true,
        onTap: onOpen,
        child: InkWell(
          onTap: onOpen,
          borderRadius: BorderRadius.circular(CmRadius.sm),
          child: InputDecorator(
            isEmpty: text == null,
            decoration: InputDecoration(
              enabled: enabled,
              isDense: true,
              hintText: placeholder,
              constraints: const BoxConstraints(minHeight: 42),
              fillColor: enabled ? c.bgSurface : c.bgInputFilled,
              suffixIcon: Padding(
                padding: const EdgeInsetsDirectional.only(end: 4),
                child: CmIcon(CmIcons.clock, size: 18, color: enabled ? c.iconSelected : c.textSecondary),
              ),
              suffixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
            child: Text(text ?? '', maxLines: 1, style: CmText.of(context).bodyLg.copyWith(color: enabled ? c.textDefault : c.textSecondary)),
          ),
        ),
      ),
    );
  }
}

/// A date field that opens the Material date picker, themed with Commmerce tokens. Mirrors `<cm-date-picker>`.
/// The picker has a calendar and a typed-entry mode (the pencil button); month and weekday names follow the
/// app's `Localizations` (or [locale]).
class CmDatePicker extends StatelessWidget {
  const CmDatePicker({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    required this.firstDate,
    required this.lastDate,
    this.selectableDayPredicate,
    this.helpText,
    this.error,
    this.placeholder,
    this.required = false,
    this.locale,
    this.initialEntryMode = DatePickerEntryMode.calendar,
    this.time = false,
    this.step = 1,
    this.minNow = false,
    this.use24HourFormat,
  });

  final String label;

  /// The chosen date (time ignored); null when none. With [time]: the local date and time.
  final DateTime? value;

  /// Adds a time box next to the date box, so the field holds a date and a time (a local [DateTime]). The time is
  /// shown in the locale's clock (12-hour with am/pm for en-IN) and chosen with the Material time picker.
  /// Choosing a date with no time set yet opens the time picker next. Since 1.2 (web: `time`).
  final bool time;

  /// With [time]: minutes between allowed times, counted from midnight (15 allows :00, :15, :30, :45). A picked
  /// time is moved to the nearest step. Default 1.
  final int step;

  /// With [time]: the earliest choice is now (the current minute, checked whenever a time is picked), or
  /// [firstDate] when that is later. With [time], [firstDate] and [lastDate] may include a time of day.
  final bool minNow;

  /// With [time]: force a 24-hour (true) or 12-hour (false) clock. Null: the locale's and platform's clock.
  final bool? use24HourFormat;

  /// Called with the picked date. Null disables the field.
  final ValueChanged<DateTime>? onChanged;

  /// Earliest and latest dates that can be chosen (like `min` and `max` on the web).
  final DateTime firstDate, lastDate;

  /// Return false for dates that can't be chosen (holidays, Sundays).
  final SelectableDayPredicate? selectableDayPredicate;
  final String? helpText, error;
  /// Shown while empty. Default: [CmStrings.chooseDate] / [CmStrings.chooseDates].
  final String? placeholder;
  final bool required;

  /// Language of the picker; defaults to the app's locale.
  final Locale? locale;

  /// Start in the calendar or in typed entry.
  final DatePickerEntryMode initialEntryMode;

  int get _step => step >= 1 && step <= 1440 ? step : 1;

  /// The earliest allowed moment: [firstDate], or now when [minNow] and later.
  DateTime get _min {
    if (!(time && minNow)) return firstDate;
    final n = DateTime.now();
    final now = DateTime(n.year, n.month, n.day, n.hour, n.minute);
    return now.isAfter(firstDate) ? now : firstDate;
  }

  /// [at] moved onto the step and inside the limits.
  DateTime _fit(DateTime at) {
    final st = _step;
    final day = DateUtils.dateOnly(at);
    var minutes = at.hour * 60 + at.minute;
    minutes = ((minutes / st).round() * st).clamp(0, (1439 ~/ st) * st);
    var r = day.add(Duration(minutes: minutes));
    final min = _min;
    // A time that is not a whole minute (the limits may carry seconds) rounds up onto the next step.
    if (r.isBefore(min)) {
      final m = DateUtils.dateOnly(min);
      final mm = min.hour * 60 + min.minute + (min.second > 0 || min.millisecond > 0 ? 1 : 0);
      r = m.add(Duration(minutes: ((mm + st - 1) ~/ st) * st));
    }
    // A last date without a time of day allows the whole of that day.
    final max = lastDate.hour == 0 && lastDate.minute == 0 ? DateUtils.dateOnly(lastDate).add(const Duration(minutes: 1439)) : lastDate;
    if (r.isAfter(max)) {
      final mm = max.hour * 60 + max.minute;
      r = DateUtils.dateOnly(max).add(Duration(minutes: (mm ~/ st) * st));
    }
    return r;
  }

  Future<void> _openTime(BuildContext context, DateTime date) async {
    final min = _min;
    final start = value != null
        ? TimeOfDay.fromDateTime(value!)
        : DateUtils.isSameDay(date, min) && min.isAfter(DateTime(date.year, date.month, date.day))
            ? TimeOfDay.fromDateTime(_fit(min))
            : TimeOfDay.fromDateTime(_fit(DateTime.now()));
    final use24 = use24HourFormat ?? MediaQuery.alwaysUse24HourFormatOf(context);
    final picked = await showTimePicker(
      context: context,
      initialTime: start,
      helpText: CmStrings.of(context).timeFor(label),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: use24),
        child: _themed(context, child),
      ),
    );
    if (picked == null) return;
    onChanged?.call(_fit(DateTime(date.year, date.month, date.day, picked.hour, picked.minute)));
  }

  Future<void> _open(BuildContext context) async {
    final now = DateUtils.dateOnly(DateTime.now());
    final firstDate = DateUtils.dateOnly(_min);
    final lastDate = DateUtils.dateOnly(this.lastDate);
    var initial = value == null ? now : DateUtils.dateOnly(value!);
    if (initial.isBefore(firstDate)) initial = firstDate;
    if (initial.isAfter(lastDate)) initial = lastDate;
    if (selectableDayPredicate != null && !selectableDayPredicate!(initial)) {
      // showDatePicker asserts that the initial date is selectable: start on the first selectable day after it.
      var d = initial;
      while (!d.isAfter(lastDate) && !selectableDayPredicate!(d)) {
        d = d.add(const Duration(days: 1));
      }
      initial = d.isAfter(lastDate) ? initial : d;
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: firstDate,
      lastDate: lastDate,
      currentDate: now,
      selectableDayPredicate: selectableDayPredicate,
      helpText: label,
      locale: locale,
      initialEntryMode: initialEntryMode,
      builder: _themed,
    );
    if (picked == null) return;
    if (!time) {
      onChanged?.call(DateUtils.dateOnly(picked));
    } else if (value != null) {
      // Keep the time of day; move it inside the limits if the new day needs it.
      onChanged?.call(_fit(DateTime(picked.year, picked.month, picked.day, value!.hour, value!.minute)));
    } else if (context.mounted) {
      await _openTime(context, picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = MaterialLocalizations.of(context);
    final s = CmStrings.of(context);
    Widget? side;
    if (time) {
      final use24 = use24HourFormat ?? MediaQuery.alwaysUse24HourFormatOf(context);
      final twelve = !use24 && l.timeOfDayFormat(alwaysUse24HourFormat: false) != TimeOfDayFormat.HH_colon_mm && l.timeOfDayFormat(alwaysUse24HourFormat: false) != TimeOfDayFormat.frenchCanadian;
      side = _TimeBox(
        name: label.isEmpty ? s.time : s.timeFor(label),
        text: value == null ? null : l.formatTimeOfDay(TimeOfDay.fromDateTime(value!), alwaysUse24HourFormat: use24),
        placeholder: '${s.patternHour}:${s.patternMinute}${twelve ? ' ${s.am}' : ''}',
        required: required,
        onOpen: onChanged == null
            ? null
            : () {
                final today = DateUtils.dateOnly(DateTime.now());
                final min = DateUtils.dateOnly(_min);
                final day = value ?? (today.isBefore(min) ? min : today.isAfter(lastDate) ? DateUtils.dateOnly(lastDate) : today);
                _openTime(context, day);
              },
      );
    }
    return _DateBox(
      label: label,
      text: value == null ? null : l.formatShortDate(value!),
      semanticValue: value == null ? null : l.formatFullDate(value!),
      placeholder: placeholder ?? s.chooseDate,
      helpText: helpText,
      error: error,
      required: required,
      onOpen: onChanged == null ? null : () => _open(context),
      side: side,
    );
  }
}

/// A preset range for [CmDateRangePicker]: a label and a function of today.
class CmDateRangePreset {
  const CmDateRangePreset(this.label, this.range, {this.translated});
  final String label;
  final DateTimeRange Function(DateTime today) range;

  /// The label from [CmStrings] (built-in presets), so it follows [CmLocalizations].
  final String Function(CmStrings strings)? translated;

  /// The label in the current language.
  String labelIn(CmStrings strings) => translated?.call(strings) ?? label;

  static DateTime _d(DateTime t, int days) => DateTime(t.year, t.month, t.day + days);
  static final today = CmDateRangePreset('Today', (t) => DateTimeRange(start: t, end: t), translated: (s) => s.presetToday);
  static final yesterday = CmDateRangePreset('Yesterday', (t) => DateTimeRange(start: _d(t, -1), end: _d(t, -1)), translated: (s) => s.presetYesterday);
  static final last7Days = CmDateRangePreset('Last 7 days', (t) => DateTimeRange(start: _d(t, -6), end: t), translated: (s) => s.presetLast7Days);
  static final last30Days = CmDateRangePreset('Last 30 days', (t) => DateTimeRange(start: _d(t, -29), end: t), translated: (s) => s.presetLast30Days);
  static final thisMonth = CmDateRangePreset('This month', (t) => DateTimeRange(start: DateTime(t.year, t.month, 1), end: t), translated: (s) => s.presetThisMonth);
  static final lastMonth = CmDateRangePreset(
    'Last month',
    (t) => DateTimeRange(start: DateTime(t.year, t.month - 1, 1), end: DateTime(t.year, t.month, 0)),
    translated: (s) => s.presetLastMonth,
  );

  /// Today, Last 7 days, Last 30 days, This month: the order and report filter set.
  static final standard = [today, last7Days, last30Days, thisMonth];
}

/// A start and end date field that opens the Material date range picker, themed with Commmerce tokens, with
/// optional preset ranges as buttons under the field. Mirrors `<cm-date-range-picker>`.
class CmDateRangePicker extends StatelessWidget {
  const CmDateRangePicker({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    required this.firstDate,
    required this.lastDate,
    this.presets = const [],
    this.helpText,
    this.error,
    this.placeholder,
    this.required = false,
    this.locale,
    this.today,
  });

  final String label;
  final DateTimeRange? value;

  /// Called with the new range. Null disables the field.
  final ValueChanged<DateTimeRange>? onChanged;
  final DateTime firstDate, lastDate;

  /// Preset ranges, e.g. [CmDateRangePreset.standard].
  final List<CmDateRangePreset> presets;
  final String? helpText, error;
  /// Shown while empty. Default: [CmStrings.chooseDate] / [CmStrings.chooseDates].
  final String? placeholder;
  final bool required;
  final Locale? locale;

  /// "Today" for presets; defaults to the current date (set it in tests).
  final DateTime? today;

  DateTime get _today => DateUtils.dateOnly(today ?? DateTime.now());

  DateTimeRange _clamp(DateTimeRange r) {
    DateTime c(DateTime d) => d.isBefore(firstDate)
        ? firstDate
        : d.isAfter(lastDate)
        ? lastDate
        : d;
    return DateTimeRange(start: c(r.start), end: c(r.end));
  }

  Future<void> _open(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: value == null ? null : _clamp(value!),
      firstDate: firstDate,
      lastDate: lastDate,
      currentDate: _today,
      helpText: label,
      locale: locale,
      builder: _themed,
    );
    if (picked != null) onChanged?.call(DateTimeRange(start: DateUtils.dateOnly(picked.start), end: DateUtils.dateOnly(picked.end)));
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final l = MaterialLocalizations.of(context);
    final enabled = onChanged != null;
    final v = value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _DateBox(
          label: label,
          text: v == null ? null : '${l.formatShortDate(v.start)} – ${l.formatShortDate(v.end)}',
          semanticValue: v == null ? null : CmStrings.of(context).dateRange(l.formatFullDate(v.start), l.formatFullDate(v.end)),
          placeholder: placeholder ?? CmStrings.of(context).chooseDates,
          helpText: helpText,
          error: error,
          required: required,
          onOpen: enabled ? () => _open(context) : null,
        ),
        if (presets.isNotEmpty) ...[
          const SizedBox(height: CmSpace.s10),
          Semantics(
            container: true,
            label: CmStrings.of(context).presetRanges,
            child: Wrap(
              spacing: CmSpace.s10,
              runSpacing: CmSpace.s10,
              children: [
                for (final p in presets)
                  Builder(
                    builder: (context) {
                      final r = p.range(_today);
                      final on = v != null && DateUtils.isSameDay(v.start, r.start) && DateUtils.isSameDay(v.end, r.end);
                      return MergeSemantics(
                        child: Semantics(
                          selected: on,
                          child: OutlinedButton(
                            onPressed: enabled ? () => onChanged!(_clamp(r)) : null,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 32),
                              padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15),
                              foregroundColor: on ? c.actionPrimaryText : c.textDefault,
                              backgroundColor: on ? c.actionPrimary : c.bgSurface,
                              side: BorderSide(color: on ? c.actionPrimary : c.borderDefault),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.full)),
                              textStyle: CmType.bodyMd,
                            ),
                            child: Text(p.labelIn(CmStrings.of(context))),
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// One row in the combobox list: an option, the "Add …" row, or a message.
class _Row<T> {
  const _Row.option(this.option) : create = null, message = null;
  const _Row.create(String this.create) : option = null, message = null;
  const _Row.message(String this.message) : option = null, create = null;
  final CmSelectOption<T>? option;
  final String? create, message;
}

class _Controller extends TextEditingController {
  /// Re-runs the autocomplete options builder (new async options arrived). RawAutocomplete only rebuilds its
  /// options when the text changes, so change it and put it back in the same frame.
  void refresh() {
    final v = value;
    value = v.copyWith(text: '${v.text}\u200b');
    value = v;
  }
}

/// How typing narrows a [CmCombobox] list.
enum CmComboboxFilter { contains, startsWith, none }

/// A text field that suggests matching options as the merchant types, built on [RawAutocomplete]. Picks one
/// option, or several with [multiple] (shown as removable [CmTag]s; Backspace in the empty field removes the last).
/// For server results set [filter] to [CmComboboxFilter.none], fetch in [onSearch], then pass new [options] and
/// [loading]. Mirrors `<cm-combobox>`.
class CmCombobox<T extends Object> extends StatefulWidget {
  const CmCombobox({
    super.key,
    required this.label,
    required this.options,
    this.value,
    this.onChanged,
    this.multiple = false,
    this.values = const [],
    this.onValuesChanged,
    this.allowCustom = false,
    this.onCreate,
    this.onSearch,
    this.filter = CmComboboxFilter.contains,
    this.loading = false,
    this.emptyText,
    this.loadingText,
    this.placeholder,
    this.helpText,
    this.error,
    this.required = false,
    this.enabled = true,
    this.showGroup = false,
  });

  final String label;

  /// The options. Give them a [CmSelectOption.group] to show them under group headings (since 1.3): headings
  /// are read as headings and skipped by the arrow keys, and filtering keeps the heading of every group that
  /// still has a match.
  final List<CmSelectOption<T>> options;

  /// Shows the chosen option's group before its label in the field, or in its tag with [multiple]
  /// ([CmStrings.comboboxGrouped], "Lead: Company"). Since 1.3.
  final bool showGroup;

  /// Chosen value (single mode).
  final T? value;
  final ValueChanged<T?>? onChanged;

  /// Choose several options, shown as tags.
  final bool multiple;

  /// Chosen values ([multiple]).
  final List<T> values;
  final ValueChanged<List<T>>? onValuesChanged;

  /// Offer "Add …" for text that matches no option; [onCreate] receives the text and adds the option.
  final bool allowCustom;
  final ValueChanged<String>? onCreate;

  /// Called as the merchant types, with the query.
  final ValueChanged<String>? onSearch;
  final CmComboboxFilter filter;

  /// Shows a spinner row while you load options.
  final bool loading;
  /// Default: [CmStrings.noResults] and [CmStrings.loading].
  final String? emptyText, loadingText;
  final String? placeholder, helpText, error;
  final bool required, enabled;

  @override
  State<CmCombobox<T>> createState() => _CmComboboxState<T>();
}

class _CmComboboxState<T extends Object> extends State<CmCombobox<T>> {
  final _controller = _Controller();
  final _focus = FocusNode(debugLabel: 'CmCombobox');
  final Map<T, String> _labels = {};
  final Map<T, String> _groups = {};

  @override
  void initState() {
    super.initState();
    _remember();
    _focus.addListener(_onFocus);
  }

  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // The shown text can depend on CmStrings (showGroup), which initState can't read.
    if (!_started && !widget.multiple) _controller.text = _displayOf(widget.value) ?? '';
    _started = true;
  }

  @override
  void didUpdateWidget(CmCombobox<T> old) {
    super.didUpdateWidget(old);
    _remember();
    if (!widget.multiple && (old.value != widget.value || old.showGroup != widget.showGroup) && !_focus.hasFocus) _controller.text = _displayOf(widget.value) ?? '';
    if (old.options != widget.options || old.loading != widget.loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.refresh();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _remember() {
    for (final o in widget.options) {
      _labels[o.value] = o.label;
      if ((o.group ?? '').isNotEmpty) _groups[o.value] = o.group!;
    }
  }

  String? _labelOf(T? v) => v == null ? null : _labels[v] ?? v.toString();

  /// The chosen value as shown in the field or its tag: the label, or "Group: label" with [CmCombobox.showGroup].
  String? _displayOf(T? v) {
    final label = _labelOf(v);
    final group = v == null ? null : _groups[v];
    if (label == null || !widget.showGroup || group == null) return label;
    return CmStrings.of(context).comboboxGrouped(group, label);
  }

  void _onFocus() {
    // Leaving the field: single mode shows the chosen label again; multiple clears an unfinished query.
    if (!_focus.hasFocus) _controller.text = widget.multiple ? '' : (_displayOf(widget.value) ?? '');
    setState(() {}); // focus ring on the box
  }

  bool _selected(T v) => widget.multiple ? widget.values.contains(v) : widget.value == v;

  Iterable<_Row<T>> _rows(TextEditingValue tv) {
    final q = tv.text.trim();
    final lq = q.toLowerCase();
    final strings = CmStrings.of(context);
    if (widget.loading) return [_Row<T>.message(widget.loadingText ?? strings.loading)];
    final showAll = widget.filter == CmComboboxFilter.none || q.isEmpty || (!widget.multiple && q == _displayOf(widget.value));
    final matches = cmSortByGroup(widget.options).where((o) {
      if (showAll) return true;
      final l = o.label.toLowerCase();
      return widget.filter == CmComboboxFilter.startsWith ? l.startsWith(lq) : l.contains(lq);
    });
    final rows = [for (final o in matches) _Row<T>.option(o)];
    final exists = widget.options.any((o) => o.label.toLowerCase() == lq) || _labels.values.any((l) => l.toLowerCase() == lq);
    if (widget.allowCustom && q.isNotEmpty && !exists) rows.add(_Row<T>.create(q));
    if (rows.isEmpty) return [_Row<T>.message(widget.emptyText ?? strings.noResults)];
    return rows;
  }

  void _pick(_Row<T> row) {
    if (row.message != null) {
      _controller.text = '';
      return;
    }
    if (row.create != null) {
      widget.onCreate?.call(row.create!);
      _controller.text = widget.multiple ? '' : row.create!;
      return;
    }
    final v = row.option!.value;
    if (widget.multiple) {
      final next = widget.values.contains(v) ? widget.values.where((x) => x != v).toList() : [...widget.values, v];
      widget.onValuesChanged?.call(next);
      _controller.text = '';
      _focus.requestFocus();
    } else {
      _remember();
      _controller.text = _displayOf(v) ?? row.option!.label;
      if (v != widget.value) widget.onChanged?.call(v);
    }
  }

  void _remove(T v) {
    widget.onValuesChanged?.call(widget.values.where((x) => x != v).toList());
    _focus.requestFocus();
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent e) {
    if (e is KeyDownEvent &&
        e.logicalKey == LogicalKeyboardKey.backspace &&
        widget.multiple &&
        _controller.text.isEmpty &&
        widget.values.isNotEmpty) {
      _remove(widget.values.last);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final hasError = widget.error != null && widget.error!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: widget.label,
                  style: CmText.of(context).label.copyWith(color: c.textDefault),
                ),
                if (widget.required)
                  TextSpan(
                    text: ' *',
                    style: TextStyle(color: c.textCritical),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: CmSpace.s10),
        RawAutocomplete<_Row<T>>(
          textEditingController: _controller,
          focusNode: _focus,
          displayStringForOption: (r) => r.option == null ? (r.create ?? '') : (_displayOf(r.option!.value) ?? r.option!.label),
          optionsBuilder: _rows,
          onSelected: _pick,
          fieldViewBuilder: (context, controller, focusNode, onSubmitted) => InputDecorator(
            isFocused: focusNode.hasFocus,
            isEmpty: false,
            decoration: InputDecoration(
              enabled: widget.enabled,
              isDense: true,
              constraints: const BoxConstraints(minHeight: 42),
              fillColor: widget.enabled ? c.bgSurface : c.bgInputFilled,
              contentPadding: const EdgeInsets.symmetric(horizontal: CmSpace.s10, vertical: 7),
              suffixIcon: CmIcon(CmIcons.chevronDown, size: 16, color: c.iconSelected),
              suffixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 26),
              errorText: hasError ? widget.error : null,
              errorStyle: CmType.bodySm.copyWith(color: c.textCritical),
              helperText: hasError ? null : widget.helpText,
              helperStyle: CmType.bodySm.copyWith(color: c.textTertiary),
            ),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (widget.multiple)
                  for (final v in widget.values) CmTag(_displayOf(v) ?? '', onRemove: widget.enabled ? () => _remove(v) : null),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 80, maxWidth: 600),
                  child: IntrinsicWidth(
                    child: Focus(
                      canRequestFocus: false,
                      skipTraversal: true,
                      onKeyEvent: _onKey,
                      child: Semantics(
                        label: '${widget.label}${widget.required ? CmStrings.of(context).requiredSuffix : ''}',
                        hint: hasError ? widget.error : widget.helpText,
                        child: TextField(
                          controller: controller,
                          focusNode: focusNode,
                          enabled: widget.enabled,
                          onChanged: widget.onSearch,
                          onSubmitted: (_) => onSubmitted(),
                          style: CmText.of(context).bodyLg.copyWith(color: widget.enabled ? c.textDefault : c.textSecondary),
                          decoration: InputDecoration.collapsed(
                            hintText: widget.multiple && widget.values.isNotEmpty ? null : widget.placeholder,
                            hintStyle: CmType.bodyLg.copyWith(color: c.textTertiary),
                          ).copyWith(filled: false),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          optionsViewBuilder: (context, onSelected, rows) {
            final list = rows.toList();
            final highlighted = AutocompleteHighlightedOption.of(context);
            return Align(
              alignment: Alignment.topLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: CmSpace.s10),
                child: Material(
                  color: c.bgSurface,
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(CmRadius.md),
                    side: BorderSide(color: c.borderDefault),
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 242, maxWidth: 600),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: CmSpace.s10),
                      shrinkWrap: true,
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final r = list[i];
                        if (r.message != null) {
                          return Semantics(
                            liveRegion: true,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: CmSpace.s15),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (widget.loading) ...[
                                    SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2, color: c.borderStrong)),
                                    const SizedBox(width: CmSpace.s10),
                                  ],
                                  Text(r.message!, style: CmType.bodyMd.copyWith(color: c.textTertiary)),
                                ],
                              ),
                            ),
                          );
                        }
                        final active = i == highlighted;
                        final sel = r.option != null && _selected(r.option!.value);
                        final single = !widget.multiple && sel;
                        // A group heading before the first row of each group (not a row: the arrows skip it).
                        final group = r.option?.group ?? '';
                        final prev = i > 0 ? (list[i - 1].option?.group ?? '') : null;
                        final heading = group.isNotEmpty && group != prev ? CmOptionGroupHeading(group, divider: i > 0) : null;
                        final divider = heading == null && i > 0 && group.isEmpty && (prev ?? '').isNotEmpty;
                        final row = Semantics(
                          selected: sel,
                          button: true,
                          child: InkWell(
                            onTap: () => onSelected(r),
                            child: Container(
                              constraints: const BoxConstraints(minHeight: 40),
                              padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: 6),
                              color: single ? (active ? c.actionPrimaryHover : c.actionPrimary) : (active ? c.bgHover : null),
                              child: Row(
                                children: [
                                  if (r.create != null) ...[CmIcon(CmIcons.plus, size: 16, color: c.textDefault), const SizedBox(width: CmSpace.s10)],
                                  if (widget.multiple && r.option != null) ...[
                                    Opacity(
                                      opacity: sel ? 1 : 0,
                                      child: CmIcon(CmIcons.check, size: 16, color: c.textDefault),
                                    ),
                                    const SizedBox(width: CmSpace.s10),
                                  ],
                                  Expanded(
                                    child: Text(
                                      r.create != null ? CmStrings.of(context).addValue(r.create!) : r.option!.label,
                                      style: CmText.of(context).bodyLg.copyWith(color: single ? c.actionPrimaryText : c.textDefault),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                        if (heading == null && !divider) return row;
                        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
                          if (heading != null) heading,
                          if (divider) Container(margin: const EdgeInsets.only(top: 6, bottom: 6), height: 1, color: c.borderDefault),
                          row,
                        ]);
                      },
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
