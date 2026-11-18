import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'button.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'overlays.dart';
import 'strings.dart';
import 'theme.dart';

/// What a [CmButtonGroup] does when its buttons don't fit on one line.
enum CmButtonGroupOverflow {
  /// The buttons wrap onto more lines, 8 apart. The default.
  wrap,

  /// One line: the buttons that don't fit move into a trailing "More" menu, the least important first.
  menu,
}

/// Where a [CmButtonGroup] lines its buttons up.
enum CmButtonGroupAlign {
  /// At the start edge (left, right in RTL). The default.
  start,

  /// At the end edge: dialog and card footers.
  end,
}

/// How long a button in a [CmButtonGroup] with [CmButtonGroupOverflow.menu] stays visible (web `data-priority`).
enum CmButtonPriority {
  /// Moves into the More menu first.
  low,

  /// The default: among these, the last in reading order moves first. A [CmButtonVariant.primary] button with this
  /// priority stays visible longest (after [high]), as long as it fits at all.
  normal,

  /// Stays visible longer than [normal] buttons.
  high,
}

/// A button in a [CmButtonGroup] with a [priority]. Plain [CmButton]s in a group have [CmButtonPriority.normal].
class CmButtonGroupItem extends StatelessWidget {
  const CmButtonGroupItem({super.key, required this.child, this.priority = CmButtonPriority.normal});

  final CmButton child;

  /// How long it stays visible when the group runs out of room ([CmButtonGroupOverflow.menu]).
  final CmButtonPriority priority;

  @override
  Widget build(BuildContext context) => child;
}

/// A row of buttons 8 apart: a task's outcome choices ("Spoke to them", "No answer, reschedule", "Not interested"),
/// card actions or a toolbar. Mirrors `<cm-button-group>` (web 1.7). Since 1.7.1.
///
/// By default ([CmButtonGroupOverflow.wrap]) the row wraps onto more lines when it runs out of room. With
/// [CmButtonGroupOverflow.menu] it stays on one line: the buttons that don't fit move into a trailing "More"
/// [CmActionMenu], measured from the group's own width (so it works in cards and side panels as well as on phones).
/// They leave in this order: [CmButtonPriority.low] buttons, then normal ones from the last backwards, then
/// [CmButtonPriority.high] ones, and a [CmButtonVariant.primary] button last. Menu items show the button's label and
/// icon, are disabled while the button is disabled or loading, and are destructive for [CmButtonTone.critical];
/// choosing one calls the button's own `onPressed`. Buttons come back out of the menu when there is room again.
///
/// The More trigger matches the buttons: 36 (slim 32, large 40), drawn 40 on touch screens with a 44 hit area. Focus
/// on a button that moves into the menu goes to More; focus on More when it goes away goes to the last button.
class CmButtonGroup extends StatefulWidget {
  const CmButtonGroup({
    super.key,
    required this.children,
    this.overflow = CmButtonGroupOverflow.wrap,
    this.align = CmButtonGroupAlign.start,
    this.label,
    this.moreLabel,
    this.moreIcon,
    this.size,
    this.onOverflowChange,
  });

  /// [CmButton]s (or [CmButtonGroupItem]s, to give one a priority), in reading order. Give every button the same size.
  final List<Widget> children;

  /// [CmButtonGroupOverflow.wrap] (the default) or [CmButtonGroupOverflow.menu].
  final CmButtonGroupOverflow overflow;

  /// [CmButtonGroupAlign.start] (the default) or [CmButtonGroupAlign.end] (dialog and card footers).
  final CmButtonGroupAlign align;

  /// Accessible name of the group, e.g. "Call outcome".
  final String? label;

  /// Text of the More trigger, and the menu's name (its accessible name with [moreIcon]). Defaults to
  /// [CmStrings.buttonGroupMore] ("More").
  final String? moreLabel;

  /// Makes the More trigger a square icon button showing this icon from [CmIcons] (use [CmIcons.more], ⋮), named by
  /// [moreLabel]. Use it when even "More" is too wide, e.g. in table rows.
  final String? moreIcon;

  /// Size of the More trigger. Defaults to the first button's size.
  final CmButtonSize? size;

  /// Called after the set of buttons in the More menu changes, with their indexes in [children], in reading order.
  final ValueChanged<List<int>>? onOverflowChange;

  @override
  State<CmButtonGroup> createState() => _CmButtonGroupState();
}

