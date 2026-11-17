import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:path_drawing/path_drawing.dart';

import 'board.dart';
import 'button.dart';
import 'display.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// The views of a [CmCalendar]: a month grid, a week of day columns with an hour axis, or one day's hours.
enum CmCalendarView { month, week, day }

/// How an event was moved: dragged with a pointer, moved with the keyboard, or by [CmCalendarState.moveEvent].
enum CmCalendarMoveSource { pointer, keyboard, api }

/// One event on a [CmCalendar]: a call, a follow-up, a demo. Mirrors `<cm-calendar-event>`.
///
/// Timed events have a [start] and an [end] (default: 30 minutes after the start). All-day events ([allDay]) use
/// only the dates: [start] is the first day and [end] the last day (default: the start day). The web reads ISO
/// strings (`yyyy-mm-ddThh:mm`, or `yyyy-mm-dd` for all-day); Flutter takes local [DateTime]s.
@immutable
class CmCalendarEvent {
  const CmCalendarEvent({
    this.value = '',
    required this.heading,
    this.label = '',
    required this.start,
    this.end,
    this.allDay = false,
    this.kind = '',
    this.tone = CmTone.neutral,
    this.icon,
    this.locked = false,
    this.pending = false,
  });

  /// Identifies the event in moves and [CmCalendar.onOpen] (e.g. its record id). Defaults to the title. Keep it
  /// unique among the calendar's events.
  final String value;

  /// The title, e.g. "Call Ravi Stores".
  final String heading;

  /// The title for screen readers and announcements, when it should differ from [heading].
  final String label;

  /// Local start. For an all-day event only the date counts.
  final DateTime start;

  /// Local end (default: 30 minutes after [start]). For an all-day event, its last day (default: the start day).
  final DateTime? end;

  /// Lasts the whole day (or days): shown in the all-day row of the week and day views, and first in a month day.
  final bool allDay;

  /// What it is, in a word or two: "Follow-up", "Demo", "Call". Shown on the chip and read in its name, so colour
  /// is never the only signal.
  final String kind;

  /// Colour of the chip. Pick one per kind and keep it.
  final CmTone tone;

  /// A [CmIcons] name shown before the title (e.g. [CmIcons.phone] for calls). The month view shows the icon
  /// instead of [kind].
  final String? icon;

  /// The event can't be moved (e.g. no permission). It can still be opened.
  final bool locked;

  /// A move is being saved: the chip is greyed and can't be moved again. The calendar also shows an event as
  /// saving while the future returned by [CmCalendar.onMove] runs.
  final bool pending;

  /// The event's name: [label], or [heading].
  String get name => label.isNotEmpty ? label : heading;

  /// The value used in moves and [CmCalendar.onOpen]: [value], or the name.
  String get id => value.isNotEmpty ? value : name;

  /// A copy with other times (or flags).
  CmCalendarEvent copyWith({DateTime? start, DateTime? end, bool? locked, bool? pending}) => CmCalendarEvent(
        value: value,
        heading: heading,
        label: label,
        start: start ?? this.start,
        end: end ?? this.end,
        allDay: allDay,
        kind: kind,
        tone: tone,
        icon: icon,
        locked: locked ?? this.locked,
        pending: pending ?? this.pending,
      );

  @override
  String toString() => 'CmCalendarEvent($id, $start - $end${allDay ? ', all day' : ''})';
}

/// Start and end of an event. For all-day events they are dates (midnight) and [end] is the last day.
@immutable
class CmCalendarTimes {
  const CmCalendarTimes(this.start, this.end);
  final DateTime start, end;

  @override
  bool operator ==(Object other) => other is CmCalendarTimes && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(start, end);

  @override
  String toString() => 'CmCalendarTimes($start, $end)';
}

/// A move reported to [CmCalendar.onMove], before the calendar shows it. Mirrors the web `cm-move` detail.
@immutable
class CmCalendarMove {
  const CmCalendarMove({required this.event, required this.from, required this.to, required this.source});

  /// The event as it was.
  final CmCalendarEvent event;

  /// Where it was and where it goes.
  final CmCalendarTimes from, to;

  final CmCalendarMoveSource source;

  /// The event's [CmCalendarEvent.id].
  String get value => event.id;

  /// An all-day event (the times are dates then).
  bool get allDay => event.allDay;

  @override
  String toString() => 'CmCalendarMove($value, $from -> $to, $source)';
}

/// Called before an event moves. Return `false` to refuse the move (the event stays and the refusal is
/// announced). Return a [Future] to save the move: the event shows at its new place as saving until it completes;
/// if it completes with `false` or throws, the event goes back and that is announced. `null` or `true` accepts.
///
/// Move the event in your own data, at once or when the save succeeds: the calendar shows a move your data doesn't
/// have yet only until you pass it new [CmCalendar.events] (as [CmBoard] does). With [CmCalendar.controlled] it
/// never shows a move by itself.
typedef CmCalendarMoveHandler = FutureOr<bool?> Function(CmCalendarMove move);

/// The view and the first and last day shown (both included). Mirrors the web `cm-range-change` detail.
@immutable
class CmCalendarRange {
  const CmCalendarRange(this.view, this.start, this.end);
  final CmCalendarView view;
  final DateTime start, end;

  @override
  bool operator ==(Object other) => other is CmCalendarRange && other.view == view && other.start == start && other.end == end;

  @override
  int get hashCode => Object.hash(view, start, end);

  @override
  String toString() => 'CmCalendarRange(${view.name}, ${_iso(start)}, ${_iso(end)})';
}

/// What a "+" button or an empty hour asks to add. Mirrors the web `cm-add` detail.
@immutable
class CmCalendarAdd {
  const CmCalendarAdd({required this.start, required this.allDay, required this.view});

  /// A day (midnight) from a month day or the all-day row; a day and a time from an hour of the week and day views.
  final DateTime start;

  /// True for a day (month view, all-day row).
  final bool allDay;
  final CmCalendarView view;

  @override
  String toString() => 'CmCalendarAdd($start, allDay: $allDay, ${view.name})';
}

/// A calendar of events in month, week and day views: an outreach planner of calls, follow-ups and demos. Mirrors
/// `<cm-calendar>`.
///
/// The header has Previous, Today and Next, the range shown and a view switch. Each change of view or range calls
/// [onRangeChange] with the days shown, so the app loads their events. Events move between days (month, week) and
/// times (week, day) by dragging (with a mouse at once; on touch, press and hold first) or with the keyboard: focus
/// an event, press Space, choose a day or time with the arrow keys (Left and Right follow the reading direction)
/// and press Enter. Each move calls [onMove], which can refuse it or save it (see [CmCalendarMoveHandler]). A "+"
/// on each day (and each hour in the week and day views) calls [onAdd].
///
/// When the calendar is narrower than 600 the month view becomes a compact grid with the chosen day's events
/// listed under it, and the week view shows three days.
///
/// Keyboard: the grid is one Tab stop; the arrow keys move between days, hours and events, Home and End to the
/// start and end of the week, Page Up and Page Down to the previous or next period. Every step of a move is
/// announced to screen readers.
///
/// Differences from the web component (Flutter can't match these): events are data ([events]), not child
/// elements, and there are no links (`href`): use [onOpen] to open the record. Month and weekday names and the date
/// formats come from [CmStrings] (English by default) instead of the browser's Intl, and there is no `locale`
/// property: translate through [CmLocalizations]; the first day of the week defaults to the app's
/// [MaterialLocalizations]. Times use [CmStrings.am] and [CmStrings.pm] ("3:00 pm") or a 24-hour clock ("15:00").
/// The `hour-cycle` property is [use24HourFormat], as on [CmDatePicker]. Events in the "+N more" list move with
/// the keyboard only (the list closes when a move starts, which would end a pointer drag). Screen readers get the
/// names, hints and announcements, but there is no grid role, `aria-current` or `aria-busy` in Flutter semantics.
class CmCalendar extends StatefulWidget {
  const CmCalendar({
    super.key,
    this.events = const [],
    this.view = CmCalendarView.month,
    this.date,
    this.today,
    this.label,
    this.step = 15,
    this.firstDayOfWeek,
    this.use24HourFormat,
    this.dayStart = 8,
    this.maxEvents = 3,
    this.headingLevel = 2,
    this.loading = false,
    this.readonly = false,
    this.controlled = false,
    this.onMove,
    this.onAdd,
    this.onOpen,
    this.onRangeChange,
    this.hourHeight = 48,
    this.timeHeight = 600,
    this.dayHeight = 112,
  });

  /// The events, in any order.
  final List<CmCalendarEvent> events;

  /// The view to show first. Previous/Next/Today and the view switch change the calendar's own view; passing a
  /// different value later switches to it.
  final CmCalendarView view;

  /// A day in the range shown. Null: today. Passing a different value later shows it. On narrow screens it is also
  /// the day listed under the month.
  final DateTime? date;

  /// Today's date, for the Today button and the highlight. Null: the device's date. Set it from your server, or to
  /// fix the date in tests.
  final DateTime? today;

  /// Name of the calendar for screen readers, e.g. "Outreach planner". Default: [CmStrings.calendarLabel].
  final String? label;

  /// Minutes events snap to when moved in the week and day views (1 to 240). Default 15.
  final int step;

  /// First day of the week: 0 = Sunday, 1 = Monday … 6 = Saturday. Null: the locale's
  /// ([MaterialLocalizations.firstDayOfWeekIndex]), else Sunday.
  final int? firstDayOfWeek;

  /// Force a 24-hour (true) or 12-hour (false) clock. Null: the platform's setting or the locale's clock. The web's
  /// `hour-cycle`.
  final bool? use24HourFormat;

  /// The hour the week and day views scroll to when they open (0 to 23). Default 8. Changing it scrolls again.
  final int dayStart;

  /// Most chips in a month day; with more, the last place shows "+N more", which lists the whole day. Default 3.
  final int maxEvents;

  /// Level of the range heading for screen readers (1 to 6). Default 2.
  final int headingLevel;

  /// Events are loading: a spinner shows by the range and "Loading events" is announced.
  final bool loading;

  /// No "+" buttons and no moving: events can only be opened.
  final bool readonly;

  /// You move the events: [onMove] is called but the calendar never shows a move by itself; pass the moved event
  /// in [events].
  final bool controlled;

  /// Called before an event moves; see [CmCalendarMoveHandler].
  final CmCalendarMoveHandler? onMove;

  /// Called by a "+" button or an empty hour.
  final ValueChanged<CmCalendarAdd>? onAdd;

  /// Called when an event chip is activated (tap or Enter).
  final ValueChanged<CmCalendarEvent>? onOpen;

  /// Called after the first build and whenever the days shown change (view, Previous/Next/Today, [date], or the
  /// width crossing 600). Load the events for those days.
  final ValueChanged<CmCalendarRange>? onRangeChange;

  /// Height of an hour in the week and day views (web `--cm-calendar-hour-height`). Default 48.
  final double hourHeight;

  /// Most height of the scrolling week and day views (web `--cm-calendar-time-height`). Default 600. In a box with
  /// a bounded height they also shrink to fit it.
  final double timeHeight;

  /// Least height of a day in the month view (web `--cm-calendar-day-height`). Default 112.
  final double dayHeight;

  @override
  State<CmCalendar> createState() => CmCalendarState();
}

// ---------- Helpers ----------

