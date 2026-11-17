import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/main.dart';
import 'package:commmerce_ui_example/release_1_7_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget page({ThemeData? theme, ValueChanged<String>? onNavigate}) =>
    MaterialApp(theme: theme ?? CmTheme.light().copyWith(platform: TargetPlatform.linux), home: Scaffold(body: Release17Page(onNavigate: onNavigate)));

void window(WidgetTester t, Size size) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

void main() {
  for (final size in const [Size(1440, 3200), Size(390, 4000)]) {
    for (final dark in [false, true]) {
      testWidgets('1.7 demo lays out at ${size.width.toInt()}px${dark ? ', dark' : ''}', (t) async {
        window(t, size);
        await t.pumpWidget(page(theme: dark ? CmTheme.dark() : null));
        await t.pump(const Duration(milliseconds: 100));
        expect(t.takeException(), isNull);
        expect(find.text('Undo instead of confirm'), findsOneWidget);
        expect(find.byType(CmDataTable), findsOneWidget);
        if (size.width < 640) {
          expect(find.text('View all fields'), findsWidgets, reason: 'the priority layout on phones');
          expect(find.byType(DropdownButtonFormField<String>), findsOneWidget, reason: 'status tabs become a dropdown');
        }
      });
    }
  }

  testWidgets('demo: Archive removes the lead at once; Undo puts it back', (t) async {
    window(t, const Size(1440, 3200));
    await t.pumpWidget(page());
    await t.pump();
    expect(find.text('Asha Traders · Pune'), findsOneWidget);
    await t.tap(find.bySemanticsLabel('Archive Asha Traders'));
    await t.pump();
    expect(find.text('Asha Traders · Pune'), findsNothing);
    expect(find.text('Asha Traders archived'), findsOneWidget);
    await t.tap(find.text('Undo'));
    await t.pump();
    await t.pump();
    expect(find.text('Asha Traders · Pune'), findsOneWidget);
    expect(find.text('Archive toast closed: action'), findsOneWidget);
  });

  testWidgets('demo: the palette finds records and runs Navigate items', (t) async {
    window(t, const Size(1440, 3200));
    String? went;
    await t.pumpWidget(page(onNavigate: (p) => went = p));
    await t.pump();
    await t.tap(find.text('Open the palette'));
    await t.pumpAndSettle();
    expect(find.byType(CmCommandPalette), findsOneWidget);
    await t.enterText(find.descendant(of: find.byType(CmCommandPalette), matching: find.byType(TextField)), 'cafe');
    await t.pump();
    expect(find.text('Loading'), findsOneWidget);
    await t.pump(const Duration(milliseconds: 300));
    expect(find.descendant(of: find.byType(CmCommandPalette), matching: find.text('Café Mocha Franchise')), findsOneWidget);
    await t.enterText(find.descendant(of: find.byType(CmCommandPalette), matching: find.byType(TextField)), 'orders');
    await t.pump(const Duration(milliseconds: 300));
    expect(find.text('Go to Orders'), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pumpAndSettle();
    expect(went, 'orders');
  });

  testWidgets('demo: data table row actions and the column picker', (t) async {
    window(t, const Size(1440, 3200));
    await t.pumpWidget(page());
    await t.pump();
    expect(find.text('Stage'), findsNothing, reason: 'Stage starts hidden');
    await t.tap(find.text('Columns'));
    await t.pump();
    await t.tap(find.widgetWithText(CmCheckbox, 'Stage'));
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pump();
    expect(find.text('Stage'), findsWidgets);
    await t.tap(find.bySemanticsLabel('Edit, Ravi Stores'));
    await t.pump();
    expect(find.text('Edit Ravi Stores'), findsOneWidget);
  });

  testWidgets('the example app opens the palette with Ctrl+K and the 1.7 page from it', (t) async {
    window(t, const Size(1440, 1000));
    await t.pumpWidget(const ExampleApp());
    await t.pump(const Duration(milliseconds: 500));
    await t.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await t.sendKeyEvent(LogicalKeyboardKey.keyK);
    await t.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await t.pump(const Duration(milliseconds: 500));
    expect(find.byType(CmCommandPalette), findsOneWidget);
    await t.enterText(find.descendant(of: find.byType(CmCommandPalette), matching: find.byType(TextField)), '1.7');
    await t.pump(const Duration(milliseconds: 300));
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    for (var i = 0; i < 5; i++) {
      await t.pump(const Duration(milliseconds: 100));
    }
    expect(find.byType(CmCommandPalette), findsNothing);
    expect(find.byType(Release17Page), findsOneWidget);
  });
}
