import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/calendar_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'semantics_audit_test.dart' show unactionable;

Future<void> pumpPage(WidgetTester t, Size size, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) async {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(MaterialApp(
    theme: theme ?? CmTheme.light(),
    home: Directionality(textDirection: dir, child: const Scaffold(body: CalendarPage())),
  ));
  // The page "loads" each range for 400ms.
  await t.pump(const Duration(milliseconds: 500));
}

void main() {
  for (final size in const [Size(1440, 900), Size(390, 844)]) {
    testWidgets('calendar page lays out without errors at ${size.width.toInt()}px, light, dark and right to left', (t) async {
      for (final (theme, dir) in [(CmTheme.light(), TextDirection.ltr), (CmTheme.dark(), TextDirection.ltr), (CmTheme.light(), TextDirection.rtl)]) {
        await pumpPage(t, size, theme: theme, dir: dir);
        final pos = t.state<ScrollableState>(find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first).position;
        while (pos.pixels < pos.maxScrollExtent) {
          pos.jumpTo((pos.pixels + 400).clamp(0, pos.maxScrollExtent));
          await t.pump();
        }
        expect(t.takeException(), isNull);
      }
    });
  }

  testWidgets('every control on the calendar page can be activated by a screen reader', (t) async {
    final handle = t.ensureSemantics();
    await pumpPage(t, const Size(1440, 4000));
    final seen = <String>{};
    expect(unactionable(t, seen), isEmpty);
    expect(seen, contains('Outreach planner'));
    expect(seen.any((l) => l.startsWith('Call Ravi Stores, Wednesday 18 November, 3:00 to 3:30 pm')), isTrue);
    handle.dispose();
  });

  testWidgets('a move to a Sunday is refused; "+" adds a follow-up', (t) async {
    await pumpPage(t, const Size(1440, 4000));
    final cal = t.state<CmCalendarState>(find.byType(CmCalendar).first);
    expect(cal.moveEvent('e1', DateTime(2026, 11, 22, 15)), isFalse);
    await t.pump();
    expect(cal.announcement, "Call Ravi Stores can't be moved to Sunday 22 November, 3:00 to 3:30 pm.");
    await t.pump(const Duration(seconds: 5));
    final handle = t.ensureSemantics();
    await t.tap(find.bySemanticsLabel('Add on Thursday 12 November').first);
    await t.pump();
    expect(find.textContaining('New follow-up 1', findRichText: true), findsWidgets);
    handle.dispose();
    await t.pump(const Duration(seconds: 5));
  });
}
