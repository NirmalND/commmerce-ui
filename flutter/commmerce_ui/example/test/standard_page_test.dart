import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/standard_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget page({ThemeData? theme}) => MaterialApp(theme: theme ?? CmTheme.light(), home: const Scaffold(body: StandardPage()));

void main() {
  for (final size in const [Size(1440, 3200), Size(390, 4000)]) {
    for (final dark in [false, true]) {
      testWidgets('1.6 standard demo lays out at ${size.width.toInt()}px${dark ? ', dark' : ''}', (t) async {
        t.view.physicalSize = size;
        t.view.devicePixelRatio = 1;
        addTearDown(t.view.reset);
        await t.pumpWidget(page(theme: dark ? CmTheme.dark() : null));
        await t.pump(const Duration(milliseconds: 100));
        expect(t.takeException(), isNull);
        expect(find.text('Card variants'), findsOneWidget);
        expect(find.byType(CmSegmentedControl<String>), findsOneWidget);
        expect(find.byType(CmAppFrame), findsOneWidget);
      });
    }
  }

  testWidgets('demo: interactive cards select; the view switch shows the table; density makes rows compact', (t) async {
    t.view.physicalSize = const Size(1440, 3200);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(page());
    await t.pump();
    CmCard card(String name) => t.widget<CmCard>(find.widgetWithText(CmCard, name).first);
    expect(card('Rao Textiles Pvt Ltd').selected, isTrue);
    await t.tap(find.text('Renews 3 Jan 2027 · Rs. 85,000'));
    await t.pumpAndSettle();
    expect(card('Ravi Stores').selected, isTrue);
    expect(card('Rao Textiles Pvt Ltd').selected, isFalse);

    expect(find.byType(CmResourceList), findsOneWidget);
    await t.tap(find.text('Compact'));
    await t.pumpAndSettle();
    expect(t.widget<CmResourceList>(find.byType(CmResourceList)).density, CmDensity.compact);
    await t.tap(find.text('Table'));
    await t.pumpAndSettle();
    expect(find.byType(CmResourceList), findsNothing);
    expect(t.widget<CmDataTable>(find.byType(CmDataTable)).density, CmDensity.compact);
    await t.tap(find.text('Cards'));
    await t.pumpAndSettle();
    expect(find.text('Table as cards'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('demo: the panel frame keeps the page transparent on a white rounded panel', (t) async {
    t.view.physicalSize = const Size(1440, 3200);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(page());
    await t.pump();
    final inner = find.descendant(of: find.byType(CmAppFrame), matching: find.byType(CmPage));
    final bg = t.widget<ColoredBox>(find.descendant(of: inner, matching: find.byType(ColoredBox)).first);
    expect(bg.color, Colors.transparent);
  });
}
