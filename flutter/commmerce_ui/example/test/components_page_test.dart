import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/components_page.dart';
import 'package:commmerce_ui_example/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// The page has looping skeleton animations, so it never settles: pump past the overlay transitions instead.
Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 5; i++) {
    await t.pump(const Duration(milliseconds: 100));
  }
}

/// Scrolls [f] to the middle of the list.
Future<void> reveal(WidgetTester t, Finder f) async {
  await Scrollable.ensureVisible(t.element(f), alignment: 0.5);
  await t.pump();
}

/// The page confirms each action in a snack bar: check it, then clear it so the next one shows at once.
Future<void> said(WidgetTester t, String message) async {
  expect(find.text(message), findsOneWidget);
  ScaffoldMessenger.of(t.element(find.byType(ComponentsPage))).clearSnackBars();
  await settle(t);
}

void main() {
  for (final size in const [Size(1440, 900), Size(900, 900), Size(390, 844)]) {
    testWidgets('components page lays out without errors at ${size.width.toInt()}px', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: const Scaffold(body: ComponentsPage())));
      await t.pump();
      // Scroll through every section so each one builds and lays out.
      final pos = t.state<ScrollableState>(find.byType(Scrollable).first).position;
      while (pos.pixels < pos.maxScrollExtent) {
        await t.drag(find.byType(ListView), const Offset(0, -400));
        await t.pump();
        expect(t.takeException(), isNull, reason: 'at ${pos.pixels.round()}px');
      }
      expect(find.text('Page, layout, grid and stack'), findsOneWidget, reason: 'reached the end');
      expect(find.text('Loading order', skipOffstage: false), findsNothing); // label is semantics only
    });
  }

  for (final size in const [Size(1440, 900), Size(390, 844)]) {
    testWidgets('every overlay opens and closes from the components page at ${size.width.toInt()}px', (t) async {
      t.view.physicalSize = size;
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: const Scaffold(body: ComponentsPage())));
      await t.scrollUntilVisible(find.text('Notifications'), 300, scrollable: find.byType(Scrollable).first);
      await settle(t);

      await reveal(t, find.text('Cancel order').first);
      await t.tap(find.text('Cancel order').first);
      await settle(t);
      expect(find.text('Cancel order #1042?'), findsOneWidget);
      await t.tap(find.text('Keep order'));
      await settle(t);
      await said(t, 'Order #1042 kept');

      for (final (open, shown) in const [('View order', 'Order #1042'), ('Filter orders', 'Search and Filter'), ('Notifications', 'Handloom dupatta is out of stock')]) {
        await reveal(t, find.text(open).first);
        await t.tap(find.text(open).first);
        await settle(t);
        expect(find.text(shown), findsOneWidget, reason: open);
        await t.sendKeyEvent(LogicalKeyboardKey.escape);
        await settle(t);
        expect(find.text(shown), findsNothing, reason: '$open closes on Esc');
      }

      await reveal(t, find.text('Share order'));
      await t.tap(find.text('Share order'));
      await settle(t);
      await t.tap(find.text('Copy order link'));
      await settle(t);
      await said(t, 'Share: copy');

      await reveal(t, find.bySemanticsLabel('Order #1042 actions'));
      await t.tap(find.bySemanticsLabel('Order #1042 actions'));
      await settle(t);
      await t.tap(find.text('Send invoice'));
      await settle(t);
      await said(t, 'Send invoice');
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('the orders search filter button opens the filter panel and applies on Search', (t) async {
    t.view.physicalSize = const Size(1440, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final handle = t.ensureSemantics();
    await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: const Scaffold(body: OrdersPage())));
    expect(find.text('#1041'), findsOneWidget);
    await t.tap(find.byWidgetPredicate((w) => w is CmIcon && w.name == CmIcons.filter));
    await t.pumpAndSettle();
    expect(find.text('Search and Filter'), findsOneWidget);
    await t.tap(find.text('Over Rs. 2,000'));
    await t.pump();
    await t.tap(find.text('Search'));
    await t.pumpAndSettle();
    expect(find.text('Search and Filter'), findsNothing);
    expect(find.text('#1042'), findsOneWidget);
    expect(find.text('#1041'), findsNothing);
    expect(find.bySemanticsLabel(RegExp('1 applied')), findsOneWidget);
    handle.dispose();
  });

  testWidgets('newer widgets on the components page: data table sorts prices by value, toasts are announced', (t) async {
    t.view.physicalSize = const Size(1440, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final handle = t.ensureSemantics();
    await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: const Scaffold(body: ComponentsPage())));
    final table = find.byType(CmDataTable);
    await t.scrollUntilVisible(table, 400, scrollable: find.byType(Scrollable).first);
    await reveal(t, table);
    await settle(t);
    final sortPrice = find.descendant(of: table, matching: find.bySemanticsLabel('Selling price, sortable'));
    List<String> order() {
      final names = ['Cotton kurta, indigo', 'Banarasi silk saree', 'Handloom dupatta', 'Block-print bedsheet'];
      final y = {for (final n in names) n: t.getTopLeft(find.descendant(of: table, matching: find.text(n))).dy};
      return names..sort((a, b) => y[a]!.compareTo(y[b]!));
    }
    await t.tap(sortPrice);
    await t.pump();
    // Rs. 749 < Rs. 1,299 < Rs. 1,899 < Rs. 8,499.
    expect(order(), ['Handloom dupatta', 'Cotton kurta, indigo', 'Block-print bedsheet', 'Banarasi silk saree']);
    expect(t.takeAnnouncements().single.message, 'Sorted by Selling price, ascending');

    await t.scrollUntilVisible(find.text('Archive order'), 400, scrollable: find.byType(Scrollable).first);
    await reveal(t, find.text('Archive order'));
    await t.tap(find.text('Save product'));
    await t.pump();
    await t.tap(find.text('Archive order'));
    await t.pump();
    expect(find.text('Product saved'), findsOneWidget);
    expect(find.text('Order #1042 archived'), findsOneWidget);
    expect(t.takeAnnouncements().map((a) => a.message), ['Product saved', 'Order #1042 archived']);
    await t.tap(find.text('Undo'));
    await settle(t);
    await said(t, 'Undo archive');
    expect(find.text('Order #1042 archived'), findsNothing);
    await t.pump(const Duration(seconds: 6));
    expect(find.text('Product saved'), findsNothing);
    handle.dispose();
  });
}
