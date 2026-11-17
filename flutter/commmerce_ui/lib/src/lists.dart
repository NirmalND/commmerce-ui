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

/// A move of a top-level row into another [CmNestedList] with the same `group`, reported to
/// [CmNestedList.onMove] before it happens. Since 1.3.
@immutable
class CmNestedMove {
  const CmNestedMove({required this.item, required this.fromList, required this.toList, required this.from, required this.to});

  /// The row moved.
  final CmNestedItem item;

  /// [CmNestedList.id] of the list it leaves and of the list it goes to.
  final String fromList, toList;

  /// Its position in the list it leaves, and its position in the list it goes to after the move.
  final int from, to;

  @override
  String toString() => 'CmNestedMove(${item.id}: $fromList[$from] -> $toList[$to])';
}

/// A titled group of rows that nest inside each other, such as a navigation menu with links and
/// sub-links, or categories and sub-categories. Mirrors `<cm-nested-list>`.
///
/// With [sortable], each row gets a drag handle: drag it, or focus it and press ↑/↓ (Home/End) to
/// move the row among its siblings. The list doesn't reorder your data: [onReorder] reports the move
/// (`parentId` is null for top-level rows) and you rebuild with the new order.
///
/// Give sortable lists the same [group] to let top-level rows move between them (since 1.3), e.g. every section
/// of a form layout: drag a handle into another list, or press ↑ on the first row or ↓ on the last to move it into
/// the list before or after (lists are in reading order on screen). [onMove] reports each such move; update both
/// lists in your data. An empty list in a group shows a drop area.
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
    this.group,
    this.id,
    this.onMove,
  });

  /// Name shared by sortable lists that accept each other's top-level rows. Since 1.3.
  final String? group;

  /// Identifies the list in [CmNestedMove]. Default: [heading].
  final String? id;

  /// Called before a top-level row moves into another list of the [group]. Return `false` to refuse it.
  /// The list the row leaves calls its own [onMove] (or, without one, the target list's): give every list in
  /// the group the same handler.
  final bool? Function(CmNestedMove move)? onMove;

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

/// A drag of a top-level row in a grouped list, by pointer.
class _NestedDrag {
  _NestedDrag(this.item, this.from, this.fromIndex);
  final CmNestedItem item;
  final _CmNestedListState from;
  final int fromIndex;
  _CmNestedListState? target;
  int index = 0;
}

class _CmNestedListState extends State<CmNestedList> {
  late bool _open = widget.open ?? widget.initiallyOpen;
  final Map<String, FocusNode> _handles = {};
  final Map<String, GlobalKey> _rowKeys = {};
  final _rowsKey = GlobalKey();

  /// Mounted lists by group, to find the lists a row can move between.
  static final Map<String, Set<_CmNestedListState>> _groups = {};
  static _NestedDrag? _drag;

  bool get _shown => !widget.collapsible || (widget.open ?? _open);
  String get _id => widget.id ?? widget.heading;
  String? get _groupName => (widget.group ?? '').isEmpty ? null : widget.group;

  FocusNode _node(String id) => _handles.putIfAbsent(id, () => FocusNode(debugLabel: 'CmNestedList handle $id'));
  GlobalKey _rowKey(String id) => _rowKeys.putIfAbsent(id, () => GlobalKey(debugLabel: 'CmNestedList row $id'));

  @override
  void initState() {
    super.initState();
    _register();
  }

