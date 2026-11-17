import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// 1.6 leftovers ported in 1.7: status tabs dropdown and small size, menu rows, headings and shortcuts.
Widget app(Widget child, {TargetPlatform platform = TargetPlatform.linux}) => MaterialApp(
      theme: CmTheme.light().copyWith(platform: platform),
      home: Scaffold(body: Align(alignment: Alignment.topLeft, child: child)),
    );

void window(WidgetTester t, Size size) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

const tabs = [CmStatusTab('all', 'All', count: 233), CmStatusTab('open', 'Open', count: 12), CmStatusTab('closed', 'Closed')];

void main() {
  group('status tabs', () {
    testWidgets('small: 13px labels, 32 tall, 16 apart', (t) async {
      window(t, const Size(1200, 800));
      await t.pumpWidget(app(CmStatusTabs(tabs: tabs, value: 'all', onChanged: (_) {}, size: CmStatusTabsSize.small)));
      final label = t.widget<Text>(find.text('Open').last);
      expect(label.style?.fontSize, 13);
      final tab = find.ancestor(of: find.text('Closed').last, matching: find.byType(Container)).last;
      expect(t.getSize(tab).height, 32);
      await t.pumpWidget(app(CmStatusTabs(tabs: tabs, value: 'all', onChanged: (_) {})));
      expect(t.widget<Text>(find.text('Open').last).style?.fontSize, 14);
    });

    testWidgets('mobile select: a dropdown with counts on phone widths, tabs elsewhere', (t) async {
      window(t, const Size(390, 800));
      String? chosen;
      await t.pumpWidget(app(SizedBox(width: 360, child: CmStatusTabs(tabs: tabs, value: 'all', onChanged: (v) => chosen = v, mobile: CmStatusTabsMobile.select))));
      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
      expect(find.text('All (233)'), findsOneWidget);
      await t.tap(find.text('All (233)'));
      await t.pumpAndSettle();
      await t.tap(find.text('Open (12)').last);
      await t.pumpAndSettle();
      expect(chosen, 'open');

      window(t, const Size(1200, 800));
      await t.pumpWidget(app(CmStatusTabs(tabs: tabs, value: 'all', onChanged: (_) {}, mobile: CmStatusTabsMobile.select)));
      expect(find.byType(DropdownButtonFormField<String>), findsNothing);
      expect(find.text('Open'), findsWidgets);
    });
  });

  group('action menu (owner standard 1.6)', () {
    const items = [
      CmMenuItem.heading('Order'),
      CmMenuItem(label: 'Edit', shortcut: 'mod+e', icon: 'edit'),
      CmMenuItem(label: 'Duplicate'),
      CmMenuItem.divider(),
      CmMenuItem.heading('Danger zone'),
      CmMenuItem(label: 'Delete', critical: true, shortcut: 'Del'),
    ];

    Future<void> open(WidgetTester t, {CmDensity density = CmDensity.comfortable, TargetPlatform platform = TargetPlatform.linux}) async {
      await t.pumpWidget(const SizedBox());
      await t.pumpWidget(app(CmActionMenu(label: 'Order actions', items: items, density: density), platform: platform));
      await t.tap(find.text('Order actions'));
      await t.pumpAndSettle();
    }

    double rowHeight(WidgetTester t, String label) =>
        t.getSize(find.ancestor(of: find.text(label), matching: find.byType(Container)).first).height;

    testWidgets('36px rows (32 compact, 44 touch), 14px text, 12px headings and shortcut hints', (t) async {
      final handle = t.ensureSemantics();
      await open(t);
      expect(rowHeight(t, 'Duplicate'), 36);
      expect(t.widget<Text>(find.text('Duplicate')).style?.fontSize, 14);
      expect(t.widget<Text>(find.text('Order')).style?.fontSize, 12);
      expect(find.text('Ctrl+E'), findsOneWidget);
      expect(t.widget<Text>(find.text('Ctrl+E')).style?.fontSize, 12);
      expect(find.text('Del'), findsOneWidget);
      expect(find.bySemanticsLabel('Edit, Ctrl E'), findsOneWidget);
      expect(t.getSemantics(find.text('Danger zone')).getSemanticsData().hasFlag(SemanticsFlag.isHeader), isTrue);
      // Headings are skipped by the keyboard: the menu opens on Edit, and ↑ wraps to Delete.
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmActionMenu item 1');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmActionMenu item 5');
      handle.dispose();

      await open(t, density: CmDensity.compact);
      expect(rowHeight(t, 'Duplicate'), 32);
      await open(t, platform: TargetPlatform.iOS);
      expect(rowHeight(t, 'Duplicate'), 44);
      expect(find.text('⌘E'), findsOneWidget, reason: 'mod is Cmd on Apple platforms');
    });
  });
}
