import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// A row in a [CmNestedList]. Put more items in [children] to nest them; each level is indented.
@immutable
class CmNestedItem {
  const CmNestedItem({required this.id, required this.label, this.actions = const [], this.children = const []});

  /// Stable id, used for reordering and focus.
  final String id;

  /// Row text, e.g. a menu link or category name.
  final String label;

  /// Controls at the end of the row: a badge, a toggle, edit and delete buttons.
  final List<Widget> actions;
  final List<CmNestedItem> children;
}

/// A titled group of rows that nest inside each other, such as a navigation menu with links and
/// sub-links, or categories and sub-categories. Mirrors `<cm-nested-list>`.
///
/// With [sortable], each row gets a drag handle: drag it, or focus it and press ↑/↓ (Home/End) to
/// move the row among its siblings. The list doesn't reorder your data: [onReorder] reports the move
/// (`parentId` is null for top-level rows) and you rebuild with the new order.
class CmNestedList extends StatefulWidget {
  const CmNestedList({
    super.key,
    required this.heading,
    required this.items,
    this.actions = const [],
    this.sortable = false,
    this.onReorder,
    this.collapsible = false,
    this.open,
    this.initiallyOpen = true,
    this.onToggle,
  });

  /// Title in the grey bar, e.g. "Header" or "Clothing & accessories".
  final String heading;
  final List<CmNestedItem> items;

  /// Controls in the heading bar, e.g. an "Add links" button.
  final List<Widget> actions;

  /// Rows get drag handles and can be reordered among their siblings.
  final bool sortable;

  /// Called after a move with the parent's id (null at the top level) and the old and new positions.
  final void Function(String? parentId, int from, int to)? onReorder;

  /// Adds a round button to the bar that shows and hides the rows.
  final bool collapsible;

  /// Controls whether the rows are shown when [collapsible]. Leave null to let the list manage it.
  final bool? open;
  final bool initiallyOpen;
  final ValueChanged<bool>? onToggle;

  @override
  State<CmNestedList> createState() => _CmNestedListState();
}

class _CmNestedListState extends State<CmNestedList> {
  late bool _open = widget.open ?? widget.initiallyOpen;
  final Map<String, FocusNode> _handles = {};

  bool get _shown => !widget.collapsible || (widget.open ?? _open);

  FocusNode _node(String id) => _handles.putIfAbsent(id, () => FocusNode(debugLabel: 'CmNestedList handle $id'));

  @override
  void dispose() {
    for (final n in _handles.values) {
      n.dispose();
    }
    super.dispose();
  }

  void _toggle() {
    final next = !_shown;
    if (widget.open == null) setState(() => _open = next);
    widget.onToggle?.call(next);
  }

