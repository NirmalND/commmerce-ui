import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/components_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// The page has looping skeleton animations, so it never settles: pump past the overlay transitions instead.
Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 5; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

Future<void> page(WidgetTester t, Size size) async {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: const Scaffold(body: ComponentsPage())));
  await t.pump();
}

void main() {
  testWidgets('time picker demo: type a time, pick one from the list', (t) async {
    await page(t, const Size(1440, 900));
    await t.scrollUntilVisible(find.text('Pickup time'), 300, scrollable: find.byType(Scrollable).first);
    await settle(t);
    final pickup = find.descendant(of: find.widgetWithText(CmTimePicker, 'Pickup time'), matching: find.byType(TextField));
    expect(t.widget<TextField>(pickup).controller!.text, '3:30 PM');
    await t.enterText(pickup, '9pm');
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await settle(t);
    expect(t.widget<TextField>(pickup).controller!.text, '9:00 PM');

    final opens = find.descendant(of: find.widgetWithText(CmTimePicker, 'Opens *'), matching: find.byType(TextField));
    await t.tap(opens);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await settle(t);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await settle(t);
    expect(t.widget<TextField>(opens).controller!.text, '09:15');
    expect(t.takeException(), isNull);
  });

  for (final size in const [Size(1440, 900), Size(390, 844)]) {
    testWidgets('report date range demo opens on Last 28 days and applies a preset at ${size.width.toInt()}px', (t) async {
      await page(t, size);
      await t.scrollUntilVisible(find.text('Report period'), 300, scrollable: find.byType(Scrollable).first);
      await settle(t);
      expect(find.textContaining('Saved as "last-28-days"'), findsOneWidget);
      await t.tap(find.descendant(of: find.widgetWithText(CmDateRangePicker, 'Report period'), matching: find.byType(InkWell)).first);
      await settle(t);
      expect(find.text('Apply'), findsOneWidget);
      await t.tap(find.text('Last 7 days'));
      await settle(t);
      await t.tap(find.text('Apply'));
      await settle(t);
      expect(find.text('Apply'), findsNothing);
      expect(find.textContaining('Saved as "last-7-days"'), findsOneWidget);
      expect(t.takeException(), isNull);
    });
  }
}
