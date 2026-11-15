import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'display.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'lists.dart';
import 'theme.dart';

/// How a [CmDataTableColumn]'s values are compared and laid out.
enum CmDataColumnType {
  /// Compared as text, numbers inside it in number order ("Size 2" before "Size 10").
  text,

  /// Right-aligned with tabular figures, sorted by value.
  numeric,

  /// Like [numeric], for amounts such as "Rs. 1,200": the currency is skipped when sorting.
  money,

  /// Sorted by date: [DateTime]s, milliseconds since the epoch or ISO 8601 strings.
  date,
}

/// Whether [CmDataTable] sorts its own rows.
enum CmDataTableSortMode {
  /// The table sorts its rows and reports the new order through [CmDataTable.onSort].
  auto,

  /// The table only calls [CmDataTable.onSort]: sort on your server, then pass the new
  /// [CmDataTable.rows], [CmDataTable.sortKey] and [CmDataTable.direction].
  manual,
}

/// One column of a [CmDataTable].
@immutable
class CmDataTableColumn {
  const CmDataTableColumn({required this.key, required this.label, this.type = CmDataColumnType.text, this.sortable = false, this.align, this.hidden = false});

  /// The key of each row's value shown in this column, and the key passed to [CmDataTable.onSort].
  final String key;

  /// Column heading.
  final String label;
  final CmDataColumnType type;

  /// Lets the merchant sort by this column.
  final bool sortable;

  /// Text alignment. Default: [TextAlign.end] for numeric and money columns, otherwise [TextAlign.start].
  final TextAlign? align;

  /// Heading for screen readers only, e.g. for an actions column.
  final bool hidden;

  bool get _end {
    final a = align ?? (type == CmDataColumnType.numeric || type == CmDataColumnType.money ? TextAlign.end : TextAlign.start);
    return a == TextAlign.end || a == TextAlign.right;
  }
}

/// A data table for reports and read-only lists: sales by day, stock by location, order lines.
/// Column headings, sortable columns, a totals row, a sticky header and first column, loading rows and
/// an empty state. For lists merchants select and act on, use [CmResourceList]. Mirrors `<cm-data-table>`.
///
/// Rows are maps from column keys to values, shown as text. On widths narrower than the table, it
/// scrolls sideways. Every sort is announced to screen readers ("Sorted by Net sales, descending").
class CmDataTable extends StatefulWidget {
  const CmDataTable({
    super.key,
    required this.columns,
    required this.rows,
    required this.caption,
    this.totals,
    this.captionHidden = false,
    this.sortKey,
    this.direction = CmSortDirection.ascending,
    this.sortMode = CmDataTableSortMode.auto,
    this.onSort,
    this.stickyHeader = false,
    this.maxHeight,
    this.stickyFirstColumn = false,
    this.loading = false,
    this.loadingRows = 5,
    this.empty,
  });

  /// The columns, in order.
  final List<CmDataTableColumn> columns;

  /// The rows: maps keyed by column [CmDataTableColumn.key].
  final List<Map<String, Object?>> rows;

  /// A totals row shown at the bottom, keyed like a row. Leave a key out for an empty cell.
  final Map<String, Object?>? totals;

  /// What the table shows, e.g. "Sales by day". It names the table for screen readers.
  final String caption;

  /// Keeps the caption for screen readers but hides it, when a card or page heading already says it.
  final bool captionHidden;

  /// Key of the sorted column. Null: rows stay in the order given. Changing it re-sorts.
  final String? sortKey;

  /// Direction of the sorted column.
  final CmSortDirection direction;
  final CmDataTableSortMode sortMode;

  /// Called when a sortable heading is pressed, with the column key and the new direction.
  final void Function(String key, CmSortDirection direction)? onSort;

  /// Keeps the heading row visible while the rows scroll inside [maxHeight].
  final bool stickyHeader;

  /// With [stickyHeader], the rows scroll inside this height.
  final double? maxHeight;

  /// Keeps the first column visible while the table scrolls sideways (on narrow screens).
  final bool stickyFirstColumn;

  /// Shows placeholder rows.
  final bool loading;

  /// How many placeholder rows [loading] shows.
  final int loadingRows;

  /// Shown instead of the rows when [rows] is empty, e.g. a [CmEmptyState]. Default "No data".
  final Widget? empty;

  /// Reads a number from a cell: 1200, "1,200", "Rs. 1,200", "₹1,200.50", "-500", "(500)" (negative), "12%".
  /// Leading text such as a currency is skipped, so the dot in "Rs." is never read as a decimal point.
  static double toNumber(Object? v) {
    if (v is num) return v.toDouble();
    final text = (v ?? '').toString().trim();
    final negative = RegExp(r'^\(.*\)$').hasMatch(text) || RegExp(r'^-|^[^\d]*-\s*\d').hasMatch(text);
    final m = RegExp(r'\d[\d,]*(?:\.\d+)?').firstMatch(text);
    if (m == null) return double.nan;
    final n = double.parse(m.group(0)!.replaceAll(',', ''));
    return negative ? -n : n;
  }

