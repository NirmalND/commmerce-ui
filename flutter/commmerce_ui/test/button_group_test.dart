// CmButtonGroup (web cm-button-group, 1.7): wrap and menu overflow, priority order, menu items mirroring the buttons,
// focus, RTL and the More trigger's sizes. Desktop checks run as macOS; the test default (Android) is a touch platform.
import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> pumpGroup(WidgetTester t, double width, Widget group, {TextDirection dir = TextDirection.ltr}) async {
  t.view.physicalSize = const Size(1400, 800);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(MaterialApp(
    theme: CmTheme.light(),
    home: Directionality(
      textDirection: dir,
      child: Scaffold(body: Align(alignment: AlignmentDirectional.topStart, child: SizedBox(width: width, child: group))),
    ),
  ));
  await t.pump();
}

/// Runs [body] as a desktop (macOS: mouse pointer, no touch sizes).
Future<void> desktop(Future<void> Function() body) async {
  debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
  try {
    await body();
  } finally {
    debugDefaultTargetPlatformOverride = null;
  }
}

/// The More trigger's button (it stays in the tree, unpainted, while everything fits).
Finder get more => find.descendant(of: find.byType(CmActionMenu), matching: find.byType(CmButton));

/// A button that is on screen (hidden buttons are laid out but not painted or hit).
Finder shown(String label) => find.widgetWithText(CmButton, label).hitTestable();

