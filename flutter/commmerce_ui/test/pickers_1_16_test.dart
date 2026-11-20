import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Scaffold(body: Align(alignment: Alignment.topLeft, child: Padding(padding: const EdgeInsets.all(20), child: SizedBox(width: 400, child: child)))),
    );

void wide(WidgetTester t, [Size size = const Size(1280, 900)]) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

TimeOfDay hm(int h, int m) => TimeOfDay(hour: h, minute: m);

/// A time picker whose value lives in the test.
class TimeHarness {
  TimeOfDay? value;
  final changes = <TimeOfDay?>[];
  Widget build({
    String label = 'Pickup time',
    TimeOfDay? min,
    TimeOfDay? max,
    int step = 1,
    int? interval,
    CmHourCycle? hourCycle = CmHourCycle.h23,
    bool required = false,
    CmFieldSize size = CmFieldSize.standard,
    ThemeData? theme,
  }) =>
      app(
        StatefulBuilder(
          builder: (c, set) => Column(children: [
            CmTimePicker(
              label: label,
              value: value,
              min: min,
              max: max,
              step: step,
              interval: interval,
              hourCycle: hourCycle,
              required: required,
              size: size,
              onChanged: (v) => set(() {
                value = v;
                changes.add(v);
              }),
            ),
            const TextField(key: Key('next')),
          ]),
        ),
        theme: theme,
      );
}

Finder get timeBox => find.descendant(of: find.byType(CmTimePicker), matching: find.byType(TextField));
String boxText(WidgetTester t) => t.widget<TextField>(timeBox).controller!.text;

