import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// One tone and one icon per kind, kept everywhere (web docs: "keep one tone per kind").
const _kinds = {
  'Follow-up': (CmTone.attention, CmIcons.phone),
  'Demo': (CmTone.success, CmIcons.rocket),
  'Meeting': (CmTone.information, CmIcons.handshake),
  'Call': (CmTone.neutral, CmIcons.phone),
};

CmCalendarEvent _event(String id, String title, String kind, DateTime start, {DateTime? end, bool allDay = false, bool locked = false}) =>
    CmCalendarEvent(value: id, heading: title, kind: kind, tone: _kinds[kind]!.$1, icon: _kinds[kind]!.$2, start: start, end: end, allDay: allDay, locked: locked);

/// November 2026 around the 18th: calls, follow-ups, demos and meetings for a sales team.
List<CmCalendarEvent> outreachEvents() {
  DateTime d(int day, [int h = 0, int m = 0]) => DateTime(2026, 11, day, h, m);
  return [
    _event('e1', 'Call Ravi Stores', 'Follow-up', d(18, 15), end: d(18, 15, 30)),
    _event('e2', 'Demo for Asha Mart', 'Demo', d(19, 10), end: d(19, 11)),
    _event('e3', 'Retail expo, Bengaluru', 'Meeting', d(20), end: d(21), allDay: true),
    _event('e4', 'Pricing call: Kiran Foods', 'Call', d(18, 11), end: d(18, 11, 30)),
    _event('e5', 'Quarterly review', 'Meeting', d(18, 11, 15), end: d(18, 12, 15), locked: true),
    _event('e6', 'Follow up Meera Textiles', 'Follow-up', d(24, 9)),
    _event('e7', 'Demo for Rao Textiles', 'Demo', d(24, 11), end: d(24, 12)),
    _event('e8', 'Call Annapurna Foods', 'Call', d(24, 14)),
    _event('e9', 'Follow up Café Mocha', 'Follow-up', d(24, 16)),
    _event('e10', 'Onboarding call', 'Call', d(12, 10)),
    _event('e11', 'Demo for Sunrise Bakers', 'Demo', d(26, 15), end: d(26, 16)),
  ];
}

/// The calendar (web `cm-calendar`): an outreach planner in month, week and day views. Drag an event to another
/// day or time, or focus it, press Space, use the arrow keys and press Enter. Moves are "saved" after a short wait;
/// moves to a Sunday are refused, and "Fail the next save" shows a save that fails and goes back.
class CalendarPage extends StatefulWidget {
  const CalendarPage({super.key, this.now});

  /// Today for the calendar (tests pass a fixed date). Default: 18 November 2026, where the sample events are.
  final DateTime? now;

  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  late List<CmCalendarEvent> _events = outreachEvents();
  bool _loading = false;
  bool _failNext = false;
  int _added = 0;
  Timer? _load;

  DateTime get _today => widget.now ?? DateTime(2026, 11, 18);

  @override
  void dispose() {
    _load?.cancel();
    super.dispose();
  }

  /// "Loads" the events of each new range, as an app would from its API.
  void _onRange(CmCalendarRange r) {
    _load?.cancel();
    setState(() => _loading = true);
    _load = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _loading = false);
    });
  }

  FutureOr<bool?> _onMove(CmCalendarMove m) {
    if (m.to.start.weekday == DateTime.sunday) {
      showCmToast(context, 'No calls on Sundays');
      return false;
    }
    final fail = _failNext;
    _failNext = false;
    return Future<bool>.delayed(const Duration(milliseconds: 800), () {
      if (fail) return false;
      if (mounted) {
        setState(() => _events = [for (final e in _events) e.id == m.value ? e.copyWith(start: m.to.start, end: m.to.end) : e]);
      }
      return true;
    });
  }

  void _onAdd(CmCalendarAdd a) {
    final start = a.allDay ? DateTime(a.start.year, a.start.month, a.start.day, 10) : a.start;
    setState(() {
      _added++;
      _events = [..._events, _event('new$_added', 'New follow-up $_added', 'Follow-up', start)];
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return CmPage(
      header: const CmPageHeader(
        title: 'Outreach planner',
        breadcrumbs: [CmBreadcrumb('CRM')],
        description: 'Calls, follow-ups, demos and meetings by month, week or day',
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        CmCard(
          heading: 'Team calendar',
          description: 'Drag an event to another day or time, or Tab to it, press Space, use the arrow keys and press Enter. '
              'Moves to a Sunday are refused; each move is saved after a short wait.',
          actions: [
            CmButton(
              label: _failNext ? 'The next save fails' : 'Fail the next save',
              size: CmButtonSize.slim,
              onPressed: () => setState(() => _failNext = !_failNext),
            ),
          ],
          child: CmCalendar(
            label: 'Outreach planner',
            events: _events,
            date: _today,
            today: _today,
            loading: _loading,
            onRangeChange: _onRange,
            onMove: _onMove,
            onAdd: _onAdd,
            onOpen: (e) => showCmToast(context, 'Open ${e.heading}'),
          ),
        ),
        const SizedBox(height: CmSpace.s24),
        CmCard(
          heading: 'My day',
          description: 'The day view, moving in half hours (step 30). The quarterly review is locked: it opens but does not move.',
          child: CmCalendar(
            label: 'My day',
            view: CmCalendarView.day,
            step: 30,
            dayStart: 9,
            timeHeight: 480,
            events: _events,
            date: _today,
            today: _today,
            onMove: _onMove,
            onAdd: _onAdd,
            onOpen: (e) => showCmToast(context, 'Open ${e.heading}'),
          ),
        ),
        const SizedBox(height: CmSpace.s24),
        CmCard(
          heading: 'Read-only, on a phone',
          description: 'At 360 wide the month is a compact grid with a dot per event, and the chosen day is listed under it.',
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Container(
              width: 360,
              padding: const EdgeInsets.all(CmSpace.s16),
              decoration: BoxDecoration(border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
              child: CmCalendar(
                label: 'Team calendar, read-only',
                readonly: true,
                events: _events,
                date: _today,
                today: _today,
                onOpen: (e) => showCmToast(context, 'Open ${e.heading}'),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