  @override
  void didUpdateWidget(CmNestedList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.group != widget.group) {
      _unregister(oldWidget.group);
      _register();
    }
  }

  void _register() {
    if (_groupName != null) (_groups[_groupName!] ??= {}).add(this);
  }

  void _unregister(String? group) {
    final set = _groups[group];
    set?.remove(this);
    if (set != null && set.isEmpty) _groups.remove(group);
  }

  @override
  void dispose() {
    _unregister(widget.group);
    for (final n in _handles.values) {
      n.dispose();
    }
    super.dispose();
  }

  /// The lists a top-level row can move between: sortable, shown lists of the same group (and this one), in
  /// reading order on screen.
  List<_CmNestedListState> get _peers {
    final g = _groupName;
    if (g == null) return const [];
    final rtl = Directionality.of(context) == TextDirection.rtl;
    Offset pos(_CmNestedListState s) {
      final box = s.context.findRenderObject() as RenderBox?;
      return box != null && box.attached ? box.localToGlobal(Offset.zero) : Offset.zero;
    }

    final list = (_groups[g] ?? const <_CmNestedListState>{})
        .where((s) => s == this || (s.mounted && s.widget.sortable && s._shown))
        .toList()
      ..sort((a, b) {
        final pa = pos(a), pb = pos(b);
        if ((pa.dy - pb.dy).abs() > 1) return pa.dy.compareTo(pb.dy);
        return rtl ? pb.dx.compareTo(pa.dx) : pa.dx.compareTo(pb.dx);
      });
    return list;
  }

  bool get _canCross => _groupName != null && (widget.onMove != null || _peers.any((p) => p.widget.onMove != null));

  /// Moves a top-level row into [target] at [to] (default: the end) after asking [CmNestedList.onMove].
  bool _moveToList(CmNestedItem item, _CmNestedListState target, int? to, {bool keyboard = false}) {
    if (target == this) return false;
    final handler = widget.onMove ?? target.widget.onMove;
    if (handler == null || _groupName == null || target._groupName != _groupName) return false;
    final from = widget.items.indexWhere((i) => i.id == item.id);
    if (from < 0) return false;
    final rows = target.widget.items;
    final index = (to ?? rows.length).clamp(0, rows.length);
    if (handler(CmNestedMove(item: item, fromList: _id, toList: target._id, from: from, to: index)) == false) return false;
    SemanticsService.announce(CmStrings.of(context).movedToList(item.label, target.widget.heading, index + 1, rows.length + 1), Directionality.of(context));
    if (keyboard) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (target.mounted) target._node(item.id).requestFocus();
      });
    }
    return true;
  }

  /// ↑ on the first row or ↓ on the last: into the list before or after, if there is one.
  bool _cross(CmNestedItem item, int dir) {
    final peers = _peers;
    final i = peers.indexOf(this);
    if (i < 0 || i + dir < 0 || i + dir >= peers.length) return false;
    final next = peers[i + dir];
    return _moveToList(item, next, dir < 0 ? next.widget.items.length : 0, keyboard: true);
  }

  // ---------- Pointer drag between lists ----------

  /// Position a dragged row would take among this list's rows (it is left out) for a pointer at [y].
  int _indexAt(double y, String draggedId) {
    var n = 0;
    for (final it in widget.items) {
      if (it.id == draggedId) continue;
      final box = _rowKey(it.id).currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) continue;
      if (box.localToGlobal(Offset.zero).dy + box.size.height / 2 < y) n++;
    }
    return n;
  }

  bool _contains(Offset p) {
    final box = (_rowsKey.currentContext ?? context).findRenderObject() as RenderBox?;
    if (box == null || !box.attached) return false;
    return (box.localToGlobal(Offset.zero) & box.size).contains(p);
  }

  void _dragUpdate(Offset p) {
    final d = _drag;
    if (d == null) return;
    var target = this;
    for (final l in _peers) {
      if (l != this && l._contains(p)) {
        target = l;
        break;
      }
    }
    final index = target._indexAt(p.dy, d.item.id);
    if (target == d.target && index == d.index) return;
    final old = d.target;
    d.target = target;
    d.index = index;
    if (old != null && old != target && old.mounted) old.setState(() {});
    if (target.mounted) target.setState(() {});
  }

  void _dragEnd() {
    final d = _drag;
    _drag = null;
    if (d == null) return;
    for (final l in _peers) {
      if (l.mounted) l.setState(() {});
    }
    final target = d.target;
    if (target == null) return;
    if (target != this) {
      _moveToList(d.item, target, d.index);
    } else if (d.index != d.fromIndex) {
      _move(null, widget.items, d.fromIndex, d.index);
    }
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
    if (parentId == null && _groupName != null && widget.sortable) return _groupedRows(context, items);
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

  /// Top-level rows of a list with a `group`: dragged by their handles within and between the lists of the group.
  Widget _groupedRows(BuildContext context, List<CmNestedItem> items) {
    final c = CmTheme.colorsOf(context);
    final d = _drag;
    final over = d != null && d.target == this;
    final others = over ? items.where((i) => i.id != d.item.id).toList() : items;
    Widget line() => Container(height: 2, margin: const EdgeInsets.only(bottom: CmSpace.s10 - 2), color: c.borderStrong);
    final children = <Widget>[];
    for (var i = 0; i < items.length; i++) {
      final it = items[i];
      if (over && it.id != d.item.id && others.indexOf(it) == d.index) children.add(line());
      children.add(Padding(
        key: _rowKey(it.id),
        padding: EdgeInsets.only(bottom: i == items.length - 1 ? 0 : CmSpace.s10),
        child: Opacity(opacity: d?.item.id == it.id ? 0.5 : 1, child: _row(context, items, i, null, widget.sortable)),
      ));
    }
    if (over && d.index >= others.length && others.isNotEmpty) children.add(Padding(padding: const EdgeInsets.only(top: CmSpace.s10 - 2), child: line()));
    if (items.isEmpty) {
      return Container(
        key: _rowsKey,
        constraints: const BoxConstraints(minHeight: 60),
        decoration: BoxDecoration(
          border: Border.all(color: over ? c.borderStrong : c.borderDefault, width: over ? 2 : 1),
          borderRadius: BorderRadius.circular(CmRadius.md),
        ),
      );
    }
    return Column(key: _rowsKey, crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: children);
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
                grouped: parentId == null && _groupName != null,
                onCross: parentId == null && _groupName != null && _canCross ? (dir) => _cross(item, dir) : null,
                drag: parentId == null && _groupName != null && sortable
                    ? (handle) => Draggable<String>(
                          data: item.id,
                          feedback: Builder(builder: (_) => _feedback(context, item)),
                          onDragStarted: () => setState(() => _drag = _NestedDrag(item, this, i)..target = this..index = i),
                          onDragUpdate: (e) => _dragUpdate(e.globalPosition),
                          onDragEnd: (_) => _dragEnd(),
                          child: handle,
                        )
                    : null,
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

  Widget _feedback(BuildContext context, CmNestedItem item) {
    final c = CmTheme.colorsOf(context);
    final box = _rowKey(item.id).currentContext?.findRenderObject() as RenderBox?;
    final width = box != null && box.hasSize ? box.size.width : 300.0;
    return Directionality(
      textDirection: Directionality.of(context),
      child: Material(
        color: c.bgSurface,
        elevation: 4,
        borderRadius: BorderRadius.circular(CmRadius.md),
        child: Container(
          width: width,
          constraints: const BoxConstraints(minHeight: 50),
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20),
          alignment: AlignmentDirectional.centerStart,
          decoration: BoxDecoration(border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Text(item.label, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: 16, fontWeight: FontWeight.w500, color: c.textDefault)),
        ),
      ),
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
      if (shown && (widget.items.isNotEmpty || (_groupName != null && widget.sortable)))
        Padding(
          padding: EdgeInsets.only(top: CmSpace.s15, left: phone ? CmSpace.s10 : 50),
          child: Semantics(container: true, label: widget.heading, explicitChildNodes: true, child: _group(context, widget.items, null)),
        ),
    ]);
  }
}