void main() {
  group('cmParseTime (web parseTime)', () {
    test('reads 24-hour, 12-hour and compact times', () {
      expect(cmParseTime('15:30'), hm(15, 30));
      expect(cmParseTime('3:30 pm'), hm(15, 30));
      expect(cmParseTime('3.30pm'), hm(15, 30));
      expect(cmParseTime('3 pm'), hm(15, 0));
      expect(cmParseTime('9pm'), hm(21, 0));
      expect(cmParseTime('1530'), hm(15, 30));
      expect(cmParseTime('330pm'), hm(15, 30));
      expect(cmParseTime('9:05 a.m.'), hm(9, 5));
      expect(cmParseTime('12 am'), hm(0, 0));
      expect(cmParseTime('12 pm'), hm(12, 0));
      expect(cmParseTime('0:00'), hm(0, 0));
    });

    test('refuses text that is not a time', () {
      for (final s in ['', 'abc', '24:00', '13 pm', '0 am', '9:5', '12:60', '123456', '3:30 xm']) {
        expect(cmParseTime(s), isNull, reason: s);
      }
      expect(cmParseTime('3 nachm.', pm: ['nachm']), hm(15, 0), reason: 'locale words for pm');
    });
  });

  group('CmTimePicker', () {
    testWidgets('forced 24-hour clock shows two-digit hours; 12-hour shows am/pm', (t) async {
      final h = TimeHarness()..value = hm(9, 5);
      await t.pumpWidget(h.build());
      expect(boxText(t), '09:05');
      await t.pumpWidget(h.build(hourCycle: CmHourCycle.h12));
      expect(boxText(t), '9:05 AM');
      h.value = null;
      await t.pumpWidget(h.build(hourCycle: CmHourCycle.h23));
      expect(find.text('hh:mm'), findsOneWidget, reason: 'placeholder is the format');
    });

    testWidgets('typed text is read on Enter (3:30 pm, 1530, 9pm) and shown in the clock', (t) async {
      final h = TimeHarness();
      await t.pumpWidget(h.build());
      await t.enterText(timeBox, '3:30 pm');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(h.value, hm(15, 30));
      expect(boxText(t), '15:30');
      await t.enterText(timeBox, '9pm');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(h.value, hm(21, 0));
      await t.enterText(timeBox, '0745');
      await t.testTextInput.receiveAction(TextInputAction.done);
      await t.pump();
      expect(h.value, hm(7, 45));
      expect(boxText(t), '07:45');
    });

    testWidgets('typed text is also read on leaving the box', (t) async {
      final h = TimeHarness();
      await t.pumpWidget(h.build());
      await t.enterText(timeBox, '1530');
      await t.tap(find.byKey(const Key('next')));
      await t.pump();
      expect(h.value, hm(15, 30));
    });

    testWidgets('keyboard: Down opens at the chosen time, Down/Up move, Enter picks, Escape closes', (t) async {
      final h = TimeHarness()..value = hm(10, 0);
      await t.pumpWidget(h.build());
      await t.tap(timeBox);
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('cm-time-600')), findsOneWidget, reason: 'list open, 10:00 in view');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(h.value, hm(10, 30));
      expect(find.byKey(const ValueKey('cm-time-600')), findsNothing, reason: 'list closed');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('cm-time-630')), findsOneWidget);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('cm-time-630')), findsNothing);
      expect(h.value, hm(10, 30), reason: 'Escape keeps the time');
    });

    testWidgets('typing while open makes the next listed time active', (t) async {
      final h = TimeHarness()..value = hm(8, 0);
      await t.pumpWidget(h.build());
      await t.tap(timeBox);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pumpAndSettle();
      await t.enterText(timeBox, '14:10');
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(h.value, hm(14, 30));
    });

    testWidgets('the clock button opens the list; tapping a time picks it; min, max and step shape the list', (t) async {
      final handle = t.ensureSemantics();
      final h = TimeHarness()..value = hm(9, 30);
      await t.pumpWidget(h.build(min: hm(9, 0), max: hm(11, 0), step: 15));
      await t.tap(find.bySemanticsLabel('Show times'));
      await t.pumpAndSettle();
      final listed = find.byWidgetPredicate((w) => w.key is ValueKey<String> && (w.key! as ValueKey<String>).value.startsWith('cm-time-'));
      final list = t.widget<ListView>(find.descendant(of: find.byType(Overlay), matching: find.byType(ListView)).last);
      expect((list.childrenDelegate as SliverChildBuilderDelegate).childCount, 9, reason: '09:00 to 11:00 every 15 minutes');
      expect(find.bySemanticsLabel('Times for Pickup time'), findsOneWidget);
      final chosen = t.getSemantics(find.byKey(const ValueKey('cm-time-570')));
      expect(chosen.getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
      expect(chosen.label, '09:30');
      expect(t.getSemantics(find.byKey(const ValueKey('cm-time-600'))).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isFalse);
      await t.tap(find.text('10:15'));
      await t.pumpAndSettle();
      expect(h.value, hm(10, 15));
      expect(listed, findsNothing);
      handle.dispose();
    });

    testWidgets('interval: default 30 below step 5, the step from 5 up, or as given', (t) async {
      Future<int> count(TimeHarness h, {int step = 1, int? interval}) async {
        await t.pumpWidget(h.build(step: step, interval: interval));
        await t.tap(timeBox);
        await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
        await t.pumpAndSettle();
        final list = t.widget<ListView>(find.descendant(of: find.byType(Overlay), matching: find.byType(ListView)).last);
        final n = (list.childrenDelegate as SliverChildBuilderDelegate).childCount!;
        await t.sendKeyEvent(LogicalKeyboardKey.escape);
        await t.pumpAndSettle();
        return n;
      }

      expect(await count(TimeHarness()), 48);
      expect(await count(TimeHarness(), step: 15), 96);
      expect(await count(TimeHarness(), interval: 60), 24);
    });

    testWidgets('validation messages match the web wording', (t) async {
      final h = TimeHarness();
      await t.pumpWidget(h.build(min: hm(9, 0), max: hm(21, 0), step: 15, required: true));
      expect(find.text('Enter or choose a time.'), findsNothing, reason: 'not before the merchant has typed');
      await t.enterText(timeBox, 'soon');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Enter a time like hh:mm.'), findsOneWidget);
      expect(boxText(t), 'soon', reason: 'unreadable text stays');
      await t.enterText(timeBox, '8:00');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Choose 09:00 or later.'), findsOneWidget);
      await t.enterText(timeBox, '22:00');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Choose 21:00 or earlier.'), findsOneWidget);
      await t.enterText(timeBox, '10:10');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Choose a time in steps of 15 minutes.'), findsOneWidget);
      await t.enterText(timeBox, '');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(h.value, isNull);
      expect(find.text('Enter or choose a time.'), findsOneWidget);
    });

    testWidgets('12-hour pattern in the bad-input message', (t) async {
      final h = TimeHarness();
      await t.pumpWidget(h.build(hourCycle: CmHourCycle.h12));
      await t.enterText(timeBox, '25:00');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Enter a time like hh:mm am.'), findsOneWidget);
    });

    testWidgets('sizes: 40 default, 36 medium, 32 small, 44 on touch', (t) async {
      double height() => t.getSize(find.byType(InputDecorator).first).height;
      final h = TimeHarness();
      final desktop = CmTheme.light().copyWith(platform: TargetPlatform.macOS);
      await t.pumpWidget(h.build(theme: desktop));
      expect(height(), 40);
      await t.pumpWidget(h.build(size: CmFieldSize.medium, theme: desktop));
      expect(height(), 36);
      await t.pumpWidget(h.build(size: CmFieldSize.small, theme: desktop));
      expect(height(), 32);
      await t.pumpWidget(h.build(size: CmFieldSize.small, theme: CmTheme.light().copyWith(platform: TargetPlatform.android)));
      await t.pumpAndSettle(); // MaterialApp animates theme changes
      expect(height(), 44);
    });

    testWidgets('semantics: a labelled text field; disabled blocks the list', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(CmTimePicker(label: 'Delivery slot', value: hm(18, 0), required: true, hourCycle: CmHourCycle.h23, helpText: 'In your time zone', onChanged: (_) {})));
      final node = t.getSemantics(find.bySemanticsLabel(RegExp('^Delivery slot, required')));
      expect(node.getSemanticsData().hasFlag(SemanticsFlag.isTextField), isTrue);
      expect(node.value, '18:00');
      expect(node.hint, contains('In your time zone'));
      await t.pumpWidget(app(CmTimePicker(label: 'Delivery slot', value: hm(18, 0), enabled: false, onChanged: (_) {})));
      await t.tap(find.bySemanticsLabel('Show times'), warnIfMissed: false);
      await t.pumpAndSettle();
      expect(find.byType(ListView), findsNothing);
      handle.dispose();
    });

    testWidgets('locale clock: 24-hour when the platform asks for it', (t) async {
      await t.pumpWidget(MediaQuery(
        data: const MediaQueryData(alwaysUse24HourFormat: true),
        child: app(CmTimePicker(label: 'Opens', value: hm(7, 0), onChanged: (_) {})),
      ));
      expect(boxText(t), '07:00');
    });

    testWidgets('strings come from CmLocalizations', (t) async {
      await t.pumpWidget(CmLocalizations(
        strings: CmStrings(timePickerBadInput: (p) => 'Saisissez une heure comme $p.', patternHour: 'hh', patternMinute: 'mm'),
        child: app(CmTimePicker(label: 'Heure', value: null, hourCycle: CmHourCycle.h23, onChanged: (_) {})),
      ));
      await t.enterText(timeBox, 'x');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      expect(find.text('Saisissez une heure comme hh:mm.'), findsOneWidget);
    });
  });

  group('CmDateRangePreset (1.16 keys)', () {
    final sunday = DateTime(2026, 11, 15);
    DateTimeRange r(String a, String b) => DateTimeRange(start: DateTime.parse(a), end: DateTime.parse(b));

    test('new presets resolve like the web', () {
      expect(CmDateRangePreset.thisWeek.resolve(sunday), r('2026-11-15', '2026-11-15'));
      expect(CmDateRangePreset.thisWeek.resolve(sunday, firstDayOfWeek: 1), r('2026-11-09', '2026-11-15'));
      expect(CmDateRangePreset.lastWeek.resolve(sunday), r('2026-11-08', '2026-11-14'));
      expect(CmDateRangePreset.lastWeek.resolve(sunday, firstDayOfWeek: 1), r('2026-11-02', '2026-11-08'));
      expect(CmDateRangePreset.last28Days.resolve(sunday), r('2026-10-19', '2026-11-15'));
      expect(CmDateRangePreset.last90Days.resolve(sunday), r('2026-08-18', '2026-11-15'));
      expect(CmDateRangePreset.last12Months.resolve(sunday), r('2025-11-16', '2026-11-15'));
      expect(CmDateRangePreset.thisYear.resolve(sunday), r('2026-01-01', '2026-11-15'));
      expect(CmDateRangePreset.lastYear.resolve(sunday), r('2025-01-01', '2025-12-31'));
      expect(CmDateRangePreset.last12Months.resolve(DateTime(2028, 2, 29)), r('2027-03-01', '2028-02-29'));
    });

    test('keys, byKey and custom', () {
      expect(CmDateRangePreset.byKey('last-28-days'), same(CmDateRangePreset.last28Days));
      expect(CmDateRangePreset.byKey('nope'), isNull);
      expect(CmDateRangePreset.custom.isCustom, isTrue);
      expect(CmDateRangePreset.all.map((p) => p.key).toSet().length, 14);
      expect(CmDateRangePreset.report.last, same(CmDateRangePreset.custom));
    });
  });

  group('CmDateRangePicker report panel (months, confirm, custom, preset)', () {
    final today = DateTime(2026, 11, 15);

    Widget picker({
      DateTimeRange? Function()? get,
      void Function(DateTimeRange)? set,
      String? Function()? getPreset,
      void Function(String)? setPreset,
      List<CmDateRangePreset>? presets,
      int months = 2,
      bool confirm = true,
      int? firstDayOfWeek,
    }) =>
        app(
          StatefulBuilder(
            builder: (c, rebuild) => CmDateRangePicker(
              label: 'Report period',
              value: get?.call(),
              preset: getPreset?.call(),
              today: today,
              firstDate: DateTime(2025, 1, 1),
              lastDate: today,
              presets: presets ?? CmDateRangePreset.report,
              months: months,
              confirm: confirm,
              firstDayOfWeek: firstDayOfWeek,
              onChanged: (r) => rebuild(() => set?.call(r)),
              onPresetChanged: (k) => rebuild(() => setPreset?.call(k)),
            ),
          ),
        );

    Future<void> open(WidgetTester t) async {
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
    }

    bool pressed(WidgetTester t, String id) =>
        t.getSemantics(find.byKey(ValueKey('cm-preset-$id'))).getSemanticsData().hasFlag(SemanticsFlag.isSelected);

    testWidgets('preset with no value shows that range today; presets live in the panel, not under the field', (t) async {
      wide(t);
      await t.pumpWidget(picker(getPreset: () => 'last-28-days'));
      expect(find.text('Oct 19, 2026 – Nov 15, 2026'), findsOneWidget);
      expect(find.text('Last 28 days'), findsNothing, reason: 'presets move into the panel');
    });

    testWidgets('two months side by side, one arrow each; a preset is a draft until Apply', (t) async {
      wide(t);
      final handle = t.ensureSemantics();
      DateTimeRange? v;
      String? key = 'last-28-days';
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r, getPreset: () => key, setPreset: (k) => key = k));
      await open(t);
      expect(find.text('October 2026'), findsOneWidget);
      expect(find.text('November 2026'), findsOneWidget);
      expect(find.bySemanticsLabel('Previous month'), findsOneWidget);
      expect(find.bySemanticsLabel('Next month'), findsOneWidget);
      expect(pressed(t, 'last-28-days'), isTrue);
      expect(pressed(t, 'custom'), isFalse);
      expect(find.text('Oct 19, 2026 – Nov 15, 2026'), findsNWidgets(2), reason: 'field and footer draft');
      await t.tap(find.text('Last 7 days'));
      await t.pumpAndSettle();
      expect(v, isNull, reason: 'a draft until Apply');
      expect(pressed(t, 'last-7-days'), isTrue);
      expect(find.text('Nov 9, 2026 – Nov 15, 2026'), findsOneWidget);
      expect(t.getSemantics(find.byKey(const ValueKey('cm-day-2026-11-9'))).label, 'Monday, November 9, 2026, start date');
      await t.tap(find.text('Apply'));
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 9), end: today));
      expect(key, 'last-7-days');
      expect(find.text('Nov 9, 2026 – Nov 15, 2026'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('Custom: dates from the calendar; Apply disabled until both; reports preset ""', (t) async {
      wide(t);
      final handle = t.ensureSemantics();
      DateTimeRange? v;
      String? key;
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r, setPreset: (k) => key = k));
      await open(t);
      expect(find.text('No dates chosen'), findsOneWidget);
      expect(find.text('Choose the start date.'), findsOneWidget);
      await t.tap(find.text('Custom'));
      await t.pumpAndSettle();
      expect(pressed(t, 'custom'), isTrue);
      await t.tap(find.byKey(const ValueKey('cm-day-2026-11-3')));
      await t.pumpAndSettle();
      expect(find.text('Start date Nov 3, 2026. Choose the end date.'), findsOneWidget);
      final apply = find.ancestor(of: find.text('Apply'), matching: find.byType(CmButton));
      expect(t.widget<CmButton>(apply).onPressed, isNull, reason: 'one date only');
      await t.tap(find.byKey(const ValueKey('cm-day-2026-11-5')));
      await t.pumpAndSettle();
      expect(find.text('Nov 3, 2026 – Nov 5, 2026'), findsOneWidget);
      expect(t.getSemantics(find.byKey(const ValueKey('cm-day-2026-11-4'))).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
      await t.tap(find.text('Apply'));
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 3), end: DateTime(2026, 11, 5)));
      expect(key, '');
      // Reopened: no preset matches, so Custom is pressed.
      await open(t);
      expect(pressed(t, 'custom'), isTrue);
      expect(pressed(t, 'last-7-days'), isFalse);
      handle.dispose();
    });

    testWidgets('Cancel and Escape drop the draft', (t) async {
      wide(t);
      DateTimeRange? v;
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r));
      await open(t);
      await t.tap(find.text('Yesterday'));
      await t.pump();
      await t.tap(find.text('Cancel'));
      await t.pumpAndSettle();
      expect(v, isNull);
      expect(find.text('Apply'), findsNothing);
      await open(t);
      await t.tap(find.text('Yesterday'));
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pumpAndSettle();
      expect(v, isNull);
      expect(find.text('Apply'), findsNothing);
    });

    testWidgets('without confirm: a preset or the end date changes the range at once', (t) async {
      wide(t);
      DateTimeRange? v;
      String? key;
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r, setPreset: (k) => key = k, confirm: false));
      await open(t);
      expect(find.text('Apply'), findsNothing);
      await t.tap(find.text('This year'));
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 1, 1), end: today));
      expect(key, 'this-year');
      await open(t);
      // Focus starts on the range start, so January is in view.
      await t.tap(find.byKey(const ValueKey('cm-day-2026-1-4')));
      await t.pump();
      expect(find.byType(Dialog), findsOneWidget, reason: 'still open after the start date');
      await t.tap(find.byKey(const ValueKey('cm-day-2026-1-10')));
      await t.pumpAndSettle();
      expect(find.byType(Dialog), findsNothing);
      expect(v, DateTimeRange(start: DateTime(2026, 1, 4), end: DateTime(2026, 1, 10)));
      expect(key, '', reason: 'picked dates are custom even when they match a preset');
    });

    testWidgets('week presets start on the picker\'s first day of the week', (t) async {
      wide(t);
      DateTimeRange? v;
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r, confirm: false, firstDayOfWeek: 1));
      await open(t);
      await t.tap(find.text('Last week'));
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 2), end: DateTime(2026, 11, 8)));
    });

    testWidgets('keyboard: arrows move across the grid, Enter picks', (t) async {
      wide(t);
      DateTimeRange? v;
      await t.pumpWidget(picker(get: () => v, set: (r) => v = r, getPreset: () => 'today', confirm: false));
      await open(t);
      // Focus starts on the range start (today, 15 Nov).
      await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 7), end: DateTime(2026, 11, 9)));
    });

    testWidgets('phones (640px or narrower) show one month with both arrows', (t) async {
      wide(t, const Size(390, 844));
      await t.pumpWidget(picker());
      await open(t);
      expect(find.text('November 2026'), findsOneWidget);
      expect(find.text('October 2026'), findsNothing);
      expect(find.bySemanticsLabel('Previous month'), findsOneWidget);
      expect(find.bySemanticsLabel('Next month'), findsOneWidget);
      expect(t.takeException(), isNull);
    });

    testWidgets('one month with months: 1; listing custom alone opens the panel', (t) async {
      wide(t);
      await t.pumpWidget(picker(months: 1, confirm: false, presets: [CmDateRangePreset.last7Days, CmDateRangePreset.custom]));
      await open(t);
      expect(find.byType(DateRangePickerDialog), findsNothing);
      expect(find.text('November 2026'), findsOneWidget);
      expect(find.text('October 2026'), findsNothing);
      await t.tap(find.bySemanticsLabel('Previous month'));
      await t.pumpAndSettle();
      expect(find.text('October 2026'), findsOneWidget);
    });

    testWidgets('pill mode (no panel): new presets report their key', (t) async {
      DateTimeRange? v;
      String? key;
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmDateRangePicker(
            label: 'Order date',
            value: v,
            today: today,
            firstDate: DateTime(2025, 1, 1),
            lastDate: today,
            presets: [CmDateRangePreset.last28Days, CmDateRangePreset.thisYear],
            onChanged: (r) => set(() => v = r),
            onPresetChanged: (k) => key = k,
          ))));
      await t.tap(find.text('Last 28 days'));
      await t.pump();
      expect(v, DateTimeRange(start: DateTime(2026, 10, 19), end: today));
      expect(key, 'last-28-days');
    });

    testWidgets('panel strings come from CmLocalizations', (t) async {
      wide(t);
      await t.pumpWidget(CmLocalizations(
        strings: const CmStrings(presetCustom: 'Personnalisée', dateRangeApply: 'Appliquer', dateRangeCancel: 'Annuler', dateRangeNoDates: 'Aucune date', presetThisWeek: 'Cette semaine'),
        child: picker(presets: [CmDateRangePreset.thisWeek, CmDateRangePreset.custom]),
      ));
      await open(t);
      for (final s in ['Personnalisée', 'Appliquer', 'Annuler', 'Aucune date', 'Cette semaine']) {
        expect(find.text(s), findsOneWidget, reason: s);
      }
    });
  });
}
