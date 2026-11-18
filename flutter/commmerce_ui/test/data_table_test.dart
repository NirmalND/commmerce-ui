import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {double width = 900, TargetPlatform? platform}) => MaterialApp(
      theme: platform == null ? CmTheme.light() : CmTheme.light().copyWith(platform: platform),
      home: Scaffold(body: SingleChildScrollView(child: Align(alignment: Alignment.topLeft, child: SizedBox(width: width, child: child)))),
    );

const _cols = [
  CmDataTableColumn(key: 'day', label: 'Day', sortable: true),
  CmDataTableColumn(key: 'orders', label: 'Orders', type: CmDataColumnType.numeric, sortable: true),
  CmDataTableColumn(key: 'sales', label: 'Net sales', type: CmDataColumnType.money, sortable: true),
  CmDataTableColumn(key: 'date', label: 'Date', type: CmDataColumnType.date, sortable: true),
];

final _rows = <Map<String, Object?>>[
  {'day': 'Monday', 'orders': 12, 'sales': 'Rs. 9,800', 'date': DateTime(2026, 11, 9)},
  {'day': 'Tuesday', 'orders': 8, 'sales': 'Rs. 12,450.50', 'date': DateTime(2026, 11, 10)},
  {'day': 'Wednesday', 'orders': 21, 'sales': 'Rs. 950', 'date': DateTime(2026, 11, 4)},
  {'day': 'Thursday', 'orders': 3, 'sales': '', 'date': DateTime(2026, 11, 12)},
];

/// The text of the first column, top to bottom.
List<String> firstColumn(WidgetTester t, List<String> days) {
  final ys = {for (final d in days) d: t.getTopLeft(find.text(d)).dy};
  return [...days]..sort((a, b) => ys[a]!.compareTo(ys[b]!));
}

const _days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];