class _CmButtonGroupState extends State<CmButtonGroup> {
  final _menu = GlobalKey<CmActionMenuState>();
  final _more = FocusNode(debugLabel: 'CmButtonGroup more');
  final List<FocusNode> _wrappers = [];
  List<int> _hidden = const [];

  CmButton _button(int i) {
    final w = widget.children[i];
    if (w is CmButtonGroupItem) return w.child;
    assert(w is CmButton, 'CmButtonGroup children must be CmButtons or CmButtonGroupItems.');
    return w as CmButton;
  }

  int _rank(int i) {
    final w = widget.children[i];
    final p = w is CmButtonGroupItem ? w.priority : CmButtonPriority.normal;
    return switch (p) {
      CmButtonPriority.low => 0,
      CmButtonPriority.high => 2,
      CmButtonPriority.normal => _button(i).variant == CmButtonVariant.primary ? 3 : 1,
    };
  }

  FocusNode _wrapper(int i) {
    while (_wrappers.length <= i) {
      _wrappers.add(FocusNode(debugLabel: 'CmButtonGroup button ${_wrappers.length}', canRequestFocus: false, skipTraversal: true));
    }
    return _wrappers[i];
  }

  @override
  void didUpdateWidget(CmButtonGroup old) {
    super.didUpdateWidget(old);
    if (widget.overflow != CmButtonGroupOverflow.menu && _hidden.isNotEmpty) {
      _hidden = const [];
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onOverflowChange?.call(const []);
      });
    }
  }

  @override
  void dispose() {
    _more.dispose();
    for (final n in _wrappers) {
      n.dispose();
    }
    super.dispose();
  }

  /// Focuses the last visible button that can take focus.
  void _focusLastButton(List<int> hidden) {
    for (var i = widget.children.length - 1; i >= 0; i--) {
      if (hidden.contains(i) || i >= _wrappers.length) continue;
      final target = _wrappers[i].descendants.where((n) => n.canRequestFocus && !n.skipTraversal).firstOrNull;
      if (target != null) {
        target.requestFocus();
        return;
      }
    }
  }

  /// The row measured again and moved buttons into or out of the menu (called after the frame that laid it out).
  void _onHidden(List<int> hidden) {
    if (!mounted || widget.overflow != CmButtonGroupOverflow.menu || listEquals(hidden, _hidden)) return;
    final moreHadFocus = _more.hasFocus;
    final movedFocus = [for (final i in hidden) if (i < _wrappers.length && _wrappers[i].hasFocus) i].isNotEmpty;
    setState(() => _hidden = hidden);
    if (hidden.isEmpty) _menu.currentState?.hide();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (movedFocus && hidden.isNotEmpty) {
        _more.requestFocus();
      } else if (moreHadFocus && hidden.isEmpty) {
        _focusLastButton(hidden);
      }
    });
    widget.onOverflowChange?.call(List.unmodifiable(hidden));
  }

  CmButtonSize get _size => widget.size ?? (widget.children.isEmpty ? CmButtonSize.medium : _button(0).size);

  Widget _moreTrigger(BuildContext context) {
    final strings = CmStrings.of(context);
    final label = widget.moreLabel ?? strings.buttonGroupMore;
    final hidden = [for (final i in _hidden) if (i < widget.children.length) i];
    return ExcludeFocus(
      excluding: hidden.isEmpty,
      child: CmActionMenu(
        key: _menu,
        label: label,
        align: CmMenuAlign.end,
        items: [
          for (final i in hidden)
            () {
              final b = _button(i);
              return CmMenuItem(
                label: b.label,
                value: '$i',
                icon: b.icon,
                disabled: b.onPressed == null || b.loading,
                critical: b.tone == CmButtonTone.critical,
                onPressed: b.onPressed,
              );
            }(),
        ],
        triggerBuilder: (context, open, toggle) => Semantics(
          expanded: open,
          child: widget.moreIcon != null
              ? CmButton.iconOnly(icon: widget.moreIcon!, label: label, size: _size, focusNode: _more, onPressed: () => _open(toggle))
              : CmButton(label: label, size: _size, focusNode: _more, onPressed: () => _open(toggle)),
        ),
      ),
    );
  }

  void _open(VoidCallback toggle) {
    // Focus More first (applied in a microtask), so the menu returns focus here when it closes.
    _more.requestFocus();
    scheduleMicrotask(() {
      if (mounted) toggle();
    });
  }

  @override
  Widget build(BuildContext context) {
    final n = widget.children.length;
    // On touch screens buttons carry an invisible 2px margin (their 44 hit area); the drawn gap stays 8.
    final gap = CmSpace.s8 - 2 * cmTouchSlop(context);
    final Widget content;
    if (widget.overflow == CmButtonGroupOverflow.wrap) {
      content = Wrap(
        spacing: gap,
        runSpacing: gap,
        alignment: widget.align == CmButtonGroupAlign.end ? WrapAlignment.end : WrapAlignment.start,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: widget.children,
      );
    } else {
      content = _OverflowRow(
        gap: gap,
        end: widget.align == CmButtonGroupAlign.end,
        textDirection: Directionality.of(context),
        ranks: [for (var i = 0; i < n; i++) _rank(i)],
        onHidden: _onHidden,
        children: [
          for (var i = 0; i < n; i++)
            Focus(
              focusNode: _wrapper(i),
              child: ExcludeFocus(excluding: _hidden.contains(i), child: widget.children[i]),
            ),
          _moreTrigger(context),
        ],
      );
    }
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: content,
    );
  }
}

