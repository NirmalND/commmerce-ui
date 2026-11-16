import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {bool still = false}) => MaterialApp(
      theme: CmTheme.light(),
      home: Builder(builder: (context) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: still),
            child: Scaffold(body: Center(child: SizedBox(width: 500, child: child))),
          )),
    );

void main() {
  group('tooltip', () {
    Widget tip() => Column(mainAxisSize: MainAxisSize.min, children: [
          CmTooltip(message: 'Duplicate this product', child: CmButton(label: 'Duplicate', onPressed: () {})),
          CmButton(label: 'Other', onPressed: () {}),
        ]);

    testWidgets('shows on hover after the delay', (t) async {
      await t.pumpWidget(app(tip()));
      final mouse = await t.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: Offset.zero);
      addTearDown(mouse.removePointer);
      await mouse.moveTo(t.getCenter(find.text('Duplicate')));
      await t.pump(const Duration(milliseconds: 100));
      expect(find.text('Duplicate this product'), findsNothing, reason: 'waits 300ms');
      await t.pump(const Duration(milliseconds: 300));
      await t.pump(const Duration(milliseconds: 200));
      expect(find.text('Duplicate this product'), findsOneWidget);
      await mouse.moveTo(Offset.zero);
      await t.pumpAndSettle();
      expect(find.text('Duplicate this product'), findsNothing);
    });

    testWidgets('shows on long press', (t) async {
      await t.pumpWidget(app(tip()));
      await t.longPress(find.text('Duplicate'));
      await t.pump(const Duration(milliseconds: 200));
      expect(find.text('Duplicate this product'), findsOneWidget);
      await t.pumpAndSettle(const Duration(seconds: 3));
    });

    testWidgets('shows on keyboard focus at once, hides on blur and on Esc', (t) async {
      await t.pumpWidget(app(tip()));
      await t.sendKeyEvent(LogicalKeyboardKey.tab);
      await t.pump(const Duration(milliseconds: 200));
      expect(find.text('Duplicate this product'), findsOneWidget);
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pumpAndSettle();
      expect(find.text('Duplicate this product'), findsNothing);

      await t.sendKeyEvent(LogicalKeyboardKey.tab); // to Other
      await t.sendKeyEvent(LogicalKeyboardKey.tab); // back round to Duplicate
      await t.pump(const Duration(milliseconds: 200));
      expect(find.text('Duplicate this product'), findsOneWidget);
      await t.sendKeyEvent(LogicalKeyboardKey.tab);
      await t.pumpAndSettle();
      expect(find.text('Duplicate this product'), findsNothing, reason: 'focus moved away');
    });

    testWidgets('screen readers get the text as a description of the control, which keeps its name and tap', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(tip()));
      final node = t.getSemantics(find.byType(CmButton).first);
      final data = node.getSemanticsData();
      expect(data.label, 'Duplicate');
      expect(data.tooltip, 'Duplicate this product');
      expect(data.hasAction(SemanticsAction.tap), isTrue);
      handle.dispose();
    });
  });

  group('toast', () {
    Widget launcher(void Function(BuildContext) onPressed) => Builder(builder: (context) => CmButton(label: 'Go', onPressed: () => onPressed(context)));

    testWidgets('each toast is announced on its own and closes after 5 seconds', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(launcher((c) => showCmToast(c, 'Product saved'))));
      await t.tap(find.text('Go'));
      await t.pump();
      expect(find.text('Product saved'), findsOneWidget);
      expect(t.takeAnnouncements().map((a) => a.message), ['Product saved']);

      await t.pumpWidget(app(launcher((c) => showCmToast(c, 'Order archived'))));
      await t.tap(find.text('Go'));
      await t.pump();
      expect(find.text('Order archived'), findsOneWidget);
      expect(find.text('Product saved'), findsOneWidget, reason: 'both show');
      expect(t.takeAnnouncements().map((a) => a.message), ['Order archived'], reason: 'only the new toast is read');

      await t.pump(const Duration(milliseconds: 4900));
      expect(find.text('Order archived'), findsOneWidget);
      await t.pump(const Duration(milliseconds: 200));
      expect(find.text('Order archived'), findsNothing);
      expect(find.text('Product saved'), findsNothing);
      handle.dispose();
    });

    testWidgets('action runs and closes; Dismiss closes; closed reports why', (t) async {
      final handle = t.ensureSemantics();
      var undone = 0;
      late CmToastController toast;
      await t.pumpWidget(app(launcher((c) => toast = showCmToast(c, 'Order archived', actionLabel: 'Undo', onAction: () => undone++))));
      await t.tap(find.text('Go'));
      await t.pump();
      expect(t.getSemantics(find.bySemanticsLabel('Undo')).getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      await t.pump(const Duration(seconds: 9)); // 10 seconds with an action
      expect(find.text('Order archived'), findsOneWidget);
      t.semantics.tap(find.semantics.byLabel('Undo'));
      await t.pump();
      expect(undone, 1);
      expect(find.text('Order archived'), findsNothing);
      expect(await toast.closed, CmToastDismissReason.action);

      await t.tap(find.text('Go'));
      await t.pump();
      await t.tap(find.bySemanticsLabel('Dismiss'));
      await t.pump();
      expect(find.text('Order archived'), findsNothing);
      expect(await toast.closed, CmToastDismissReason.close);
      t.takeAnnouncements();
      handle.dispose();
    });

    testWidgets('hover pauses the timer; at most three show; critical has the alert icon', (t) async {
      var n = 0;
      await t.pumpWidget(app(launcher((c) => showCmToast(c, 'Toast ${++n}', tone: n == 3 ? CmToastTone.critical : CmToastTone.neutral))));
      await t.tap(find.text('Go'));
      await t.pump();
      final mouse = await t.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: t.getCenter(find.text('Toast 1')));
      addTearDown(mouse.removePointer);
      await t.pump(const Duration(seconds: 8));
      expect(find.text('Toast 1'), findsOneWidget, reason: 'paused while hovered');
      await mouse.moveTo(Offset.zero);
      await t.pump(const Duration(seconds: 6));
      expect(find.text('Toast 1'), findsNothing);

      for (var i = 0; i < 4; i++) {
        await t.tap(find.text('Go'));
        await t.pump();
      }
      expect(find.text('Toast 2'), findsNothing, reason: 'oldest removed above three');
      expect(find.text('Toast 3'), findsOneWidget);
      expect(find.text('Toast 5'), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is CmIcon && w.name == CmIcons.alert), findsOneWidget);
      await t.pump(const Duration(seconds: 6));
    });

    test('duration is clamped to 2–10 seconds', () {
      expect(const CmToast(message: 'x').effectiveDuration, const Duration(seconds: 5));
      expect(const CmToast(message: 'x', actionLabel: 'Undo').effectiveDuration, const Duration(seconds: 10));
      expect(const CmToast(message: 'x', duration: Duration(seconds: 1)).effectiveDuration, const Duration(seconds: 2));
      expect(const CmToast(message: 'x', duration: Duration(seconds: 30)).effectiveDuration, const Duration(seconds: 10));
    });
  });

  testWidgets('spinner: sizes and a live-region label', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Row(mainAxisSize: MainAxisSize.min, children: [CmSpinner(label: 'Loading orders'), CmSpinner(size: CmSpinnerSize.small)])));
    expect(t.getSize(find.byType(CmSpinner).first), const Size(44, 44));
    expect(t.getSize(find.byType(CmSpinner).last), const Size(20, 20));
    final data = t.getSemantics(find.bySemanticsLabel('Loading orders')).getSemanticsData();
    expect(data.hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    expect(find.bySemanticsLabel('Loading'), findsOneWidget);
    handle.dispose();
  });

  group('progress bar', () {
    testWidgets('label and value for screen readers; clamped; fill width follows the value', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const CmProgressBar(label: 'Importing products', value: 40, showValue: true), still: true));
      final data = t.getSemantics(find.bySemanticsLabel('Importing products')).getSemanticsData();
      expect(data.value, '40%');
      expect(find.text('40%'), findsOneWidget);
      final fill = t.widget<AnimatedFractionallySizedBox>(find.byType(AnimatedFractionallySizedBox));
      expect(fill.widthFactor, 0.4);

      await t.pumpWidget(app(const CmProgressBar(label: 'Importing products', value: 150), still: true));
      expect(t.getSemantics(find.bySemanticsLabel('Importing products')).getSemanticsData().value, '100%');
      expect(find.text('100%'), findsNothing, reason: 'value text only with showValue');
      await t.pumpWidget(app(const CmProgressBar(label: 'Importing products', value: -5), still: true));
      expect(t.getSemantics(find.bySemanticsLabel('Importing products')).getSemanticsData().value, '0%');
      handle.dispose();
    });

    testWidgets('indeterminate says "In progress"; hidden label still names it; sizes', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const CmProgressBar(label: 'Updating prices', labelHidden: true, size: CmProgressBarSize.small, showValue: true)));
      await t.pump(const Duration(milliseconds: 500));
      expect(find.text('Updating prices'), findsNothing);
      final data = t.getSemantics(find.bySemanticsLabel('Updating prices')).getSemanticsData();
      expect(data.value, 'In progress');
      expect(t.getSize(find.byType(CmProgressBar)).height, 4);
      await t.pumpWidget(app(const CmProgressBar(label: 'Updating prices', value: 10)));
      expect(t.getSize(find.byType(CmProgressBar)).height, greaterThan(8), reason: 'label above an 8px bar');
      handle.dispose();
    });
  });
}