void main() {
  test('reads numbers from amounts: the dot in "Rs." is not a decimal point', () {
    expect(CmDataTable.toNumber('Rs. 1,200'), 1200);
    expect(CmDataTable.toNumber('Rs. 12,450.50'), 12450.5);
    expect(CmDataTable.toNumber('₹1,200.50'), 1200.5);
    expect(CmDataTable.toNumber('-500'), -500);
    expect(CmDataTable.toNumber('Rs. -500'), -500);
    expect(CmDataTable.toNumber('(500)'), -500);
    expect(CmDataTable.toNumber('12%'), 12);
    expect(CmDataTable.toNumber(7), 7);
    expect(CmDataTable.toNumber('none').isNaN, isTrue);
    expect(CmDataTable.compare('Size 2', 'size 10', CmDataColumnType.text), lessThan(0), reason: 'numbers in text sort by value, any case');
  });

  testWidgets('sorts money by value, both directions, empty values last; announces each sort', (t) async {
    final handle = t.ensureSemantics();
    final sorts = <String>[];
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows, onSort: (k, d) => sorts.add('$k ${d.name}'))));
    expect(firstColumn(t, _days), _days, reason: 'unsorted: the order given');

    await t.tap(find.bySemanticsLabel('Net sales, sortable'));
    await t.pump();
    // Rs. 950 < Rs. 9,800 < Rs. 12,450.50; a text sort would put 12,450 first and 950 last.
    expect(firstColumn(t, _days), ['Wednesday', 'Monday', 'Tuesday', 'Thursday']);
    expect(t.takeAnnouncements().single.message, 'Sorted by Net sales, ascending');
    expect(find.bySemanticsLabel('Net sales, sorted ascending'), findsOneWidget);

    await t.tap(find.bySemanticsLabel('Net sales, sorted ascending'));
    await t.pump();
    expect(firstColumn(t, _days), ['Tuesday', 'Monday', 'Wednesday', 'Thursday'], reason: 'descending, empty still last');
    expect(t.takeAnnouncements().single.message, 'Sorted by Net sales, descending');
    expect(sorts, ['sales ascending', 'sales descending']);

    await t.tap(find.bySemanticsLabel('Orders, sortable'));
    await t.pump();
    expect(firstColumn(t, _days), ['Thursday', 'Tuesday', 'Monday', 'Wednesday']);
    await t.tap(find.bySemanticsLabel('Date, sortable'));
    await t.pump();
    expect(firstColumn(t, _days), ['Wednesday', 'Monday', 'Tuesday', 'Thursday']);
    await t.tap(find.bySemanticsLabel('Day, sortable'));
    await t.pump();
    expect(firstColumn(t, _days), ['Monday', 'Thursday', 'Tuesday', 'Wednesday']);
    t.takeAnnouncements();
    handle.dispose();
  });

  testWidgets('sort headings are buttons with a tap action, and work from the keyboard', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows)));
    final data = t.getSemantics(find.bySemanticsLabel('Orders, sortable')).getSemanticsData();
    expect(data.hasFlag(SemanticsFlag.isButton), isTrue);
    expect(data.hasFlag(SemanticsFlag.isHeader), isTrue);
    expect(data.hasAction(SemanticsAction.tap), isTrue);
    t.semantics.tap(find.semantics.byLabel('Orders, sortable'));
    await t.pump();
    expect(firstColumn(t, _days).first, 'Thursday');
    t.takeAnnouncements();

    // Tab to the first heading (Day) and press Enter.
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pump();
    expect(find.bySemanticsLabel('Day, sorted ascending'), findsOneWidget);
    expect(t.takeAnnouncements().single.message, 'Sorted by Day, ascending');
    handle.dispose();
  });

  testWidgets('manual mode reports the sort and waits for the page to pass it back', (t) async {
    final handle = t.ensureSemantics();
    String? key;
    var dir = CmSortDirection.ascending;
    late StateSetter set;
    await t.pumpWidget(app(StatefulBuilder(builder: (context, s) {
      set = s;
      return CmDataTable(
        caption: 'Sales by day',
        columns: _cols,
        rows: _rows,
        sortKey: key,
        direction: dir,
        sortMode: CmDataTableSortMode.manual,
        onSort: (k, d) => set(() { key = k; dir = d; }),
      );
    })));
    await t.tap(find.bySemanticsLabel('Net sales, sortable'));
    await t.pump();
    expect(firstColumn(t, _days), _days, reason: 'manual: the table does not reorder');
    expect(find.bySemanticsLabel('Net sales, sorted ascending'), findsOneWidget);
    expect(t.takeAnnouncements().single.message, 'Sorted by Net sales, ascending');
    handle.dispose();
  });

  testWidgets('scrolls sideways when narrower than its columns; fills the width when wider', (t) async {
    final wide = [for (final r in _rows) {...r, 'note': 'A long note about this day that needs plenty of room to show'}];
    final cols = [..._cols, const CmDataTableColumn(key: 'note', label: 'Note')];
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: cols, rows: wide), width: 400));
    expect(t.takeException(), isNull, reason: 'no overflow');
    final scroll = t.widget<SingleChildScrollView>(find.descendant(of: find.byType(CmDataTable), matching: find.byType(SingleChildScrollView)).first);
    expect(scroll.scrollDirection, Axis.horizontal);
    final pos = t.state<ScrollableState>(find.descendant(of: find.byType(CmDataTable), matching: find.byType(Scrollable)).first).position;
    expect(pos.maxScrollExtent, greaterThan(0));

    t.view.physicalSize = const Size(1400, 900);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows), width: 1200));
    final row = t.getRect(find.ancestor(of: find.text('Monday'), matching: find.byType(Row)).first);
    expect(row.width, closeTo(1200, 0.5));
  });

  testWidgets('sticky first column stays put while the rest scrolls', (t) async {
    final cols = [..._cols, const CmDataTableColumn(key: 'note', label: 'Note')];
    final wide = [for (final r in _rows) {...r, 'note': 'A long note about this day that needs plenty of room to show'}];
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: cols, rows: wide, stickyFirstColumn: true, totals: const {'day': 'Total', 'orders': 44}), width: 400));
    final dayX = t.getTopLeft(find.text('Monday')).dx;
    final ordersX = t.getTopLeft(find.text('12')).dx;
    final headX = t.getTopLeft(find.text('Orders')).dx;
    await t.drag(find.text('12'), const Offset(-200, 0));
    await t.pump();
    expect(t.getTopLeft(find.text('Monday')).dx, dayX);
    expect(t.getTopLeft(find.text('12')).dx, lessThan(ordersX - 100));
    expect(t.getTopLeft(find.text('Orders')).dx, closeTo(headX - (ordersX - t.getTopLeft(find.text('12')).dx), 0.5), reason: 'heading scrolls with the body');
    expect(find.text('Total'), findsOneWidget);
  });

  testWidgets('totals, empty state, loading rows, hidden caption', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows, totals: const {'day': 'Total', 'sales': 'Rs. 23,200.50'})));
    expect(find.text('Total'), findsOneWidget);
    expect(find.text('Rs. 23,200.50'), findsOneWidget);
    expect(find.text('Sales by day'), findsOneWidget);
    expect(find.text('9 Nov 2026'), findsOneWidget, reason: 'dates are written as day month year');

    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', captionHidden: true, columns: _cols, rows: const [], totals: const {'day': 'Total'})));
    expect(find.text('No data'), findsOneWidget);
    expect(find.text('Total'), findsNothing, reason: 'no totals without rows');
    expect(find.text('Sales by day'), findsNothing);
    expect(find.bySemanticsLabel('Sales by day'), findsOneWidget, reason: 'hidden caption still names the table');

    await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows, loading: true, loadingRows: 3)));
    expect(find.byType(CmSkeleton), findsNWidgets(3 * _cols.length));
    expect(find.text('Monday'), findsNothing);
    expect(find.bySemanticsLabel('Sales by day, loading'), findsOneWidget);
    handle.dispose();
  });

  group('1.7 (web 1.6): row actions, resize, column picker, priority layout, scroll hint', () {
    const people = [
      CmDataTableColumn(key: 'name', label: 'Customer'),
      CmDataTableColumn(key: 'city', label: 'City', priority: CmColumnPriority.low),
      CmDataTableColumn(key: 'orders', label: 'Orders', type: CmDataColumnType.numeric),
      CmDataTableColumn(key: 'act', label: 'Actions', type: CmDataColumnType.actions, actions: [
        CmDataTableAction(label: 'Edit'),
        CmDataTableAction(label: 'Delete', icon: 'trash', iconOnly: true, critical: true, value: 'delete'),
      ]),
    ];
    final rows = <Map<String, Object?>>[
      {'name': 'Ravi Stores', 'city': 'Mumbai', 'orders': 12},
      {'name': 'Asha Traders', 'city': 'Pune', 'orders': 4},
    ];

    testWidgets('row actions show on hover and focus, are named with the row, and report the action', (t) async {
      final handle = t.ensureSemantics();
      final got = <String>[];
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, onRowAction: (a, r, i) => got.add('$a ${r['name']} $i')), platform: TargetPlatform.macOS));
      double opacityOf(String label) => t.widget<Opacity>(find.ancestor(of: find.bySemanticsLabel(label), matching: find.byType(Opacity)).first).opacity;
      expect(opacityOf('Edit, Ravi Stores'), 0, reason: 'hidden until hover or focus on desktop');
      expect(find.bySemanticsLabel('Delete, Ravi Stores'), findsOneWidget, reason: 'still read by screen readers');
      final mouse = await t.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(location: t.getCenter(find.text('Ravi Stores')));
      addTearDown(mouse.removePointer);
      await t.pump();
      expect(opacityOf('Edit, Ravi Stores'), 1);
      expect(opacityOf('Edit, Asha Traders'), 0);
      await t.tap(find.bySemanticsLabel('Delete, Ravi Stores'));
      await t.tap(find.bySemanticsLabel('Edit, Ravi Stores'));
      expect(got, ['delete Ravi Stores 0', 'Edit Ravi Stores 0']);
      await mouse.moveTo(const Offset(5, 880));
      await t.pump();
      // Keyboard: focus on the second row's Edit shows its actions.
      Focus.of(t.element(find.descendant(of: find.bySemanticsLabel('Edit, Asha Traders'), matching: find.byType(GestureDetector)).first)).requestFocus();
      await t.pump();
      await t.pump();
      expect(opacityOf('Edit, Asha Traders'), 1, reason: 'focus inside the row shows its actions');
      handle.dispose();
    });

    testWidgets('row actions always show on touch screens and with CmRowActions.always', (t) async {
      await t.pumpWidget(MaterialApp(
        theme: CmTheme.light().copyWith(platform: TargetPlatform.android),
        home: Scaffold(body: SizedBox(width: 900, child: CmDataTable(caption: 'Customers', columns: people, rows: rows))),
      ));
      expect(t.widgetList<Opacity>(find.byType(Opacity)).every((o) => o.opacity == 1), isTrue);
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, rowActions: CmRowActions.always), platform: TargetPlatform.windows));
      expect(t.widgetList<Opacity>(find.byType(Opacity)).every((o) => o.opacity == 1), isTrue);
    });

    testWidgets('resize: keyboard ±16 announced and reported, drag, minimum 48', (t) async {
      final handle = t.ensureSemantics();
      final got = <String>[];
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, resizable: true, onColumnResize: (k, w) => got.add('$k $w'))));
      final handleFinder = find.bySemanticsLabel('Resize Customer column');
      expect(handleFinder, findsOneWidget);
      expect(find.bySemanticsLabel('Resize Actions column'), findsNothing, reason: 'actions columns have no handle');
      final before = t.getSize(find.ancestor(of: find.text('Ravi Stores'), matching: find.byType(Container)).first).width;
      t.semantics.performAction(find.semantics.byLabel('Resize Customer column'), SemanticsAction.increase);
      await t.pump();
      expect(got.single, 'name ${(before + 16).roundToDouble()}');
      expect(t.takeAnnouncements().last.message, 'Customer column, ${(before + 16).round()} pixels wide');
      // Keyboard on the focused handle: ← narrows by 16.
      Focus.of(t.element(find.descendant(of: handleFinder, matching: find.byType(GestureDetector)).first)).requestFocus();
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await t.pump();
      expect(got.last, 'name ${before.roundToDouble()}');
      final handleCenter = t.getCenter(handleFinder);
      await t.dragFrom(handleCenter, const Offset(-1000, 0));
      await t.pump();
      expect(got.last, 'name 48.0', reason: 'never narrower than 48');
      handle.dispose();
    });

    testWidgets('column picker hides and shows columns; the naming column is locked', (t) async {
      final changes = <String>[];
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, columnPicker: true, onColumnsChange: (cols, k, v) => changes.add('$k $v ${cols.where((c) => c.visible).length}'))));
      expect(find.text('Mumbai'), findsOneWidget);
      await t.tap(find.text('Columns'));
      await t.pump();
      expect(find.byType(CmCheckbox), findsNWidgets(4));
      expect(t.widget<CmCheckbox>(find.widgetWithText(CmCheckbox, 'Customer')).onChanged, isNull);
      await t.tap(find.widgetWithText(CmCheckbox, 'City'));
      await t.pump();
      expect(changes, ['city false 3']);
      expect(find.text('Mumbai'), findsNothing);
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pump();
      expect(find.byType(CmCheckbox), findsNothing);
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: [...people.take(3), const CmDataTableColumn(key: 'x', label: 'X', visible: false)], rows: rows)));
      expect(find.text('X'), findsNothing, reason: 'visible: false leaves a column out');
      expect(find.text('Mumbai'), findsOneWidget, reason: 'new columns from the page reset the choice');
    });

    testWidgets('priority layout: low columns hidden on narrow widths behind View all fields', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, mobile: CmDataTableMobile.priority), width: 400));
      expect(t.takeException(), isNull);
      expect(find.text('Mumbai'), findsNothing);
      expect(find.text('City'), findsNothing);
      expect(find.text('View all fields'), findsNWidgets(2));
      await t.tap(find.text('View all fields').first);
      await t.pump();
      expect(find.text('Mumbai'), findsOneWidget);
      expect(find.text('City'), findsOneWidget);
      expect(find.text('Hide fields'), findsOneWidget);
      expect(t.getSemantics(find.bySemanticsLabel('Hide fields')).getSemanticsData().hasFlag(SemanticsFlag.isExpanded), isTrue);

      await t.pumpWidget(app(CmDataTable(caption: 'Customers', columns: people, rows: rows, mobile: CmDataTableMobile.priority), width: 900));
      expect(find.text('Mumbai'), findsOneWidget, reason: 'every column on wide tables');
      expect(find.text('View all fields'), findsNothing);
      handle.dispose();
    });

    testWidgets('scroll hint while there is more to the end', (t) async {
      final wide = [for (final r in _rows) {...r, 'note': 'A long note about this day that needs plenty of room to show'}];
      final cols = [..._cols, const CmDataTableColumn(key: 'note', label: 'Note')];
      await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: cols, rows: wide), width: 400));
      await t.pump();
      expect(find.text('Scroll for more'), findsOneWidget);
      final pos = t.state<ScrollableState>(find.descendant(of: find.byType(CmDataTable), matching: find.byType(Scrollable)).first).position;
      pos.jumpTo(pos.maxScrollExtent);
      await t.pump();
      expect(find.text('Scroll for more'), findsNothing);
      await t.pumpWidget(app(CmDataTable(caption: 'Sales by day', columns: _cols, rows: _rows), width: 900));
      await t.pump();
      expect(find.text('Scroll for more'), findsNothing);
    });
  });
}
