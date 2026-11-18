import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {Size size = const Size(1280, 900)}) => MediaQuery(
      data: MediaQueryData(size: size),
      child: MaterialApp(theme: CmTheme.light(), home: Scaffold(body: Center(child: SingleChildScrollView(child: child)))),
    );

void main() {
  testWidgets('app card: details, rating, offer and links', (t) async {
    final handle = t.ensureSemantics();
    var signups = 0, details = 0, reviews = 0;
    await t.pumpWidget(app(SizedBox(width: 420, child: CmAppCard(
      name: 'PayWise',
      developer: 'PayWise Technologies',
      rating: 4.5,
      reviews: 1284,
      onReviewsTap: () => reviews++,
      pricing: 'Free plan available. 7-day free trial.',
      offer: 'Bundle products and kits with Bundle Manager: 20% off',
      actions: [CmButton(label: 'Sign Up', variant: CmButtonVariant.primary, onPressed: () => signups++), CmButton(label: 'Contact', onPressed: () {})],
      onViewDetails: () => details++,
    ))));
    expect(find.text('By PayWise Technologies'), findsOneWidget);
    expect(find.bySemanticsLabel('Rated 4.5 out of 5'), findsOneWidget);
    expect(find.text('1,284 Reviews'), findsOneWidget);
    expect(find.bySemanticsLabel('Offer: Bundle products and kits with Bundle Manager: 20% off'), findsOneWidget);
    final name = t.getSemantics(find.text('PayWise')).getSemanticsData();
    expect(name.hasFlag(SemanticsFlag.isHeader), isTrue);
    await t.tap(find.text('Sign Up'));
    await t.tap(find.text('1,284 Reviews'));
    await t.tap(find.bySemanticsLabel('View details of PayWise'));
    expect((signups, reviews, details), (1, 1, 1));
    handle.dispose();
  });

  testWidgets('app card: keyboard reaches View Details; narrow cards shrink', (t) async {
    var details = 0;
    await t.pumpWidget(app(SizedBox(width: 340, child: CmAppCard(name: 'ShipQuick', pricing: 'From Rs. 499 a month.', onViewDetails: () => details++, status: CmToggle(semanticLabel: 'ShipQuick on', value: true, onChanged: (_) {})))));
    final logo = find.descendant(of: find.byType(CmAppCard), matching: find.byType(Container)).at(1);
    expect(t.getSize(logo), const Size(96, 40));
    await t.sendKeyEvent(LogicalKeyboardKey.tab); // toggle
    await t.sendKeyEvent(LogicalKeyboardKey.tab); // View Details
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(details, 1);
    expect(find.text('1 Review'), findsNothing);
    await t.pumpWidget(app(const SizedBox(width: 340, child: CmAppCard(name: 'New app', rating: 5, reviews: 1))));
    expect(find.text('1 Review'), findsOneWidget);
  });
}
