import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/crm_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'semantics_audit_test.dart' show unactionable;

/// Skeletons and spinners loop forever: pump a fixed time instead of settling.
Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 5; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Widget wrap({ThemeData? theme}) => MaterialApp(theme: theme ?? CmTheme.light(), home: const Scaffold(body: CrmPage()));

void main() {
  for (final size in const [Size(1440, 900), Size(900, 900), Size(390, 844)]) {
    testWidgets('CRM page lays out without errors at ${size.width.toInt()}px, light and dark', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      for (final theme in [CmTheme.light(), CmTheme.dark()]) {
        await t.pumpWidget(wrap(theme: theme));
        await settle(t);
        final pos = t.state<ScrollableState>(find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first).position;
        while (pos.pixels < pos.maxScrollExtent) {
          pos.jumpTo((pos.pixels + 400).clamp(0, pos.maxScrollExtent));
          await t.pump();
        }
        expect(t.takeException(), isNull);
        pos.jumpTo(0);
        await t.pump();
      }
      // The frame inside the card follows its own width: side navigation only when the card is 1024px or wider.
      await t.pumpWidget(wrap());
      await settle(t);
      final frameWidth = t.getSize(find.byType(CmAppFrame)).width;
      expect(find.byType(CmSideNav), frameWidth >= 1024 ? findsOneWidget : findsNothing);
      expect(find.byType(CmBottomNavigation), frameWidth >= 1024 ? findsNothing : findsOneWidget);
    });
  }

  testWidgets('every control on the CRM page can be activated by a screen reader', (t) async {
    t.view.physicalSize = const Size(1440, 6000);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final handle = t.ensureSemantics();
    await t.pumpWidget(wrap());
    await t.pump(const Duration(milliseconds: 500));
    final seen = <String>{};
    final bad = unactionable(t, seen);
    handle.dispose();
    expect(bad, isEmpty, reason: 'announced but not activatable: ${bad.join(' | ')}');
    for (final label in ['Notifications, 2 unread', 'Collapse menu', 'Activity for Rao Textiles', 'Sale closed', 'Messages, 120 unread', 'Add task', 'Time for Follow up']) {
      expect(seen.any((l) => l.contains(label)), isTrue, reason: '"$label" was checked');
    }
  });

  testWidgets('search, notifications and Show more work on the page', (t) async {
    t.view.physicalSize = const Size(1440, 2400);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(wrap());
    await settle(t);
    // The standalone search (the second box) finds grouped records after a short wait.
    await t.enterText(find.byType(TextField).at(1), 'ra');
    await t.pump();
    expect(find.text('Loading'), findsOneWidget);
    await t.pump(const Duration(milliseconds: 400));
    expect(find.text('Ravi Stores'), findsOneWidget);
    await t.tap(find.text('Ravi Stores'));
    await settle(t);
    expect(find.text('Last action: Open Ravi Stores'), findsOneWidget);
    // The bell opens the panel; "Mark all read" clears the count.
    await t.tap(find.bySemanticsLabel('Notifications, 2 unread').first);
    await settle(t);
    await t.tap(find.text('Mark all read'));
    await settle(t);
    expect(find.text('Mark all read'), findsNothing);
    await t.tap(find.bySemanticsLabel('Close'));
    await settle(t);
    expect(find.bySemanticsLabel('Notifications'), findsWidgets);
    // Show more adds older events.
    await t.ensureVisible(find.text('Show more'));
    await t.tap(find.text('Show more'));
    await t.pump(const Duration(milliseconds: 600));
    expect(find.text('Lead created from the website form'), findsOneWidget);
  });
}