  static bool _empty(Object? v) => v == null || (v is String && v.isEmpty);

  static int? _time(Object? v) => v is DateTime ? v.millisecondsSinceEpoch : v is num ? v.toInt() : DateTime.tryParse(v.toString())?.millisecondsSinceEpoch;

  /// Compares two non-empty values the way a column of [type] sorts.
  static int compare(Object? a, Object? b, CmDataColumnType type) {
    switch (type) {
      case CmDataColumnType.numeric:
      case CmDataColumnType.money:
        double n(Object? v) { final x = toNumber(v); return x.isNaN ? 0 : x; }
        return n(a).compareTo(n(b));
      case CmDataColumnType.date:
        return (_time(a) ?? 0).compareTo(_time(b) ?? 0);
      case CmDataColumnType.text:
        return _natural(a.toString(), b.toString());
    }
  }

  /// Case-insensitive, with runs of digits compared as numbers.
  static int _natural(String a, String b) {
    final re = RegExp(r'\d+|\D+');
    final pa = re.allMatches(a.toLowerCase()).map((m) => m.group(0)!).toList();
    final pb = re.allMatches(b.toLowerCase()).map((m) => m.group(0)!).toList();
    for (var i = 0; i < pa.length && i < pb.length; i++) {
      final x = pa[i], y = pb[i];
      final nx = int.tryParse(x), ny = int.tryParse(y);
      final r = nx != null && ny != null ? nx.compareTo(ny) : x.compareTo(y);
      if (r != 0) return r;
    }
    return pa.length.compareTo(pb.length);
  }

  /// [rows] sorted by the column [key] (stable; empty values stay last in both directions).
  static List<Map<String, Object?>> sortRows(List<Map<String, Object?>> rows, CmDataTableColumn column, CmSortDirection direction) {
    final sign = direction == CmSortDirection.descending ? -1 : 1;
    final indexed = [for (var i = 0; i < rows.length; i++) (rows[i], i)];
    indexed.sort((p, q) {
      final a = p.$1[column.key], b = q.$1[column.key];
      final ea = _empty(a), eb = _empty(b);
      if (ea || eb) return ea == eb ? p.$2 - q.$2 : (ea ? 1 : -1);
      final r = sign * compare(a, b, column.type);
      return r != 0 ? r : p.$2 - q.$2;
    });
    return [for (final p in indexed) p.$1];
  }

  /// How a value is written in a cell: text as is, dates as "9 Feb 2023".
  static String format(Object? v) {
    if (v == null) return '';
    if (v is DateTime) {
      const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${v.day} ${m[v.month - 1]} ${v.year}';
    }
    return v.toString();
  }

  @override
  State<CmDataTable> createState() => _CmDataTableState();
}

class _CmDataTableState extends State<CmDataTable> {
  late String? _sort = widget.sortKey;
  late CmSortDirection _dir = widget.direction;
  bool _awaitingManual = false;
  final _hBody = ScrollController(), _hHead = ScrollController(), _hFoot = ScrollController(), _v = ScrollController();

  @override
  void initState() {
    super.initState();
    _hBody.addListener(() {
      for (final c in [_hHead, _hFoot]) {
        if (c.hasClients && c.offset != _hBody.offset) c.jumpTo(_hBody.offset.clamp(0, c.position.maxScrollExtent));
      }
    });
  }

  @override
  void didUpdateWidget(CmDataTable old) {
    super.didUpdateWidget(old);
    if (widget.sortKey != old.sortKey || widget.direction != old.direction) {
      _sort = widget.sortKey;
      _dir = widget.direction;
      // Manual mode: the page sorted and passed the new state back; announce it now.
      if (_awaitingManual && _sort != null) {
        _awaitingManual = false;
        _announce();
      }
    }
  }

  @override
  void dispose() {
    for (final c in [_hBody, _hHead, _hFoot, _v]) {
      c.dispose();
    }
    super.dispose();
  }

  CmDataTableColumn? get _sortColumn {
    for (final c in widget.columns) {
      if (c.key == _sort) return c;
    }
    return null;
  }

  void _announce() {
    final col = _sortColumn;
    if (col == null) return;
    SemanticsService.announce('Sorted by ${col.label}, ${_dir.name}', Directionality.of(context));
  }

