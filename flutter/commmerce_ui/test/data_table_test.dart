import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {double width = 900}) => MaterialApp(
      theme: CmTheme.light(),
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
}