String _p(int n) => n.toString().padLeft(2, '0');
String _iso(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${_p(d.month)}-${_p(d.day)}';
DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
DateTime _addDays(DateTime d, int n) => DateTime(d.year, d.month, d.day + n, d.hour, d.minute);
DateTime _addMonths(DateTime d, int n) {
  final last = DateTime(d.year, d.month + n + 1, 0).day;
  return DateTime(d.year, d.month + n, math.min(d.day, last));
}

int _dayDiff(DateTime a, DateTime b) => DateTime.utc(b.year, b.month, b.day).difference(DateTime.utc(a.year, a.month, a.day)).inDays;
int _jsDay(DateTime d) => d.weekday % 7;

/// An event read for drawing: times resolved, the days it shows on.
class _Ev {
  _Ev(this.e, {required this.allDay, required this.start, required this.end, required this.min, required this.dur, required this.days});
  final CmCalendarEvent e;
  final bool allDay;

  /// Timed: start and end. All-day: the first and last day at midnight.
  final DateTime start, end;

  /// Minutes from midnight of the start day (timed), and the length in minutes.
  final int min, dur;

  /// ISO days it shows on: its start day, or every day of an all-day event.
  final List<String> days;

  String get id => e.id;
  String get name => e.name;
}

enum _Mode { day, time }

class _Held {
  _Held(this.ev, this.origin, this.mode, this.from);
  final _Ev ev;
  final String origin;
  final _Mode mode;
  final CmMovePlace from;
}

class _Drag {
  _Drag(this.h, this.grab, this.pointer) : to = h.from;
  final _Held h;
  final double grab;
  Offset pointer;
  CmMovePlace to;
}

class _Overlay {
  _Overlay(this.to, this.from);
  final CmCalendarTimes to, from;
  bool settled = false;
}

/// A focusable place in the calendar: a day, an hour, a "+" button, an event chip.
class _It {
  _It(this.k, this.i, {this.row, this.day, this.ev, this.item = true, this.pop = false, this.activate});

  /// Its key: `add:iso`, `cell:iso`, `day:iso`, `more:iso`, `adadd:iso`, `slot:iso:h`, `ev:id:iso`, `pop:…`.
  final String k;

  /// Index of its day among the days shown.
  final int i;

  /// `a` in the all-day row, the hour in the time grid.
  final String? row;
  final String? day, ev;

  /// Part of the grid's arrow-key navigation (one Tab stop); else an ordinary Tab stop (lists).
  final bool item;

  /// In the "+N more" list.
  final bool pop;

  /// Enter (and Space, except on events).
  final VoidCallback? activate;
}

class _CalendarMoveModel extends CmMoveModel {
  _CalendarMoveModel({
    required this.nav,
    required super.groupCount,
    required super.slotCount,
    required super.onDrop,
    required super.pickedUpMessage,
    required super.overMessage,
    required super.cancelledMessage,
    required super.announce,
    super.onTarget,
    super.onCancel,
  });
  final CmMovePlace? Function(LogicalKeyboardKey key, CmMovePlace at) nav;

  @override
  CmMovePlace? navigate(LogicalKeyboardKey key, CmMovePlace at) => nav(key, at);
}

enum _Where { month, time, allDay, list }

const _narrowWidth = 600.0;
const _tabular = [FontFeature.tabularFigures()];

/// State of a [CmCalendar]: navigate, pick up, move and revert from your own controls through a
/// `GlobalKey<CmCalendarState>`.
class CmCalendarState extends State<CmCalendar> {
  late CmCalendarView _view = widget.view;
  late DateTime? _date = widget.date == null ? null : _dateOnly(widget.date!);
  bool _narrow = false;
  int _localeFirstDay = 0;

  late final CmMoveModel _model = _CalendarMoveModel(
    nav: _moveKey,
    groupCount: () => _days().length,
    slotCount: (_) => _held == null ? 0 : (_held!.mode == _Mode.day ? 1 : _slots(_held!.ev.dur)),
    onTarget: _showTarget,
    onDrop: _keyboardDrop,
    onCancel: (_) => _release(),
    pickedUpMessage: (at) => _s.calendarPickedUp(_held?.ev.name ?? '', _placeText(_held!, at)),
    overMessage: (at) => _s.calendarOver(_placeText(_held!, at)),
    cancelledMessage: (from) => _s.calendarCancelled(_held?.ev.name ?? '', _placeText(_held!, from)),
    announce: announce,
  );

  _Held? _held;
  _Drag? _drag;
  ({String iso, int? min})? _target;
  String _more = '';
  final Map<String, _Overlay> _overlays = {};
  final Set<String> _saving = {};
  String _announcement = '';
  String _focusKey = '';
  String? _activeKey;
  (String, DateTime)? _pendingFocus;
  bool _focusPop = false;
  bool _scrollToStart = true;
  String _lastRange = '';
  bool _frameScheduled = false;
  Timer? _scrollTimer;
  bool _keyHandler = false;

  final List<_It> _items = [];
  final List<String> _popKeys = [];
  final Map<String, FocusNode> _nodes = {};
  final Map<String, int> _live = {};
  final Map<int, GlobalKey> _dropKeys = {};
  final Map<int, GlobalKey> _colKeys = {};
  // By the day's place in the grid, not its date: a date can move to another place when the range changes.
  final Map<int, OverlayPortalController> _pops = {};
  final Map<int, LayerLink> _links = {};
  final _hoverCell = ValueNotifier<String?>(null);
  final _timeScroll = ScrollController();
  final _viewportKey = GlobalKey();
  final _phKey = GlobalKey();

  CmStrings get _s => CmStrings.of(context);

  // ---------- Public API ----------

  /// The view shown now.
  CmCalendarView get view => _view;

  /// The view and the first and last day shown, as in [CmCalendar.onRangeChange].
  CmCalendarRange get range {
    final d = _days();
    return CmCalendarRange(_view, d.first, d.last);
  }

  /// The id of the event picked up with the keyboard, if any.
  String? get heldEvent => _held?.ev.id;

  /// True while an event is dragged with a pointer.
  bool get dragging => _drag != null;

  /// The last message announced (for tests and logging).
  String get announcement => _announcement;

  /// Speaks [text] to screen readers.
  void announce(String text) {
    _announcement = text;
    if (!mounted) return;
    SemanticsService.announce(text, Directionality.of(context), assertiveness: Assertiveness.assertive);
  }

  /// Shows the previous month, week (three days when narrow) or day.
  void previous() => setState(() => _date = _shift(_anchor, -1));

  /// Shows the next month, week (three days when narrow) or day.
  void next() => setState(() => _date = _shift(_anchor, 1));

  /// Shows the range with today in it.
  void goToToday() => setState(() => _date = _todayDate);

  /// Switches to [view].
  void setView(CmCalendarView view) {
    if (view == _view) return;
    _setMore('');
    _model.cancel(silent: true);
    setState(() {
      _view = view;
      _scrollToStart = true;
    });
  }

  /// Scrolls the week or day view so [hour] (0–23) is at the top. Useful after loading events, e.g. to open at the
  /// first one. Does nothing in the month view.
  void scrollToHour(int hour) {
    if (_view == CmCalendarView.month || !_timeScroll.hasClients) return;
    final p = _timeScroll.position;
    p.jumpTo((hour.clamp(0, 23) * widget.hourHeight).clamp(p.minScrollExtent, p.maxScrollExtent));
  }

  /// Picks up an event for moving with the arrow keys, as Space does: e.g. from a "Move" item in your own menu.
  /// [day] is the day it is picked up from, for an all-day event over several days. Returns false when the event
  /// is not shown, locked, saving or the calendar is read-only.
  bool pickUp(String value, [DateTime? day]) {
    final ev = _evById(value);
    if (ev == null || ev.e.locked || _isPending(ev) || widget.readonly) return false;
    final days = _days().map(_iso).toList();
    final want = day == null ? null : _iso(day);
    final origin = want != null && ev.days.contains(want) && days.contains(want) ? want : ev.days.where(days.contains).firstOrNull;
    if (origin == null) return false;
    final held = _holdFor(ev, origin);
    if (held == null) return false;
    _dragEnd(drop: false);
    _model.cancel(silent: true);
    _setMore('');
    final key = 'ev:${ev.id}:$origin';
    setState(() {
      _held = held;
      _focusKey = key;
    });
    _focusLater(key);
    _model.pickUp(held.from);
    return true;
  }

  /// Cancels a keyboard move or a drag in progress: the event stays where it was.
  void cancelMove() {
    final d = _drag;
    if (d != null) {
      _dragEnd(drop: false);
      announce(_s.calendarCancelled(d.h.ev.name, _placeText(d.h, d.h.from)));
    }
    _model.cancel();
  }

  /// Moves an event to a new [start] (local; [end] defaults to keeping its length), as a drop would: calls
  /// [CmCalendar.onMove] and shows the move unless it is refused. Returns false when the move was refused, went
  /// nowhere or the event was not found.
  bool moveEvent(String value, DateTime start, [DateTime? end]) {
    final ev = _evById(value);
    if (ev == null) return false;
    final s = ev.allDay ? _dateOnly(start) : start;
    var e = end == null ? null : (ev.allDay ? _dateOnly(end) : end);
    if (e == null || e.isBefore(s)) e = ev.allDay ? _addDays(s, _dayDiff(ev.start, ev.end)) : s.add(Duration(minutes: ev.dur));
    return _commit(ev, s, e, CmCalendarMoveSource.api, false, _iso(s));
  }

  /// Puts an event back where it was before its last move by the calendar, and announces it. A failed save (a
  /// future from [CmCalendar.onMove] that completes with false or throws) does this for you. Does nothing with
  /// [CmCalendar.controlled], after the save succeeded, or when the event has not moved. Returns whether it went
  /// back.
  bool revert(String value) {
    final wasSaving = _saving.remove(value);
    final o = _overlays[value];
    if (widget.controlled || o == null || o.settled) {
      if (wasSaving) setState(() {});
      return false;
    }
    final focused = _nodesOf(value).contains(FocusManager.instance.primaryFocus);
    setState(() => _overlays.remove(value));
    final ev = _evById(value);
    if (ev != null && focused) _focusLater('ev:${ev.id}:${ev.days.first}');
    announce(_s.calendarReverted(ev?.name ?? value, ev != null ? _when(ev) : _when(_evFromTimes(value, o.from))));
    return true;
  }

  // ---------- Lifecycle ----------

  @override
  void didUpdateWidget(CmCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.view != oldWidget.view && widget.view != _view) {
      _setMore('');
      _model.cancel(silent: true);
      _view = widget.view;
      _scrollToStart = true;
    }
    if (widget.date != oldWidget.date) _date = widget.date == null ? null : _dateOnly(widget.date!);
    if (widget.dayStart != oldWidget.dayStart) _scrollToStart = true;
    if (!identical(widget.events, oldWidget.events)) {
      // New data from the app: it now has the moves it accepted; keep only those still being saved.
      _overlays.removeWhere((id, _) => !_saving.contains(id));
    }
    if (_held != null && _evById(_held!.ev.id) == null) _model.cancel(silent: true);
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    if (_keyHandler) HardwareKeyboard.instance.removeHandler(_onDragKey);
    for (final n in _nodes.values) {
      n.dispose();
    }
    _hoverCell.dispose();
    _timeScroll.dispose();
    super.dispose();
  }

  // ---------- Reading ----------

  DateTime get _todayDate => widget.today == null ? _dateOnly(DateTime.now()) : _dateOnly(widget.today!);
  DateTime get _anchor => _date ?? _todayDate;
  int get _step => widget.step >= 1 && widget.step <= 240 ? widget.step : 15;
  int get _firstDay => widget.firstDayOfWeek == null ? _localeFirstDay : ((widget.firstDayOfWeek! % 7) + 7) % 7;
  bool get _compact => _view == CmCalendarView.month && _narrow;
  bool get _timeView => _view != CmCalendarView.month;
  int get _dayStart => widget.dayStart.clamp(0, 23);

  bool get _use24 {
    if (widget.use24HourFormat != null) return widget.use24HourFormat!;
    if (MediaQuery.maybeAlwaysUse24HourFormatOf(context) ?? false) return true;
    final l = Localizations.of<MaterialLocalizations>(context, MaterialLocalizations);
    if (l == null) return false;
    final f = l.timeOfDayFormat();
    return f == TimeOfDayFormat.HH_colon_mm || f == TimeOfDayFormat.HH_dot_mm || f == TimeOfDayFormat.frenchCanadian;
  }

  /// The days shown, in order.
  List<DateTime> _days() {
    final a = _anchor;
    final fd = _firstDay;
    switch (_view) {
      case CmCalendarView.day:
        return [a];
      case CmCalendarView.week:
        if (_narrow) return [a, _addDays(a, 1), _addDays(a, 2)];
        final s = _addDays(a, -((_jsDay(a) - fd + 7) % 7));
        return List.generate(7, (i) => _addDays(s, i));
      case CmCalendarView.month:
        final first = DateTime(a.year, a.month, 1);
        final s = _addDays(first, -((_jsDay(first) - fd + 7) % 7));
        final n = ((_dayDiff(s, DateTime(a.year, a.month + 1, 0)) + 1) / 7).ceil() * 7;
        return List.generate(n, (i) => _addDays(s, i));
    }
  }

  CmCalendarEvent _effective(CmCalendarEvent e) {
    final o = _overlays[e.id];
    return o == null ? e : e.copyWith(start: o.to.start, end: o.to.end);
  }

  _Ev _parse(CmCalendarEvent raw) {
    final e = _effective(raw);
    if (e.allDay) {
      final s = _dateOnly(e.start);
      var en = _dateOnly(e.end ?? e.start);
      if (en.isBefore(s)) en = s;
      final n = math.min(_dayDiff(s, en), 366);
      return _Ev(e, allDay: true, start: s, end: en, min: 0, dur: 1440, days: List.generate(n + 1, (i) => _iso(_addDays(s, i))));
    }
    final s = e.start;
    var en = e.end;
    if (en == null || !en.isAfter(s)) en = s.add(const Duration(minutes: 30));
    final dur = math.max(1, en.difference(s).inMinutes);
    return _Ev(e, allDay: false, start: s, end: en, min: s.hour * 60 + s.minute, dur: dur, days: [_iso(s)]);
  }

  List<_Ev> _parsed() => [for (final e in widget.events) _parse(e)];

  _Ev? _evById(String id) {
    for (final e in widget.events) {
      if (e.id == id) return _parse(e);
    }
    return null;
  }

  _Ev _evFromTimes(String id, CmCalendarTimes t) {
    final e = widget.events.firstWhere((x) => x.id == id, orElse: () => CmCalendarEvent(heading: id, start: t.start, end: t.end));
    return _parse(e.copyWith(start: t.start, end: t.end));
  }

  bool _isPending(_Ev ev) => ev.e.pending || _saving.contains(ev.id);

  /// Events by ISO day: all-day first, then by start time, then by name.
  Map<String, List<_Ev>> _byDay(List<_Ev> evs) {
    final m = <String, List<_Ev>>{};
    for (final ev in evs) {
      for (final d in ev.days) {
        m.putIfAbsent(d, () => []).add(ev);
      }
    }
    for (final list in m.values) {
      list.sort((a, b) {
        if (a.allDay != b.allDay) return a.allDay ? -1 : 1;
        final t = a.start.compareTo(b.start);
        return t != 0 ? t : a.name.compareTo(b.name);
      });
    }
    return m;
  }

  // ---------- Words ----------

  String _dayText(DateTime d) => _s.calendarDate(_s.calendarWeekdays[_jsDay(d)], d.day, _s.calendarMonths[d.month - 1]);

  String _timeText(int min) {
    final m = ((min % 1440) + 1440) % 1440;
    final h = m ~/ 60, mm = m % 60;
    if (_use24) return '${_p(h)}:${_p(mm)}';
    return '${h % 12 == 0 ? 12 : h % 12}:${_p(mm)} ${h < 12 ? _s.am : _s.pm}';
  }

  /// "3:00 to 3:30 pm": a shared am/pm is written once.
  String _timeRange(DateTime s, DateTime e) {
    final sameDay = _iso(s) == _iso(e) || (e.hour == 0 && e.minute == 0 && _dayDiff(s, e) == 1);
    final sm = s.hour * 60 + s.minute, em = e.hour * 60 + e.minute;
    if (!sameDay) return _s.calendarTimeRange('${_dayText(s)}, ${_timeText(sm)}', '${_dayText(e)}, ${_timeText(em)}');
    if (!_use24 && (s.hour < 12) == (e.hour < 12) && !(e.hour == 0 && e.minute == 0 && _iso(s) != _iso(e))) {
      final start = _timeText(sm);
      return _s.calendarTimeRange(start.substring(0, start.lastIndexOf(' ')), _timeText(em));
    }
    return _s.calendarTimeRange(_timeText(sm), _timeText(em));
  }

  String _when(_Ev ev) {
    if (ev.allDay) {
      if (_iso(ev.start) == _iso(ev.end)) return _s.calendarAllDayOn(_dayText(ev.start));
      return _s.calendarAllDayRange(_dayText(ev.start), _dayText(ev.end));
    }
    if (_iso(ev.start) != _iso(ev.end) && !(ev.end.hour == 0 && ev.end.minute == 0 && _dayDiff(ev.start, ev.end) == 1)) {
      return _timeRange(ev.start, ev.end);
    }
    return _s.calendarTimed(_dayText(ev.start), _timeRange(ev.start, ev.end));
  }

  String _name(_Ev ev) => ev.e.kind.isNotEmpty ? _s.calendarEventNameKind(ev.name, _when(ev), ev.e.kind) : _s.calendarEventName(ev.name, _when(ev));

  String _rangeLabel(List<DateTime> days) {
    final s = _s;
    if (_view == CmCalendarView.month) return s.calendarMonthYear(s.calendarMonths[_anchor.month - 1], _anchor.year);
    if (days.length == 1) {
      final d = days.first;
      return s.calendarDateWithYear(s.calendarWeekdays[_jsDay(d)], d.day, s.calendarMonths[d.month - 1], d.year);
    }
    return s.calendarDayRange(days.first, days.last);
  }

  String _hourLabel(int h) {
    if (_use24) return _timeText(h * 60);
    return '${h % 12 == 0 ? 12 : h % 12} ${h < 12 ? _s.am : _s.pm}';
  }

  /// The place of a move in words: a day, or a day and a time range.
  String _placeText(_Held h, CmMovePlace at) {
    final t = _timesAt(h, at);
    if (h.mode == _Mode.time) return _s.calendarTimed(_dayText(t.start), _timeRange(t.start, t.end));
    return _dayText(_addDays(DateTime.parse(h.origin), at.group - h.from.group));
  }

  // ---------- Navigation ----------

  DateTime _shift(DateTime d, int dir) => switch (_view) {
        CmCalendarView.month => _addMonths(d, dir),
        CmCalendarView.week => _addDays(d, dir * (_narrow ? 3 : 7)),
        CmCalendarView.day => _addDays(d, dir),
      };

  void _setMore(String iso) {
    if (_more == iso) return;
    for (final c in _pops.values) {
      if (c.isShowing) c.hide();
    }
    if (iso.isNotEmpty) {
      final i = _days().indexWhere((d) => _iso(d) == iso);
      if (i < 0) return;
      _pop(i).show();
    }
    if (mounted) setState(() => _more = iso);
  }

  OverlayPortalController _pop(int i) => _pops.putIfAbsent(i, OverlayPortalController.new);
  LayerLink _link(int i) => _links.putIfAbsent(i, LayerLink.new);

  void _openMore(String iso) {
    _setMore(iso);
    _focusPop = true;
    _schedule();
  }

  void _closeMore({required bool refocus}) {
    final iso = _more;
    _setMore('');
    if (refocus && iso.isNotEmpty) {
      _focusKey = 'more:$iso';
      _focusLater('more:$iso');
    }
  }

  // ---------- Focus among days, times and events ----------

  FocusNode _node(String k) => _nodes.putIfAbsent(k, () => FocusNode(debugLabel: 'CmCalendar $k'));

  Iterable<FocusNode> _nodesOf(String id) => _nodes.entries.where((e) => e.key.startsWith('ev:$id:') || e.key.startsWith('pop:ev:$id:')).map((e) => e.value);

  bool _isLive(String k) => (_live[k] ?? 0) > 0;

  void _focusLater(String key) {
    _pendingFocus = (key, DateTime.now().add(const Duration(seconds: 1)));
    _schedule();
  }

  String _defaultKey() {
    final iso = _iso(_anchor);
    if (_compact) return 'day:$iso';
    if (_view == CmCalendarView.month) return widget.readonly ? 'cell:$iso' : 'add:$iso';
    return 'slot:$iso:$_dayStart';
  }

  String? _computeActive() {
    if (_items.isEmpty) return null;
    final anchor = _iso(_anchor);
    return (_items.where((i) => i.k == _focusKey).firstOrNull ??
            _items.where((i) => i.k == _defaultKey()).firstOrNull ??
            _items.where((i) => i.day == anchor).firstOrNull ??
            _items.first)
        .k;
  }

  void _focusItem(_It it) {
    setState(() => _focusKey = it.k);
    _node(it.k).requestFocus();
    _reveal(it.k);
  }

  void _reveal(String k) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = _nodes[k]?.context;
      if (!mounted || ctx == null || !ctx.mounted) return;
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd);
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart);
    });
  }

  void _onFocusChange(_It it, bool focused) {
    if (focused) {
      if (it.item && _focusKey != it.k) setState(() => _focusKey = it.k);
      return;
    }
    final held = _held;
    if (held != null && it.ev == held.ev.id) {
      // Focus left the held event (a click elsewhere, Tab): put it back. A rebuild that keeps it is not a leave.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_model.active || _held?.ev.id != it.ev || _pendingFocus != null) return;
        if (_nodesOf(it.ev!).contains(FocusManager.instance.primaryFocus)) return;
        _model.cancel();
      });
    }
    if (it.pop) {
      // The "+N more" list closes when focus leaves it.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _more.isEmpty || _held != null || _focusPop) return;
        final pf = FocusManager.instance.primaryFocus;
        if (_popKeys.any((k) => _nodes[k] == pf)) return;
        _setMore('');
      });
    }
  }

  LogicalKeyboardKey _logical(LogicalKeyboardKey k) {
    if (Directionality.of(context) != TextDirection.rtl) return k;
    if (k == LogicalKeyboardKey.arrowLeft) return LogicalKeyboardKey.arrowRight;
    if (k == LogicalKeyboardKey.arrowRight) return LogicalKeyboardKey.arrowLeft;
    return k;
  }

  static final _navKeys = {
    LogicalKeyboardKey.arrowLeft,
    LogicalKeyboardKey.arrowRight,
    LogicalKeyboardKey.arrowUp,
    LogicalKeyboardKey.arrowDown,
    LogicalKeyboardKey.home,
    LogicalKeyboardKey.end,
    LogicalKeyboardKey.pageUp,
    LogicalKeyboardKey.pageDown,
  };

  KeyEventResult _onKey(_It it, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final hw = HardwareKeyboard.instance;
    final key = _logical(e.logicalKey);
    if (_drag != null && key == LogicalKeyboardKey.escape) {
      cancelMove();
      return KeyEventResult.handled;
    }
    if (hw.isAltPressed || hw.isControlPressed || hw.isMetaPressed) return KeyEventResult.ignored;
    if (_model.active) {
      if (key == LogicalKeyboardKey.tab) {
        _model.cancel();
        return KeyEventResult.ignored;
      }
      if (_model.handleKey(key) || _navKeys.contains(key)) return KeyEventResult.handled;
      return KeyEventResult.ignored;
    }
    final down = e is KeyDownEvent;
    if (it.pop && key == LogicalKeyboardKey.escape && down) {
      _closeMore(refocus: true);
      return KeyEventResult.handled;
    }
    if (it.ev != null && key == LogicalKeyboardKey.space) {
      if (down) pickUp(it.ev!, it.day == null ? null : DateTime.parse(it.day!));
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter || key == LogicalKeyboardKey.space) {
      if (it.activate == null) return KeyEventResult.ignored;
      if (down) it.activate!();
      return KeyEventResult.handled;
    }
    if (it.pop && (key == LogicalKeyboardKey.arrowDown || key == LogicalKeyboardKey.arrowUp)) {
      final chips = _popKeys.where((k) => k.startsWith('pop:ev:')).toList();
      final i = chips.indexOf(it.k) + (key == LogicalKeyboardKey.arrowDown ? 1 : -1);
      if (i >= 0 && i < chips.length && chips.contains(it.k)) _nodes[chips[i]]?.requestFocus();
      return KeyEventResult.handled;
    }
    if (!it.item) return KeyEventResult.ignored;
    if (key == LogicalKeyboardKey.pageUp || key == LogicalKeyboardKey.pageDown) {
      _page(it, key == LogicalKeyboardKey.pageUp ? -1 : 1);
      return KeyEventResult.handled;
    }
    final next = _neighbour(it, key);
    if (next != null) {
      _focusItem(next);
      return KeyEventResult.handled;
    }
    return _navKeys.contains(key) ? KeyEventResult.handled : KeyEventResult.ignored;
  }

  /// The item an arrow key (or Home/End) moves focus to, or null.
  _It? _neighbour(_It cur, LogicalKeyboardKey key) {
    final byDay = <int, List<_It>>{};
    for (final i in _items) {
      byDay.putIfAbsent(i.i, () => []).add(i);
    }
    final d = cur.i;
    final list = byDay[d] ?? [cur];
    final idx = math.max(0, list.indexWhere((x) => x.k == cur.k));
    final n = _days().length;
    final month = _view == CmCalendarView.month;
    _It? inDay(int day, _It? Function(List<_It> l) pick) {
      final l = day >= 0 && day < n ? byDay[day] : null;
      return l == null || l.isEmpty ? null : pick(l);
    }

    _It sameRow(List<_It> l) => month ? l[math.min(idx, l.length - 1)] : (l.where((x) => x.row == cur.row).firstOrNull ?? l.first);
    if (key == LogicalKeyboardKey.arrowRight) return inDay(d + 1, sameRow);
    if (key == LogicalKeyboardKey.arrowLeft) return inDay(d - 1, sameRow);
    if (key == LogicalKeyboardKey.arrowDown) return idx + 1 < list.length ? list[idx + 1] : (month ? inDay(d + 7, (l) => l.first) : null);
    if (key == LogicalKeyboardKey.arrowUp) return idx > 0 ? list[idx - 1] : (month ? inDay(d - 7, (l) => l.last) : null);
    if (key == LogicalKeyboardKey.home) return month ? inDay(d - d % 7, (l) => l.first) : inDay(0, sameRow);
    if (key == LogicalKeyboardKey.end) return month ? inDay(math.min(n - 1, d - d % 7 + 6), (l) => l.first) : inDay(n - 1, sameRow);
    return null;
  }

  /// Page Up/Down: the previous or next period, with focus on the matching day.
  void _page(_It cur, int dir) {
    final from = cur.day == null ? _anchor : DateTime.parse(cur.day!);
    final next = _iso(_shift(from, dir));
    final kind = cur.k.split(':').first;
    final String key;
    if (_compact) {
      key = 'day:$next';
    } else if (_view == CmCalendarView.month) {
      key = widget.readonly ? 'cell:$next' : 'add:$next';
    } else if (kind == 'adadd' || cur.row == 'a') {
      key = 'adadd:$next';
    } else {
      key = 'slot:$next:${cur.row ?? _dayStart}';
    }
    setState(() {
      _date = _shift(_anchor, dir);
      _focusKey = key;
    });
    _focusLater(key);
  }

  // ---------- Moving with the keyboard ----------

  int _slots(int dur) => (1440 - math.min(dur, 1440)) ~/ _step + 1;

  CmMovePlace? _moveKey(LogicalKeyboardKey key, CmMovePlace at) {
    final h = _held;
    if (h == null) return null;
    final n = _days().length;
    int g(int x) => x.clamp(0, n - 1);
    if (h.mode == _Mode.day) {
      final month = _view == CmCalendarView.month;
      if (key == LogicalKeyboardKey.arrowRight) return CmMovePlace(g(at.group + 1), 0);
      if (key == LogicalKeyboardKey.arrowLeft) return CmMovePlace(g(at.group - 1), 0);
      if (key == LogicalKeyboardKey.arrowDown) return month ? CmMovePlace(at.group + 7 < n ? at.group + 7 : at.group, 0) : at;
      if (key == LogicalKeyboardKey.arrowUp) return month ? CmMovePlace(at.group - 7 >= 0 ? at.group - 7 : at.group, 0) : at;
      if (key == LogicalKeyboardKey.home) return CmMovePlace(month ? at.group - at.group % 7 : 0, 0);
      if (key == LogicalKeyboardKey.end) return CmMovePlace(month ? g(at.group - at.group % 7 + 6) : n - 1, 0);
      return null;
    }
    final last = _slots(h.ev.dur) - 1;
    final hour = math.max(1, (60 / _step).round());
    int i(int x) => x.clamp(0, last);
    if (key == LogicalKeyboardKey.arrowRight) return CmMovePlace(g(at.group + 1), at.index);
    if (key == LogicalKeyboardKey.arrowLeft) return CmMovePlace(g(at.group - 1), at.index);
    if (key == LogicalKeyboardKey.arrowDown) return CmMovePlace(at.group, i(at.index + 1));
    if (key == LogicalKeyboardKey.arrowUp) return CmMovePlace(at.group, i(at.index - 1));
    if (key == LogicalKeyboardKey.pageDown) return CmMovePlace(at.group, i(at.index + hour));
    if (key == LogicalKeyboardKey.pageUp) return CmMovePlace(at.group, i(at.index - hour));
    if (key == LogicalKeyboardKey.home) return CmMovePlace(at.group, 0);
    if (key == LogicalKeyboardKey.end) return CmMovePlace(at.group, last);
    return null;
  }

  /// New start and end for a held event at a place.
  CmCalendarTimes _timesAt(_Held h, CmMovePlace at) {
    final ev = h.ev;
    if (h.mode == _Mode.time) {
      final days = _days();
      final day = at.group >= 0 && at.group < days.length ? days[at.group] : DateTime.parse(h.origin);
      final start = DateTime(day.year, day.month, day.day, 0, at.index * _step);
      return CmCalendarTimes(start, start.add(Duration(minutes: ev.dur)));
    }
    final delta = at.group - h.from.group;
    return CmCalendarTimes(_addDays(ev.start, delta), _addDays(ev.end, delta));
  }

  _Held? _holdFor(_Ev ev, String origin) {
    final group = _days().map(_iso).toList().indexOf(origin);
    if (group < 0) return null;
    final mode = _timeView && !ev.allDay ? _Mode.time : _Mode.day;
    final index = mode == _Mode.time ? math.min(ev.min ~/ _step, _slots(ev.dur) - 1) : 0;
    return _Held(ev, origin, mode, CmMovePlace(group, index));
  }

  void _release() {
    if (!mounted) return;
    setState(() {
      _held = null;
      _target = null;
    });
  }

  void _showTarget(CmMovePlace? at) {
    final h = _held;
    if (!mounted) return;
    if (h == null || at == null) {
      setState(() => _target = null);
      return;
    }
    final days = _days();
    final iso = _iso(at.group < days.length ? days[at.group] : DateTime.parse(h.origin));
    setState(() => _target = at == h.from ? null : (iso: iso, min: h.mode == _Mode.time ? at.index * _step : null));
    _schedule();
  }

  void _keyboardDrop(CmMovePlace from, CmMovePlace to) {
    final h = _held;
    _release();
    if (h == null) return;
    _commitPlace(h, from, to, CmCalendarMoveSource.keyboard);
  }

  void _commitPlace(_Held h, CmMovePlace from, CmMovePlace to, CmCalendarMoveSource source) {
    final t = _timesAt(h, to);
    final day = h.mode == _Mode.time ? _iso(t.start) : _iso(_addDays(DateTime.parse(h.origin), to.group - from.group));
    _commit(h.ev, t.start, t.end, source, from == to, day);
  }

  // ---------- Committing ----------

  CmCalendarTimes _times(bool allDay, DateTime s, DateTime e) => allDay ? CmCalendarTimes(_dateOnly(s), _dateOnly(e)) : CmCalendarTimes(s, e);

  bool _commit(_Ev ev, DateTime start, DateTime end, CmCalendarMoveSource source, bool same, String day) {
    final s = _s;
    final name = ev.name;
    final from = _times(ev.allDay, ev.start, ev.end);
    final to = _times(ev.allDay, start, end);
    if (same || from == to) {
      if (source != CmCalendarMoveSource.api) announce(s.calendarSameSpot(name));
      setState(() {});
      return false;
    }
    final place = ev.allDay ? _dayText(start) : s.calendarTimed(_dayText(start), _timeRange(start, end));
    FutureOr<bool?> result;
    try {
      result = widget.onMove?.call(CmCalendarMove(event: ev.e, from: from, to: to, source: source));
    } catch (_) {
      result = false;
    }
    if (result == false) {
      announce(s.calendarRefused(name, place));
      setState(() {});
      return false;
    }
    final saving = result is Future;
    setState(() {
      if (!widget.controlled) _overlays[ev.id] = _Overlay(to, from);
      if (saving) _saving.add(ev.id);
    });
    if (source == CmCalendarMoveSource.keyboard) _focusLater('ev:${ev.id}:$day');
    announce(s.calendarMoved(name, place));
    if (result is Future<bool?>) {
      result.then((ok) => ok != false, onError: (Object _) => false).then((ok) {
        if (!mounted) return;
        if (ok) {
          setState(() {
            _saving.remove(ev.id);
            _overlays[ev.id]?.settled = true;
          });
        } else if (!widget.controlled) {
          revert(ev.id);
        } else {
          setState(() => _saving.remove(ev.id));
          announce(_s.calendarReverted(name, _when(ev)));
        }
      });
    }
    return true;
  }

  // ---------- Pointer drag ----------

  /// The day column under a point in the time grid (the nearest one sideways) and the minutes from midnight there.
  (int, double)? _timeAt(Offset p) {
    final n = _days().length;
    var group = -1;
    var best = double.infinity;
    double? top;
    for (var g = 0; g < n; g++) {
      final box = _colKeys[g]?.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) continue;
      final r = box.localToGlobal(Offset.zero) & box.size;
      top ??= r.top;
      final dist = p.dx < r.left ? r.left - p.dx : (p.dx > r.right ? p.dx - r.right : 0.0);
      if (dist < best) {
        best = dist;
        group = g;
      }
    }
    if (group < 0 || top == null) return null;
    return (group, (p.dy - top) / widget.hourHeight * 60);
  }

  /// The day under a point (nearest): month days, narrow month days, or the all-day row.
  int? _dayAt(Offset p) {
    int? best;
    var bestDist = double.infinity;
    for (final e in _dropKeys.entries) {
      final box = e.value.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) continue;
      final r = box.localToGlobal(Offset.zero) & box.size;
      final dx = p.dx < r.left ? r.left - p.dx : (p.dx > r.right ? p.dx - r.right : 0.0);
      final dy = p.dy < r.top ? r.top - p.dy : (p.dy > r.bottom ? p.dy - r.bottom : 0.0);
      final dist = math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = e.key;
      }
    }
    return best;
  }

  void _dragBegin(_Ev ev, String iso, bool timeChip, Offset global) {
    if (_drag != null || widget.readonly || ev.e.locked || _isPending(ev)) return;
    final held = _holdFor(ev, iso);
    if (held == null) return;
    if (_model.active) _model.cancel();
    var grab = 0.0;
    if (held.mode == _Mode.time && timeChip) {
      final at = _timeAt(global);
      if (at != null) grab = (at.$2 - ev.min).clamp(0, ev.dur.toDouble());
    }
    _setMore('');
    setState(() => _drag = _Drag(held, grab, global));
    announce(_s.calendarPickedUp(ev.name, _placeText(held, held.from)));
    _updateDragTarget();
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 16), (_) => _autoScroll());
    if (!_keyHandler) {
      HardwareKeyboard.instance.addHandler(_onDragKey);
      _keyHandler = true;
    }
  }

  bool _onDragKey(KeyEvent e) {
    if (_drag == null || e is! KeyDownEvent || e.logicalKey != LogicalKeyboardKey.escape) return false;
    cancelMove();
    return true;
  }

  void _dragMove(Offset global) {
    final d = _drag;
    if (d == null) return;
    d.pointer = global;
    _updateDragTarget();
  }

  void _updateDragTarget() {
    final d = _drag;
    if (d == null || !mounted) return;
    CmMovePlace? to;
    if (d.h.mode == _Mode.time) {
      final at = _timeAt(d.pointer);
      if (at != null) {
        final last = _slots(d.h.ev.dur) - 1;
        to = CmMovePlace(at.$1, ((at.$2 - d.grab) / _step).round().clamp(0, last));
      }
    } else {
      final g = _dayAt(d.pointer);
      if (g != null) to = CmMovePlace(g, 0);
    }
    if (to == null || (to == d.to && _target != null)) return;
    final changedDay = to.group != d.to.group;
    d.to = to;
    final same = to == d.h.from;
    final days = _days();
    setState(() => _target = same ? null : (iso: _iso(days[to!.group]), min: d.h.mode == _Mode.time ? to.index * _step : null));
    if (changedDay) announce(_s.calendarOver(_placeText(d.h, to)));
  }

  void _autoScroll() {
    final d = _drag;
    if (d == null || !mounted || d.h.mode != _Mode.time || !_timeScroll.hasClients) return;
    final box = _viewportKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.attached) return;
    final r = box.localToGlobal(Offset.zero) & box.size;
    if (d.pointer.dx < r.left || d.pointer.dx > r.right) return;
    const edge = 40.0, max = 14.0;
    double speed(double dist) => dist < edge ? ((edge - math.max(dist, 0)) / edge * max).ceilToDouble() : 0;
    final up = speed(d.pointer.dy - r.top), down = speed(r.bottom - d.pointer.dy);
    final p = _timeScroll.position;
    final before = p.pixels;
    if (up > 0) {
      p.jumpTo((p.pixels - up).clamp(p.minScrollExtent, p.maxScrollExtent));
    } else if (down > 0) {
      p.jumpTo((p.pixels + down).clamp(p.minScrollExtent, p.maxScrollExtent));
    }
    if (p.pixels != before) _updateDragTarget();
  }

  void _dragEnd({required bool drop}) {
    _scrollTimer?.cancel();
    _scrollTimer = null;
    if (_keyHandler) {
      HardwareKeyboard.instance.removeHandler(_onDragKey);
      _keyHandler = false;
    }
    final d = _drag;
    if (d == null) return;
    if (mounted) {
      setState(() {
        _drag = null;
        _target = null;
      });
    } else {
      _drag = null;
    }
    if (drop && mounted) _commitPlace(d.h, d.h.from, d.to, CmCalendarMoveSource.pointer);
  }

  Map<Type, GestureRecognizerFactory> _chipGestures(_Ev ev, String iso, bool timeChip, bool movable, VoidCallback onTap) {
    final g = <Type, GestureRecognizerFactory>{
      TapGestureRecognizer: GestureRecognizerFactoryWithHandlers<TapGestureRecognizer>(TapGestureRecognizer.new, (r) => r.onTap = onTap),
    };
    if (!movable) return g;
    g[PanGestureRecognizer] = GestureRecognizerFactoryWithHandlers<PanGestureRecognizer>(
      () => PanGestureRecognizer(supportedDevices: const {PointerDeviceKind.mouse}),
      (r) => r
        ..dragStartBehavior = DragStartBehavior.down
        ..onStart = ((d) => _dragBegin(ev, iso, timeChip, d.globalPosition))
        ..onUpdate = ((d) => _dragMove(d.globalPosition))
        ..onEnd = ((_) => _dragEnd(drop: true))
        ..onCancel = (() => _dragEnd(drop: false)),
    );
    // Touch and pen: press and hold first (300ms, as on the web), so a swipe still scrolls.
    g[LongPressGestureRecognizer] = GestureRecognizerFactoryWithHandlers<LongPressGestureRecognizer>(
      () => LongPressGestureRecognizer(
        duration: const Duration(milliseconds: 300),
        supportedDevices: const {PointerDeviceKind.touch, PointerDeviceKind.stylus, PointerDeviceKind.invertedStylus, PointerDeviceKind.unknown},
      ),
      (r) => r
        ..onLongPressStart = ((d) {
          HapticFeedback.selectionClick();
          _dragBegin(ev, iso, timeChip, d.globalPosition);
        })
        ..onLongPressMoveUpdate = ((d) => _dragMove(d.globalPosition))
        ..onLongPressEnd = ((_) => _dragEnd(drop: true))
        ..onLongPressCancel = (() => _dragEnd(drop: false)),
    );
    return g;
  }

  // ---------- Adding and opening ----------

  void _add(DateTime start, bool allDay) {
    if (widget.readonly) return;
    widget.onAdd?.call(CmCalendarAdd(start: start, allDay: allDay, view: _view));
  }

  void _open(_Ev ev) {
    if (_model.active) return;
    widget.onOpen?.call(ev.e);
  }

  // ---------- After each frame ----------

  void _schedule() {
    if (_frameScheduled) return;
    _frameScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _frameScheduled = false;
      if (mounted) _afterFrame();
    });
    WidgetsBinding.instance.ensureVisualUpdate();
  }

  void _afterFrame() {
    final pf = _pendingFocus;
    if (pf != null) {
      var key = pf.$1;
      if (!_isLive(key) && key.startsWith('ev:') && !widget.controlled) key = 'more:${key.substring(key.lastIndexOf(':') + 1)}';
      if (_isLive(key)) {
        _pendingFocus = null;
        _nodes[key]?.requestFocus();
        _reveal(key);
      } else if (DateTime.now().isAfter(pf.$2)) {
        _pendingFocus = null;
      }
    }
    if (_focusPop) {
      final k = _popKeys.where((k) => k.startsWith('pop:ev:')).firstOrNull ?? _popKeys.firstOrNull;
      if (k != null && _isLive(k)) {
        _focusPop = false;
        _nodes[k]?.requestFocus();
      } else if (_more.isEmpty) {
        _focusPop = false;
      } else {
        _schedule();
      }
    }
    if (_timeView) {
      if (_scrollToStart && _timeScroll.hasClients) {
        _scrollToStart = false;
        scrollToHour(_dayStart);
      }
    } else {
      _scrollToStart = true;
    }
    if (_held != null && _target != null) {
      final ctx = _phKey.currentContext;
      if (ctx != null) Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd);
      final ctx2 = _phKey.currentContext;
      if (ctx2 != null) Scrollable.ensureVisible(ctx2, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart);
    }
    final r = range;
    final sig = '${r.view.name}|${_iso(r.start)}|${_iso(r.end)}';
    if (sig != _lastRange) {
      _lastRange = sig;
      if (_more.isNotEmpty && (_more.compareTo(_iso(r.start)) < 0 || _more.compareTo(_iso(r.end)) > 0)) _setMore('');
      widget.onRangeChange?.call(r);
    }
    // Forget focus nodes of places no longer shown.
    final gone = [for (final e in _nodes.entries) if (!_isLive(e.key) && !e.value.hasFocus) e.key];
    for (final k in gone) {
      _nodes.remove(k)!.dispose();
      _live.remove(k);
    }
  }

  // ---------- Building ----------

  Widget _focusable(
    _It it, {
    required Widget Function(BuildContext context, bool focused, bool hovered) builder,
    String? label,
    String? hint,
    bool button = true,
    bool? selected,
    bool? expanded,
    bool excludeSemantics = true,
    VoidCallback? onSemanticTap,
    VoidCallback? onTap,
    GestureTapUpCallback? onTapUp,
    Map<Type, GestureRecognizerFactory>? gestures,
    MouseCursor cursor = SystemMouseCursors.click,
    Object? tapGroup,
  }) {
    if (it.item) _items.add(it);
    if (it.pop) _popKeys.add(it.k);
    return _Focusable(
      key: ValueKey(it.k),
      owner: this,
      it: it,
      node: _node(it.k),
      builder: builder,
      label: label,
      hint: hint,
      button: button,
      selected: selected,
      expanded: expanded,
      excludeSemantics: excludeSemantics,
      onSemanticTap: onSemanticTap ?? it.activate,
      onTap: onTap,
      onTapUp: onTapUp,
      gestures: gestures,
      cursor: cursor,
      tapGroup: tapGroup,
    );
  }

  _Ev? get _activeEv => _held?.ev ?? _drag?.h.ev;

  ({Color fill, Color bar}) _tone(CmColors c, CmTone t) => switch (t) {
        CmTone.neutral => (fill: c.bgTag, bar: c.textTertiary),
        CmTone.attention => (fill: c.bgAttention, bar: c.textAttention),
        CmTone.information => (fill: c.bgInformationSoft, bar: c.textInformation),
        CmTone.success => (fill: c.bgSuccessSoft, bar: c.textSuccess),
        CmTone.critical => (fill: c.bgCritical, bar: c.textCritical),
      };

  Widget _chip(BuildContext context, _Ev ev, String iso, int i, _Where where, {bool item = true, String? row, String prefix = ''}) {
    final s = _s;
    final busy = _isPending(ev);
    final name = _name(ev);
    final movable = !widget.readonly && !ev.e.locked && !busy;
    final moving = _activeEv?.id == ev.id;
    final pop = prefix == 'pop:';
    final it = _It('${prefix}ev:${ev.id}:$iso', i, row: row, day: iso, ev: ev.id, item: item, pop: pop, activate: () => _open(ev));
    void semanticTap() {
      if (_held?.ev.id == ev.id) {
        _model.drop();
      } else if (widget.onOpen != null) {
        _open(ev);
      } else if (movable) {
        pickUp(ev.id, DateTime.parse(iso));
      }
    }

    return _focusable(
      it,
      label: busy ? '$name, ${s.calendarSaving}' : name,
      hint: movable ? '${s.calendarRoleDescription}. ${s.calendarOpenHint} ${s.calendarInstructions}' : s.calendarOpenHint,
      onSemanticTap: semanticTap,
      cursor: busy
          ? SystemMouseCursors.progress
          : movable
              ? (moving && _drag != null ? SystemMouseCursors.grabbing : SystemMouseCursors.grab)
              : SystemMouseCursors.click,
      // A chip in the "+N more" list is not dragged: the list closes when a move starts.
      gestures: _chipGestures(ev, iso, where == _Where.time, movable && !pop, () {
        _node(it.k).requestFocus();
        _open(ev);
      }),
      builder: (context, focused, _) => _chipBox(context, ev, where, moving: moving, busy: busy, focused: focused),
    );
  }

  Widget _chipBox(BuildContext context, _Ev ev, _Where where, {required bool moving, required bool busy, required bool focused}) {
    final c = CmTheme.colorsOf(context);
    final tone = _tone(c, ev.e.tone);
    final list = where == _Where.list;
    final base = (list ? CmType.bodyMd : CmType.bodyXs).copyWith(color: c.textDefault);
    final small = CmType.bodyXs.copyWith(color: c.textDefault);
    const gap = WidgetSpan(child: SizedBox(width: 4));
    final wideGap = WidgetSpan(child: SizedBox(width: list ? 8 : 4));
    final icon = ev.e.icon == null ? null : WidgetSpan(alignment: PlaceholderAlignment.middle, child: CmIcon(ev.e.icon!, size: 14, color: c.textDefault));
    final time = ev.allDay ? null : TextSpan(text: _timeText(ev.min), style: base.copyWith(fontFeatures: _tabular));
    final showKind = ev.e.kind.isNotEmpty && (where != _Where.month || ev.e.icon == null);
    final spin = busy ? const WidgetSpan(alignment: PlaceholderAlignment.middle, child: _Spin()) : null;
    final title = TextSpan(text: ev.name, style: base.copyWith(fontWeight: FontWeight.w500));
    Widget body;
    if (where == _Where.time) {
      Widget line(InlineSpan span) => Text.rich(span, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false, style: base);
      body = ClipRect(
        child: OverflowBox(
          alignment: AlignmentDirectional.topStart,
          minHeight: 0,
          maxHeight: double.infinity,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            line(TextSpan(children: [if (icon != null) ...[icon, gap], if (time != null) time, if (spin != null) ...[gap, spin]])),
            line(title),
            if (showKind) line(TextSpan(text: ev.e.kind, style: base)),
          ]),
        ),
      );
    } else {
      body = Text.rich(
        TextSpan(children: [
          if (icon != null) ...[icon, gap],
          if (time != null) ...[time, wideGap],
          title,
          if (showKind) ...[wideGap, TextSpan(text: ev.e.kind, style: list ? small : base)],
          if (spin != null) ...[gap, spin],
        ]),
        maxLines: list ? null : 1,
        overflow: list ? null : TextOverflow.ellipsis,
        softWrap: list,
        style: base,
      );
    }
    final bg = moving || busy ? c.bgPage : Color.alphaBlend(tone.fill, c.bgSurface);
    Widget box = ClipRRect(
      borderRadius: BorderRadius.circular(CmRadius.xs),
      child: Container(
        constraints: BoxConstraints(minHeight: list ? 40 : 24),
        padding: list ? const EdgeInsetsDirectional.fromSTEB(8, 4, 8, 4) : const EdgeInsetsDirectional.fromSTEB(4, 2, 4, 2),
        alignment: where == _Where.time ? AlignmentDirectional.topStart : AlignmentDirectional.centerStart,
        decoration: BoxDecoration(color: bg, border: BorderDirectional(start: BorderSide(color: tone.bar, width: 3))),
        child: body,
      ),
    );
    if (moving) box = CustomPaint(foregroundPainter: _Dashed(color: c.borderStrong, radius: CmRadius.xs, width: 2), child: box);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(CmRadius.xs),
        boxShadow: focused
            ? [BoxShadow(color: c.bgSurface, spreadRadius: 1), BoxShadow(color: c.borderStrong, spreadRadius: 3)]
            : where == _Where.time
                ? [BoxShadow(color: c.bgSurface, spreadRadius: 1)]
                : null,
      ),
      child: box,
    );
  }

  Widget _placeholder(BuildContext context, _Ev ev, {Key? key, bool fill = false}) {
    final c = CmTheme.colorsOf(context);
    return ExcludeSemantics(
      key: key,
      child: CustomPaint(
        foregroundPainter: _Dashed(color: c.borderStrong, radius: CmRadius.xs, width: 2),
        child: Container(
          constraints: const BoxConstraints(minHeight: 24),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          alignment: fill ? AlignmentDirectional.topStart : AlignmentDirectional.centerStart,
          decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(CmRadius.xs)),
          child: Text(ev.name, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false, style: CmType.bodyXs.copyWith(color: c.textTertiary)),
        ),
      ),
    );
  }

  /// A 28px (24 in the all-day row) "+" button that shows on hover or focus where there is a mouse.
  Widget _addButton(BuildContext context, _It it, String label, {double size = 28}) {
    final touch = cmIsTouch(context);
    return _focusable(it, label: label, onTap: it.activate, builder: (context, focused, hovered) {
      final c = CmTheme.colorsOf(context);
      return ValueListenableBuilder<String?>(
        valueListenable: _hoverCell,
        builder: (context, cell, _) => Opacity(
          opacity: touch || focused || cell == it.day ? 1 : 0,
          child: Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: hovered ? c.bgHover : null,
              borderRadius: BorderRadius.circular(CmRadius.sm),
              border: focused ? Border.all(color: c.borderStrong, width: 2) : null,
            ),
            child: CmIcon(CmIcons.plus, size: 16, color: c.iconSelected),
          ),
        ),
      );
    });
  }

  Widget _hover(String iso, Widget child) => MouseRegion(
        onEnter: (_) => _hoverCell.value = iso,
        onExit: (_) {
          if (_hoverCell.value == iso) _hoverCell.value = null;
        },
        child: child,
      );

  @override
  Widget build(BuildContext context) {
    final s = _s;
    _localeFirstDay = Localizations.of<MaterialLocalizations>(context, MaterialLocalizations)?.firstDayOfWeekIndex ?? 0;
    return LayoutBuilder(builder: (context, box) {
      final width = box.maxWidth.isFinite ? box.maxWidth : 1000.0;
      _narrow = width < _narrowWidth;
      _items.clear();
      final days = _days();
      final byDay = _byDay(_parsed());
      final grid = _view == CmCalendarView.month ? _month(context, days, byDay, width) : _timeGrid(context, days, byDay, width);
      _activeKey = _computeActive();
      _schedule();
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: widget.label ?? s.calendarLabel,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          _header(context, days),
          const SizedBox(height: CmSpace.s12),
          // In a box with a bounded height the week and day views shrink to fit; otherwise they are timeHeight tall.
          if (_timeView && box.hasBoundedHeight) Flexible(child: grid.single) else ...grid,
          if (widget.loading) Semantics(liveRegion: true, label: s.calendarLoading, child: const SizedBox.shrink()),
        ]),
      );
    });
  }

  Widget _header(BuildContext context, List<DateTime> days) {
    final s = _s;
    final c = CmTheme.colorsOf(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final narrowWeek = _view == CmCalendarView.week && _narrow;
    final prev = switch (_view) {
      CmCalendarView.month => s.calendarPreviousMonth,
      CmCalendarView.week => narrowWeek ? s.calendarPreviousDays(3) : s.calendarPreviousWeek,
      CmCalendarView.day => s.calendarPreviousDay,
    };
    final next = switch (_view) {
      CmCalendarView.month => s.calendarNextMonth,
      CmCalendarView.week => narrowWeek ? s.calendarNextDays(3) : s.calendarNextWeek,
      CmCalendarView.day => s.calendarNextDay,
    };
    final nav = Row(mainAxisSize: MainAxisSize.min, children: [
      CmButton.iconOnly(icon: rtl ? CmIcons.chevronRight : CmIcons.chevronLeft, label: prev, onPressed: previous),
      const SizedBox(width: CmSpace.s4),
      CmButton(label: s.calendarToday, onPressed: goToToday),
      const SizedBox(width: CmSpace.s4),
      CmButton.iconOnly(icon: rtl ? CmIcons.chevronLeft : CmIcons.chevronRight, label: next, onPressed: this.next),
    ]);
    final title = Semantics(
      header: true,
      headingLevel: widget.headingLevel.clamp(1, 6),
      liveRegion: true,
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Flexible(child: Text(_rangeLabel(days), style: CmType.headingSm.copyWith(color: c.textDefault))),
        if (widget.loading) ...[
          const SizedBox(width: CmSpace.s8),
          ExcludeSemantics(child: SizedBox.square(dimension: 20, child: CmSpinner(size: CmSpinnerSize.small, label: s.calendarLoading))),
        ],
      ]),
    );
    final views = Semantics(
      container: true,
      explicitChildNodes: true,
      label: s.calendarViews,
      child: _ViewSwitch(
        selected: _view,
        labels: {CmCalendarView.month: s.calendarMonth, CmCalendarView.week: s.calendarWeek, CmCalendarView.day: s.calendarDay},
        onSelected: setView,
      ),
    );
    if (!_narrow) {
      return Row(children: [nav, const SizedBox(width: CmSpace.s12), Expanded(child: title), const SizedBox(width: CmSpace.s12), views]);
    }
    return Wrap(spacing: CmSpace.s12, runSpacing: CmSpace.s8, crossAxisAlignment: WrapCrossAlignment.center, children: [
      nav,
      ConstrainedBox(constraints: const BoxConstraints(minWidth: 160), child: title),
      views,
    ]);
  }

  Widget _grid(BuildContext context, List<DateTime> days, Widget child) => Semantics(
        container: true,
        explicitChildNodes: true,
        label: _rangeLabel(days),
        hint: _s.calendarGridHelp,
        child: child,
      );

  Widget _num(BuildContext context, DateTime d, {required bool today, required bool other, bool selected = false}) {
    final c = CmTheme.colorsOf(context);
    return ExcludeSemantics(
      child: Container(
        constraints: const BoxConstraints(minWidth: 24),
        height: 24,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: today ? c.actionPrimary : null,
          borderRadius: BorderRadius.circular(CmRadius.full),
          boxShadow: selected ? [BoxShadow(color: c.borderStrong, spreadRadius: 2)] : null,
        ),
        child: Text(
          '${d.day}',
          style: CmType.bodyXs.copyWith(fontWeight: FontWeight.w500, fontFeatures: _tabular, color: today ? c.actionPrimaryText : (other ? c.textTertiary : c.textDefault)),
        ),
      ),
    );
  }

  List<Widget> _month(BuildContext context, List<DateTime> days, Map<String, List<_Ev>> byDay, double width) {
    final s = _s;
    final c = CmTheme.colorsOf(context);
    final anchor = _anchor;
    final today = _iso(_todayDate);
    final max = math.max(1, widget.maxEvents);
    final active = _activeEv;
    final target = _target;
    final compact = _narrow;
    final ro = widget.readonly;
    final cellW = (width - 2) / 7;
    final order = List.generate(7, (i) => (i + _firstDay) % 7);
    final heads = Row(children: [
      for (final d in order)
        Expanded(
          child: Semantics(
            label: s.calendarWeekdays[d],
            excludeSemantics: true,
            child: Padding(
              padding: compact ? const EdgeInsets.symmetric(horizontal: 2, vertical: 4) : const EdgeInsets.symmetric(horizontal: CmSpace.s8, vertical: CmSpace.s4),
              child: Text(
                compact ? s.calendarWeekdaysShort[d].characters.take(2).toString() : s.calendarWeekdaysShort[d],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: compact ? TextAlign.center : TextAlign.start,
                style: CmType.bodyXs.copyWith(fontWeight: FontWeight.w500, color: c.textTertiary),
              ),
            ),
          ),
        ),
    ]);

    Widget cell(DateTime d, int i, int col) {
      final iso = _iso(d);
      final list = byDay[iso] ?? const <_Ev>[];
      final dayText = _dayText(d);
      final other = d.month != anchor.month;
      final isToday = iso == today;
      final over = target?.iso == iso;
      final border = BorderDirectional(
        top: BorderSide(color: c.borderSubtle),
        start: col > 0 ? BorderSide(color: c.borderSubtle) : BorderSide.none,
      );
      if (compact) {
        final selected = iso == _iso(anchor);
        final dots = list.take(3).map((ev) => _tone(c, ev.e.tone).bar).toList();
        final it = _It('day:$iso', i, day: iso, activate: () {
          setState(() {
            _date = d;
            _focusKey = 'day:$iso';
          });
        });
        return Container(
          key: _dropKeys.putIfAbsent(i, GlobalKey.new),
          padding: const EdgeInsets.all(2),
          foregroundDecoration: over ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
          decoration: BoxDecoration(color: other ? c.bgPage : c.bgSurface, border: border),
          child: _focusable(
            it,
            label: s.calendarDayEvents(dayText, list.length),
            selected: selected,
            onTap: it.activate,
            builder: (context, focused, hovered) => Container(
              constraints: const BoxConstraints(minHeight: 44),
              padding: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(
                color: hovered ? c.bgHover : null,
                borderRadius: BorderRadius.circular(CmRadius.sm),
                border: focused ? Border.all(color: c.borderStrong, width: 2) : null,
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                _num(context, d, today: isToday, other: other, selected: selected),
                const SizedBox(height: 2),
                SizedBox(
                  height: 6,
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    for (var k = 0; k < dots.length; k++) ...[
                      if (k > 0) const SizedBox(width: 2),
                      Container(width: 6, height: 6, decoration: BoxDecoration(color: dots[k], shape: BoxShape.circle)),
                    ],
                  ]),
                ),
              ]),
            ),
          ),
        );
      }
      var shown = list;
      var hidden = 0;
      if (list.length > max) {
        shown = list.sublist(0, max - 1);
        final mine = active == null ? null : list.where((e) => e.id == active.id).firstOrNull;
        if (mine != null && !shown.contains(mine)) shown = [...list.sublist(0, math.max(0, max - 2)), mine];
        hidden = list.length - shown.length;
      }
      final showPh = over && active != null;
      final content = Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        SizedBox(
          height: 28,
          child: Row(children: [
            _num(context, d, today: isToday, other: other),
            const Spacer(),
            if (!ro) _addButton(context, _It('add:$iso', i, day: iso, activate: () => _add(d, true)), s.calendarAddOn(dayText)),
          ]),
        ),
        if (shown.isNotEmpty || showPh)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              for (var k = 0; k < shown.length; k++) ...[
                if (k > 0) const SizedBox(height: 2),
                _chip(context, shown[k], iso, i, _Where.month),
              ],
              if (showPh) ...[if (shown.isNotEmpty) const SizedBox(height: 2), _placeholder(context, active, key: _phKey)],
            ]),
          ),
        if (hidden > 0)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: TapRegion(
              groupId: ('more', iso),
              child: _focusable(
                _It('more:$iso', i, day: iso, activate: () => _more == iso ? _closeMore(refocus: false) : _openMore(iso)),
                label: s.calendarMoreLabel(hidden, dayText),
                expanded: _more == iso,
                onTap: () => _more == iso ? _closeMore(refocus: false) : _openMore(iso),
                builder: (context, focused, hovered) => Container(
                  constraints: const BoxConstraints(minHeight: 24),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  alignment: AlignmentDirectional.centerStart,
                  decoration: BoxDecoration(
                    color: hovered ? c.bgHover : null,
                    borderRadius: BorderRadius.circular(CmRadius.xs),
                    border: focused ? Border.all(color: c.borderStrong, width: 2) : null,
                  ),
                  child: Text(
                    s.calendarMore(hidden),
                    style: CmType.bodyXs.copyWith(fontWeight: FontWeight.w500, color: c.textDefault, decoration: hovered ? TextDecoration.underline : null),
                  ),
                ),
              ),
            ),
          ),
      ]);
      Widget box = Container(
        key: _dropKeys.putIfAbsent(i, GlobalKey.new),
        constraints: BoxConstraints(minHeight: widget.dayHeight),
        padding: const EdgeInsets.all(4),
        foregroundDecoration: over ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
        decoration: BoxDecoration(color: other ? c.bgPage : c.bgSurface, border: border),
        child: content,
      );
      if (ro) {
        final inner = box;
        box = _focusable(
          _It('cell:$iso', i, day: iso),
          label: s.calendarDayEvents(dayText, list.length),
          button: false,
          excludeSemantics: false,
          cursor: MouseCursor.defer,
          builder: (context, focused, _) => Container(
            foregroundDecoration: focused ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
            child: inner,
          ),
        );
      } else {
        box = Semantics(container: true, explicitChildNodes: true, label: dayText, child: box);
      }
      return OverlayPortal(
        controller: _pop(i),
        overlayChildBuilder: (ctx) => _popup(ctx, iso, i, col, cellW, list, dayText),
        child: CompositedTransformTarget(link: _link(i), child: _hover(iso, box)),
      );
    }

    final weeks = days.length ~/ 7;
    final table = Container(
      decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderSubtle)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        heads,
        for (var w = 0; w < weeks; w++)
          IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              for (var k = 0; k < 7; k++) Expanded(child: cell(days[w * 7 + k], w * 7 + k, k)),
            ]),
          ),
      ]),
    );
    final out = <Widget>[_grid(context, days, table)];
    if (!compact) return out;
    final iso = _iso(anchor);
    final list = byDay[iso] ?? const <_Ev>[];
    final i = days.indexWhere((d) => _iso(d) == iso);
    final dayText = _dayText(anchor);
    out.addAll([
      const SizedBox(height: CmSpace.s12),
      Row(children: [
        Expanded(
          child: Semantics(
            header: true,
            headingLevel: (widget.headingLevel.clamp(1, 6) + 1).clamp(1, 6),
            child: Text(dayText, style: CmType.headingSm.copyWith(color: c.textDefault)),
          ),
        ),
        if (!ro) ...[
          const SizedBox(width: CmSpace.s8),
          CmButton(label: s.calendarAdd, icon: CmIcons.plus, semanticLabel: s.calendarAddOn(dayText), onPressed: () => _add(anchor, true)),
        ],
      ]),
      const SizedBox(height: CmSpace.s8),
      if (list.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: CmSpace.s12),
          child: Text(s.calendarNoEvents, style: CmType.bodyMd.copyWith(color: c.textTertiary)),
        )
      else
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var k = 0; k < list.length; k++) ...[
            if (k > 0) const SizedBox(height: 4),
            _chip(context, list[k], iso, i, _Where.list, item: false),
          ],
        ]),
    ]);
    return out;
  }

  Widget _popup(BuildContext context, String iso, int i, int col, double cellW, List<_Ev> list, String dayText) {
    final c = CmTheme.colorsOf(context);
    final s = _s;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final start = rtl ? Alignment.topRight : Alignment.topLeft;
    final end = rtl ? Alignment.topLeft : Alignment.topRight;
    final anchor = col >= 4 ? end : start;
    final w = math.min(math.max(cellW, 240.0), MediaQuery.sizeOf(context).width * 0.8);
    _popKeys.clear();
    final close = _focusable(
      _It('pop:x:$iso', i, day: iso, item: false, pop: true, activate: () => _closeMore(refocus: true)),
      label: s.close,
      onTap: () => _closeMore(refocus: true),
      builder: (context, focused, hovered) => Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: hovered ? c.bgHover : null,
          borderRadius: BorderRadius.circular(CmRadius.sm),
          border: focused ? Border.all(color: c.borderStrong, width: 2) : null,
        ),
        child: CmIcon(CmIcons.close, size: 16, color: c.iconSelected),
      ),
    );
    final chips = [for (final ev in list) _chip(context, ev, iso, i, _Where.list, item: false, prefix: 'pop:')];
    return Stack(children: [
      CompositedTransformFollower(
        link: _link(i),
        showWhenUnlinked: false,
        targetAnchor: anchor,
        followerAnchor: anchor,
        child: TapRegion(
          groupId: ('more', iso),
          onTapOutside: (_) => _setMore(''),
          child: SizedBox(
            width: w,
            child: Semantics(
              container: true,
              explicitChildNodes: true,
              namesRoute: true,
              label: dayText,
              child: Container(
                padding: const EdgeInsets.all(CmSpace.s8),
                decoration: BoxDecoration(
                  color: c.bgSurface,
                  border: Border.all(color: c.borderSubtle),
                  borderRadius: BorderRadius.circular(CmRadius.md),
                  boxShadow: CmShadow.md,
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
                  Row(children: [
                    Expanded(child: ExcludeSemantics(child: Text(dayText, style: CmType.bodyMd.copyWith(fontWeight: FontWeight.w500, color: c.textDefault)))),
                    const SizedBox(width: CmSpace.s8),
                    close,
                  ]),
                  const SizedBox(height: CmSpace.s4),
                  for (var k = 0; k < chips.length; k++) ...[if (k > 0) const SizedBox(height: 4), chips[k]],
                ]),
              ),
            ),
          ),
        ),
      ),
    ]);
  }

  /// Side-by-side lanes for overlapping timed events in a day.
  Map<_Ev, ({int lane, int lanes})> _lanes(List<_Ev> list) {
    final out = <_Ev, ({int lane, int lanes})>{};
    final timed = list.where((e) => !e.allDay).toList()..sort((a, b) => a.min != b.min ? a.min - b.min : b.dur - a.dur);
    var cluster = <_Ev>[];
    var ends = <int>[];
    var clusterEnd = -1;
    void close() {
      for (final e in cluster) {
        out[e] = (lane: out[e]!.lane, lanes: ends.length);
      }
      cluster = [];
      ends = [];
    }

    for (final e in timed) {
      final int end = math.min(1440, e.min + math.max(e.dur, 20));
      if (e.min >= clusterEnd) {
        close();
        clusterEnd = -1;
      }
      var lane = ends.indexWhere((x) => x <= e.min);
      if (lane < 0) {
        lane = ends.length;
        ends.add(end);
      } else {
        ends[lane] = end;
      }
      out[e] = (lane: lane, lanes: 1);
      cluster.add(e);
      clusterEnd = math.max(clusterEnd, end);
    }
    close();
    return out;
  }

  List<Widget> _timeGrid(BuildContext context, List<DateTime> days, Map<String, List<_Ev>> byDay, double width) {
    final s = _s;
    final c = CmTheme.colorsOf(context);
    final today = _iso(_todayDate);
    final active = _activeEv;
    final target = _target;
    final ro = widget.readonly;
    final hh = widget.hourHeight;
    final axis = _narrow ? 44.0 : 56.0;
    final colW = math.max(0.0, (width - 2 - axis) / days.length);
    final dir = Directionality.of(context);
    final axisStyle = CmType.bodyXs.copyWith(color: c.textTertiary);
    final line = BorderSide(color: c.borderSubtle);
    final cols = [
      for (final d in days)
        () {
          final iso = _iso(d);
          final list = byDay[iso] ?? const <_Ev>[];
          return (d: d, iso: iso, text: _dayText(d), allDay: list.where((e) => e.allDay).toList(), timed: list.where((e) => !e.allDay).toList(), lanes: _lanes(list));
        }(),
    ];

    final heads = Row(children: [
      SizedBox(width: axis, child: Semantics(header: true, label: s.calendarTime, child: const SizedBox(height: 1))),
      for (final col in cols)
        Expanded(
          child: Semantics(
            label: col.text,
            excludeSemantics: true,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: CmSpace.s4),
              decoration: BoxDecoration(border: BorderDirectional(start: line)),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(s.calendarWeekdaysShort[_jsDay(col.d)], maxLines: 1, overflow: TextOverflow.clip, style: axisStyle),
                const SizedBox(height: 2),
                Container(
                  constraints: const BoxConstraints(minWidth: 28),
                  height: 28,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: col.iso == today ? c.actionPrimary : null, borderRadius: BorderRadius.circular(CmRadius.full)),
                  child: Text('${col.d.day}', style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, fontFeatures: _tabular, color: col.iso == today ? c.actionPrimaryText : c.textDefault)),
                ),
              ]),
            ),
          ),
        ),
    ]);

    final adRow = IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          width: axis,
          child: Padding(
            padding: const EdgeInsetsDirectional.only(end: CmSpace.s8, top: 4, bottom: 4),
            child: Align(alignment: AlignmentDirectional.centerEnd, child: Text(s.calendarAllDay, textAlign: TextAlign.end, style: axisStyle)),
          ),
        ),
        for (var i = 0; i < cols.length; i++)
          Expanded(
            child: () {
              final col = cols[i];
              final over = target?.iso == col.iso && active != null && active.allDay;
              return _hover(
                col.iso,
                Container(
                  key: _dropKeys.putIfAbsent(i, GlobalKey.new),
                  constraints: const BoxConstraints(minHeight: 36),
                  padding: const EdgeInsets.all(4),
                  foregroundDecoration: over ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
                  decoration: BoxDecoration(border: BorderDirectional(start: line)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
                    if (!ro)
                      Align(
                        alignment: AlignmentDirectional.centerEnd,
                        child: _addButton(context, _It('adadd:${col.iso}', i, row: 'a', day: col.iso, activate: () => _add(col.d, true)), s.calendarAddAllDay(col.text), size: 24),
                      ),
                    for (final ev in col.allDay) ...[const SizedBox(height: 2), _chip(context, ev, col.iso, i, _Where.allDay, row: 'a')],
                    if (over) ...[const SizedBox(height: 2), _placeholder(context, active, key: _phKey)],
                  ]),
                ),
              );
            }(),
          ),
      ]),
    );

    Widget column(int i) {
      final col = cols[i];
      final children = <Widget>[
        for (var h = 0; h < 24; h++)
          Positioned(
            top: h * hh,
            left: 0,
            right: 0,
            height: hh,
            child: DecoratedBox(decoration: BoxDecoration(border: Border(top: h > 0 ? line : BorderSide.none))),
          ),
      ];
      for (var h = 0; h < 24; h++) {
        if (!ro) {
          final it = _It('slot:${col.iso}:$h', i, row: '$h', day: col.iso, activate: () => _add(DateTime(col.d.year, col.d.month, col.d.day, h), false));
          children.add(Positioned(
            top: h * hh,
            left: 0,
            right: 0,
            height: hh,
            child: _focusable(
              it,
              label: s.calendarAddAt(_timeText(h * 60), col.text),
              onTapUp: (d) {
                // A pointer click starts at the step under the pointer; a key press at the hour.
                final within = (d.localPosition.dy / hh * 60 / _step).floor() * _step;
                _node(it.k).requestFocus();
                _add(DateTime(col.d.year, col.d.month, col.d.day, h, within.clamp(0, 59)), false);
              },
              builder: (context, focused, hovered) => Container(
                alignment: Alignment.center,
                decoration: BoxDecoration(color: hovered ? c.bgHover : null),
                foregroundDecoration: focused ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
                child: hovered || focused ? Text('+', style: CmType.bodyLg.copyWith(height: 1, color: c.iconSelected)) : null,
              ),
            ),
          ));
        }
        for (final ev in col.timed.where((e) => e.min ~/ 60 == h)) {
          final l = col.lanes[ev] ?? (lane: 0, lanes: 1);
          final len = math.min(ev.dur, 1440 - ev.min) / 60;
          children.add(Positioned.directional(
            textDirection: dir,
            start: l.lane * colW / l.lanes,
            width: math.max(0.0, colW / l.lanes - 2),
            top: ev.min / 60 * hh,
            height: math.max(24.0, len * hh - 1),
            child: _chip(context, ev, col.iso, i, _Where.time, row: '$h'),
          ));
        }
      }
      if (active != null && !active.allDay && target?.iso == col.iso && target!.min != null) {
        children.add(Positioned.directional(
          textDirection: dir,
          start: 0,
          end: 2,
          top: target.min! / 60 * hh,
          height: math.max(24.0, math.min(active.dur, 1440 - target.min!) / 60 * hh),
          child: _placeholder(context, active, key: _phKey, fill: true),
        ));
      }
      return Container(
        key: _colKeys.putIfAbsent(i, GlobalKey.new),
        height: 24 * hh,
        decoration: BoxDecoration(border: BorderDirectional(start: line)),
        child: Stack(clipBehavior: Clip.none, children: children),
      );
    }

    final body = Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      SizedBox(
        width: axis,
        height: 24 * hh,
        child: ExcludeSemantics(
          child: Stack(clipBehavior: Clip.none, children: [
            for (var h = 0; h < 24; h++)
              PositionedDirectional(
                top: h == 0 ? 0 : h * hh - 8,
                end: CmSpace.s8,
                start: 0,
                child: Text(_hourLabel(h), textAlign: TextAlign.end, maxLines: 1, style: axisStyle),
              ),
          ]),
        ),
      ),
      for (var i = 0; i < cols.length; i++) SizedBox(width: colW, child: column(i)),
    ]);

    final grid = Container(
      decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(CmRadius.md - 1),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: widget.timeHeight),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            Container(
              decoration: BoxDecoration(color: c.bgSurface, border: Border(bottom: line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [heads, adRow]),
            ),
            Flexible(
              child: SingleChildScrollView(
                key: _viewportKey,
                controller: _timeScroll,
                child: body,
              ),
            ),
          ]),
        ),
      ),
    );
    return [_grid(context, days, grid)];
  }
}