  void _move(String? parentId, List<CmNestedItem> siblings, int from, int to, {bool keyboard = false}) {
    to = to.clamp(0, siblings.length - 1);
    if (to == from || widget.onReorder == null) return;
    final item = siblings[from];
    widget.onReorder!(parentId, from, to);
    SemanticsService.announce(CmStrings.of(context).movedTo(item.label, to + 1, siblings.length), Directionality.of(context));
    if (keyboard) {
      // The moved row is rebuilt in its new place; give its handle focus back.
      WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _node(item.id).requestFocus(); });
    }
  }

  Widget _group(BuildContext context, List<CmNestedItem> items, String? parentId) {
    final sortable = widget.sortable && widget.onReorder != null && items.length > 1;
    Widget row(int i) => Padding(
          key: ValueKey(items[i].id),
          padding: EdgeInsets.only(top: i == 0 ? 0 : CmSpace.s10),
          child: _row(context, items, i, parentId, sortable),
        );
    if (!sortable) return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < items.length; i++) row(i)]);
    return ReorderableListView(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      buildDefaultDragHandles: false,
      onReorder: (from, to) => _move(parentId, items, from, to > from ? to - 1 : to),
      children: [for (var i = 0; i < items.length; i++) row(i)],
    );
  }

  Widget _row(BuildContext context, List<CmNestedItem> siblings, int i, String? parentId, bool sortable) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final item = siblings[i];
    final gap = phone ? CmSpace.s10 : CmSpace.s15;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Container(
          constraints: BoxConstraints(minHeight: phone ? 50 : 60),
          padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s10 : CmSpace.s20),
          decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Row(children: [
            if (widget.sortable) ...[
              _Handle(
                label: item.label,
                index: i,
                node: _node(item.id),
                enabled: sortable,
                onMove: (to) => _move(parentId, siblings, i, to, keyboard: true),
                count: siblings.length,
              ),
              SizedBox(width: gap - 6),
            ],
            Expanded(child: Text(item.label, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: phone ? 14 : 16, fontWeight: FontWeight.w500, color: c.textDefault))),
            for (final a in item.actions) ...[SizedBox(width: gap), a],
          ]),
        ),
        if (item.children.isNotEmpty)
          Padding(
            padding: EdgeInsets.only(top: CmSpace.s10, left: phone ? CmSpace.s20 : 50),
            child: Semantics(container: true, label: item.label, explicitChildNodes: true, child: _group(context, item.children, item.id)),
          ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final shown = _shown;
    final gap = phone ? CmSpace.s10 : CmSpace.s15;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      Container(
        constraints: BoxConstraints(minHeight: phone ? 60 : 90),
        padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s10 : CmSpace.s20),
        decoration: BoxDecoration(color: c.bgPage, borderRadius: BorderRadius.circular(CmRadius.md)),
        child: Row(children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(widget.heading, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: phone ? 18 : 26, height: 1.3, fontWeight: FontWeight.w500, color: c.textDefault)),
            ),
          ),
          for (final a in widget.actions) ...[SizedBox(width: gap), a],
          if (widget.collapsible) ...[
            SizedBox(width: gap),
            Semantics(
              button: true,
              expanded: shown,
              label: shown ? CmStrings.of(context).hideSection(widget.heading) : CmStrings.of(context).showSection(widget.heading),
              excludeSemantics: true, onTap: _toggle,
              child: Material(
                color: c.actionPrimary,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  hoverColor: c.actionPrimaryHover,
                  onTap: _toggle,
                  child: SizedBox.square(
                    dimension: phone ? 30 : 34,
                    child: Center(child: CmIcon(shown ? CmIcons.chevronUp : CmIcons.chevronDown, size: 14, color: c.actionPrimaryText)),
                  ),
                ),
              ),
            ),
          ],
        ]),
      ),
      if (shown && widget.items.isNotEmpty)
        Padding(
          padding: EdgeInsets.only(top: CmSpace.s15, left: phone ? CmSpace.s10 : 50),
          child: Semantics(container: true, label: widget.heading, explicitChildNodes: true, child: _group(context, widget.items, null)),
        ),
    ]);
  }
}

class _Handle extends StatefulWidget {
  const _Handle({required this.label, required this.index, required this.node, required this.enabled, required this.onMove, required this.count});
  final String label;
  final int index, count;
  final FocusNode node;
  final bool enabled;
  final ValueChanged<int> onMove;

  @override
  State<_Handle> createState() => _HandleState();
}

class _HandleState extends State<_Handle> {
  bool _focus = false;