  void _onSort(CmDataTableColumn c) {
    final direction = _sort == c.key && _dir == CmSortDirection.ascending ? CmSortDirection.descending : CmSortDirection.ascending;
    widget.onSort?.call(c.key, direction);
    if (widget.sortMode == CmDataTableSortMode.manual) {
      _awaitingManual = true;
      return;
    }
    setState(() {
      _sort = c.key;
      _dir = direction;
    });
    _announce();
  }

  List<Map<String, Object?>> get _rows {
    final col = _sortColumn;
    if (col == null || widget.sortMode == CmDataTableSortMode.manual) return widget.rows;
    return CmDataTable.sortRows(widget.rows, col, _dir);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final scaler = MediaQuery.textScalerOf(context);
    final cellStyle = CmType.bodyMd.copyWith(color: c.textDefault, fontFeatures: const [FontFeature.tabularFigures()]);
    final headStyle = CmType.bodySm.copyWith(color: c.textDefault);
    final footStyle = cellStyle.copyWith(fontWeight: FontWeight.w500);
    final cols = widget.columns;
    final rows = _rows;
    final showEmpty = !widget.loading && rows.isEmpty;
    final showTotals = widget.totals != null && !widget.loading && !showEmpty;

    double measure(String s, TextStyle st) {
      if (s.isEmpty) return 0;
      final p = TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr, textScaler: scaler, maxLines: 1)..layout();
      final w = p.width;
      p.dispose();
      return w;
    }

    // Natural widths: the widest heading, cell or total in each column, plus 20px padding each side.
    final natural = [
      for (final col in cols)
        // +2 for the heading's side borders and sub-pixel text widths.
        2 * CmSpace.s20 + 2 +
            [
              col.hidden ? 0.0 : measure(col.label, headStyle) + (col.sortable ? 16 : 0),
              if (!widget.loading) for (final r in rows) measure(CmDataTable.format(r[col.key]), cellStyle),
              if (showTotals) measure(CmDataTable.format(widget.totals![col.key]), footStyle),
              if (widget.loading) 40.0,
            ].fold<double>(0, (a, b) => a > b ? a : b),
    ];
    final rowH = scaler.scale(14) * 1.5 + 2 * CmSpace.s10 + 1;
    final headH = scaler.scale(12) * 1.5 + 2 * 7 + 4 + 2;

    final focusRing = BoxDecoration(border: Border.all(color: c.borderStrong, width: 2), borderRadius: BorderRadius.circular(CmRadius.xs));