/// A place in the calendar that takes focus: a day, an hour, a button, an event.
class _Focusable extends StatefulWidget {
  const _Focusable({
    super.key,
    required this.owner,
    required this.it,
    required this.node,
    required this.builder,
    this.label,
    this.hint,
    this.button = true,
    this.selected,
    this.expanded,
    this.excludeSemantics = true,
    this.onSemanticTap,
    this.onTap,
    this.onTapUp,
    this.gestures,
    this.cursor = SystemMouseCursors.click,
    this.tapGroup,
  });
  final CmCalendarState owner;
  final _It it;
  final FocusNode node;
  final Widget Function(BuildContext context, bool focused, bool hovered) builder;
  final String? label, hint;
  final bool button, excludeSemantics;
  final bool? selected, expanded;
  final VoidCallback? onSemanticTap, onTap;
  final GestureTapUpCallback? onTapUp;
  final Map<Type, GestureRecognizerFactory>? gestures;
  final MouseCursor cursor;
  final Object? tapGroup;

  @override
  State<_Focusable> createState() => _FocusableState();
}

class _FocusableState extends State<_Focusable> {
  bool _focus = false, _hover = false;

  @override
  void initState() {
    super.initState();
    _mount(widget.it.k);
  }

  @override
  void didUpdateWidget(_Focusable old) {
    super.didUpdateWidget(old);
    if (old.it.k != widget.it.k) {
      _unmount(old.it.k);
      _mount(widget.it.k);
    }
  }