class _OverflowRow extends MultiChildRenderObjectWidget {
  const _OverflowRow({required this.gap, required this.end, required this.textDirection, required this.ranks, required this.onHidden, required super.children});

  final double gap;
  final bool end;
  final TextDirection textDirection;
  final List<int> ranks;
  final ValueChanged<List<int>> onHidden;

  @override
  _RenderOverflowRow createRenderObject(BuildContext context) =>
      _RenderOverflowRow(gap: gap, end: end, textDirection: textDirection, ranks: ranks, onHidden: onHidden);

  @override
  void updateRenderObject(BuildContext context, _RenderOverflowRow r) {
    r
      ..gap = gap
      ..end = end
      ..textDirection = textDirection
      ..ranks = ranks
      ..onHidden = onHidden;
  }
}

class _RowParentData extends ContainerBoxParentData<RenderBox> {
  bool shown = true;
}

/// Lays the buttons out on one line; the ones that don't fit are laid out (to measure them) but not painted, hit or
/// read; the last child (More) shows only when something is hidden.
class _RenderOverflowRow extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _RowParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _RowParentData> {
  _RenderOverflowRow({required double gap, required bool end, required TextDirection textDirection, required List<int> ranks, required this.onHidden})
      : _gap = gap,
        _end = end,
        _textDirection = textDirection,
        _ranks = ranks;

  ValueChanged<List<int>> onHidden;
  List<int>? _reported;

  double _gap;
  set gap(double v) {
    if (v == _gap) return;
    _gap = v;
    markNeedsLayout();
  }

  bool _end;
  set end(bool v) {
    if (v == _end) return;
    _end = v;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection v) {
    if (v == _textDirection) return;
    _textDirection = v;
    markNeedsLayout();
  }

