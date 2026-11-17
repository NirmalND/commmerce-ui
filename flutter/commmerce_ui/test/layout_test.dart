import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {Size size = const Size(1280, 900)}) => MediaQuery(
      data: MediaQueryData(size: size),
      child: MaterialApp(theme: CmTheme.light(), home: Scaffold(body: Center(child: SingleChildScrollView(child: child)))),
    );

void phone(WidgetTester t) {
  t.view.physicalSize = const Size(390, 844);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

void main() {
  testWidgets('accordion opens on tap, reports state and is expanded in semantics', (t) async {
    final handle = t.ensureSemantics();
    final states = <bool>[];
    await t.pumpWidget(app(SizedBox(width: 480, child: CmAccordion(heading: 'Found in 2 orders', onToggle: states.add, child: const Text('#1042 · 12 Nov')))));
    expect(find.text('#1042 · 12 Nov'), findsNothing);
    var data = t.getSemantics(find.bySemanticsLabel('Found in 2 orders').first).getSemanticsData();
    expect(data.hasFlag(SemanticsFlag.hasExpandedState), isTrue);
    expect(data.hasFlag(SemanticsFlag.isExpanded), isFalse);
    expect(data.hasFlag(SemanticsFlag.isHeader), isTrue);

    await t.tap(find.text('Found in 2 orders'));
    await t.pumpAndSettle();
    expect(find.text('#1042 · 12 Nov'), findsOneWidget);
    expect(states, [true]);
    data = t.getSemantics(find.bySemanticsLabel('Found in 2 orders').first).getSemanticsData();
    expect(data.hasFlag(SemanticsFlag.isExpanded), isTrue);
    handle.dispose();
  });

  testWidgets('accordion works from the keyboard and can be disabled', (t) async {
    await t.pumpWidget(app(Column(children: [
      const SizedBox(width: 480, child: CmAccordion(heading: 'Cart details', child: Text('3 items · Rs. 1,240'))),
      const SizedBox(width: 480, child: CmAccordion(heading: 'Locked', enabled: false, child: Text('Hidden'))),
    ])));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pumpAndSettle();
    expect(find.text('3 items · Rs. 1,240'), findsOneWidget);
    await t.tap(find.text('Locked'));
    await t.pumpAndSettle();
    expect(find.text('Hidden'), findsNothing);
  });

  testWidgets('controlled accordion follows its open value', (t) async {
    var open = true;
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => SizedBox(width: 480, child: CmAccordion(heading: 'Notes', open: open, onToggle: (v) => set(() => open = v), child: const Text('Gift wrap'))))));
    expect(find.text('Gift wrap'), findsOneWidget);
    await t.tap(find.text('Notes'));
    await t.pumpAndSettle();
    expect(open, isFalse);
    expect(find.text('Gift wrap'), findsNothing);
  });

  testWidgets('action bar: actions fire, critical heading is a live region', (t) async {
    final handle = t.ensureSemantics();
    var saved = 0;
    await t.pumpWidget(app(SizedBox(width: 1000, child: Column(children: [
      CmActionBar(
        eyebrow: '#1042',
        heading: 'Priya Sharma',
        adornment: const CmBadge('Paid', tone: CmTone.success),
        actions: [CmButton(label: 'Fulfil order', variant: CmButtonVariant.primary, size: CmButtonSize.large, onPressed: () => saved++)],
      ),
      const CmActionBar(tone: CmTone.critical, heading: 'Add a shipping address to fulfil this order'),
    ]))));
    await t.tap(find.text('Fulfil order'));
    expect(saved, 1);
    expect(find.text('Paid'), findsOneWidget);
    final live = t.getSemantics(find.text('Add a shipping address to fulfil this order')).getSemanticsData();
    expect(live.hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    // Desktop: text and actions share one row.
    expect(t.getTopLeft(find.text('Fulfil order')).dy, lessThan(t.getBottomLeft(find.text('Priya Sharma')).dy));
    handle.dispose();
  });

  testWidgets('action bar on a phone puts actions under the text', (t) async {
    phone(t);
    await t.pumpWidget(app(
      CmActionBar(eyebrow: 'Add product', heading: 'Cotton kurta', actions: [CmButton(label: 'Save', variant: CmButtonVariant.primary, onPressed: () {})]),
      size: const Size(390, 844),
    ));
    expect(t.getTopLeft(find.text('Save')).dy, greaterThan(t.getBottomLeft(find.text('Cotton kurta')).dy));
    expect(t.getSize(find.byType(CmActionBar)).height, greaterThanOrEqualTo(68));
  });
}
