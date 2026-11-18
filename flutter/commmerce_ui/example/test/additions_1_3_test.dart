import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/additions_1_3.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget page({ThemeData? theme, ValueChanged<String>? onAction}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Scaffold(body: ListView(padding: const EdgeInsets.all(20), children: [Additions13(onAction: onAction)])),
    );

void main() {
  for (final size in const [Size(1440, 2400), Size(390, 2400)]) {
    for (final dark in [false, true]) {
      testWidgets('1.3 demo sections lay out at ${size.width.toInt()}px${dark ? ', dark' : ''}', (t) async {
        t.view.physicalSize = size;
        t.view.devicePixelRatio = 1;
        addTearDown(t.view.reset);
        await t.pumpWidget(page(theme: dark ? CmTheme.dark() : null));
        await t.pump(const Duration(milliseconds: 100));
        expect(t.takeException(), isNull);
        expect(find.text('Leads by status'), findsNothing, reason: 'the board name is for screen readers');
        expect(find.textContaining('Status colour'), findsOneWidget);
      });
    }
  }

  testWidgets('board demo: a keyboard move saves after a second; Lost refuses grade A', (t) async {
    t.view.physicalSize = const Size(1440, 2400);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final said = <String>[];
    await t.pumpWidget(page(onAction: said.add));
    // Tapping the title opens the record; tapping elsewhere on the card focuses it.
    await t.tap(find.text('Surat'));
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    for (var i = 0; i < 3; i++) {
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    }
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    await t.pump();
    expect(t.takeAnnouncements().last.message, 'Moved Meera Textiles to Won, position 1 of 1.');
    await t.pump(const Duration(seconds: 1));
    expect(find.text('Meera Textiles'), findsOneWidget);
    // Ravi Stores is grade A: Lost refuses it.
    await t.tap(find.text('Bengaluru'));
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    for (var i = 0; i < 5; i++) {
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    }
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    await t.pump();
    expect(t.takeAnnouncements().last.message, 'Ravi Stores can\'t be moved to Lost.');
    // Enter on the card, or a tap on its title, opens the record.
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.tap(find.text('Kumar Electricals'));
    expect(said, ['Open Ravi Stores', 'Open Kumar Electricals']);
  });
}
