// Every enabled control a screen reader can find must also be something it can activate:
// a button, link or toggle node without a tap action is announced but does nothing on
// VoiceOver/TalkBack double-tap. This walks the full semantics tree of the example pages,
// scrolling long pages to the end so every section is built and checked.
import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/components_page.dart';
import 'package:commmerce_ui_example/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

/// Adds the label of every node to [seen] and returns the controls that can't be activated.
List<String> unactionable(WidgetTester t, Set<String> seen) {
  final bad = <String>[];
  void visit(SemanticsNode n) {
    final d = n.getSemanticsData();
    if (d.label.isNotEmpty) seen.add(d.label);
    final interactive = d.hasFlag(SemanticsFlag.isButton) || d.hasFlag(SemanticsFlag.isLink) || d.hasFlag(SemanticsFlag.hasToggledState) || d.hasFlag(SemanticsFlag.hasCheckedState);
    final disabled = d.hasFlag(SemanticsFlag.hasEnabledState) && !d.hasFlag(SemanticsFlag.isEnabled);
    if (interactive && !disabled && !d.hasAction(SemanticsAction.tap)) bad.add(d.label.replaceAll('\n', ' '));
    n.visitChildren((c) { visit(c); return true; });
  }
  visit(t.binding.rootPipelineOwner.semanticsOwner?.rootSemanticsNode ?? RendererBinding.instance.renderViews.first.owner!.semanticsOwner!.rootSemanticsNode!);
  return bad;
}

Widget wrap(Widget page) => MaterialApp(theme: CmTheme.light(), home: Scaffold(body: page));

void main() {
  for (final entry in {
    'dashboard': const DashboardPage(),
    'orders': const OrdersPage(),
    'product editor': const ProductEditorPage(),
    'components': const ComponentsPage(),
  }.entries) {
    testWidgets('every control on ${entry.key} can be activated by a screen reader', (t) async {
      t.view.physicalSize = const Size(1440, 6000);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      final handle = t.ensureSemantics();
      await t.pumpWidget(wrap(entry.value));
      // Spinners, progress bars and skeletons loop forever, so pump a fixed time instead of settling.
      await t.pump(const Duration(milliseconds: 500));
      final seen = <String>{};
      final bad = <String>{...unactionable(t, seen)};
      // Long pages build lazily: scroll the main list to the end, checking as it goes.
      final lists = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down);
      if (lists.evaluate().isNotEmpty) {
        final pos = t.state<ScrollableState>(lists.first).position;
        while (pos.pixels < pos.maxScrollExtent) {
          pos.jumpTo((pos.pixels + 3000).clamp(0, pos.maxScrollExtent));
          await t.pump(const Duration(milliseconds: 100));
          bad.addAll(unactionable(t, seen));
        }
      }
      handle.dispose();
      expect(bad, isEmpty, reason: 'announced but not activatable: ${bad.join(' | ')}');
      if (entry.key == 'components') {
        // The audit reached the newest sections at the end of the page.
        for (final label in ['Selling price, sortable', 'Duplicate', 'About delivery dates', 'Save product', 'Loading orders', 'Importing products', 'Orders', 'Robinson Jain', 'Cotton kurta, indigo (no image)']) {
          expect(seen.any((l) => l.contains(label)), isTrue, reason: '"$label" was checked');
        }
      }
    });
  }
}