  List<int> _ranks;
  set ranks(List<int> v) {
    if (listEquals(v, _ranks)) return;
    _ranks = v;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _RowParentData) child.parentData = _RowParentData();
  }

  List<RenderBox> get _children {
    final list = <RenderBox>[];
    var c = firstChild;
    while (c != null) {
      list.add(c);
      c = childAfter(c);
    }
    return list;
  }

  BoxConstraints _childConstraints(RenderBox child, BoxConstraints constraints) {
    final maxW = constraints.maxWidth.isFinite ? constraints.maxWidth : child.getMaxIntrinsicWidth(constraints.maxHeight);
    return BoxConstraints(maxWidth: maxW, maxHeight: constraints.maxHeight);
  }

  /// Which buttons (indexes) to hide, given their widths, the More trigger's width and the room there is.
  Set<int> _plan(List<double> widths, double moreWidth, double avail) {
    final hide = <int>{};
    if (!avail.isFinite || widths.isEmpty) return hide;
    final total = widths.fold<double>(0, (s, w) => s + w) + _gap * math.max(widths.length - 1, 0);
    if (total <= avail + 0.5) return hide;
    final order = [for (var i = 0; i < widths.length; i++) i]
      ..sort((a, z) {
        final ra = a < _ranks.length ? _ranks[a] : 1, rz = z < _ranks.length ? _ranks[z] : 1;
        return ra != rz ? ra - rz : z - a;
      });
    var used = total + _gap + moreWidth;
    for (final i in order) {
      if (used <= avail + 0.5) break;
      hide.add(i);
      used -= widths[i] + _gap;
    }
    return hide;
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) {
    final kids = _children;
    if (kids.isEmpty) return constraints.smallest;
    final sizes = [for (final c in kids) c.getDryLayout(_childConstraints(c, constraints))];
    final buttons = sizes.sublist(0, sizes.length - 1);
    final hide = _plan([for (final s in buttons) s.width], sizes.last.width, constraints.maxWidth);
    var h = 0.0, w = 0.0;
    for (var i = 0; i < buttons.length; i++) {
      if (hide.contains(i)) continue;
      h = math.max(h, buttons[i].height);
      w += buttons[i].width + _gap;
    }
    if (hide.isNotEmpty) {
      h = math.max(h, sizes.last.height);
      w += sizes.last.width + _gap;
    }
    w = math.max(0, w - _gap);
    return constraints.constrain(Size(constraints.maxWidth.isFinite ? constraints.maxWidth : w, h));
  }

  @override
  void performLayout() {
    final kids = _children;
    if (kids.isEmpty) {
      size = constraints.smallest;
      return;
    }
    for (final c in kids) {
      c.layout(_childConstraints(c, constraints), parentUsesSize: true);
    }
    final buttons = kids.sublist(0, kids.length - 1);
    final more = kids.last;
    final hide = _plan([for (final b in buttons) b.size.width], more.size.width, constraints.maxWidth);
    final shown = <RenderBox>[];
    for (var i = 0; i < buttons.length; i++) {
      final visible = !hide.contains(i);
      (buttons[i].parentData! as _RowParentData).shown = visible;
      if (visible) shown.add(buttons[i]);
    }
    (more.parentData! as _RowParentData).shown = hide.isNotEmpty;
    if (hide.isNotEmpty) shown.add(more);
    var content = 0.0, height = 0.0;
    for (final c in shown) {
      content += c.size.width;
      height = math.max(height, c.size.height);
    }
    content += _gap * math.max(shown.length - 1, 0);
    final width = constraints.maxWidth.isFinite ? constraints.maxWidth : content;
    size = constraints.constrain(Size(width, height));
    var x = _end ? size.width - content : 0.0;
    for (final c in kids) {
      final pd = c.parentData! as _RowParentData;
      if (!pd.shown) {
        pd.offset = Offset.zero;
        continue;
      }
      final dy = (size.height - c.size.height) / 2;
      pd.offset = Offset(_textDirection == TextDirection.ltr ? x : size.width - x - c.size.width, dy);
      x += c.size.width + _gap;
    }
    final hidden = hide.toList()..sort();
    if (_reported == null || !listEquals(hidden, _reported)) {
      _reported = hidden;
      final report = onHidden;
      SchedulerBinding.instance.addPostFrameCallback((_) => report(hidden));
    }
  }

  @override
  double computeMinIntrinsicWidth(double height) {
    final kids = _children;
    return kids.isEmpty ? 0 : kids.last.getMaxIntrinsicWidth(height);
  }

  @override
  double computeMaxIntrinsicWidth(double height) {
    final kids = _children;
    if (kids.length < 2) return 0;
    final buttons = kids.sublist(0, kids.length - 1);
    return buttons.fold<double>(0, (s, c) => s + c.getMaxIntrinsicWidth(height)) + _gap * (buttons.length - 1);
  }

  @override
  double computeMinIntrinsicHeight(double width) => _children.fold<double>(0, (h, c) => math.max(h, c.getMinIntrinsicHeight(double.infinity)));

  @override
  double computeMaxIntrinsicHeight(double width) => _children.fold<double>(0, (h, c) => math.max(h, c.getMaxIntrinsicHeight(double.infinity)));

  @override
  void paint(PaintingContext context, Offset offset) {
    for (final c in _children) {
      final pd = c.parentData! as _RowParentData;
      if (pd.shown) context.paintChild(c, pd.offset + offset);
    }
  }

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) {
    for (final c in _children.reversed) {
      final pd = c.parentData! as _RowParentData;
      if (!pd.shown) continue;
      final hit = result.addWithPaintOffset(offset: pd.offset, position: position, hitTest: (r, p) => c.hitTest(r, position: p));
      if (hit) return true;
    }
    return false;
  }

  @override
  void visitChildrenForSemantics(RenderObjectVisitor visitor) {
    for (final c in _children) {
      if ((c.parentData! as _RowParentData).shown) visitor(c);
    }
  }
}
