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
  testWidgets('skeleton display announces loading once and hides its shapes', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const SizedBox(width: 1200, child: CmSkeletonDisplay(label: 'Loading order', navigation: true))));
    await t.pump(const Duration(milliseconds: 300));
    final node = t.getSemantics(find.bySemanticsLabel('Loading order'));
    expect(node.getSemanticsData().hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    // Header, 4 main cards, 5 side cards and the navigation placeholder.
    expect(find.byType(CmSkeleton), findsNWidgets(11));
    final main = t.getTopLeft(find.byType(CmSkeleton).at(2));
    final side = t.getTopLeft(find.byType(CmSkeleton).at(6));
    expect(side.dx, greaterThan(main.dx + 300), reason: 'side column sits to the right on desktop');
    expect(side.dy, main.dy);
    handle.dispose();
  });

  testWidgets('skeleton display stacks on phones and drops the navigation', (t) async {
    t.view.physicalSize = const Size(390, 844);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(app(const CmSkeletonDisplay(navigation: true), size: const Size(390, 844)));
    expect(find.byType(CmSkeleton), findsNWidgets(10));
    expect(t.getSize(find.byType(CmSkeleton).first).height, 60);
    final xs = List.generate(10, (i) => t.getTopLeft(find.byType(CmSkeleton).at(i)).dx).toSet();
    expect(xs.length, 1, reason: 'every card starts at the same left edge');
    await t.pumpWidget(app(const CmSkeletonDisplay(layout: CmSkeletonLayout.oneColumn), size: const Size(390, 844)));
    expect(find.byType(CmSkeleton), findsNWidgets(3));
  });

  testWidgets('comment box posts trimmed text, clears, and ignores empty text', (t) async {
    final posted = <String>[];
    await t.pumpWidget(app(SizedBox(width: 600, child: CmCommentBox(
      onSubmit: posted.add,
      comments: [CmComment(text: 'Customer asked for gift wrap.', author: 'Robinson Jain', dateTime: DateTime(2023, 2, 9, 17, 7))],
    ))));
    expect(find.text('9 Feb 2023, 5:07 pm'), findsOneWidget);
    expect(find.text('– Robinson Jain'), findsOneWidget);
    await t.tap(find.text('Post comment'));
    expect(posted, isEmpty);
    await t.enterText(find.byType(TextField), '  Shipped with Delhivery, AWB 12345  ');
    await t.tap(find.text('Post comment'));
    await t.pump();
    expect(posted, ['Shipped with Delhivery, AWB 12345']);
    expect(find.text('Shipped with Delhivery, AWB 12345'), findsNothing, reason: 'box cleared');
  });

  testWidgets('comment box posts with Ctrl+Enter and can be disabled', (t) async {
    final posted = <String>[];
    await t.pumpWidget(app(SizedBox(width: 600, child: CmCommentBox(onSubmit: posted.add))));
    await t.enterText(find.byType(TextField), 'Called customer');
    await t.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await t.pump();
    expect(posted, ['Called customer']);
    expect(find.bySemanticsLabel('Comments'), findsWidgets);

    await t.pumpWidget(app(SizedBox(width: 600, child: CmCommentBox(onSubmit: posted.add, enabled: false))));
    await t.tap(find.text('Post comment'));
    expect(posted.length, 1);
  });

  testWidgets('smart tips: tip is one link, tour button fires, keyboard opens a tip', (t) async {
    final handle = t.ensureSemantics();
    var opened = '', tours = 0;
    await t.pumpWidget(app(SizedBox(width: 400, child: CmSmartTips(
      tourHeading: 'Take a tour of Commmerce',
      onTour: () => tours++,
      tips: [
        CmSmartTip(heading: 'Shipping and delivery', description: 'Set rates for Delhi NCR and the rest of India.', onTap: () => opened = 'shipping'),
        CmSmartTip(heading: 'Importing products', description: 'Bring your catalog in from a CSV.', opensNewTab: true, onTap: () => opened = 'import'),
      ],
    ))));
    expect(find.text('Smart tips'), findsOneWidget);
    await t.tap(find.text('Start'));
    expect(tours, 1);
    await t.tap(find.text('Shipping and delivery'));
    expect(opened, 'shipping');
    final link = t.getSemantics(find.bySemanticsLabel(RegExp('^Importing products'))).getSemanticsData();
    expect(link.hasFlag(SemanticsFlag.isLink), isTrue);
    expect(link.label, contains('opens in a new tab'));
    // Tab: Start button, first tip, second tip.
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(opened, 'import');
    handle.dispose();
  });
}