    Widget headCell(int i, double w) {
      final col = cols[i];
      final first = i == 0, last = i == cols.length - 1;
      final side = BorderSide(color: c.borderSubtle);
      final on = col.key == _sort;
      final desc = on && _dir == CmSortDirection.descending;
      Widget label = col.hidden
          ? Semantics(label: col.label, child: const SizedBox(width: 1, height: 18))
          : Text(col.label, maxLines: 1, softWrap: false, style: headStyle);
      if (col.sortable) {
        label = _SortHeading(
          label: label,
          semanticLabel: '${col.label}, ${on ? 'sorted ${desc ? 'descending' : 'ascending'}' : 'sortable'}',
          icon: CmIcon(desc ? CmIcons.chevronDown : CmIcons.chevronUp, size: 12, color: c.iconSelected),
          showIcon: on,
          iconFirst: col._end,
          focusRing: focusRing,
          onTap: () => _onSort(col),
        );
      } else if (!col.hidden) {
        label = Semantics(header: true, child: label);
      }
      return Container(
        width: w,
        height: headH,
        padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20),
        alignment: col._end ? Alignment.centerRight : Alignment.centerLeft,
        decoration: BoxDecoration(
          color: c.bgHover,
          border: Border(top: side, bottom: side, left: first ? side : BorderSide.none, right: last ? side : BorderSide.none),
          borderRadius: BorderRadius.only(
            topLeft: first ? const Radius.circular(CmRadius.md) : Radius.zero,
            topRight: last ? const Radius.circular(CmRadius.md) : Radius.zero,
          ),
        ),
        child: label,
      );
    }

    Widget cell(int i, double w, Widget child, {TextStyle? style}) => Container(
          width: w,
          height: rowH,
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20),
          alignment: cols[i]._end ? Alignment.centerRight : Alignment.centerLeft,
          decoration: BoxDecoration(color: c.bgSurface, border: Border(bottom: BorderSide(color: c.borderDefault))),
          child: child,
        );

    Widget text(Object? v, TextStyle st, {bool header = false}) {
      final t = Text(CmDataTable.format(v), maxLines: 1, softWrap: false, style: st);
      return header ? Semantics(header: true, child: t) : t;
    }

    /// The heading, body rows and totals for the columns [idx], each as a list of rows.
    Widget head(List<int> idx, List<double> w) => Row(children: [for (final i in idx) headCell(i, w[i])]);
    List<Widget> body(List<int> idx, List<double> w) => widget.loading
        ? [
            for (var r = 0; r < (widget.loadingRows < 1 ? 1 : widget.loadingRows); r++)
              Row(children: [for (final i in idx) cell(i, w[i], const CmSkeleton(width: 40))]),
          ]
        : [
            for (final r in rows)
              // The first cell names the row, as a row heading does on the web.
              Row(children: [for (final i in idx) cell(i, w[i], text(r[cols[i].key], cellStyle, header: i == 0))]),
          ];
    Widget? foot(List<int> idx, List<double> w) =>
        showTotals ? Row(children: [for (final i in idx) cell(i, w[i], text(widget.totals![cols[i].key], footStyle))]) : null;

    final caption = widget.captionHidden
        ? null
        : Padding(
            padding: const EdgeInsets.only(bottom: CmSpace.s10),
            child: Text(widget.caption, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, color: c.textDefault)),
          );

    Widget vertical(Widget child) => widget.stickyHeader && widget.maxHeight != null
        ? ConstrainedBox(
            constraints: BoxConstraints(maxHeight: widget.maxHeight!),
            child: Scrollbar(controller: _v, child: SingleChildScrollView(controller: _v, child: child)),
          )
        : child;

    final table = LayoutBuilder(builder: (context, box) {
      final total = natural.fold<double>(0, (a, b) => a + b);
      final avail = box.maxWidth.isFinite ? box.maxWidth : total;
      // Wider than needed: share the extra space in proportion, as a 100%-wide table does.
      final w = total >= avail || total == 0 ? natural : [for (final n in natural) n * avail / total];
      final all = [for (var i = 0; i < cols.length; i++) i];
      final emptyRow = Container(
        width: (total >= avail ? total : avail),
        padding: const EdgeInsets.all(CmSpace.s20),
        child: DefaultTextStyle.merge(style: cellStyle, child: widget.empty ?? Text('No data', style: cellStyle)),
      );

      if (!widget.stickyFirstColumn || cols.length < 2) {
        final footer = foot(all, w);
        return Scrollbar(
          controller: _hBody,
          child: SingleChildScrollView(
            controller: _hBody,
            scrollDirection: Axis.horizontal,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              head(all, w),
              vertical(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [...body(all, w), if (showEmpty) emptyRow])),
              ?footer,
            ]),
          ),
        );
      }

      // Sticky first column: it stays put while the other columns scroll sideways together.
      final rest = all.sublist(1);
      Widget side(ScrollController ctrl, Widget child, {bool user = false}) => Expanded(
            child: SingleChildScrollView(
              controller: ctrl,
              scrollDirection: Axis.horizontal,
              physics: user ? null : const NeverScrollableScrollPhysics(),
              child: child,
            ),
          );
      final footer = showTotals ? Row(children: [foot([0], w)!, side(_hFoot, foot(rest, w)!)]) : null;
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [head([0], w), side(_hHead, head(rest, w))]),
        vertical(showEmpty
            ? SingleChildScrollView(scrollDirection: Axis.horizontal, child: emptyRow)
            : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Column(children: body([0], w)),
                side(_hBody, Column(crossAxisAlignment: CrossAxisAlignment.start, children: body(rest, w)), user: true),
              ])),
        ?footer,
      ]);
    });

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.loading ? '${widget.caption}, loading' : widget.caption,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        if (caption != null) ExcludeSemantics(child: caption),
        table,
      ]),
    );
  }
}

class _SortHeading extends StatefulWidget {
  const _SortHeading({required this.label, required this.semanticLabel, required this.icon, required this.showIcon, required this.iconFirst, required this.focusRing, required this.onTap});
  final Widget label, icon;
  final String semanticLabel;
  final bool showIcon, iconFirst;
  final BoxDecoration focusRing;
  final VoidCallback onTap;

  @override
  State<_SortHeading> createState() => _SortHeadingState();
}

class _SortHeadingState extends State<_SortHeading> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final icon = Opacity(opacity: widget.showIcon || _hover ? 1 : 0, child: widget.icon);
    return Semantics(
      button: true,
      header: true,
      label: widget.semanticLabel,
      excludeSemantics: true,
      onTap: widget.onTap,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 2),
            decoration: _focus ? widget.focusRing : null,
            child: Row(mainAxisSize: MainAxisSize.min, children: widget.iconFirst
                ? [icon, const SizedBox(width: 4), Flexible(child: widget.label)]
                : [Flexible(child: widget.label), const SizedBox(width: 4), icon]),
          ),
        ),
      ),
    );
  }
}
