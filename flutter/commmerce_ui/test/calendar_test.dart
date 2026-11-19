import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'dart:ui' show SemanticsFlag;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

final today = DateTime(2026, 11, 18);

List<CmCalendarEvent> outreach() => [
      CmCalendarEvent(value: 'c1', heading: 'Call Ravi Stores', start: DateTime(2026, 11, 18, 15), end: DateTime(2026, 11, 18, 15, 30), kind: 'Follow-up', tone: CmTone.attention, icon: CmIcons.phone),
      CmCalendarEvent(value: 'd1', heading: 'Demo for Asha Mart', start: DateTime(2026, 11, 19, 10), end: DateTime(2026, 11, 19, 11), kind: 'Demo', tone: CmTone.success),
      CmCalendarEvent(value: 'f1', heading: 'Trade fair', start: DateTime(2026, 11, 20), end: DateTime(2026, 11, 21), allDay: true, kind: 'Event', tone: CmTone.information),
      for (var i = 0; i < 4; i++) CmCalendarEvent(value: 'b$i', heading: 'Busy $i', start: DateTime(2026, 11, 24, 9 + i), kind: 'Call'),
    ];

/// The calendar with its data in the test, as an app's state would hold it.
class Planner extends StatefulWidget {
  const Planner({
    super.key,
    this.events,
    this.view = CmCalendarView.month,
    this.width = 1000,
    this.readonly = false,
    this.controlled = false,
    this.apply = true,
    this.onMove,
    this.step = 15,
    this.use24,
    this.firstDayOfWeek,
    this.dayStart = 8,
  });
  final List<CmCalendarEvent>? events;
  final CmCalendarView view;
  final double width;
  final bool readonly, controlled, apply;
  final FutureOr<bool?> Function(CmCalendarMove m)? onMove;
  final int step;
  final bool? use24;
  final int? firstDayOfWeek;
  final int dayStart;
  @override
  State<Planner> createState() => PlannerState();
}

class PlannerState extends State<Planner> {
  final key = GlobalKey<CmCalendarState>();
  late List<CmCalendarEvent> events = widget.events ?? outreach();
  final moves = <CmCalendarMove>[];
  final adds = <CmCalendarAdd>[];
  final opened = <String>[];
  final ranges = <CmCalendarRange>[];
  late int dayStart = widget.dayStart;

  void setDayStart(int h) => setState(() => dayStart = h);

  void apply(CmCalendarMove m) => setState(() {
        events = [for (final e in events) e.id == m.value ? e.copyWith(start: m.to.start, end: m.to.end) : e];
      });

  @override
  Widget build(BuildContext context) => SizedBox(
        width: widget.width,
        child: CmCalendar(
          key: key,
          label: 'Outreach planner',
          events: events,
          view: widget.view,
          date: today,
          today: today,
          step: widget.step,
          readonly: widget.readonly,
          controlled: widget.controlled,
          use24HourFormat: widget.use24,
          firstDayOfWeek: widget.firstDayOfWeek,
          dayStart: dayStart,
          onAdd: adds.add,
          onOpen: (e) => opened.add(e.id),
          onRangeChange: ranges.add,
          onMove: (m) {
            moves.add(m);
            if (widget.onMove != null) return widget.onMove!(m);
            if (widget.controlled && widget.apply) apply(m);
            return true;
          },
        ),
      );
}

Widget app(Widget child, {TextDirection dir = TextDirection.ltr, ThemeData? theme, CmStrings? strings}) {
  final home = Directionality(textDirection: dir, child: Scaffold(body: Align(alignment: Alignment.topLeft, child: child)));
  return MaterialApp(theme: theme ?? CmTheme.light(), home: strings == null ? home : CmLocalizations(strings: strings, child: home));
}