  KeyEventResult _key(KeyEvent e) {
    if (!widget.enabled || (e is! KeyDownEvent && e is! KeyRepeatEvent)) return KeyEventResult.ignored;
    final k = e.logicalKey;
    final int to;
    if (k == LogicalKeyboardKey.arrowUp) {
      to = widget.index - 1;
    } else if (k == LogicalKeyboardKey.arrowDown) {
      to = widget.index + 1;
    } else if (k == LogicalKeyboardKey.home) {
      to = 0;
    } else if (k == LogicalKeyboardKey.end) {
      to = widget.count - 1;
    } else {
      return KeyEventResult.ignored;
    }
    widget.onMove(to);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final i = widget.index;
    Widget handle = MouseRegion(
      cursor: widget.enabled ? SystemMouseCursors.grab : SystemMouseCursors.basic,
      child: Container(
        width: 24, height: 34,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(CmRadius.xs),
          border: _focus ? Border.all(color: c.borderStrong, width: 2) : null,
        ),
        child: Center(child: CmIcon(CmIcons.drag, size: 18, color: c.iconSelected)),
      ),
    );
    if (widget.enabled) handle = ReorderableDragStartListener(index: i, child: handle);
    return Semantics(
      button: true,
      enabled: widget.enabled,
      label: CmStrings.of(context).reorder(widget.label),
      hint: CmStrings.of(context).reorderHint,
      customSemanticsActions: widget.enabled
          ? {
              if (i > 0) CustomSemanticsAction(label: CmStrings.of(context).moveUp): () => widget.onMove(i - 1),
              if (i < widget.count - 1) CustomSemanticsAction(label: CmStrings.of(context).moveDown): () => widget.onMove(i + 1),
            }
          : null,
      excludeSemantics: true,
      // Activating the handle focuses it; arrow keys or the Move up/down actions then reorder.
      onTap: widget.enabled ? () => widget.node.requestFocus() : null,
      child: Transform.translate(
        offset: const Offset(-6, 0),
        child: Focus(
          focusNode: widget.node,
          canRequestFocus: widget.enabled,
          onFocusChange: (f) => setState(() => _focus = f),
          onKeyEvent: (_, e) => _key(e),
          child: handle,
        ),
      ),
    );
  }
}

/// A square tile that opens one report: a large icon over a short name, e.g. "Hourly sales".
/// A pinned tile shows a pin in its corner. Mirrors `<cm-report-tile>`.
class CmReportTile extends StatefulWidget {
  const CmReportTile({super.key, required this.label, required this.onTap, this.icon = CmIcons.chart, this.illustration, this.pinned = false});

  /// Report name, two or three words in sentence case.
  final String label;
  final VoidCallback? onTap;

  /// System icon from [CmIcons].
  final String icon;

  /// Your own 58px illustration instead of [icon] (38px on phones). Decorative.
  final Widget? illustration;

  /// Shows a pin: the report is pinned to the dashboard.
  final bool pinned;

  @override
  State<CmReportTile> createState() => _CmReportTileState();
}

class _CmReportTileState extends State<CmReportTile> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final icon = phone ? 38.0 : 58.0;
    return Semantics(
      button: true,
      label: widget.pinned ? CmStrings.of(context).pinned(widget.label) : widget.label,
      excludeSemantics: true, onTap: widget.onTap,
      child: FocusableActionDetector(
        enabled: widget.onTap != null,
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap?.call(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            height: phone ? 118 : 150,
            padding: const EdgeInsets.all(CmSpace.s10),
            decoration: BoxDecoration(
              color: c.bgSurface,
              border: Border.all(color: _hover ? c.borderStrong : c.borderDefault),
              borderRadius: BorderRadius.circular(CmRadius.md),
              boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
            ),
            child: Stack(children: [
              Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  SizedBox.square(dimension: icon, child: widget.illustration ?? CmIcon(widget.icon, size: icon, color: c.iconSelected)),
                  SizedBox(height: phone ? CmSpace.s10 : CmSpace.s20),
                  Text(widget.label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: CmType.bodyMd.copyWith(fontSize: phone ? 12 : 14, fontWeight: FontWeight.w500, height: 1.3, color: c.textDefault)),
                ]),
              ),
              if (widget.pinned) Positioned(top: phone ? -2 : 0, right: phone ? -2 : 0, child: CmIcon(CmIcons.pin, size: 18, color: c.iconSelected)),
            ]),
          ),
        ),
      ),
    );
  }
}

