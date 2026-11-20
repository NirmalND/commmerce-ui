import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Field heights for fields that come in three sizes (owner standard, 1.6): [standard] 40, [medium] 36,
/// [small] 32 (filter rows). Every size is 44 on touch screens.
enum CmFieldSize { standard, medium, small }

/// A clock to force on a [CmTimePicker]: [h12] (am/pm) or [h23] (24-hour, 00:00 to 23:59).
enum CmHourCycle { h12, h23 }

String _two(int n) => n.toString().padLeft(2, '0');
int _minutes(TimeOfDay t) => t.hour * 60 + t.minute;
TimeOfDay _time(int m) => TimeOfDay(hour: (m ~/ 60) % 24, minute: m % 60);
final _nonLetters = RegExp(r'[^\p{L}]', unicode: true);
String _word(String s) => s.toLowerCase().replaceAll(_nonLetters, '');

/// Reads a typed time, like the web `parseTime`: `15:30`, `3:30 pm`, `3.30pm`, `3 pm`, `9pm`, `1530`, `330pm`. Without
/// am/pm the hours are read on a 24-hour clock. [am] and [pm] are the words accepted for each half of the day
/// (compared without case, spaces or dots, so "p.m." matches "pm"). Returns null when the text is not a time.
TimeOfDay? cmParseTime(String text, {List<String> am = const ['am', 'a'], List<String> pm = const ['pm', 'p']}) {
  final s = text.trim().toLowerCase();
  if (s.isEmpty) return null;
  final word = _word(s);
  final isPm = word.isNotEmpty && pm.map(_word).contains(word);
  final isAm = word.isNotEmpty && am.map(_word).contains(word);
  if (word.isNotEmpty && !isPm && !isAm) return null;
  final nums = RegExp(r'\d+').allMatches(s).map((m) => m.group(0)!).toList();
  int h, m;
  if (nums.length == 1) {
    final g = nums[0];
    if (g.length <= 2) {
      h = int.parse(g);
      m = 0;
    } else if (g.length <= 4) {
      h = int.parse(g.substring(0, g.length - 2));
      m = int.parse(g.substring(g.length - 2));
    } else {
      return null;
    }
  } else if (nums.length == 2 || nums.length == 3) {
    if (nums[0].length > 2 || nums[1].length != 2) return null;
    h = int.parse(nums[0]);
    m = int.parse(nums[1]);
  } else {
    return null;
  }
  if (m > 59) return null;
  if (isAm || isPm) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (isPm ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return TimeOfDay(hour: h, minute: m);
}

/// A time field: type a time or choose one from a dropdown list. Mirrors `<cm-time-picker>` (since 1.16).
///
/// Shows the 12-hour clock with am/pm or the 24-hour clock (two-digit hours, "09:05"), following the platform and
/// locale or [hourCycle]; the value is always a [TimeOfDay]. Typed text is read when the merchant presses Enter or
/// leaves the box ([cmParseTime]); text that is not a time stays as typed, the value becomes null and the field
/// shows "Enter a time like hh:mm am.". Keyboard: Down or Up opens the list at the chosen time (or the next one from
/// now), Up and Down move, Page Up and Page Down move by six, Enter picks, Escape closes without changing the time.
///
/// Like the web field, it checks itself once the merchant has typed or picked: [required], [min], [max] and [step]
/// messages show under the box unless you pass [error].
class CmTimePicker extends StatefulWidget {
  const CmTimePicker({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.helpText,
    this.error,
    this.placeholder,
    this.min,
    this.max,
    this.step = 1,
    this.interval,
    this.hourCycle,
    this.required = false,
    this.enabled = true,
    this.size = CmFieldSize.standard,
  });

  /// Visible label above the box, e.g. "Pickup time".
  final String label;

  /// The chosen time; null when none (or while the typed text is not a time).
  final TimeOfDay? value;

  /// Called when the time changes: a time picked from the list, or typed text read on Enter or on leaving the box
  /// (null when it is cleared or is not a time).
  final ValueChanged<TimeOfDay?>? onChanged;

  /// One sentence under the box.
  final String? helpText;

  /// Error message: turns the border critical, and replaces the field's own messages.
  final String? error;

  /// Shown while empty. Default: the format, e.g. "hh:mm am" or "hh:mm".
  final String? placeholder;

  /// Earliest and latest times that can be chosen. The list starts and ends there.
  final TimeOfDay? min, max;

  /// Minutes between allowed times, counted from midnight (15 allows :00, :15, :30, :45). A typed time off the
  /// step is invalid. 1 to 720; default 1.
  final int step;

  /// Minutes between the times in the list. Default: [step] when it is 5 or more, else 30. Any allowed time can
  /// still be typed.
  final int? interval;

  /// Forces a clock. Null: 24-hour when `MediaQuery.alwaysUse24HourFormat` is on or the locale's clock is 24-hour,
  /// else 12-hour with am/pm.
  final CmHourCycle? hourCycle;
  final bool required;

  /// False blocks interaction (as does a null [onChanged]).
  final bool enabled;

  /// 40 by default, 36 [CmFieldSize.medium], 32 [CmFieldSize.small]; 44 on touch screens.
  final CmFieldSize size;

  @override
  State<CmTimePicker> createState() => _CmTimePickerState();
}

class _CmTimePickerState extends State<CmTimePicker> {
  final _controller = TextEditingController();
  final _focus = FocusNode(debugLabel: 'CmTimePicker');
  final _portal = OverlayPortalController();
  final _link = LayerLink();
  final _scroll = ScrollController();
  bool _open = false;
  int _active = -1;

  /// The merchant has typed or picked, so the field's own messages show.
  bool _touched = false;

  /// The text in the box is not a time.
  bool _bad = false;
  bool _started = false;
  double _width = 200;

  bool get _enabled => widget.enabled && widget.onChanged != null;
  int get _step => widget.step >= 1 && widget.step <= 720 ? widget.step : 1;
  int get _every {
    final n = widget.interval ?? 0;
    if (n >= 1 && n <= 720) return n;
    return _step >= 5 ? _step : 30;
  }

  /// The times in the list, as minutes since midnight: every [CmTimePicker.interval] from min (or midnight) to max,
  /// on the step.
  List<int> get _times {
    final lo = widget.min == null ? 0 : _minutes(widget.min!);
    final hi = widget.max == null ? 1439 : _minutes(widget.max!);
    final every = _every;
    return [
      for (var m = (lo / every).ceil() * every; m <= hi; m += every)
        if (m % _step == 0) m,
    ];
  }

  bool _localeTwelve(MaterialLocalizations l) {
    final f = l.timeOfDayFormat(alwaysUse24HourFormat: false);
    return f == TimeOfDayFormat.h_colon_mm_space_a || f == TimeOfDayFormat.a_space_h_colon_mm;
  }

  bool get _hour12 => switch (widget.hourCycle) {
        CmHourCycle.h12 => true,
        CmHourCycle.h23 => false,
        null => !MediaQuery.alwaysUse24HourFormatOf(context) && _localeTwelve(MaterialLocalizations.of(context)),
      };

  String _format(TimeOfDay t) {
    if (!_hour12) return '${_two(t.hour)}:${_two(t.minute)}';
    final l = MaterialLocalizations.of(context);
    if (_localeTwelve(l)) return l.formatTimeOfDay(t, alwaysUse24HourFormat: false);
    // A 12-hour clock forced on a 24-hour locale: the locale has no am/pm order, so write it the English way.
    final s = CmStrings.of(context);
    return '${t.hourOfPeriod == 0 ? 12 : t.hourOfPeriod}:${_two(t.minute)} ${t.period == DayPeriod.am ? s.am : s.pm}';
  }

  String get _pattern {
    final s = CmStrings.of(context);
    return '${s.patternHour}:${s.patternMinute}${_hour12 ? ' ${s.am}' : ''}';
  }

  TimeOfDay? _parse(String text) {
    final s = CmStrings.of(context);
    final l = MaterialLocalizations.of(context);
    return cmParseTime(text, am: [s.am, l.anteMeridiemAbbreviation, 'am', 'a'], pm: [s.pm, l.postMeridiemAbbreviation, 'pm', 'p']);
  }

  void _setText(String text) => _controller.value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started && widget.value != null) _setText(_format(widget.value!));
    _started = true;
  }

  @override
  void didUpdateWidget(CmTimePicker old) {
    super.didUpdateWidget(old);
    final reformat = old.hourCycle != widget.hourCycle;
    if (old.value != widget.value || reformat) {
      // A null value after unreadable text keeps the text, so the merchant can correct it.
      if (widget.value != null) {
        _bad = false;
        _setText(_format(widget.value!));
      } else if (!_bad) {
        _setText('');
      }
    }
    if (!_enabled && _open) _close();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onFocus() {
    if (!_focus.hasFocus) {
      _close();
      _commit();
    }
    if (mounted) setState(() {});
  }

  void _emit(TimeOfDay? t) {
    if (t != widget.value) widget.onChanged?.call(t);
  }

  /// Reads the typed text: a real time becomes the value, shown in the field's clock; anything else stays as typed.
  void _commit() {
    if (!mounted || !_enabled) return;
    final text = _controller.text.trim();
    final t = text.isEmpty ? null : _parse(text);
    if (text.isNotEmpty || widget.value != null) _touched = true;
    setState(() => _bad = text.isNotEmpty && t == null);
    if (t != null) _setText(_format(t));
    _emit(t);
  }

  int _nearest(TimeOfDay? t) {
    final times = _times;
    if (times.isEmpty) return -1;
    if (t == null) return 0;
    final m = _minutes(t);
    final i = times.indexWhere((x) => x >= m);
    return i == -1 ? times.length - 1 : i;
  }

  void _show() {
    if (!_enabled) return;
    final now = TimeOfDay.now();
    setState(() {
      _active = _nearest(widget.value ?? _parse(_controller.text) ?? now);
      _open = true;
    });
    _portal.show();
    _scrollToActive();
  }

  void _close() {
    if (!_open) return;
    if (mounted) setState(() => _open = false);
    _portal.hide();
  }

  double get _rowHeight => cmIsTouch(context) ? CmControlHeight.touch : CmControlHeight.md;

  void _scrollToActive() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients || _active < 0) return;
      final pos = _scroll.position;
      final row = _rowHeight;
      final top = _active * row + CmSpace.s4;
      if (top < pos.pixels) {
        _scroll.jumpTo(top.clamp(0, pos.maxScrollExtent));
      } else if (top + row > pos.pixels + pos.viewportDimension) {
        _scroll.jumpTo((top + row - pos.viewportDimension + CmSpace.s4).clamp(0, pos.maxScrollExtent));
      }
    });
  }

  void _pick(int m) {
    final t = _time(m);
    _close();
    _touched = true;
    setState(() => _bad = false);
    _setText(_format(t));
    _emit(t);
    _focus.requestFocus();
  }

  void _toggle() {
    if (!_enabled) return;
    if (_open) {
      _close();
    } else {
      _commit();
      _show();
    }
    _focus.requestFocus();
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    final times = _times;
    if (k == LogicalKeyboardKey.arrowDown || k == LogicalKeyboardKey.arrowUp) {
      if (!_open) {
        _show();
      } else if (times.isNotEmpty) {
        final d = k == LogicalKeyboardKey.arrowDown ? 1 : -1;
        setState(() => _active = _active < 0 ? 0 : (_active + d).clamp(0, times.length - 1));
        _scrollToActive();
      }
      return KeyEventResult.handled;
    }
    if (k == LogicalKeyboardKey.pageDown || k == LogicalKeyboardKey.pageUp) {
      if (!_open || times.isEmpty) return KeyEventResult.ignored;
      setState(() => _active = (_active + (k == LogicalKeyboardKey.pageDown ? 6 : -6)).clamp(0, times.length - 1));
      _scrollToActive();
      return KeyEventResult.handled;
    }
    if (k == LogicalKeyboardKey.enter || k == LogicalKeyboardKey.numpadEnter) {
      if (_open && _active >= 0 && _active < times.length) {
        _pick(times[_active]);
      } else {
        _close();
        _commit();
      }
      return KeyEventResult.handled;
    }
    if (k == LogicalKeyboardKey.escape && _open) {
      _close();
      return KeyEventResult.handled;
    }
    if (k == LogicalKeyboardKey.tab) _close();
    return KeyEventResult.ignored;
  }

  void _onTyped(String text) {
    // While the list shows, the first time at or after what is typed becomes active, so Enter picks it.
    if (!_open) return;
    final t = _parse(text);
    if (t != null) {
      setState(() => _active = _nearest(t));
      _scrollToActive();
    }
  }

  /// The field's own message: unreadable text, then required, then min, max and step.
  String? _message(CmStrings s) {
    if (widget.error != null && widget.error!.isNotEmpty) return widget.error;
    if (!_touched) return null;
    if (_bad) return s.timePickerBadInput(_pattern);
    final v = widget.value;
    if (v == null) return widget.required ? s.timePickerRequired : null;
    final m = _minutes(v);
    if (widget.min != null && m < _minutes(widget.min!)) return s.timePickerRangeUnderflow(_format(widget.min!));
    if (widget.max != null && m > _minutes(widget.max!)) return s.timePickerRangeOverflow(_format(widget.max!));
    if (m % _step != 0) return s.timePickerStepMismatch(_step);
    return null;
  }

  double get _height {
    if (cmIsTouch(context)) return CmControlHeight.touch;
    return switch (widget.size) {
      CmFieldSize.standard => CmControlHeight.lg,
      CmFieldSize.medium => CmControlHeight.md,
      CmFieldSize.small => CmControlHeight.sm,
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final enabled = _enabled;
    final message = _message(s);
    final hasError = message != null;
    final small = widget.size == CmFieldSize.small;
    final h = _height;
    final touch = cmIsTouch(context);
    final button = touch ? 36.0 : (small ? 24.0 : 28.0);

    final trigger = Semantics(
      button: true,
      enabled: enabled,
      label: s.timePickerShowTimes,
      expanded: _open,
      excludeSemantics: true,
      onTap: enabled ? _toggle : null,
      child: InkWell(
        canRequestFocus: false,
        onTap: enabled ? _toggle : null,
        borderRadius: BorderRadius.circular(CmRadius.xs),
        child: SizedBox.square(
          dimension: button,
          child: Center(child: CmIcon(CmIcons.clock, size: 16, color: enabled ? c.iconSelected : c.textSecondary)),
        ),
      ),
    );

    final box = InputDecorator(
      isFocused: _focus.hasFocus,
      isEmpty: false,
      decoration: InputDecoration(
        enabled: enabled,
        isDense: true,
        constraints: BoxConstraints(minHeight: h),
        contentPadding: cmFieldPadding(h, horizontal: small ? CmSpace.s8 : CmSpace.s12),
        fillColor: enabled ? c.bgSurface : c.bgInputFilled,
        suffixIcon: Padding(padding: const EdgeInsetsDirectional.only(end: CmSpace.s4), child: trigger),
        suffixIconConstraints: BoxConstraints(minWidth: button + CmSpace.s4, minHeight: button),
        errorText: message,
        errorStyle: CmType.bodyXs.copyWith(color: c.textCritical),
        errorMaxLines: 3,
        helperText: hasError ? null : widget.helpText,
        helperStyle: CmType.bodyXs.copyWith(color: c.textTertiary),
        helperMaxLines: 3,
      ),
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: _onKey,
        child: Semantics(
          label: '${widget.label}${widget.required ? s.requiredSuffix : ''}',
          hint: message ?? widget.helpText,
          expanded: _open,
          child: TextField(
            controller: _controller,
            focusNode: _focus,
            groupId: this,
            enabled: enabled,
            autocorrect: false,
            enableSuggestions: false,
            keyboardType: TextInputType.datetime,
            onChanged: _onTyped,
            onSubmitted: (_) {
              _close();
              _commit();
            },
            style: cmFieldText(context).copyWith(color: enabled ? c.textDefault : c.textSecondary, fontFeatures: const [FontFeature.tabularFigures()]),
            decoration: InputDecoration.collapsed(
              hintText: widget.placeholder ?? _pattern,
              hintStyle: cmFieldText(context).copyWith(color: c.textTertiary),
            ).copyWith(filled: false),
          ),
        ),
      ),
    );

    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(
          child: Text.rich(TextSpan(children: [
            TextSpan(text: widget.label, style: (small ? CmText.of(context).bodySm : CmText.of(context).label).copyWith(color: c.textDefault)),
            if (widget.required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical)),
          ])),
        ),
        SizedBox(height: small ? CmSpace.s4 : CmSpace.s8),
        LayoutBuilder(builder: (context, constraints) {
          if (constraints.maxWidth.isFinite) _width = constraints.maxWidth;
          return OverlayPortal(
            controller: _portal,
            overlayChildBuilder: (context) => Positioned(
              width: _width,
              child: CompositedTransformFollower(
                link: _link,
                showWhenUnlinked: false,
                targetAnchor: rtl ? Alignment.bottomRight : Alignment.bottomLeft,
                followerAnchor: rtl ? Alignment.topRight : Alignment.topLeft,
                offset: const Offset(0, CmSpace.s4),
                child: TapRegion(groupId: this, child: _list(context)),
              ),
            ),
            child: TapRegion(
              groupId: this,
              onTapOutside: (_) => _close(),
              child: CompositedTransformTarget(link: _link, child: box),
            ),
          );
        }),
      ],
    );
  }

  Widget _list(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final times = _times;
    final chosen = widget.value == null ? null : _minutes(widget.value!);
    final row = _rowHeight;
    return Semantics(
      container: true,
      label: widget.label.isEmpty ? s.timePickerTimes : s.timePickerTimesFor(widget.label),
      explicitChildNodes: true,
      child: Container(
        constraints: BoxConstraints(maxHeight: row * 7 + CmSpace.s8),
        decoration: BoxDecoration(
          color: c.bgSurface,
          border: Border.all(color: c.borderSubtle),
          borderRadius: BorderRadius.circular(CmRadius.md),
          boxShadow: CmShadow.md,
        ),
        clipBehavior: Clip.antiAlias,
        child: Material(
          type: MaterialType.transparency,
          child: ListView.builder(
            controller: _scroll,
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(vertical: CmSpace.s4),
            itemCount: times.length,
            itemExtent: row,
            itemBuilder: (context, i) {
              final m = times[i];
              final selected = m == chosen;
              final active = i == _active;
              final text = _format(_time(m));
              return Semantics(
                selected: selected,
                button: true,
                label: text,
                excludeSemantics: true,
                onTap: () => _pick(m),
                child: InkWell(
                  canRequestFocus: false,
                  onTap: () => _pick(m),
                  onHover: (on) {
                    if (on && _active != i) setState(() => _active = i);
                  },
                  child: Container(
                    key: ValueKey('cm-time-$m'),
                    alignment: AlignmentDirectional.centerStart,
                    padding: const EdgeInsets.symmetric(horizontal: CmSpace.s12),
                    color: selected ? (active ? c.actionPrimaryHover : c.actionPrimary) : (active ? c.bgHover : null),
                    child: Text(
                      text,
                      maxLines: 1,
                      style: CmType.bodyMd.copyWith(
                        color: selected ? c.actionPrimaryText : c.textDefault,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