Future<PlannerState> pumpPlanner(WidgetTester t, Planner p, {TextDirection dir = TextDirection.ltr, ThemeData? theme, CmStrings? strings, TargetPlatform? platform}) async {
  t.view.physicalSize = const Size(1200, 1400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(app(p, dir: dir, theme: (theme ?? CmTheme.light()).copyWith(platform: platform), strings: strings));
  await t.pump();
  return t.state<PlannerState>(find.byType(Planner));
}

String? focused() => FocusManager.instance.primaryFocus?.debugLabel?.replaceFirst('CmCalendar ', '');

Future<void> key(WidgetTester t, LogicalKeyboardKey k) async {
  await t.sendKeyEvent(k);
  await t.pump();
}

Finder chip(String title) => find.textContaining(title, findRichText: true);

void main() {
  group('month view', () {
    testWidgets('a grid of weeks from the first day of the week; the range label, today and one range change', (t) async {
      final p = await pumpPlanner(t, const Planner());
      expect(find.text('November 2026'), findsOneWidget);
      expect(p.ranges, [CmCalendarRange(CmCalendarView.month, DateTime(2026, 11, 1), DateTime(2026, 12, 5))]);
      // Sunday first (en_US); 35 days from 1 November to 5 December.
      expect(find.text('Sun'), findsOneWidget);
      expect(find.text('5'), findsNWidgets(2)); // 5 November and 5 December
      await t.pump();
      expect(p.ranges, hasLength(1), reason: 'fires once, not on every build');
      final cal = p.key.currentState!;
      expect(cal.range.start, DateTime(2026, 11, 1));
    });

    testWidgets('firstDayOfWeek starts the weeks on Monday', (t) async {
      final p = await pumpPlanner(t, const Planner(firstDayOfWeek: 1));
      expect(p.ranges.single.start, DateTime(2026, 10, 26));
      expect(p.ranges.single.end, DateTime(2026, 12, 6));
    });

    testWidgets('events are chips with a full accessible name and the kind, or the icon, as text', (t) async {
      final h = t.ensureSemantics();
      await pumpPlanner(t, const Planner());
      expect(find.bySemanticsLabel('Call Ravi Stores, Wednesday 18 November, 3:00 to 3:30 pm, Follow-up'), findsOneWidget);
      expect(find.bySemanticsLabel('Trade fair, Friday 20 November to Saturday 21 November, all day, Event'), findsNWidgets(2));
      expect(find.bySemanticsLabel('Demo for Asha Mart, Thursday 19 November, 10:00 to 11:00 am, Demo'), findsOneWidget);
      // Month chips show the icon instead of the kind; the demo has no icon, so its kind shows.
      expect(chip('Follow-up'), findsNothing);
      expect(chip('Demo for Asha Mart'), findsOneWidget);
      expect(find.textContaining('10:00 am', findRichText: true), findsNWidgets(2)); // the demo and Busy 1
      final node = t.getSemantics(find.bySemanticsLabel(RegExp('^Call Ravi Stores')));
      expect(node.hint, contains('movable event'));
      expect(node.hint, contains('Press Space to pick up'));
      h.dispose();
    });

    testWidgets('a day with more than maxEvents shows "+N more", which lists the whole day; Escape closes it', (t) async {
      final h = t.ensureSemantics();
      await pumpPlanner(t, const Planner());
      expect(find.text('+2 more'), findsOneWidget);
      expect(chip('Busy 2'), findsNothing);
      expect(find.bySemanticsLabel('2 more on Tuesday 24 November'), findsOneWidget);
      await t.tap(find.text('+2 more'));
      await t.pump();
      await t.pump();
      for (var i = 0; i < 4; i++) {
        expect(chip('Busy $i'), findsWidgets);
      }
      expect(focused(), 'pop:ev:b0:2026-11-24');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'pop:ev:b1:2026-11-24');
      await key(t, LogicalKeyboardKey.escape);
      await t.pump();
      expect(chip('Busy 3'), findsNothing);
      expect(focused(), 'more:2026-11-24');
      h.dispose();
    });

    testWidgets('one Tab stop; arrow keys move between days and events (Down past the last item goes a week on)', (t) async {
      await pumpPlanner(t, const Planner());
      await key(t, LogicalKeyboardKey.tab);
      // Header buttons first, then the grid's one stop: the chosen day's "+".
      for (var i = 0; i < 8 && focused() != 'add:2026-11-18'; i++) {
        await key(t, LogicalKeyboardKey.tab);
      }
      expect(focused(), 'add:2026-11-18');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'ev:c1:2026-11-18');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'add:2026-11-25');
      await key(t, LogicalKeyboardKey.arrowLeft);
      expect(focused(), 'add:2026-11-24');
      await key(t, LogicalKeyboardKey.home);
      expect(focused(), 'add:2026-11-22');
      await key(t, LogicalKeyboardKey.end);
      expect(focused(), 'add:2026-11-28');
      // Tab leaves the grid: the next stop is outside the calendar.
      await key(t, LogicalKeyboardKey.tab);
      expect(focused()?.startsWith('add:'), isNot(true));
    });

    testWidgets('Page Down shows the next month with focus on the same day', (t) async {
      final p = await pumpPlanner(t, const Planner());
      p.key.currentState!.pickUp('c1');
      await t.pump();
      await key(t, LogicalKeyboardKey.escape);
      expect(focused(), 'ev:c1:2026-11-18');
      await key(t, LogicalKeyboardKey.arrowUp);
      expect(focused(), 'add:2026-11-18');
      await key(t, LogicalKeyboardKey.pageDown);
      await t.pump();
      expect(find.text('December 2026'), findsOneWidget);
      expect(focused(), 'add:2026-12-18');
    });
  });

  group('header and range', () {
    testWidgets('Previous, Today and Next change the range; each new range is reported once', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner());
      await t.tap(find.bySemanticsLabel('Next month'));
      await t.pump();
      await t.pump();
      expect(find.text('December 2026'), findsOneWidget);
      await t.tap(find.bySemanticsLabel('Previous month'));
      await t.tap(find.bySemanticsLabel('Previous month'));
      await t.pump();
      await t.pump();
      expect(find.text('October 2026'), findsOneWidget);
      await t.tap(find.text('Today'));
      await t.pump();
      await t.pump();
      expect(find.text('November 2026'), findsOneWidget);
      expect(p.ranges.map((r) => r.start.month).toList(), [11, 11, 9, 11]);
      await t.tap(find.text('Week'));
      await t.pump();
      await t.pump();
      expect(p.ranges.last, CmCalendarRange(CmCalendarView.week, DateTime(2026, 11, 15), DateTime(2026, 11, 21)));
      expect(find.text('15–21 Nov 2026'), findsOneWidget);
      expect(t.getSemantics(find.bySemanticsLabel('Week')).hasFlag(SemanticsFlag.isToggled), isTrue);
      h.dispose();
    });

    testWidgets('loading: a spinner by the range and "Loading events" announced', (t) async {
      final h = t.ensureSemantics();
      t.view.physicalSize = const Size(1200, 1400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(app(SizedBox(width: 900, child: CmCalendar(date: today, today: today, loading: true))));
      await t.pump();
      expect(find.byType(CmSpinner), findsOneWidget);
      expect(find.bySemanticsLabel('Loading events'), findsOneWidget);
      h.dispose();
    });
  });

  group('week and day views', () {
    testWidgets('week: seven columns, an all-day row and 24 hours; a timed chip sits at its time; opens at day-start', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      expect(p.ranges.single, CmCalendarRange(CmCalendarView.week, DateTime(2026, 11, 15), DateTime(2026, 11, 21)));
      expect(find.text('All day'), findsOneWidget);
      expect(find.text('3 pm'), findsOneWidget);
      final scroll = find.byType(SingleChildScrollView).last;
      expect(t.widget<SingleChildScrollView>(scroll).controller!.offset, 8 * 48);
      // 15:00 to 15:30: 15 hours down the column, half an hour tall.
      final c = t.getRect(chip('Call Ravi Stores').first);
      final demo = t.getRect(chip('Demo for Asha Mart').first);
      expect(demo.left, greaterThan(c.left), reason: 'Thursday is right of Wednesday');
      final top = t.getTopLeft(find.ancestor(of: chip('Call Ravi Stores').first, matching: find.byType(Positioned)).first);
      final dTop = t.getTopLeft(find.ancestor(of: chip('Demo for Asha Mart').first, matching: find.byType(Positioned)).first);
      expect(top.dy - dTop.dy, 5 * 48);
      final size = t.getSize(find.ancestor(of: chip('Call Ravi Stores').first, matching: find.byType(Positioned)).first);
      expect(size.height, 24);
      expect(chip('Trade fair'), findsNWidgets(2));
    });

    testWidgets('overlapping events share the hour side by side', (t) async {
      await pumpPlanner(
        t,
        Planner(view: CmCalendarView.day, events: [
          CmCalendarEvent(value: 'a', heading: 'First', start: DateTime(2026, 11, 18, 9), end: DateTime(2026, 11, 18, 10)),
          CmCalendarEvent(value: 'b', heading: 'Second', start: DateTime(2026, 11, 18, 9, 30), end: DateTime(2026, 11, 18, 10, 30)),
        ]),
      );
      Rect r(String s) => t.getRect(find.ancestor(of: chip(s), matching: find.byType(Positioned)).first);
      expect(r('First').width, closeTo(r('Second').width, 0.01));
      expect(r('Second').left, greaterThan(r('First').left));
      expect(r('First').width, lessThan(500));
    });

    testWidgets('day: one column, Previous and Next move a day', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.day));
      expect(find.text('Wednesday 18 November 2026'), findsOneWidget);
      await t.tap(find.bySemanticsLabel('Next day'));
      await t.pump();
      await t.pump();
      expect(find.text('Thursday 19 November 2026'), findsOneWidget);
      expect(p.ranges.last, CmCalendarRange(CmCalendarView.day, DateTime(2026, 11, 19), DateTime(2026, 11, 19)));
      h.dispose();
    });

    testWidgets('keyboard in the time grid: Down and Up through the hours, Left and Right to the same hour', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      p.key.currentState!;
      for (var i = 0; i < 10 && focused() != 'slot:2026-11-18:8'; i++) {
        await key(t, LogicalKeyboardKey.tab);
      }
      expect(focused(), 'slot:2026-11-18:8');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'slot:2026-11-18:9');
      await key(t, LogicalKeyboardKey.arrowRight);
      expect(focused(), 'slot:2026-11-19:9');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'slot:2026-11-19:10');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'ev:d1:2026-11-19', reason: 'the event at 10:00 comes after its hour');
      await key(t, LogicalKeyboardKey.home);
      expect(focused(), 'slot:2026-11-15:10');
    });
  });

  group('adding', () {
    testWidgets('"+" on a day, the all-day row and an hour call onAdd, by pointer and keyboard', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner());
      await t.tap(find.bySemanticsLabel('Add on Wednesday 18 November'));
      expect(p.adds.single.start, DateTime(2026, 11, 18));
      expect(p.adds.single.allDay, isTrue);
      expect(p.adds.single.view, CmCalendarView.month);
      await key(t, LogicalKeyboardKey.enter);
      expect(p.adds, hasLength(2));
      p.key.currentState!.setView(CmCalendarView.week);
      await t.pump();
      await t.pump();
      await t.tap(find.bySemanticsLabel('Add an all-day event on Thursday 19 November'));
      expect(p.adds.last.allDay, isTrue);
      expect(p.adds.last.start, DateTime(2026, 11, 19));
      // An hour: a click starts at the step under the pointer.
      final slot = find.bySemanticsLabel('Add at 9:00 am, Thursday 19 November');
      await t.tapAt(t.getTopLeft(slot) + const Offset(10, 36));
      expect(p.adds.last.allDay, isFalse);
      expect(p.adds.last.start, DateTime(2026, 11, 19, 9, 45));
      await key(t, LogicalKeyboardKey.space);
      expect(p.adds.last.start, DateTime(2026, 11, 19, 9));
      h.dispose();
    });

    testWidgets('readonly: no "+" and no moving; events still open', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner(readonly: true));
      expect(find.bySemanticsLabel(RegExp('^Add on')), findsNothing);
      expect(p.key.currentState!.pickUp('c1'), isFalse);
      await t.tap(chip('Call Ravi Stores'));
      expect(p.opened, ['c1']);
      expect(find.bySemanticsLabel('Wednesday 18 November, 1 event'), findsOneWidget);
      h.dispose();
    });
  });

  group('moving with the keyboard', () {
    testWidgets('month: Space picks up, arrows choose a day (Down = a week on), Enter drops; every step announced', (t) async {
      final p = await pumpPlanner(t, const Planner());
      final cal = p.key.currentState!;
      await t.tap(chip('Call Ravi Stores'));
      await t.pump();
      expect(p.opened, ['c1']);
      expect(focused(), 'ev:c1:2026-11-18');
      await key(t, LogicalKeyboardKey.space);
      expect(cal.heldEvent, 'c1');
      expect(cal.announcement, 'Picked up Call Ravi Stores. Wednesday 18 November.');
      await key(t, LogicalKeyboardKey.arrowRight);
      expect(cal.announcement, 'Thursday 19 November.');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(cal.announcement, 'Thursday 26 November.');
      expect(find.text('Call Ravi Stores'), findsOneWidget, reason: 'the placeholder on the target day');
      await key(t, LogicalKeyboardKey.enter);
      await t.pump();
      expect(p.moves.single.to, CmCalendarTimes(DateTime(2026, 11, 26, 15), DateTime(2026, 11, 26, 15, 30)));
      expect(p.moves.single.from.start, DateTime(2026, 11, 18, 15));
      expect(p.moves.single.source, CmCalendarMoveSource.keyboard);
      expect(cal.announcement, 'Moved Call Ravi Stores to Thursday 26 November, 3:00 to 3:30 pm.');
      expect(cal.heldEvent, isNull);
      expect(focused(), 'ev:c1:2026-11-26', reason: 'focus follows the event');
      expect(p.opened, ['c1'], reason: 'Enter while held drops, it does not open');
    });

    testWidgets('week: Up and Down by the step, Page Down an hour, Left and Right by a day', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      final cal = p.key.currentState!;
      expect(cal.pickUp('c1'), isTrue);
      await t.pump();
      expect(focused(), 'ev:c1:2026-11-18');
      expect(cal.announcement, 'Picked up Call Ravi Stores. Wednesday 18 November, 3:00 to 3:30 pm.');
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(cal.announcement, 'Wednesday 18 November, 3:15 to 3:45 pm.');
      await key(t, LogicalKeyboardKey.pageDown);
      expect(cal.announcement, 'Wednesday 18 November, 4:15 to 4:45 pm.');
      await key(t, LogicalKeyboardKey.arrowRight);
      expect(cal.announcement, 'Thursday 19 November, 4:15 to 4:45 pm.');
      await key(t, LogicalKeyboardKey.space);
      expect(p.moves.single.to.start, DateTime(2026, 11, 19, 16, 15));
    });

    testWidgets('an all-day event in the week view moves between days in the all-day row', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      final cal = p.key.currentState!;
      expect(cal.pickUp('f1', DateTime(2026, 11, 21)), isTrue);
      await t.pump();
      expect(cal.announcement, 'Picked up Trade fair. Saturday 21 November.');
      await key(t, LogicalKeyboardKey.arrowLeft);
      await key(t, LogicalKeyboardKey.arrowLeft);
      expect(cal.announcement, 'Thursday 19 November.');
      await key(t, LogicalKeyboardKey.enter);
      expect(p.moves.single.to, CmCalendarTimes(DateTime(2026, 11, 18), DateTime(2026, 11, 19)));
      expect(p.moves.single.allDay, isTrue);
      expect(cal.announcement, 'Moved Trade fair to Wednesday 18 November.');
    });

    testWidgets('Escape cancels (announced, focus stays); dropping where it started calls nothing', (t) async {
      final p = await pumpPlanner(t, const Planner());
      final cal = p.key.currentState!;
      cal.pickUp('c1');
      await t.pump();
      await key(t, LogicalKeyboardKey.arrowRight);
      await key(t, LogicalKeyboardKey.escape);
      expect(cal.announcement, 'Move cancelled. Call Ravi Stores is back on Wednesday 18 November.');
      expect(cal.heldEvent, isNull);
      expect(focused(), 'ev:c1:2026-11-18');
      await key(t, LogicalKeyboardKey.space);
      await key(t, LogicalKeyboardKey.space);
      expect(cal.announcement, 'Call Ravi Stores dropped where it started.');
      expect(p.moves, isEmpty);
    });

    testWidgets('focus leaving the held event cancels the move', (t) async {
      final p = await pumpPlanner(t, const Planner());
      final cal = p.key.currentState!;
      cal.pickUp('c1');
      await t.pump();
      await key(t, LogicalKeyboardKey.arrowRight);
      await t.tap(find.text('Week'));
      await t.pump();
      await t.pump();
      expect(cal.heldEvent, isNull);
      expect(p.moves, isEmpty);
    });

    testWidgets('an event in the "+N more" list can be picked up: the list closes and it moves from its day', (t) async {
      final p = await pumpPlanner(t, const Planner());
      final cal = p.key.currentState!;
      await t.tap(find.text('+2 more'));
      await t.pump();
      await t.pump();
      await key(t, LogicalKeyboardKey.arrowDown);
      await key(t, LogicalKeyboardKey.arrowDown);
      await key(t, LogicalKeyboardKey.arrowDown);
      expect(focused(), 'pop:ev:b3:2026-11-24');
      await key(t, LogicalKeyboardKey.space);
      await t.pump();
      expect(cal.heldEvent, 'b3');
      expect(focused(), 'ev:b3:2026-11-24', reason: 'shown in its day while it moves');
      await key(t, LogicalKeyboardKey.arrowRight);
      await key(t, LogicalKeyboardKey.enter);
      expect(p.moves.single.to.start, DateTime(2026, 11, 25, 12));
    });

    testWidgets('locked events can be opened but not picked up or dragged', (t) async {
      final p = await pumpPlanner(t, Planner(events: [CmCalendarEvent(value: 'l', heading: 'Board review', start: DateTime(2026, 11, 18, 11), locked: true)]));
      expect(p.key.currentState!.pickUp('l'), isFalse);
      final g = await t.startGesture(t.getCenter(chip('Board review')), kind: PointerDeviceKind.mouse);
      await g.moveBy(const Offset(150, 0));
      await t.pump();
      await g.up();
      await t.pump();
      expect(p.moves, isEmpty);
    });
  });

  group('the app decides', () {
    testWidgets('returning false keeps the event where it was and says so', (t) async {
      final p = await pumpPlanner(t, Planner(onMove: (_) => false));
      final cal = p.key.currentState!;
      expect(cal.moveEvent('c1', DateTime(2026, 11, 19, 15)), isFalse);
      await t.pump();
      expect(cal.announcement, "Call Ravi Stores can't be moved to Thursday 19 November, 3:00 to 3:30 pm.");
      expect(p.moves.single.source, CmCalendarMoveSource.api);
    });

    testWidgets('a future: "Saving" while it runs and no second move; a failed save goes back and says so', (t) async {
      final h = t.ensureSemantics();
      final save = Completer<bool>();
      final p = await pumpPlanner(t, Planner(view: CmCalendarView.week, onMove: (_) => save.future));
      final cal = p.key.currentState!;
      expect(cal.moveEvent('c1', DateTime(2026, 11, 19, 15)), isTrue);
      await t.pump();
      expect(find.bySemanticsLabel(RegExp(r'^Call Ravi Stores, Thursday 19 November, 3:00 to 3:30 pm, Follow-up, Saving$')), findsOneWidget);
      expect(cal.pickUp('c1'), isFalse);
      save.complete(false);
      await t.pump();
      await t.pump();
      expect(cal.announcement, "Couldn't move Call Ravi Stores. It is back on Wednesday 18 November, 3:00 to 3:30 pm.");
      expect(find.bySemanticsLabel(RegExp(r'^Call Ravi Stores, Wednesday 18 November')), findsOneWidget);
      h.dispose();
    });

    testWidgets('a resolved save keeps the move; revert() after that does nothing; revert() before puts it back', (t) async {
      final save = Completer<bool>();
      final p = await pumpPlanner(t, Planner(onMove: (m) => m.value == 'c1' ? save.future : Completer<bool>().future));
      final cal = p.key.currentState!;
      cal.moveEvent('c1', DateTime(2026, 11, 19, 15));
      await t.pump();
      save.complete(true);
      await t.pump();
      await t.pump();
      expect(cal.revert('c1'), isFalse);
      cal.moveEvent('d1', DateTime(2026, 11, 20, 10));
      await t.pump();
      expect(cal.revert('d1'), isTrue);
      await t.pump();
      expect(cal.announcement, "Couldn't move Demo for Asha Mart. It is back on Thursday 19 November, 10:00 to 11:00 am.");
    });

    testWidgets('without a new list the calendar shows the move; controlled waits for the app', (t) async {
      final h = t.ensureSemantics();
      var p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      p.key.currentState!.moveEvent('c1', DateTime(2026, 11, 19, 15));
      await t.pump();
      expect(find.bySemanticsLabel(RegExp('^Call Ravi Stores, Thursday 19 November')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
      p = await pumpPlanner(t, const Planner(view: CmCalendarView.week, controlled: true, apply: false));
      p.key.currentState!.moveEvent('c1', DateTime(2026, 11, 19, 15));
      await t.pump();
      expect(p.moves, hasLength(1));
      expect(find.bySemanticsLabel(RegExp('^Call Ravi Stores, Wednesday 18 November')), findsOneWidget);
      p.apply(p.moves.single);
      await t.pump();
      expect(find.bySemanticsLabel(RegExp('^Call Ravi Stores, Thursday 19 November')), findsOneWidget);
      h.dispose();
    });
  });

  group('pointer drag', () {
    testWidgets('month: a mouse drag shows the target day and drops there; the click after it does not open', (t) async {
      final p = await pumpPlanner(t, const Planner(), platform: TargetPlatform.macOS);
      final cal = p.key.currentState!;
      final from = t.getCenter(chip('Call Ravi Stores'));
      final g = await t.startGesture(from, kind: PointerDeviceKind.mouse);
      await g.moveBy(const Offset(10, 0));
      await t.pump();
      expect(cal.dragging, isTrue);
      expect(cal.announcement, 'Picked up Call Ravi Stores. Wednesday 18 November.');
      final cellW = (1000 - 2) / 7;
      await g.moveBy(Offset(cellW, 0));
      await t.pump();
      expect(cal.announcement, 'Thursday 19 November.');
      await g.up();
      await t.pump();
      expect(cal.dragging, isFalse);
      expect(p.moves.single.to.start, DateTime(2026, 11, 19, 15));
      expect(p.moves.single.source, CmCalendarMoveSource.pointer);
      expect(p.opened, isEmpty);
    });

    testWidgets('week: drops at the time under the pointer, snapped to the step; Escape cancels a drag', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week), platform: TargetPlatform.macOS);
      final cal = p.key.currentState!;
      final from = t.getTopLeft(chip('Call Ravi Stores')) + const Offset(10, 4);
      var g = await t.startGesture(from, kind: PointerDeviceKind.mouse);
      await g.moveBy(const Offset(0, 10));
      await t.pump();
      await g.moveBy(const Offset(0, 48 - 10 + 3)); // an hour and a bit later in all: snaps to 16:00
      await t.pump();
      await g.up();
      await t.pump();
      expect(p.moves.single.to.start, DateTime(2026, 11, 18, 16));
      g = await t.startGesture(t.getTopLeft(chip('Demo for Asha Mart')) + const Offset(10, 4), kind: PointerDeviceKind.mouse);
      await g.moveBy(const Offset(0, 40));
      await t.pump();
      expect(cal.dragging, isTrue);
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pump();
      expect(cal.dragging, isFalse);
      expect(cal.announcement, 'Move cancelled. Demo for Asha Mart is back on Thursday 19 November, 10:00 to 11:00 am.');
      await g.up();
      await t.pump();
      expect(p.moves, hasLength(1));
    });

    testWidgets('touch: press and hold picks up; a quick swipe does not', (t) async {
      final p = await pumpPlanner(t, const Planner());
      final cal = p.key.currentState!;
      final from = t.getCenter(chip('Call Ravi Stores'));
      var g = await t.startGesture(from);
      await g.moveBy(const Offset(60, 0));
      await t.pump(const Duration(milliseconds: 400));
      expect(cal.dragging, isFalse);
      await g.up();
      await t.pump();
      g = await t.startGesture(from);
      await t.pump(const Duration(milliseconds: 400));
      expect(cal.dragging, isTrue);
      await g.moveBy(Offset((1000 - 2) / 7, 0));
      await t.pump();
      await g.up();
      await t.pump();
      expect(p.moves.single.to.start, DateTime(2026, 11, 19, 15));
    });
  });

  group('narrow and RTL', () {
    testWidgets('narrow month: day buttons with dots, the chosen day listed under the grid; fits 320', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner(width: 320));
      expect(t.takeException(), isNull);
      expect(find.bySemanticsLabel('Wednesday 18 November, 1 event'), findsOneWidget);
      expect(find.bySemanticsLabel('Tuesday 24 November, 4 events'), findsOneWidget);
      expect(find.text('Wednesday 18 November'), findsOneWidget);
      expect(chip('Call Ravi Stores'), findsOneWidget);
      await t.tap(find.bySemanticsLabel('Thursday 19 November, 1 event'));
      await t.pump();
      await t.pump();
      expect(chip('Demo for Asha Mart'), findsOneWidget);
      expect(chip('Call Ravi Stores'), findsNothing);
      await t.tap(find.bySemanticsLabel('Add on Thursday 19 November'));
      expect(p.adds.single.start, DateTime(2026, 11, 19));
      await t.tap(find.bySemanticsLabel('Friday 27 November, 0 events'));
      await t.pump();
      expect(find.text('No events'), findsOneWidget);
      h.dispose();
    });

    testWidgets('narrow week: three days from the date; Previous and Next move three days', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(t, const Planner(width: 320, view: CmCalendarView.week));
      expect(t.takeException(), isNull);
      expect(p.ranges.single, CmCalendarRange(CmCalendarView.week, DateTime(2026, 11, 18), DateTime(2026, 11, 20)));
      await t.tap(find.bySemanticsLabel('Next 3 days'));
      await t.pump();
      await t.pump();
      expect(p.ranges.last.start, DateTime(2026, 11, 21));
      h.dispose();
    });

    testWidgets('the range is reported again when the width crosses 600', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week, width: 800));
      expect(p.ranges.single.start, DateTime(2026, 11, 15));
      await t.pumpWidget(app(const Planner(view: CmCalendarView.week, width: 400)));
      await t.pump();
      expect(p.ranges.last, CmCalendarRange(CmCalendarView.week, DateTime(2026, 11, 18), DateTime(2026, 11, 20)));
    });

    testWidgets('RTL: days run right to left; Left and Right follow the reading direction', (t) async {
      final p = await pumpPlanner(t, const Planner(), dir: TextDirection.rtl);
      final cal = p.key.currentState!;
      expect(t.getCenter(chip('Demo for Asha Mart')).dx, lessThan(t.getCenter(chip('Call Ravi Stores')).dx));
      cal.pickUp('c1');
      await t.pump();
      await key(t, LogicalKeyboardKey.arrowLeft);
      expect(cal.announcement, 'Thursday 19 November.');
      await key(t, LogicalKeyboardKey.escape);
      await key(t, LogicalKeyboardKey.arrowUp);
      expect(focused(), 'add:2026-11-18');
      await key(t, LogicalKeyboardKey.arrowLeft);
      expect(focused(), 'add:2026-11-19');
    });
  });

  group('built-in text and themes', () {
    testWidgets('every string comes from CmStrings and can be replaced', (t) async {
      final h = t.ensureSemantics();
      final p = await pumpPlanner(
        t,
        const Planner(),
        strings: CmStrings(
          calendarToday: "Aujourd'hui",
          calendarMonth: 'Mois',
          calendarNextMonth: 'Mois suivant',
          calendarMonths: const ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
          calendarWeekdays: const ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
          calendarMore: (n) => '+$n de plus',
          calendarPickedUp: (e, place) => '$e pris. $place.',
          calendarDate: (w, d, m) => '$w $d $m',
        ),
      );
      expect(find.text("Aujourd'hui"), findsOneWidget);
      expect(find.text('Mois'), findsOneWidget);
      expect(find.text('novembre 2026'), findsOneWidget);
      expect(find.text('+2 de plus'), findsOneWidget);
      expect(find.bySemanticsLabel('Mois suivant'), findsOneWidget);
      p.key.currentState!.pickUp('c1');
      await t.pump();
      expect(p.key.currentState!.announcement, 'Call Ravi Stores pris. mercredi 18 novembre.');
      h.dispose();
    });

    testWidgets('12- or 24-hour clock', (t) async {
      final h = t.ensureSemantics();
      await pumpPlanner(t, const Planner(view: CmCalendarView.day, use24: true));
      expect(find.text('15:00'), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('^Call Ravi Stores, Wednesday 18 November, 15:00 to 15:30')), findsOneWidget);
      await t.pumpWidget(const SizedBox());
      await pumpPlanner(t, const Planner(view: CmCalendarView.day, use24: false));
      expect(find.text('3 pm'), findsOneWidget);
      expect(find.textContaining('3:00 pm', findRichText: true), findsOneWidget);
      h.dispose();
    });

    testWidgets('dark theme and every view build without errors', (t) async {
      for (final v in CmCalendarView.values) {
        await t.pumpWidget(const SizedBox());
        await pumpPlanner(t, Planner(view: v), theme: CmTheme.dark());
        expect(t.takeException(), isNull);
      }
    });
  });

  group('day start (issue #34)', () {
    testWidgets('changing dayStart after render scrolls again; scrollToHour scrolls on demand', (t) async {
      final p = await pumpPlanner(t, const Planner(view: CmCalendarView.week));
      ScrollController ctl() => t.widget<SingleChildScrollView>(find.byType(SingleChildScrollView).last).controller!;
      expect(ctl().offset, 8 * 48);
      p.setDayStart(10);
      await t.pump();
      await t.pump();
      expect(ctl().offset, 10 * 48);
      p.key.currentState!.scrollToHour(6);
      expect(ctl().offset, 6 * 48);
      p.key.currentState!.setView(CmCalendarView.month);
      await t.pump();
      p.key.currentState!.scrollToHour(3);
      p.key.currentState!.setView(CmCalendarView.day);
      await t.pump();
      await t.pump();
      expect(ctl().offset, 10 * 48, reason: 'coming back to a time view opens at day start');
    });
  });
}
