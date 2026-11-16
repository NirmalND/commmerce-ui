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

/// A menu whose order lives in the test, as an app's state would.
class _Menu extends StatefulWidget {
  const _Menu();
  @override
  State<_Menu> createState() => _MenuState();
}

class _MenuState extends State<_Menu> {
  List<String> top = ['Home', 'Shop', 'Contact'];
  List<String> shop = ['Kurtas', 'Sarees'];
  final moves = <String>[];

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 700,
        child: CmNestedList(
          heading: 'Header',
          sortable: true,
          collapsible: true,
          onReorder: (parent, from, to) => setState(() {
            moves.add('${parent ?? 'top'}:$from>$to');
            final list = parent == null ? top : shop;
            list.insert(to, list.removeAt(from));
          }),
          items: [
            for (final l in top)
              CmNestedItem(id: l, label: l, children: l == 'Shop' ? [for (final s in shop) CmNestedItem(id: s, label: s)] : const []),
          ],
        ),
      );
}

void main() {
  testWidgets('nested list: keyboard reorder with announcement and focus kept', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const _Menu()));
    final state = t.state<_MenuState>(find.byType(_Menu));
    expect(find.bySemanticsLabel('Reorder Home'), findsOneWidget);
    // Tab: collapse button, then the first handle.
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmNestedList handle Home');
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.pump();
    expect(state.top, ['Shop', 'Home', 'Contact']);
    expect(state.moves, ['top:0>1']);
    expect(t.takeAnnouncements().single.message, 'Home moved to position 2 of 3.');
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmNestedList handle Home', reason: 'focus stays on the moved row');
    await t.sendKeyEvent(LogicalKeyboardKey.end);
    await t.pump();
    expect(state.top, ['Shop', 'Contact', 'Home']);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.pump();
    expect(state.moves.length, 2, reason: 'already last');
    handle.dispose();
  });

  testWidgets('nested list: children reorder among themselves; screen-reader actions', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const _Menu()));
    final state = t.state<_MenuState>(find.byType(_Menu));
    t.semantics.customAction(find.semantics.byLabel('Reorder Sarees'), const CustomSemanticsAction(label: 'Move up'));
    await t.pump();
    expect(state.shop, ['Sarees', 'Kurtas']);
    expect(state.moves, ['Shop:1>0']);
    handle.dispose();
  });

  testWidgets('nested list: drag the handle to reorder', (t) async {
    await t.pumpWidget(app(const _Menu()));
    final state = t.state<_MenuState>(find.byType(_Menu));
    final from = t.getCenter(find.bySemanticsLabel('Reorder Contact'));
    final g = await t.startGesture(from);
    await t.pump(const Duration(milliseconds: 100));
    for (var i = 0; i < 20; i++) {
      await g.moveBy(const Offset(0, -15));
      await t.pump(const Duration(milliseconds: 16));
    }
    await g.up();
    await t.pumpAndSettle();
    expect(state.top.first, 'Contact');
  });

  testWidgets('nested list collapses and reports expanded state', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const _Menu()));
    expect(find.text('Kurtas'), findsOneWidget);
    var btn = t.getSemantics(find.bySemanticsLabel('Hide Header')).getSemanticsData();
    expect(btn.hasFlag(SemanticsFlag.isExpanded), isTrue);
    await t.tap(find.bySemanticsLabel('Hide Header'));
    await t.pump();
    expect(find.text('Kurtas'), findsNothing);
    btn = t.getSemantics(find.bySemanticsLabel('Show Header')).getSemanticsData();
    expect(btn.hasFlag(SemanticsFlag.isExpanded), isFalse);
    handle.dispose();
  });

  testWidgets('nested list is compact on phones', (t) async {
    phone(t);
    await t.pumpWidget(app(CmNestedList(heading: 'Categories', items: const [CmNestedItem(id: 'a', label: 'Clothing')]), size: const Size(390, 844)));
    final row = find.ancestor(of: find.text('Clothing'), matching: find.byType(Container)).first;
    expect(t.getSize(row).height, 50);
  });

  testWidgets('report tiles: tap, pinned name, three per row on phones', (t) async {
    final handle = t.ensureSemantics();
    phone(t);
    var opened = '';
    await t.pumpWidget(app(CmReportTiles(heading: 'Sales', tiles: [
      for (final r in ['Hourly sales', 'Sales by payment', 'Sales by city', 'Top products'])
        CmReportTile(label: r, icon: CmIcons.clock, pinned: r == 'Hourly sales', onTap: () => opened = r),
    ]), size: const Size(390, 844)));
    expect(find.bySemanticsLabel('Hourly sales, pinned'), findsOneWidget);
    await t.tap(find.text('Sales by city'));
    expect(opened, 'Sales by city');
    double y(String s) => t.getTopLeft(find.text(s)).dy;
    expect(y('Hourly sales'), y('Sales by city'));
    expect(y('Top products'), greaterThan(y('Hourly sales')));
    expect(t.getSize(find.byType(CmReportTile).first).height, 118);
    handle.dispose();
  });

  testWidgets('report tile opens from the keyboard', (t) async {
    var n = 0;
    await t.pumpWidget(app(SizedBox(width: 146, child: CmReportTile(label: 'Hourly sales', onTap: () => n++))));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    expect(n, 1);
    expect(t.getSize(find.byType(CmReportTile)).height, 150);
  });

  testWidgets('table header: sort buttons say their state and flip direction', (t) async {
    final handle = t.ensureSemantics();
    String? key = 'product';
    var dir = CmSortDirection.ascending;
    bool? all = false;
    const cols = [
      CmTableColumn(key: 'product', label: 'Product', sortable: true, flex: 2),
      CmTableColumn(key: 'price', label: 'Selling price', sortable: true, align: TextAlign.end),
      CmTableColumn(key: 'status', label: 'Status'),
      CmTableColumn(key: 'action', label: 'Action', hidden: true, width: 80),
    ];
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => SizedBox(width: 900, child: CmTableHeader(
          columns: cols,
          sortKey: key,
          direction: dir,
          onSort: (k, d) => set(() { key = k; dir = d; }),
          selectAll: all,
          onSelectAll: (v) => set(() => all = v),
        )))));
    expect(find.bySemanticsLabel('Product, sorted ascending'), findsOneWidget);
    expect(find.bySemanticsLabel('Selling price, sortable'), findsOneWidget);
    expect(find.bySemanticsLabel('Action'), findsOneWidget);
    expect(find.text('Action'), findsNothing);
    await t.tap(find.text('Product'));
    await t.pump();
    expect(dir, CmSortDirection.descending);
    expect(find.bySemanticsLabel('Product, sorted descending'), findsOneWidget);
    await t.tap(find.text('Selling price'));
    await t.pump();
    expect((key, dir), ('price', CmSortDirection.ascending));
    await t.tap(find.byType(Checkbox));
    await t.pump();
    expect(all, true);
    expect(t.getSize(find.byType(CmTableHeader)).height, greaterThanOrEqualTo(34));
    handle.dispose();
  });

  testWidgets('table header: keyboard sorting, mixed select-all, rows share its columns', (t) async {
    String? key;
    bool? picked;
    const cols = [CmTableColumn(key: 'name', label: 'Product name', sortable: true, flex: 2), CmTableColumn(key: 'price', label: 'Price', align: TextAlign.end)];
    await t.pumpWidget(app(SizedBox(width: 600, child: Column(children: [
      CmTableHeader(columns: cols, onSort: (k, _) => key = k, selectAll: null, onSelectAll: (v) => picked = v),
      CmTableHeader.row(columns: cols, leading: const SizedBox(), cells: const [Text('Cotton kurta'), Text('Rs. 1,299')]),
    ]))));
    await t.sendKeyEvent(LogicalKeyboardKey.tab); // checkbox
    await t.sendKeyEvent(LogicalKeyboardKey.tab); // sort button
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(key, 'name');
    await t.tap(find.byType(Checkbox));
    expect(picked, true, reason: 'a mixed box selects all');
    expect(t.getTopLeft(find.text('Cotton kurta')).dx, t.getTopLeft(find.text('Product name')).dx);
    expect(t.getTopRight(find.text('Rs. 1,299')).dx, closeTo(t.getTopRight(find.text('Price')).dx, 1));
  });
}
