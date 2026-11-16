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
  });
  final String label;
  final String? text, placeholder, helpText, error, semanticValue;
  final VoidCallback? onOpen;
  final bool required;

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
        Semantics(
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
        ),
      ],
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
  });

  final String label;

  /// The chosen date (time ignored); null when none.
  final DateTime? value;

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

  Future<void> _open(BuildContext context) async {
    final now = DateUtils.dateOnly(DateTime.now());
    var initial = value ?? now;
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
    if (picked != null) onChanged?.call(DateUtils.dateOnly(picked));
  }

  @override
  Widget build(BuildContext context) {
    final l = MaterialLocalizations.of(context);
    return _DateBox(
      label: label,
      text: value == null ? null : l.formatShortDate(value!),
      semanticValue: value == null ? null : l.formatFullDate(value!),
      placeholder: placeholder ?? CmStrings.of(context).chooseDate,
      helpText: helpText,
      error: error,
      required: required,
      onOpen: onChanged == null ? null : () => _open(context),
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
  });

  final String label;
  final List<CmSelectOption<T>> options;

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

  @override
  void initState() {
    super.initState();
    _remember();
    if (!widget.multiple) _controller.text = _labelOf(widget.value) ?? '';
    _focus.addListener(_onFocus);
  }

  @override
  void didUpdateWidget(CmCombobox<T> old) {
    super.didUpdateWidget(old);
    _remember();
    if (!widget.multiple && old.value != widget.value && !_focus.hasFocus) _controller.text = _labelOf(widget.value) ?? '';
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
    }
  }

  String? _labelOf(T? v) => v == null ? null : _labels[v] ?? v.toString();

  void _onFocus() {
    // Leaving the field: single mode shows the chosen label again; multiple clears an unfinished query.
    if (!_focus.hasFocus) _controller.text = widget.multiple ? '' : (_labelOf(widget.value) ?? '');
    setState(() {}); // focus ring on the box
  }

  bool _selected(T v) => widget.multiple ? widget.values.contains(v) : widget.value == v;

  Iterable<_Row<T>> _rows(TextEditingValue tv) {
    final q = tv.text.trim();
    final lq = q.toLowerCase();
    final strings = CmStrings.of(context);
    if (widget.loading) return [_Row<T>.message(widget.loadingText ?? strings.loading)];
    final showAll = widget.filter == CmComboboxFilter.none || q.isEmpty || (!widget.multiple && q == _labelOf(widget.value));
    final matches = widget.options.where((o) {
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
      _controller.text = row.option!.label;
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
          displayStringForOption: (r) => r.option?.label ?? r.create ?? '',
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
                  for (final v in widget.values) CmTag(_labelOf(v) ?? '', onRemove: widget.enabled ? () => _remove(v) : null),
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
                        return Semantics(
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
