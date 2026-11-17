import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/record_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'semantics_audit_test.dart' show unactionable;

final _now = DateTime(2026, 11, 17, 10);

Future<void> pumpPage(WidgetTester t, Size size, {ThemeData? theme, TextDirection dir = TextDirection.ltr, VoidCallback? onBack}) async {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(MaterialApp(
    theme: theme ?? CmTheme.light(),
    home: Directionality(textDirection: dir, child: Scaffold(body: RecordPage(now: _now, onBack: onBack))),
  ));
  await t.pump(const Duration(milliseconds: 100));
}

Rect details(WidgetTester t) => t.getRect(find.byType(CmInfoPanel));
Rect activity(WidgetTester t) => t.getRect(find.ancestor(of: find.byType(CmStatusTabs), matching: find.byType(CmCard)).first);
ScrollPosition pagePosition(WidgetTester t) =>
    t.state<ScrollableState>(find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first).position;

void main() {
  for (final size in const [Size(1440, 900), Size(900, 900), Size(390, 844)]) {
    testWidgets('record page lays out without errors at ${size.width.toInt()}px, light and dark', (t) async {
      for (final theme in [CmTheme.light(), CmTheme.dark()]) {
        await pumpPage(t, size, theme: theme);
        final pos = pagePosition(t);
        while (pos.pixels < pos.maxScrollExtent) {
          pos.jumpTo((pos.pixels + 300).clamp(0, pos.maxScrollExtent));
          await t.pump();
        }
        expect(t.takeException(), isNull);
      }
    });
  }

  testWidgets('1440: Details is a 320 column on the end side, beside the activity', (t) async {
    await pumpPage(t, const Size(1440, 900));
    expect(details(t).width, 320);
    expect(details(t).right, 1440 - 24, reason: 'page padding 24');
    expect(details(t).top, activity(t).top);
    expect(details(t).left - activity(t).right, 24);
  });

  testWidgets('RTL: Details on the left', (t) async {
    await pumpPage(t, const Size(1440, 900), dir: TextDirection.rtl);
    expect(details(t).left, 24);
    expect(activity(t).left - details(t).right, 24);
  });

  testWidgets('a 900 window gives an 852 layout: the aside stacks above the activity', (t) async {
    await pumpPage(t, const Size(900, 900));
    expect(details(t).width, 900 - 48);
    expect(details(t).bottom, lessThan(activity(t).top));
  });

  testWidgets('phone: 16 gaps, back arrow, actions under the meta line', (t) async {
    final handle = t.ensureSemantics();
    var back = 0;
    await pumpPage(t, const Size(390, 844), onBack: () => back++);
    final owner = t.getRect(find.ancestor(of: find.text('Owner').first, matching: find.byType(CmCard)).first);
    expect(owner.top - details(t).bottom, 16);
    final meta = t.getRect(find.text('Owner Ravi Kumar · Created 12 Nov 2026 · Source Website form'));
    expect(t.getRect(find.text('Convert')).top, greaterThan(meta.bottom));
    await t.tap(find.bySemanticsLabel('Back to Leads'));
    expect(back, 1);
    handle.dispose();
  });

  testWidgets('the aside sticks while the activity scrolls when it fits the window', (t) async {
    await pumpPage(t, const Size(1440, 900));
    final pos = pagePosition(t);
    final aside = t.getRect(find.ancestor(of: find.byType(CmInfoPanel), matching: find.byType(Column)).first);
    expect(aside.height + 24, lessThanOrEqualTo(900 - t.getRect(find.byType(CmPageHeader)).height), reason: 'the aside fits');
    pos.jumpTo(pos.maxScrollExtent);
    await t.pump();
    expect(pos.pixels, greaterThan(0), reason: 'the main column is taller than the window');
    final viewportTop = t.getRect(find.byType(SingleChildScrollView).first).top;
    expect(details(t).top, closeTo(viewportTop + 24, 0.5), reason: 'stuck under the header');
    expect(activity(t).top, lessThan(viewportTop), reason: 'the activity scrolled away');
  });

  testWidgets('Emails shows only the emails', (t) async {
    await pumpPage(t, const Size(1440, 900));
    expect(find.byType(CmTimelineItem), findsNWidgets(6));
    await t.tap(find.text('Emails').last);
    await t.pump();
    expect(find.byType(CmTimelineItem), findsNWidgets(2));
    expect(find.text('Call: discussed bulk pricing'), findsNothing);
  });

  testWidgets('every control on the record page can be activated by a screen reader', (t) async {
    final handle = t.ensureSemantics();
    await pumpPage(t, const Size(1440, 3000));
    final seen = <String>{};
    final bad = unactionable(t, seen);
    handle.dispose();
    expect(bad, isEmpty, reason: bad.join(' | '));
    for (final label in ['Back to Leads', 'Convert', 'Add deal', 'Add task', 'Change']) {
      expect(seen.any((l) => l.contains(label)), isTrue, reason: label);
    }
  });
}
