// The owner standard (1.6, issue #33): sizes, card variants, empty state, status tabs, segmented control, resource
// list density, data table standard and the cards layout. Desktop checks run as macOS; the test default (Android)
// is a touch platform.
import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {TextDirection dir = TextDirection.ltr, double width = 800}) => MaterialApp(
      theme: CmTheme.light(),
      home: Directionality(
        textDirection: dir,
        child: Scaffold(body: SingleChildScrollView(child: Align(alignment: AlignmentDirectional.topStart, child: SizedBox(width: width, child: child)))),
      ),
    );

void window(WidgetTester t, Size size) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
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

Size sizeOfDecorated(WidgetTester t, Finder of) => t.getSize(find.descendant(of: of, matching: find.byType(InputDecorator)).first);

void main() {
  group('tokens', () {
    test('control heights, icon sizes, motion and the 1.6 type tokens are generated', () {
      expect([CmControlHeight.sm, CmControlHeight.md, CmControlHeight.lg, CmControlHeight.touch], [32, 36, 40, 44]);
      expect([CmIconSize.sm, CmIconSize.md, CmIconSize.lg], [16, 20, 24]);
      expect(CmMotion.fast, const Duration(milliseconds: 120));
      expect(CmMotion.base, const Duration(milliseconds: 200));
      expect(CmMotion.standard, const Cubic(0.2, 0, 0, 1));
      expect((CmType.label.fontSize, CmType.label.fontWeight), (13, FontWeight.w500));
      expect(CmType.label.height! * 13, closeTo(18, 0.01));
      expect((CmType.headingSection.fontSize, CmType.headingSection.fontWeight), (18, FontWeight.w600));
      expect(CmType.headingSection.height! * 18, closeTo(26, 0.01));
      expect(CmType.bodyXs.fontSize, 12);
      expect(CmType.bodyXs.height! * 12, closeTo(16, 0.01));
    });

    testWidgets('cmDuration is zero when the platform turns animations off', (t) async {
      late Duration on, off;
      await t.pumpWidget(MaterialApp(home: Builder(builder: (c) { on = cmDuration(c, CmMotion.fast); return const SizedBox(); })));
      await t.pumpWidget(MaterialApp(
        builder: (c, child) => MediaQuery(data: MediaQuery.of(c).copyWith(disableAnimations: true), child: child!),
        home: Builder(builder: (c) { off = cmDuration(c, CmMotion.fast); return const SizedBox(); }),
      ));
      expect(on, CmMotion.fast);
      expect(off, Duration.zero);
    });
  });

  group('controls', () {
    testWidgets('buttons 36 (slim 32, large 40) on desktop; 40 drawn with a 44 hit area on touch', (t) async {
      Finder box(String label) => find.descendant(of: find.widgetWithText(CmButton, label), matching: find.byType(Container)).first;
      Widget buttons() => app(Wrap(children: [
            CmButton(label: 'Medium', onPressed: () {}),
            CmButton(label: 'Slim', size: CmButtonSize.slim, onPressed: () {}),
            CmButton(label: 'Large', size: CmButtonSize.large, onPressed: () {}),
          ]));
      await desktop(() async {
        await t.pumpWidget(buttons());
        expect(t.getSize(box('Medium')).height, 36);
        expect(t.getSize(box('Slim')).height, 32);
        expect(t.getSize(box('Large')).height, 40);
        expect(t.getSize(find.widgetWithText(CmButton, 'Medium')).height, 36, reason: 'no touch margin on desktop');
        await t.pumpWidget(const SizedBox());
      });
      await t.pumpWidget(buttons());
      for (final l in ['Medium', 'Slim', 'Large']) {
        expect(t.getSize(box(l)).height, 40, reason: '$l is drawn 40 on touch');
        expect(t.getSize(find.widgetWithText(CmButton, l)).height, 44, reason: '$l hit area');
      }
    });

    testWidgets('a pressed button shows a step past hover', (t) async {
      await desktop(() async {
        await t.pumpWidget(app(CmButton(label: 'Save', variant: CmButtonVariant.primary, onPressed: () {})));
        Color bg() => (t.widget<Container>(find.descendant(of: find.byType(CmButton), matching: find.byType(Container)).first).decoration! as BoxDecoration).color!;
        final idle = bg();
        final g = await t.startGesture(t.getCenter(find.byType(CmButton)));
        await t.pump();
        expect(bg(), isNot(idle));
        await g.up();
        await t.pump();
        expect(bg(), idle);
        await t.pumpWidget(const SizedBox());
      });
    });

    testWidgets('fields 40 (small 32) on desktop, 44 on touch; labels 13/500; help text 12/16', (t) async {
      Widget fields() => app(Column(children: [
            const CmTextField(key: ValueKey('text'), label: 'Name'),
            const CmTextField(key: ValueKey('help'), label: 'GSTIN', helpText: 'As on the invoice'),
            const CmTextField(key: ValueKey('small'), label: 'Filter', small: true),
            CmSelect<String>(key: const ValueKey('select'), label: 'City', options: const [CmSelectOption('a', 'Agra')], value: 'a', onChanged: (_) {}),
            const CmSearch(key: ValueKey('search'), label: 'Search orders'),
          ]));
      await desktop(() async {
        await t.pumpWidget(fields());
        expect(sizeOfDecorated(t, find.byKey(const ValueKey('text'))).height, closeTo(40, 0.5));
        expect(sizeOfDecorated(t, find.byKey(const ValueKey('small'))).height, closeTo(32, 0.5));
        expect(sizeOfDecorated(t, find.byKey(const ValueKey('select'))).height, closeTo(40, 0.5));
        expect(sizeOfDecorated(t, find.byKey(const ValueKey('search'))).height, closeTo(40, 0.5));
        final label = t.widget<Text>(find.descendant(of: find.byKey(const ValueKey('text')), matching: find.byType(Text)).first).textSpan! as TextSpan;
        final style = (label.children!.first as TextSpan).style!;
        expect((style.fontSize, style.fontWeight), (13, FontWeight.w500));
        expect(t.widget<Text>(find.text('As on the invoice')).style?.fontSize ?? DefaultTextStyle.of(t.element(find.text('As on the invoice'))).style.fontSize, 12);
        await t.pumpWidget(const SizedBox());
      });
      await t.pumpWidget(fields());
      expect(sizeOfDecorated(t, find.byKey(const ValueKey('text'))).height, closeTo(44, 0.5));
      expect(sizeOfDecorated(t, find.byKey(const ValueKey('small'))).height, closeTo(44, 0.5), reason: 'small is 44 on touch too');
    });

    testWidgets('checkbox 16 on desktop, 18 on touch', (t) async {
      Widget box() => app(CmCheckbox(label: 'Send receipt', value: true, onChanged: (_) {}));
      Finder square() => find.ancestor(of: find.byType(Checkbox), matching: find.byType(SizedBox)).first;
      await desktop(() async {
        await t.pumpWidget(box());
        expect(t.getSize(square()), const Size(16, 16));
        await t.pumpWidget(const SizedBox());
      });
      await t.pumpWidget(box());
      expect(t.getSize(square()), const Size(18, 18));
    });

    testWidgets('badge 24 tall with 12px text', (t) async {
      await t.pumpWidget(app(const Center(child: CmBadge('Paid', tone: CmTone.success))));
      expect(t.getSize(find.byType(CmBadge)).height, 24);
      expect(t.widget<Text>(find.text('Paid')).style!.fontSize, 12);
    });
  });

  group('card', () {
    testWidgets('standard 24 padding, compact 16, phones 16; 16 under the header; flat', (t) async {
      window(t, const Size(1000, 800));
      Widget card(CmCardVariant v) => app(CmCard(heading: 'Orders', variant: v, child: const SizedBox(key: ValueKey('body'), height: 20)));
      await t.pumpWidget(card(CmCardVariant.standard));
      final outer = t.getRect(find.byType(CmCard));
      final body = t.getRect(find.byKey(const ValueKey('body')));
      expect(body.left - outer.left, 25, reason: '24 inside the 1px border');
      expect(body.top - t.getRect(find.text('Orders')).bottom, 16);
      final deco = t.widget<AnimatedContainer>(find.descendant(of: find.byType(CmCard), matching: find.byType(AnimatedContainer))).decoration! as BoxDecoration;
      expect(deco.boxShadow, isNull, reason: 'cards are flat');
      expect((deco.border! as Border).top.color, CmColors.light.borderSubtle);
      expect(deco.borderRadius, BorderRadius.circular(8));
      await t.pumpWidget(card(CmCardVariant.compact));
      await t.pumpAndSettle();
      expect(t.getRect(find.byKey(const ValueKey('body'))).left - t.getRect(find.byType(CmCard)).left, 17);
      expect(t.getRect(find.byKey(const ValueKey('body'))).top - t.getRect(find.text('Orders')).bottom, 12);
      window(t, const Size(390, 800));
      await t.pumpWidget(card(CmCardVariant.standard));
      await t.pumpAndSettle();
      expect(t.getRect(find.byKey(const ValueKey('body'))).left - t.getRect(find.byType(CmCard)).left, 17, reason: '16 on phones');
    });

    testWidgets('interactive: one button named by the heading; tap anywhere; selected; actions stay separate', (t) async {
      final handle = t.ensureSemantics();
      var opened = 0, edited = 0;
      Widget card(bool selected) => app(CmCard.interactive(
            heading: 'Rao Textiles',
            selected: selected,
            onPressed: () => opened++,
            actions: [CmButton(label: 'Edit', onPressed: () => edited++)],
            child: const SizedBox(key: ValueKey('body'), height: 60),
          ));
      await t.pumpWidget(card(false));
      await t.tapAt(t.getRect(find.byType(CmCard)).bottomCenter - const Offset(0, 30));
      expect(opened, 1, reason: 'the whole card is pressable');
      await t.tap(find.text('Edit'));
      expect((opened, edited), (1, 1), reason: 'actions do not open the card');
      final node = t.getSemantics(find.bySemanticsLabel('Rao Textiles').first);
      expect(node.getSemanticsData().hasFlag(SemanticsFlag.isButton), isTrue);
      expect(find.bySemanticsLabel('Edit'), findsOneWidget, reason: 'the action is its own button');
      await t.pumpWidget(card(true));
      await t.pumpAndSettle();
      final deco = t.widget<AnimatedContainer>(find.descendant(of: find.byType(CmCard), matching: find.byType(AnimatedContainer))).decoration! as BoxDecoration;
      expect((deco.border! as Border).top, BorderSide(color: CmColors.light.borderStrong, width: 2));
      expect(t.getSemantics(find.bySemanticsLabel('Rao Textiles').first).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
      handle.dispose();
    });

    testWidgets('interactive: Enter opens it from the keyboard', (t) async {
      var opened = 0;
      await desktop(() async {
        await t.pumpWidget(app(CmCard.interactive(heading: 'Open me', onPressed: () => opened++, child: const SizedBox(height: 20))));
        await t.sendKeyEvent(LogicalKeyboardKey.tab);
        await t.pump();
        await t.sendKeyEvent(LogicalKeyboardKey.enter);
        expect(opened, 1);
        await t.pumpWidget(const SizedBox());
      });
    });
  });

  group('empty state', () {
    testWidgets('default: 48 tile, 24 icon, 16 heading, 13 text', (t) async {
      await t.pumpWidget(app(CmEmptyState(heading: 'No tasks', message: 'Tasks you add show here.', action: CmButton(label: 'Add task', onPressed: () {}))));
      final tile = find.ancestor(of: find.byType(CmIcon), matching: find.byType(Container)).first;
      expect(t.getSize(tile), const Size(48, 48));
      expect(t.widget<CmIcon>(find.byType(CmIcon).first).size, 24);
      expect(t.widget<Text>(find.text('No tasks')).style!.fontSize, 16);
      expect(t.widget<Text>(find.text('Tasks you add show here.')).style!.fontSize, 13);
      expect(t.getRect(find.text('No tasks')).top - t.getRect(tile).bottom, 12);
    });

    testWidgets('large keeps the 160px circle (120 on phones)', (t) async {
      window(t, const Size(1000, 800));
      await t.pumpWidget(app(const CmEmptyState(heading: 'No products yet', large: true)));
      final circle = find.ancestor(of: find.byType(CmIcon), matching: find.byType(Container)).first;
      expect(t.getSize(circle), const Size(160, 160));
      window(t, const Size(390, 800));
      await t.pumpWidget(app(const CmEmptyState(heading: 'No products yet', large: true), width: 390));
      expect(t.getSize(find.ancestor(of: find.byType(CmIcon), matching: find.byType(Container)).first), const Size(120, 120));
    });
  });

  group('status tabs', () {
    const tabs = [CmStatusTab('all', 'All', count: 1200), CmStatusTab('open', 'Open', count: 4), CmStatusTab('done', 'Done')];

    testWidgets('14px labels, counts in pills read with the label, 40 tall on desktop', (t) async {
      final handle = t.ensureSemantics();
      await desktop(() async {
        await t.pumpWidget(app(CmStatusTabs(tabs: tabs, value: 'open', onChanged: (_) {})));
        expect(find.text('1,200'), findsOneWidget);
        expect(find.bySemanticsLabel('Open, 4'), findsOneWidget);
        expect(t.getSemantics(find.bySemanticsLabel('Open, 4')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
        expect(t.widget<Text>(find.text('Done').last).style!.fontSize, 14);
        expect(t.getSize(find.ancestor(of: find.text('Done').last, matching: find.byType(Container)).last).height, 40);
        await t.pumpWidget(const SizedBox());
      });
      handle.dispose();
    });

    testWidgets('arrow keys move and select (mirrored in RTL); one tab stop', (t) async {
      String value = 'all';
      await desktop(() async {
        Future<void> pump(TextDirection dir) => t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmStatusTabs(tabs: tabs, value: value, onChanged: (v) => set(() => value = v))), dir: dir));
        await pump(TextDirection.ltr);
        await t.sendKeyEvent(LogicalKeyboardKey.tab);
        await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await t.pumpAndSettle();
        expect(value, 'open');
        await t.sendKeyEvent(LogicalKeyboardKey.end);
        await t.pumpAndSettle();
        expect(value, 'done');
        await pump(TextDirection.rtl);
        await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
        await t.pumpAndSettle();
        expect(value, 'all', reason: 'left is "next" in RTL, wrapping round');
        await t.pumpWidget(const SizedBox());
      });
    });

    testWidgets('a row too wide for its box fades at the edge with more tabs', (t) async {
      final many = [for (var i = 0; i < 12; i++) CmStatusTab('$i', 'Status number $i', count: i)];
      await t.pumpWidget(app(CmStatusTabs(tabs: many, value: '0', onChanged: (_) {}), width: 360));
      await t.pump();
      expect(find.byType(ShaderMask), findsOneWidget);
      await t.pumpWidget(app(CmStatusTabs(tabs: tabs, value: 'all', onChanged: (_) {}), width: 800));
      await t.pump();
      expect(find.byType(ShaderMask), findsNothing, reason: 'nothing to fade when everything fits');
    });
  });

  group('segmented control', () {
    final options = [const CmRadioOption(value: 'board', label: 'Board'), const CmRadioOption(value: 'list', label: 'List'), const CmRadioOption(value: 'map', label: 'Map', enabled: false)];

    testWidgets('a radio group: 36 tall (small 32) on desktop, 44 on touch; checked option in semantics', (t) async {
      final handle = t.ensureSemantics();
      Finder track() => find.descendant(of: find.byType(CmSegmentedControl<String>), matching: find.byType(Container)).first;
      await desktop(() async {
        await t.pumpWidget(app(Center(child: CmSegmentedControl<String>(options: options, value: 'list', semanticLabel: 'View', onChanged: (_) {}))));
        expect(t.getSize(track()).height, 36);
        await t.pumpWidget(app(Center(child: CmSegmentedControl<String>(options: options, value: 'list', small: true, onChanged: (_) {}))));
        expect(t.getSize(track()).height, 32);
        await t.pumpWidget(const SizedBox());
      });
      await t.pumpWidget(app(Center(child: CmSegmentedControl<String>(options: options, value: 'list', semanticLabel: 'View', onChanged: (_) {}))));
      expect(t.getSize(track()).height, 44);
      final list = t.getSemantics(find.bySemanticsLabel('List')).getSemanticsData();
      expect(list.hasFlag(SemanticsFlag.isInMutuallyExclusiveGroup), isTrue);
      expect(list.hasFlag(SemanticsFlag.isChecked), isTrue);
      expect(t.getSemantics(find.bySemanticsLabel('Map')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
      handle.dispose();
    });

    testWidgets('keyboard: arrows skip disabled options, mirrored in RTL; tap selects', (t) async {
      var value = 'board';
      await desktop(() async {
        Future<void> pump(TextDirection dir) =>
            t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmSegmentedControl<String>(options: options, value: value, onChanged: (v) => set(() => value = v))), dir: dir));
        await pump(TextDirection.ltr);
        await t.sendKeyEvent(LogicalKeyboardKey.tab);
        await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await t.pump();
        expect(value, 'list');
        await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
        await t.pump();
        expect(value, 'board', reason: 'Map is disabled: wraps to the first');
        await pump(TextDirection.rtl);
        await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
        await t.pump();
        expect(value, 'list', reason: 'left moves forward in RTL');
        await t.tap(find.text('Board'));
        await t.pump();
        expect(value, 'board');
        await t.pumpWidget(const SizedBox());
      });
    });
  });

  group('page header and navigation', () {
    testWidgets('page header: description 13px, title 24 (20 on phones), badge beside a short title', (t) async {
      window(t, const Size(1200, 800));
      Widget header() => const CmPageHeader(title: 'Leads', description: 'Everyone who asked about a product.', adornment: CmBadge('12'));
      await t.pumpWidget(app(header(), width: 1200));
      expect(t.widget<Text>(find.text('Everyone who asked about a product.')).style!.fontSize, 13);
      expect(t.widget<Text>(find.text('Leads')).style!.fontSize, 24);
      final title = t.getRect(find.text('Leads'));
      final badge = t.getRect(find.byType(CmBadge));
      expect(badge.left - title.right, closeTo(8, 0.5), reason: 'beside the title (#32)');
      expect(badge.center.dy, closeTo(title.center.dy, 1));
      window(t, const Size(390, 800));
      await t.pumpWidget(app(header(), width: 390));
      expect(t.widget<Text>(find.text('Leads')).style!.fontSize, 20);
    });

    testWidgets('side navigation: 220 wide, 36px rows on desktop', (t) async {
      await desktop(() async {
        await t.pumpWidget(app(Align(
          alignment: AlignmentDirectional.topStart,
          child: CmSideNav(
            items: const [CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home), CmNavItem(id: 'orders', label: 'Orders', icon: CmIcons.cart)],
            selectedId: 'home',
            onSelected: (_) {},
          ),
        )));
        expect(t.getSize(find.byType(CmSideNav)).width, 220);
        expect(t.getSize(find.ancestor(of: find.text('Orders'), matching: find.byType(Container)).first).height, 36);
        await t.pumpWidget(const SizedBox());
      });
    });
  });

  group('resource list', () {
    final items = [
      for (final n in ['Asha', 'Ravi'])
        CmResourceItem(id: n, semanticLabel: n, child: Text(n), actions: [CmButton(label: 'Call $n', onPressed: () {}), CmButton(label: 'Email $n', onPressed: () {})]),
    ];

    testWidgets('rows 56, compact 40 (desktop); the select-all box lines up with the rows', (t) async {
      await desktop(() async {
        // Rows without buttons (36px buttons with 4px above and below make a compact row 44).
        final plain = [for (final n in ['Asha', 'Ravi']) CmResourceItem(id: n, semanticLabel: n, child: Text(n))];
        Widget list(CmDensity d) => app(CmResourceList(items: plain, density: d, onSelectionChanged: (_) {}));
        Finder row(String n) => find.ancestor(of: find.text(n), matching: find.byType(Container)).at(1);
        await t.pumpWidget(list(CmDensity.comfortable));
        expect(t.getSize(find.ancestor(of: find.text('Asha'), matching: find.byWidgetPredicate((w) => w is Container && w.constraints?.minHeight == 56))).height, 56);
        final boxes = find.byType(Checkbox);
        expect(boxes, findsNWidgets(3), reason: 'select-all and two rows');
        expect(t.getRect(boxes.at(0)).center.dx, closeTo(t.getRect(boxes.at(1)).center.dx, 0.5));
        // 20 from the list's inner edge (inside its 1px border), like the web.
        expect(t.getRect(find.ancestor(of: boxes.at(1), matching: find.byType(SizedBox)).first).left, closeTo(t.getRect(find.byType(CmResourceList)).left + 1 + 20, 0.5));
        await t.pumpWidget(list(CmDensity.compact));
        expect(t.getSize(find.ancestor(of: find.text('Asha'), matching: find.byWidgetPredicate((w) => w is Container && w.constraints?.minHeight == 40))).height, 40);
        expect(row('Asha'), findsOneWidget);
        await t.pumpWidget(const SizedBox());
      });
    });

    testWidgets('on phones the actions wrap under the content when it would get too narrow (#31)', (t) async {
      window(t, const Size(360, 800));
      await t.pumpWidget(app(CmResourceList(items: items), width: 360));
      expect(t.getRect(find.text('Call Asha')).top, greaterThan(t.getRect(find.text('Asha')).bottom));
      expect(t.getRect(find.text('Call Asha')).left, lessThan(t.getRect(find.text('Asha')).left + 20), reason: 'at the start');
      window(t, const Size(1200, 800));
      await t.pumpWidget(app(CmResourceList(items: items), width: 1200));
      expect(t.getRect(find.text('Call Asha')).center.dy, closeTo(t.getRect(find.text('Asha')).center.dy, 1), reason: 'one line on wide screens');
    });
  });

  group('data table', () {
    const cols = [
      CmDataTableColumn(key: 'name', label: 'Customer'),
      CmDataTableColumn(key: 'city', label: 'City'),
      CmDataTableColumn(key: 'total', label: 'Total', type: CmDataColumnType.money),
    ];
    final rows = [
      {'name': 'Asha Rao', 'city': 'Pune', 'total': 'Rs. 1,200'},
      {'name': 'A very long customer name that goes on and on well past any reasonable column width for a table', 'city': 'Agra', 'total': 'Rs. 90'},
    ];

    testWidgets('heading 40 in 12/600, rows 48 (compact 40), 13px cells padded 12/10, money at the end', (t) async {
      await desktop(() async {
        window(t, const Size(1200, 800));
        await t.pumpWidget(app(CmDataTable(columns: cols, rows: rows, caption: 'Customers'), width: 1000));
        final head = find.ancestor(of: find.text('Customer'), matching: find.byType(Container)).first;
        expect(t.getSize(head).height, 40);
        expect(t.widget<Text>(find.text('Customer')).style!.fontSize, 12);
        expect(t.widget<Text>(find.text('Customer')).style!.fontWeight, FontWeight.w600);
        final cell = find.ancestor(of: find.text('Pune'), matching: find.byType(Container)).first;
        expect(t.getSize(cell).height, 48);
        expect(t.widget<Text>(find.text('Pune')).style!.fontSize, 13);
        expect(t.getRect(find.text('Pune')).left - t.getRect(cell).left, 12);
        final money = find.ancestor(of: find.text('Rs. 1,200'), matching: find.byType(Container)).first;
        expect(t.getRect(money).right - t.getRect(find.text('Rs. 1,200')).right, 12, reason: 'right-aligned');
        await t.pumpWidget(app(CmDataTable(columns: cols, rows: rows, caption: 'Customers', density: CmDensity.compact), width: 1000));
        expect(t.getSize(find.ancestor(of: find.text('Pune'), matching: find.byType(Container)).first).height, 40);
        await t.pumpWidget(const SizedBox());
      });
    });

    testWidgets('a long text value ends in an ellipsis with the full value in a tooltip', (t) async {
      await t.pumpWidget(app(CmDataTable(columns: cols, rows: rows, caption: 'Customers'), width: 1000));
      final long = rows[1]['name']!;
      final text = t.widget<Text>(find.text(long));
      expect(text.overflow, TextOverflow.ellipsis);
      expect(t.getSize(find.text(long)).width, lessThanOrEqualTo(CmDataTable.cellMaxWidth));
      expect(find.byWidgetPredicate((w) => w is Tooltip && w.message == long), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is Tooltip && w.message == 'Pune'), findsNothing, reason: 'short values have no tooltip');
    });

    testWidgets('cards layout at 640px or less: a card per row with label and value pairs', (t) async {
      await t.pumpWidget(app(CmDataTable(columns: cols, rows: rows, caption: 'Customers', mobile: CmDataTableMobile.cards), width: 360));
      expect(find.text('City'), findsNWidgets(2), reason: 'each card labels its values');
      expect(find.text('Customer'), findsNothing, reason: 'no heading row');
      expect(t.getRect(find.text('Agra')).top, greaterThan(t.getRect(find.text('Pune')).bottom));
      await t.pumpWidget(app(CmDataTable(columns: cols, rows: rows, caption: 'Customers', mobile: CmDataTableMobile.cards), width: 1000));
      expect(find.text('Customer'), findsOneWidget, reason: 'a table on wide screens');
    });
  });
}