/// A titled group of [CmReportTile]s, e.g. "Sales". Tiles are 146px wide, 15px apart, and wrap;
/// on phones three fit a row. Mirrors `<cm-report-tiles>`.
class CmReportTiles extends StatelessWidget {
  const CmReportTiles({super.key, required this.tiles, this.heading});
  final List<Widget> tiles;

  /// Group title, one word where possible: "Sales".
  final String? heading;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: heading,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(phone ? CmSpace.s10 : CmSpace.s20),
        decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(CmRadius.md)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          if (heading != null)
            Padding(
              padding: EdgeInsets.only(bottom: phone ? CmSpace.s10 : CmSpace.s20),
              child: Semantics(header: true, child: Text(heading!, style: CmType.bodyLg.copyWith(fontSize: phone ? 14 : 16, fontWeight: FontWeight.w500, color: c.textDefault))),
            ),
          LayoutBuilder(builder: (context, box) {
            final gap = phone ? CmSpace.s10 : CmSpace.s15;
            final w = phone ? (box.maxWidth - 2 * gap) / 3 : 146.0;
            return Wrap(spacing: gap, runSpacing: gap, children: [for (final tile in tiles) SizedBox(width: w, child: tile)]);
          }),
        ]),
      ),
    );
  }
}

/// Sort order of a [CmTableHeader] column.
enum CmSortDirection { ascending, descending }

/// One column of a [CmTableHeader]. Lay out rows with the same [flex] and [width]
/// (see [CmTableHeader.row]).
@immutable
class CmTableColumn {
  const CmTableColumn({required this.key, required this.label, this.sortable = false, this.align = TextAlign.start, this.hidden = false, this.flex = 1, this.width});

  /// Identifies the column in [CmTableHeader.onSort].
  final String key;
  final String label;

  /// Sortable columns become buttons.
  final bool sortable;

  /// [TextAlign.start], [TextAlign.center] or [TextAlign.end].
  final TextAlign align;

  /// Read by screen readers only, e.g. for an actions column with no visible label.
  final bool hidden;

  /// Share of the remaining width, as a `fr` value in the web component's grid.
  final int flex;

  /// Fixed width in pixels instead of [flex].
  final double? width;
}

/// The grey 34px label bar at the top of a table or resource list: column names in 12px type,
/// optional sort buttons and an optional "select all" checkbox. Mirrors `<cm-table-header>`.
///
/// The header doesn't sort: [onSort] reports the column and the new direction, and you pass the new
/// [sortKey] and [direction] back. Use [CmTableHeader.row] to lay out rows on the same columns.
class CmTableHeader extends StatelessWidget {
  const CmTableHeader({super.key, required this.columns, this.sortKey, this.direction = CmSortDirection.ascending, this.onSort, this.selectAll = false, this.onSelectAll});

  final List<CmTableColumn> columns;

  /// Key of the sorted column.
  final String? sortKey;
  final CmSortDirection direction;

  /// Called when a sortable column is pressed: the same column flips direction, a new one starts ascending.
  final void Function(String key, CmSortDirection direction)? onSort;

  /// Select-all box: true ticked, false empty, null a dash (some rows selected).
  final bool? selectAll;

  /// Adds the leading select-all checkbox column when set.
  final ValueChanged<bool>? onSelectAll;

  static const double _gap = CmSpace.s20;

  /// Lays out [cells] on the same columns as a header with [columns], for the rows under it.
  /// Pass [leading] (e.g. a row checkbox) when the header has [onSelectAll].
  static Widget row({required List<CmTableColumn> columns, required List<Widget> cells, Widget? leading, bool selectable = false}) {
    final sel = selectable || leading != null;
    // +1 for the header's 1px border, so cells line up with the labels.
    return Padding(
      padding: EdgeInsets.only(left: (sel ? CmSpace.s10 : CmSpace.s20) + 1, right: CmSpace.s20 + 1),
      child: Row(children: [
        if (sel) ...[SizedBox(width: 20, child: leading), const SizedBox(width: _gap)],
        for (var i = 0; i < columns.length && i < cells.length; i++) ...[
          if (i > 0) const SizedBox(width: _gap),
          _cell(columns[i], Align(alignment: _align(columns[i].align), child: cells[i])),
        ],
      ]),
    );
  }