void main() {
  // Five buttons of the same width (in the test font every glyph is as wide as the text is tall).
  const labels = ['Alpha', 'Bravo', 'Charl', 'Delta', 'Echoo'];
  List<int>? lastHidden;
  final pressed = <String>[];

  Widget outcomes({CmButtonSize size = CmButtonSize.medium, CmButtonGroupAlign align = CmButtonGroupAlign.start, String? moreIcon}) => CmButtonGroup(
        overflow: CmButtonGroupOverflow.menu,
        label: 'Call outcome',
        align: align,
        moreIcon: moreIcon,
        onOverflowChange: (h) => lastHidden = h,
        children: [
          CmButton(label: 'Alpha', size: size, variant: CmButtonVariant.primary, onPressed: () => pressed.add('Alpha')),
          CmButton(label: 'Bravo', size: size, icon: CmIcons.calendar, onPressed: () => pressed.add('Bravo')),
          CmButtonGroupItem(priority: CmButtonPriority.low, child: CmButton(label: 'Charl', size: size, onPressed: () => pressed.add('Charl'))),
          CmButton(label: 'Delta', size: size, onPressed: null),
          CmButtonGroupItem(priority: CmButtonPriority.high, child: CmButton(label: 'Echoo', size: size, tone: CmButtonTone.critical, onPressed: () => pressed.add('Echoo'))),
        ],
      );

  setUp(() {
    lastHidden = null;
    pressed.clear();
  });

  group('menu overflow', () {
    testWidgets('everything fits: no More, no overflow change, buttons 8 apart', (t) => desktop(() async {
          await pumpGroup(t, 900, outcomes());
          expect(more.hitTestable(), findsNothing);
          expect(lastHidden, isNull);
          for (final l in labels) {
            expect(shown(l), findsOneWidget);
          }
          expect(t.getRect(find.widgetWithText(CmButton, 'Bravo')).left - t.getRect(find.widgetWithText(CmButton, 'Alpha')).right, 8);
          expect(t.getSize(find.widgetWithText(CmButton, 'Alpha')).height, 36);
        }));

    testWidgets('narrower: low first, then normal from the last backwards, then high, primary last', (t) => desktop(() async {
          const order = ['Charl', 'Delta', 'Bravo', 'Echoo', 'Alpha'];
          var seen = 0;
          for (var w = 700.0; w >= 60; w -= 10) {
            await pumpGroup(t, w, outcomes());
            await t.pump();
            final hidden = [for (final l in labels) if (shown(l).evaluate().isEmpty) l];
            expect(hidden.length, greaterThanOrEqualTo(seen), reason: 'at $w buttons only move into the menu as it narrows');
            expect(hidden.toSet(), order.take(hidden.length).toSet(), reason: 'at $w');
            if (hidden.isNotEmpty) {
              expect(more.hitTestable(), findsOneWidget, reason: 'at $w');
              expect(lastHidden, [for (var i = 0; i < labels.length; i++) if (hidden.contains(labels[i])) i]);
              // Everything shown fits inside the group, More at the end.
              final group = t.getRect(find.byType(CmButtonGroup));
              expect(t.getRect(more).right, lessThanOrEqualTo(group.right + 0.5));
            }
            seen = hidden.length;
          }
          expect(seen, 5, reason: 'at 60 only More is left');
        }));

    testWidgets('menu items mirror the buttons in reading order; choosing one runs its onPressed', (t) => desktop(() async {
          await pumpGroup(t, 260, outcomes());
          final items = t.widget<CmActionMenu>(find.byType(CmActionMenu)).items;
          final hidden = [for (final i in lastHidden!) labels[i]];
          expect(items.map((i) => i.label).toList(), hidden);
          expect(hidden, containsAll(['Bravo', 'Charl', 'Delta']));
          final bravo = items.firstWhere((i) => i.label == 'Bravo');
          expect(bravo.icon, CmIcons.calendar);
          expect(bravo.disabled, isFalse);
          expect(items.firstWhere((i) => i.label == 'Delta').disabled, isTrue, reason: 'a disabled button is a disabled item');

          await t.tap(more);
          await t.pumpAndSettle();
          await t.tap(find.text('Charl').hitTestable());
          await t.pumpAndSettle();
          expect(pressed, ['Charl']);

          // A disabled item does nothing.
          await t.tap(more);
          await t.pumpAndSettle();
          await t.tap(find.text('Delta').hitTestable());
          await t.pumpAndSettle();
          expect(pressed, ['Charl']);
        }));

    testWidgets('critical and loading buttons: destructive and disabled items', (t) => desktop(() async {
          await pumpGroup(
            t,
            150,
            CmButtonGroup(overflow: CmButtonGroupOverflow.menu, children: [
              CmButton(label: 'Save', onPressed: () {}),
              CmButton(label: 'Sending', loading: true, onPressed: () {}),
              CmButton(label: 'Not interested', tone: CmButtonTone.critical, onPressed: () {}),
            ]),
          );
          final items = t.widget<CmActionMenu>(find.byType(CmActionMenu)).items;
          expect(items.firstWhere((i) => i.label == 'Not interested').critical, isTrue);
          expect(items.firstWhere((i) => i.label == 'Sending').disabled, isTrue);
        }));

    testWidgets('buttons come back when the group is wider again', (t) => desktop(() async {
          await pumpGroup(t, 260, outcomes());
          expect(lastHidden, isNotEmpty);
          await pumpGroup(t, 900, outcomes());
          await t.pump();
          expect(lastHidden, isEmpty);
          for (final l in labels) {
            expect(shown(l), findsOneWidget);
          }
          expect(more.hitTestable(), findsNothing);
        }));

    testWidgets('RTL: buttons from the right, More at the left end; end alignment', (t) => desktop(() async {
          await pumpGroup(t, 400, outcomes(), dir: TextDirection.rtl);
          final group = t.getRect(find.byType(CmButtonGroup));
          expect(t.getRect(find.widgetWithText(CmButton, 'Alpha')).right, group.right);
          final m = t.getRect(more);
          for (final l in labels) {
            if (shown(l).evaluate().isNotEmpty) expect(t.getRect(find.widgetWithText(CmButton, l)).left, greaterThan(m.right));
          }
          await pumpGroup(t, 900, outcomes(align: CmButtonGroupAlign.end));
          expect(t.getRect(find.widgetWithText(CmButton, 'Echoo')).right, t.getRect(find.byType(CmButtonGroup)).right);
        }));

    testWidgets('More matches the button size: 36, slim 32, large 40; icon-only is square', (t) => desktop(() async {
          await pumpGroup(t, 200, outcomes());
          expect(t.getSize(more).height, 36);
          await pumpGroup(t, 200, outcomes(size: CmButtonSize.slim));
          expect(t.getSize(more).height, 32);
          await pumpGroup(t, 200, outcomes(size: CmButtonSize.large));
          expect(t.getSize(more).height, 40);
          await pumpGroup(t, 200, outcomes(moreIcon: CmIcons.more));
          expect(t.getSize(more), const Size(36, 36));
        }));

    testWidgets('touch: More is drawn 40 with a 44 hit area; drawn gap stays 8', (t) async {
      await pumpGroup(t, 300, outcomes(size: CmButtonSize.slim));
      expect(t.getSize(more).height, 44, reason: 'hit area');
      final drawn = find.descendant(of: more, matching: find.byType(Container)).first;
      expect(t.getSize(drawn).height, 40);
      final a = find.descendant(of: find.widgetWithText(CmButton, 'Alpha'), matching: find.byType(Container)).first;
      final b = find.descendant(of: find.widgetWithText(CmButton, 'Bravo'), matching: find.byType(Container)).first;
      if (shown('Bravo').evaluate().isNotEmpty) expect(t.getRect(b).left - t.getRect(a).right, 8);
    });

    testWidgets('the group is named for screen readers; hidden buttons are not read', (t) => desktop(() async {
          final handle = t.ensureSemantics();
          await pumpGroup(t, 260, outcomes());
          expect(find.bySemanticsLabel('Call outcome'), findsOneWidget);
          final hidden = [for (final i in lastHidden!) labels[i]];
          expect(find.bySemanticsLabel(hidden.first), findsNothing);
          expect(find.bySemanticsLabel('Alpha'), findsOneWidget);
          expect(find.bySemanticsLabel('More'), findsOneWidget);
          handle.dispose();
        }));

    testWidgets('focus on a button that moves into the menu goes to More, and back to the last button', (t) => desktop(() async {
          await pumpGroup(t, 900, outcomes());
          // Tab to Bravo (Delta is disabled and skipped).
          await t.sendKeyEvent(LogicalKeyboardKey.tab);
          await t.sendKeyEvent(LogicalKeyboardKey.tab);
          await t.pump();
          await pumpGroup(t, 200, outcomes());
          await t.pump();
          expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmButtonGroup more');
          await pumpGroup(t, 900, outcomes());
          await t.pump();
          await t.pump();
          final focused = FocusManager.instance.primaryFocus;
          expect(focused, isNotNull);
          final echo = find.widgetWithText(CmButton, 'Echoo');
          expect(find.descendant(of: echo, matching: find.byElementPredicate((e) => e == focused!.context)), findsOneWidget,
              reason: 'focus moved to the last button');
        }));
  });

  group('wrap overflow (default)', () {
    testWidgets('wraps onto more lines 8 apart', (t) => desktop(() async {
          await pumpGroup(
            t,
            200,
            CmButtonGroup(children: [for (final l in labels) CmButton(label: l, onPressed: () {})]),
          );
          expect(find.byType(Wrap), findsOneWidget);
          final a = t.getRect(find.widgetWithText(CmButton, 'Alpha'));
          final e = t.getRect(find.widgetWithText(CmButton, 'Echoo'));
          expect(e.top, greaterThan(a.top));
          for (final l in labels) {
            expect(shown(l), findsOneWidget);
          }
          final rows = {for (final l in labels) t.getRect(find.widgetWithText(CmButton, l)).top}.toList()..sort();
          expect(rows[1] - rows[0], 36 + 8);
        }));
  });
}