  @override
  void dispose() {
    _unmount(widget.it.k);
    super.dispose();
  }

  void _mount(String k) => widget.owner._live[k] = (widget.owner._live[k] ?? 0) + 1;
  void _unmount(String k) => widget.owner._live[k] = math.max(0, (widget.owner._live[k] ?? 1) - 1);

  @override
  Widget build(BuildContext context) {
    final owner = widget.owner;
    final it = widget.it;
    Widget child = widget.builder(context, _focus, _hover);
    if (widget.gestures != null) {
      child = RawGestureDetector(gestures: widget.gestures!, behavior: HitTestBehavior.opaque, child: child);
    } else if (widget.onTap != null || widget.onTapUp != null) {
      child = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTap == null
            ? null
            : () {
                widget.node.requestFocus();
                widget.onTap!();
              },
        onTapUp: widget.onTapUp,
        child: child,
      );
    }
    child = MouseRegion(
      cursor: widget.cursor,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: child,
    );
    return Focus(
      focusNode: widget.node,
      skipTraversal: it.item && owner._activeKey != it.k,
      includeSemantics: false,
      onKeyEvent: (_, e) => owner._onKey(it, e),
      onFocusChange: (f) {
        setState(() => _focus = f);
        owner._onFocusChange(it, f);
      },
      child: Semantics(
        container: true,
        explicitChildNodes: !widget.excludeSemantics,
        excludeSemantics: widget.excludeSemantics,
        button: widget.button,
        focusable: true,
        focused: _focus,
        selected: widget.selected,
        expanded: widget.expanded,
        label: widget.label,
        hint: widget.hint,
        onTap: widget.onSemanticTap,
        child: child,
      ),
    );
  }
}