  static Alignment _align(TextAlign a) => switch (a) {
        TextAlign.center => Alignment.center,
        TextAlign.end || TextAlign.right => Alignment.centerRight,
        _ => Alignment.centerLeft,
      };

  static Widget _cell(CmTableColumn col, Widget child) => col.width != null ? SizedBox(width: col.width, child: child) : Expanded(flex: col.flex, child: child);

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final style = CmType.bodySm.copyWith(color: c.textDefault);
    final sel = onSelectAll != null;
    return Container(
      constraints: const BoxConstraints(minHeight: 34),
      padding: EdgeInsets.only(left: sel ? CmSpace.s10 : CmSpace.s20, right: CmSpace.s20),
      decoration: BoxDecoration(
        color: c.bgHover,
        border: Border.all(color: c.borderSubtle),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(CmRadius.md)),
      ),
      child: Row(children: [
        if (sel) ...[
          SizedBox.square(
            dimension: 20,
            child: Checkbox(
              value: selectAll,
              tristate: true,
              onChanged: (_) => onSelectAll!(selectAll != true),
              semanticLabel: CmStrings.of(context).selectAll,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              side: BorderSide(color: c.borderStrong),
              fillColor: WidgetStateProperty.all(c.bgSurface),
              checkColor: c.iconSelected,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.xs)),
            ),
          ),
          const SizedBox(width: _gap),
        ],
        for (var i = 0; i < columns.length; i++) ...[
          if (i > 0) const SizedBox(width: _gap),
          _cell(
            columns[i],
            Align(
              alignment: _align(columns[i].align),
              child: columns[i].sortable
                  ? _SortButton(
                      column: columns[i],
                      on: columns[i].key == sortKey,
                      direction: direction,
                      style: style,
                      onTap: onSort == null
                          ? null
                          : () => onSort!(columns[i].key, columns[i].key == sortKey && direction == CmSortDirection.ascending ? CmSortDirection.descending : CmSortDirection.ascending),
                    )
                  : columns[i].hidden
                      ? Semantics(label: columns[i].label, child: const SizedBox(height: 18))
                      : Semantics(header: true, child: Text(columns[i].label, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: columns[i].align, style: style)),
            ),
          ),
        ],
      ]),
    );
  }
}

class _SortButton extends StatefulWidget {
  const _SortButton({required this.column, required this.on, required this.direction, required this.style, required this.onTap});
  final CmTableColumn column;
  final bool on;
  final CmSortDirection direction;
  final TextStyle style;
  final VoidCallback? onTap;

  @override
  State<_SortButton> createState() => _SortButtonState();
}

class _SortButtonState extends State<_SortButton> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final desc = widget.on && widget.direction == CmSortDirection.descending;
    final s = CmStrings.of(context);
    final state = ', ${widget.on ? (desc ? s.sortedDescending : s.sortedAscending) : s.sortable}';
    return Semantics(
      button: true,
      header: true,
      label: '${widget.column.label}$state',
      excludeSemantics: true, onTap: widget.onTap,
      child: FocusableActionDetector(
        enabled: widget.onTap != null,
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap?.call(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 2),
            decoration: _focus ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2), borderRadius: BorderRadius.circular(CmRadius.xs)) : null,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Flexible(child: widget.column.hidden ? const SizedBox(height: 18) : Text(widget.column.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: widget.style)),
              const SizedBox(width: 4),
              Opacity(opacity: widget.on || _hover ? 1 : 0, child: CmIcon(desc ? CmIcons.chevronDown : CmIcons.chevronUp, size: 12, color: c.iconSelected)),
            ]),
          ),
        ),
      ),
    );
  }
}