class _Handle extends StatefulWidget {
  const _Handle({
    required this.label,
    required this.index,
    required this.node,
    required this.enabled,
    required this.onMove,
    required this.count,
    this.grouped = false,
    this.onCross,
    this.drag,
  });
  final String label;
  final int index, count;
  final FocusNode node;
  final bool enabled, grouped;
  final ValueChanged<int> onMove;

  /// ↑ on the first row (-1) or ↓ on the last (1) of a grouped list: move into the list before or after.
  final bool Function(int dir)? onCross;

  /// Wraps the handle in a drag between lists, instead of the list's own reorder drag.
  final Widget Function(Widget handle)? drag;

  @override
  State<_Handle> createState() => _HandleState();
}

class _HandleState extends State<_Handle> {
  bool _focus = false;

  KeyEventResult _key(KeyEvent e) {
    if (!widget.enabled || (e is! KeyDownEvent && e is! KeyRepeatEvent)) return KeyEventResult.ignored;
    final k = e.logicalKey;
    final up = k == LogicalKeyboardKey.arrowUp, down = k == LogicalKeyboardKey.arrowDown;
    if (widget.onCross != null && ((up && widget.index == 0) || (down && widget.index == widget.count - 1))) {
      if (widget.onCross!(up ? -1 : 1)) return KeyEventResult.handled;
    }
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
    if (widget.enabled) handle = widget.drag?.call(handle) ?? ReorderableDragStartListener(index: i, child: handle);
    return Semantics(
      button: true,
      enabled: widget.enabled,
      label: CmStrings.of(context).reorder(widget.label),
      hint: widget.grouped ? CmStrings.of(context).reorderHintGroup : CmStrings.of(context).reorderHint,
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