/// The Month / Week / Day buttons: one pressed at a time.
class _ViewSwitch extends StatelessWidget {
  const _ViewSwitch({required this.selected, required this.labels, required this.onSelected});
  final CmCalendarView selected;
  final Map<CmCalendarView, String> labels;
  final ValueChanged<CmCalendarView> onSelected;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final h = cmButtonHeight(context, CmControlHeight.md);
    return Container(
      height: h,
      decoration: BoxDecoration(border: Border.all(color: c.borderInput), borderRadius: BorderRadius.circular(CmRadius.sm)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(CmRadius.sm - 1),
        child: Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final v in CmCalendarView.values) ...[
            if (v.index > 0) Container(width: 1, color: c.borderInput),
            _ViewButton(label: labels[v]!, pressed: v == selected, onPressed: () => onSelected(v)),
          ],
        ]),
      ),
    );
  }
}

class _ViewButton extends StatefulWidget {
  const _ViewButton({required this.label, required this.pressed, required this.onPressed});
  final String label;
  final bool pressed;
  final VoidCallback onPressed;

  @override
  State<_ViewButton> createState() => _ViewButtonState();
}

class _ViewButtonState extends State<_ViewButton> {
  bool _focus = false, _hover = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final p = widget.pressed;
    return Semantics(
      button: true,
      toggled: p,
      label: widget.label,
      excludeSemantics: true,
      onTap: widget.onPressed,
      child: Focus(
        includeSemantics: false,
        onFocusChange: (f) => setState(() => _focus = f),
        onKeyEvent: (_, e) {
          if (e is KeyDownEvent && (e.logicalKey == LogicalKeyboardKey.enter || e.logicalKey == LogicalKeyboardKey.space || e.logicalKey == LogicalKeyboardKey.numpadEnter)) {
            widget.onPressed();
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() => _hover = true),
          onExit: (_) => setState(() => _hover = false),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.onPressed,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: CmSpace.s12),
              alignment: Alignment.center,
              color: p ? c.actionPrimary : (_hover ? c.bgHover : c.bgSurface),
              foregroundDecoration: _focus ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2)) : null,
              child: Text(widget.label, style: CmType.bodyMd.copyWith(color: p ? c.actionPrimaryText : c.textDefault)),
            ),
          ),
        ),
      ),
    );
  }
}

/// The 12px spinner of an event being saved.
class _Spin extends StatelessWidget {
  const _Spin();

  @override
  Widget build(BuildContext context) => SizedBox.square(
        dimension: 12,
        child: CircularProgressIndicator(strokeWidth: 2, color: CmTheme.colorsOf(context).textDefault),
      );
}

class _Dashed extends CustomPainter {
  _Dashed({required this.color, required this.radius, required this.width});
  final Color color;
  final double radius, width;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)).deflate(width / 2);
    final path = dashPath(Path()..addRRect(rect), dashArray: CircularIntervalList<double>([5, 4]));
    canvas.drawPath(path, Paint()..style = PaintingStyle.stroke..strokeWidth = width..color = color);
  }

  @override
  bool shouldRepaint(_Dashed old) => old.color != color || old.radius != radius || old.width != width;
}
