import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

// 1.18: CmDateRangePicker variant: CmDateRangeVariant.report (web cm-date-range-picker variant="report"): the field
// is one button with the preset chip and the range; the popup has the presets with their dates, typed start and end
// boxes, months listed one under another, and Cancel/Apply.

final today = DateTime(2026, 11, 20); // a Friday

void size(WidgetTester t, [Size s = const Size(1280, 900)]) {
  t.view.physicalSize = s;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// A report picker whose range and preset live in the test.
class Harness {
  Harness({this.value, this.preset});
  DateTimeRange? value;
  String? preset;
  final changes = <DateTimeRange>[];
  final presets = <String>[];

  Widget build({List<CmDateRangePreset> list = const [], DateTime? first, DateTime? last, DateTime? on}) => MaterialApp(
        theme: CmTheme.light(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                width: 360,
                child: StatefulBuilder(
                  builder: (c, set) => CmDateRangePicker(
                    label: 'Report period',
                    variant: CmDateRangeVariant.report,
                    value: value,
                    preset: preset,
                    presets: list,
                    today: on ?? today,
                    firstDayOfWeek: 1,
                    firstDate: first ?? DateTime(2024),
                    lastDate: last ?? on ?? today,
                    onChanged: (r) => set(() {
                      value = r;
                      changes.add(r);
                    }),
                    onPresetChanged: (k) => set(() {
                      preset = k;
                      presets.add(k);
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

DateTimeRange range(int m1, int d1, int m2, int d2) => DateTimeRange(start: DateTime(2026, m1, d1), end: DateTime(2026, m2, d2));
String textOf(WidgetTester t, String key) {
  final w = t.widget(find.byKey(ValueKey(key)));
  return w is Text ? (w.data ?? w.textSpan!.toPlainText()) : '';
}

Finder get presetScroll => find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;

/// The dates under a preset, scrolled into view first (the preset list builds lazily).
Future<String> spanOf(WidgetTester t, String key) async {
  await t.scrollUntilVisible(find.byKey(ValueKey('cm-preset-span-$key')), 60, scrollable: presetScroll);
  return textOf(t, 'cm-preset-span-$key');
}

Finder get summary => find.byKey(const ValueKey('cm-report-range'));
Finder get applyButton => find.widgetWithText(CmButton, 'Apply');
bool applyEnabled(WidgetTester t) => t.widget<CmButton>(applyButton).onPressed != null;

Future<void> open(WidgetTester t) async {
  await t.tap(summary);
  await t.pumpAndSettle();
}

Future<void> typeInto(WidgetTester t, String key, String text) async {
  await t.enterText(find.byKey(ValueKey(key)), text);
  await t.testTextInput.receiveAction(TextInputAction.done);
  await t.pumpAndSettle();
}

void main() {
  testWidgets('the field is one button with the preset chip, the range and a chevron', (t) async {
    size(t);
    final h = Harness(value: range(10, 23, 11, 19), preset: '');
    await t.pumpWidget(h.build());
    expect(find.descendant(of: find.byKey(const ValueKey('cm-report-chip')), matching: find.text('Custom')), findsOneWidget);
    expect(textOf(t, 'cm-report-range'), '23 Oct – 19 Nov 2026');
    expect(find.byType(TextField), findsNothing, reason: 'no typed boxes in the field');
    expect(find.byWidgetPredicate((w) => w is CmIcon && w.name == CmIcons.chevronDown), findsOneWidget);
    expect(find.byWidgetPredicate((w) => w is CmIcon && w.name == CmIcons.calendar), findsNothing);

    // A preset key with no value: the preset's range today, named by the chip.
    final p = Harness(preset: 'last-28-days');
    await t.pumpWidget(p.build());
    expect(find.descendant(of: find.byKey(const ValueKey('cm-report-chip')), matching: find.text('Last 28 days')), findsOneWidget);
    expect(textOf(t, 'cm-report-range'), '24 Oct – 20 Nov 2026');

    // Without a key, dates that match a listed preset are named by it.
    final m = Harness(value: range(11, 14, 11, 20));
    await t.pumpWidget(m.build());
    expect(find.descendant(of: find.byKey(const ValueKey('cm-report-chip')), matching: find.text('Last 7 days')), findsOneWidget);
    expect(textOf(t, 'cm-report-range'), '14 – 20 Nov 2026');
  });

  testWidgets('without a range it says "Choose dates" and has no chip', (t) async {
    size(t);
    await t.pumpWidget(Harness().build());
    expect(find.byKey(const ValueKey('cm-report-chip')), findsNothing);
    expect(textOf(t, 'cm-report-range'), 'Choose dates');
  });

  testWidgets('without Custom in the list, picked dates have no chip', (t) async {
    size(t);
    final h = Harness(value: range(11, 3, 11, 9), preset: '');
    await t.pumpWidget(h.build(list: CmDateRangePreset.standard));
    expect(find.byKey(const ValueKey('cm-report-chip')), findsNothing);
    expect(textOf(t, 'cm-report-range'), '3 – 9 Nov 2026');
  });

  testWidgets('the summary button keeps its tap for screen readers and reads the chip and the range', (t) async {
    size(t);
    final handle = t.ensureSemantics();
    await t.pumpWidget(Harness(value: range(10, 23, 11, 19), preset: '').build());
    final node = t.getSemantics(find.bySemanticsLabel('Report period'));
    expect(node.value, contains('Custom, '));
    expect(node.value, contains('to'));
    expect(node.getSemanticsData().hasFlag(SemanticsFlag.isButton), isTrue);
    expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    t.semantics.tap(find.semantics.byLabel('Report period'));
    await t.pumpAndSettle();
    expect(applyButton, findsOneWidget);
    handle.dispose();
  });

  testWidgets('lists the report presets, Custom first, each with its dates', (t) async {
    size(t);
    await t.pumpWidget(Harness().build());
    await open(t);
    const keys = [
      'custom', 'today', 'yesterday', 'this-week', 'last-7-days', 'last-week', 'last-28-days', 'last-30-days',
      'this-month', 'last-month', 'last-90-days', 'quarter-to-date', 'this-year',
    ];
    // The list builds lazily: read the order from its children.
    String? keyIn(Widget? w) {
      final k = w?.key;
      if (k is ValueKey<String> && k.value.startsWith('cm-preset-')) return k.value.substring('cm-preset-'.length);
      return switch (w) {
        SingleChildRenderObjectWidget(:final child) => keyIn(child),
        Container(:final child) => keyIn(child),
        _ => null,
      };
    }
    final list = t.widget<ListView>(find.byType(ListView));
    final children = (list.childrenDelegate as SliverChildListDelegate).children;
    expect(children.map(keyIn).toList(), keys);
    expect(find.byKey(const ValueKey('cm-preset-last-quarter')), findsNothing);
    expect(find.byKey(const ValueKey('cm-preset-span-custom')), findsNothing, reason: 'Custom has no dates');
    final spans = {
      'yesterday': '19 Nov',
      'this-week': '16 – 20 Nov',
      'last-week': '9 – 15 Nov',
      'last-month': '1 – 31 Oct',
      'last-90-days': '23 Aug – 20 Nov',
      'quarter-to-date': '1 Oct – 20 Nov',
      'this-year': '1 Jan – 20 Nov',
    };
    for (final e in spans.entries) {
      expect(await spanOf(t, e.key), e.value, reason: e.key);
    }
  });

  testWidgets('preset dates show the year only when it is not this year', (t) async {
    size(t);
    await t.pumpWidget(Harness().build(on: DateTime(2027, 1, 3)));
    await open(t);
    expect(await spanOf(t, 'today'), '3 Jan');
    expect(await spanOf(t, 'last-7-days'), '28 Dec 2026 – 3 Jan 2027');
    expect(await spanOf(t, 'last-month'), '1 – 31 Dec 2026');
  });

  testWidgets('a preset is a draft until Apply; Cancel drops it; the selected preset has the tab bar', (t) async {
    size(t);
    final h = Harness(value: range(11, 1, 11, 5), preset: '');
    await t.pumpWidget(h.build());
    await open(t);
    expect(find.byKey(const ValueKey('cm-preset-indicator')), findsOneWidget, reason: 'Custom is pressed for picked dates');
    await t.tap(find.byKey(const ValueKey('cm-preset-last-7-days')));
    await t.pumpAndSettle();
    expect(h.changes, isEmpty);
    expect(find.descendant(of: find.byKey(const ValueKey('cm-preset-last-7-days')), matching: find.byKey(const ValueKey('cm-preset-indicator'))), findsOneWidget);
    final label = t.widget<Text>(find.descendant(of: find.byKey(const ValueKey('cm-preset-last-7-days')), matching: find.text('Last 7 days')));
    expect(label.style!.fontWeight, FontWeight.w600);
    expect(textOf(t, 'cm-range-draft'), '14 – 20 Nov 2026 · 7 days');
    expect(t.widget<TextField>(find.byKey(const ValueKey('cm-report-start'))).controller!.text, '11/14/2026');

    await t.tap(find.widgetWithText(CmButton, 'Cancel'));
    await t.pumpAndSettle();
    expect(applyButton, findsNothing);
    expect([h.changes.length, h.value, h.preset], [0, range(11, 1, 11, 5), '']);

    await open(t);
    await t.tap(find.byKey(const ValueKey('cm-preset-last-7-days')));
    await t.pumpAndSettle();
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect([h.value, h.preset, h.changes.length], [range(11, 14, 11, 20), 'last-7-days', 1]);
    expect(find.descendant(of: find.byKey(const ValueKey('cm-report-chip')), matching: find.text('Last 7 days')), findsOneWidget);
  });

  testWidgets('Escape drops the draft', (t) async {
    size(t);
    final h = Harness(value: range(11, 1, 11, 5), preset: '');
    await t.pumpWidget(h.build());
    await open(t);
    await t.tap(find.byKey(const ValueKey('cm-preset-today')));
    await t.pumpAndSettle();
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pumpAndSettle();
    expect([applyButton.evaluate().length, h.changes.length], [0, 0]);
  });

  testWidgets('typed start and end boxes change the draft; bad text disables Apply', (t) async {
    size(t);
    final h = Harness(value: range(11, 1, 11, 5), preset: 'last-7-days');
    await t.pumpWidget(h.build());
    await open(t);
    expect(find.text('Start date'), findsOneWidget);
    expect(find.text('End date'), findsOneWidget);
    expect(t.widget<TextField>(find.byKey(const ValueKey('cm-report-start'))).controller!.text, '11/01/2026');
    await typeInto(t, 'cm-report-end', '11/20/2026');
    expect(textOf(t, 'cm-range-draft'), '1 – 20 Nov 2026 · 20 days');
    expect(find.descendant(of: find.byKey(const ValueKey('cm-preset-custom')), matching: find.byKey(const ValueKey('cm-preset-indicator'))), findsOneWidget);

    await t.enterText(find.byKey(const ValueKey('cm-report-start')), 'not a date');
    await t.pump();
    expect(applyEnabled(t), isFalse);
    await typeInto(t, 'cm-report-start', '11/10/2026');
    expect(applyEnabled(t), isTrue);
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect([h.value, h.preset], [range(11, 10, 11, 20), '']);
  });

  testWidgets('a date typed without Enter counts on Apply; dates outside the range are bad', (t) async {
    size(t);
    final h = Harness(value: range(11, 1, 11, 5), preset: '');
    await t.pumpWidget(h.build());
    await open(t);
    await t.enterText(find.byKey(const ValueKey('cm-report-end')), '11/25/2026'); // after lastDate (today)
    await t.pump();
    expect(applyEnabled(t), isFalse);
    await t.enterText(find.byKey(const ValueKey('cm-report-end')), '11/12/2026');
    await t.pump();
    expect(applyEnabled(t), isTrue);
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect(h.value, range(11, 1, 11, 12));
  });

  testWidgets('an end typed before the start swaps them', (t) async {
    size(t);
    final h = Harness(value: range(11, 10, 11, 20), preset: '');
    await t.pumpWidget(h.build());
    await open(t);
    await typeInto(t, 'cm-report-end', '11/05/2026');
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect(h.value, range(11, 5, 11, 10));
  });

  testWidgets('months are listed one under another, opened at the range\'s first month', (t) async {
    size(t);
    final h = Harness(value: range(10, 23, 11, 19), preset: '');
    await t.pumpWidget(h.build(first: DateTime(2020)));
    await open(t);
    final list = find.byKey(const ValueKey('cm-report-months'));
    final oct = find.byKey(const ValueKey('cm-month-2026-10'));
    expect(oct, findsOneWidget);
    expect((t.getTopLeft(oct).dy - t.getTopLeft(list).dy).abs(), lessThan(1));
    expect(find.descendant(of: oct, matching: find.text('October 2026')), findsOneWidget);
    // One weekday row above the list, starting on Monday here.
    expect(find.text('M'), findsOneWidget);
    // Months from 12 before the range to the last date (today).
    final scrollable = find.descendant(of: list, matching: find.byType(Scrollable)).first;
    await t.scrollUntilVisible(find.byKey(const ValueKey('cm-month-2026-11')), 200, scrollable: scrollable);
    expect(find.byKey(const ValueKey('cm-month-2026-12')), findsNothing);
    await t.scrollUntilVisible(find.byKey(const ValueKey('cm-month-2025-10')), -200, scrollable: scrollable);
    expect(find.byKey(const ValueKey('cm-month-2025-9')), findsNothing);
    // Day cells are 36 tall; the start and end are marked.
    expect(t.getSize(find.byKey(const ValueKey('cm-day-2025-10-15'))).height, 36);
  });

  testWidgets('arrow keys move across months, scrolling the list', (t) async {
    size(t);
    final h = Harness(value: range(10, 23, 11, 19), preset: '');
    await t.pumpWidget(h.build());
    await open(t);
    for (var i = 0; i < 4; i++) {
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    }
    await t.pumpAndSettle();
    // 23 Oct + 4 weeks = 20 Nov: in view.
    expect(find.byKey(const ValueKey('cm-day-2026-11-20')).hitTestable(), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pumpAndSettle();
    expect(textOf(t, 'cm-range-draft'), '20 Nov 2026 –');
  });

  testWidgets('picking two days makes a custom draft; the popup stays open until Apply', (t) async {
    size(t);
    final h = Harness();
    await t.pumpWidget(h.build());
    await open(t);
    expect(textOf(t, 'cm-range-draft'), 'No dates chosen');
    await t.tap(find.byKey(const ValueKey('cm-day-2026-11-3')));
    await t.pump();
    expect(applyEnabled(t), isFalse);
    await t.tap(find.byKey(const ValueKey('cm-day-2026-11-9')));
    await t.pumpAndSettle();
    expect(applyButton, findsOneWidget);
    expect(t.widget<TextField>(find.byKey(const ValueKey('cm-report-end'))).controller!.text, '11/09/2026');
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect([h.value, h.preset], [range(11, 3, 11, 9), '']);
    expect(find.descendant(of: find.byKey(const ValueKey('cm-report-chip')), matching: find.text('Custom')), findsOneWidget);
  });

  testWidgets('phones: presets are one sideways row of pills without dates, the footer stays visible', (t) async {
    size(t, const Size(390, 700));
    final h = Harness(value: range(11, 14, 11, 20), preset: 'last-7-days');
    await t.pumpWidget(h.build());
    await open(t);
    final custom = t.getTopLeft(find.byKey(const ValueKey('cm-preset-custom')));
    final today0 = t.getTopLeft(find.byKey(const ValueKey('cm-preset-today')));
    expect(today0.dy, custom.dy, reason: 'one row');
    expect(today0.dx, greaterThan(custom.dx));
    expect(find.byKey(const ValueKey('cm-preset-span-today')), findsNothing);
    expect(find.byKey(const ValueKey('cm-preset-indicator')), findsNothing, reason: 'pressed = black fill on phones');
    expect(t.getSize(find.byKey(const ValueKey('cm-report-months'))).height, lessThanOrEqualTo(700 * 0.4));
    expect(applyButton.hitTestable(), findsOneWidget);
    expect(t.getBottomLeft(applyButton).dy, lessThanOrEqualTo(700));
    await t.tap(find.byKey(const ValueKey('cm-preset-yesterday')));
    await t.pumpAndSettle();
    await t.tap(applyButton);
    await t.pumpAndSettle();
    expect([h.value, h.preset], [range(11, 19, 11, 19), 'yesterday']);
    expect(t.takeException(), isNull);
  });

  testWidgets('custom presets replace the report set', (t) async {
    size(t);
    await t.pumpWidget(Harness().build(list: [CmDateRangePreset.custom, CmDateRangePreset.lastQuarter, CmDateRangePreset.quarterToDate]));
    await open(t);
    expect(find.byKey(const ValueKey('cm-preset-today')), findsNothing);
    expect(textOf(t, 'cm-preset-span-last-quarter'), '1 Jul – 30 Sep');
    expect(find.text('Last quarter'), findsOneWidget);
  });

  test('quarter presets', () {
    DateTimeRange r(CmDateRangePreset p, DateTime d) => p.resolve(d);
    expect(r(CmDateRangePreset.quarterToDate, DateTime(2026, 11, 18)), DateTimeRange(start: DateTime(2026, 10, 1), end: DateTime(2026, 11, 18)));
    expect(r(CmDateRangePreset.lastQuarter, DateTime(2026, 11, 18)), DateTimeRange(start: DateTime(2026, 7, 1), end: DateTime(2026, 9, 30)));
    expect(r(CmDateRangePreset.lastQuarter, DateTime(2026, 2, 3)).start, DateTime(2025, 10, 1));
    expect(r(CmDateRangePreset.lastQuarter, DateTime(2026, 2, 3)).end, DateTime(2025, 12, 31));
    expect(r(CmDateRangePreset.quarterToDate, DateTime(2026, 3, 31)).start, DateTime(2026, 1, 1));
    expect(CmDateRangePreset.byKey('quarter-to-date'), same(CmDateRangePreset.quarterToDate));
    expect(CmDateRangePreset.byKey('last-quarter'), same(CmDateRangePreset.lastQuarter));
    expect(CmDateRangePreset.reportVariant.map((p) => p.key), [
      'custom', 'today', 'yesterday', 'this-week', 'last-7-days', 'last-week', 'last-28-days', 'last-30-days',
      'this-month', 'last-month', 'last-90-days', 'quarter-to-date', 'this-year',
    ]);
    const s = CmStrings();
    expect([s.presetQuarterToDate, s.presetLastQuarter, s.dateRangeDayCount(1), s.dateRangeDayCount(28)], ['Quarter to date', 'Last quarter', '1 day', '28 days']);
  });
}
