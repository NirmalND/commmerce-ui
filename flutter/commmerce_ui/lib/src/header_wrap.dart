import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Lays out a header's [lead] (title) and [trailing] (actions) on one row while the lead keeps at least
/// [minLeadWidth]; narrower, the trailing part moves under the lead instead of squeezing it. Like the web card and
/// page header (flex-wrap with a minimum width for the title). Internal: used by [CmCard] and [CmPageHeader].
class CmHeaderWrap extends MultiChildRenderObjectWidget {
  CmHeaderWrap({
    super.key,
    required Widget lead,
    required Widget trailing,
    required this.minLeadWidth,
    this.gap = 20,
    this.runGap = 10,
    this.center = false,
    this.trailingAtEnd = false,
  }) : super(children: [lead, trailing]);

  /// The narrowest the lead may get on the shared row.
  final double minLeadWidth;

  /// Space between lead and trailing on one row.
  final double gap;

  /// Space between them when the trailing part has moved under the lead.
  final double runGap;

  /// Centres both vertically on one row (page header) instead of aligning their tops (card).
  final bool center;

  /// When stacked, puts the trailing part at the end side instead of the start.
  final bool trailingAtEnd;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderHeaderWrap(minLeadWidth, gap, runGap, center, trailingAtEnd, Directionality.of(context));

  @override
  void updateRenderObject(BuildContext context, RenderObject renderObject) {
    (renderObject as _RenderHeaderWrap)
      ..minLeadWidth = minLeadWidth
      ..gap = gap
      ..runGap = runGap
      ..center = center
      ..trailingAtEnd = trailingAtEnd
      ..textDirection = Directionality.of(context);
  }
}

class _WrapParentData extends ContainerBoxParentData<RenderBox> {}

class _RenderHeaderWrap extends RenderBox
    with ContainerRenderObjectMixin<RenderBox, _WrapParentData>, RenderBoxContainerDefaultsMixin<RenderBox, _WrapParentData> {
  _RenderHeaderWrap(this._minLeadWidth, this._gap, this._runGap, this._center, this._trailingAtEnd, this._textDirection);

  double _minLeadWidth, _gap, _runGap;
  bool _center, _trailingAtEnd;
  TextDirection _textDirection;

  set minLeadWidth(double v) { if (v != _minLeadWidth) { _minLeadWidth = v; markNeedsLayout(); } }
  set gap(double v) { if (v != _gap) { _gap = v; markNeedsLayout(); } }
  set runGap(double v) { if (v != _runGap) { _runGap = v; markNeedsLayout(); } }
  set center(bool v) { if (v != _center) { _center = v; markNeedsLayout(); } }
  set trailingAtEnd(bool v) { if (v != _trailingAtEnd) { _trailingAtEnd = v; markNeedsLayout(); } }
  set textDirection(TextDirection v) { if (v != _textDirection) { _textDirection = v; markNeedsLayout(); } }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _WrapParentData) child.parentData = _WrapParentData();
  }

  RenderBox get _lead => firstChild!;
  RenderBox get _trailing => lastChild!;

  @override
  double computeMinIntrinsicWidth(double height) => math.max(_lead.getMinIntrinsicWidth(height), _trailing.getMinIntrinsicWidth(height));

  @override
  double computeMaxIntrinsicWidth(double height) => _lead.getMaxIntrinsicWidth(height) + _gap + _trailing.getMaxIntrinsicWidth(height);

  @override
  double computeMinIntrinsicHeight(double width) => _lead.getMinIntrinsicHeight(width) + _runGap + _trailing.getMinIntrinsicHeight(width);

  @override
  double computeMaxIntrinsicHeight(double width) => _lead.getMaxIntrinsicHeight(width) + _runGap + _trailing.getMaxIntrinsicHeight(width);

  ({Size size, Offset lead, Offset trailing}) _layout(BoxConstraints constraints, Size Function(RenderBox, BoxConstraints) layoutChild) {
    final width = constraints.maxWidth.isFinite ? constraints.maxWidth : _lead.getMaxIntrinsicWidth(double.infinity) + _gap + _trailing.getMaxIntrinsicWidth(double.infinity);
    final t = layoutChild(_trailing, BoxConstraints(maxWidth: width));
    final rtl = _textDirection == TextDirection.rtl;
    final emptyTrailing = t.width == 0 && t.height == 0;
    final room = width - (emptyTrailing ? 0 : t.width + _gap);
    if (room >= math.min(_minLeadWidth, width) || emptyTrailing) {
      final l = layoutChild(_lead, BoxConstraints.tightFor(width: math.max(0, room)));
      final h = math.max(l.height, t.height);
      final ly = _center ? (h - l.height) / 2 : 0.0;
      final ty = _center ? (h - t.height) / 2 : 0.0;
      final lx = rtl ? width - l.width : 0.0;
      final tx = rtl ? 0.0 : width - t.width;
      return (size: constraints.constrain(Size(width, h)), lead: Offset(lx, ly), trailing: Offset(tx, ty));
    }
    final l = layoutChild(_lead, BoxConstraints.tightFor(width: width));
    final atEnd = _trailingAtEnd != rtl;
    final tx = atEnd ? width - t.width : 0.0;
    return (size: constraints.constrain(Size(width, l.height + _runGap + t.height)), lead: Offset.zero, trailing: Offset(tx, l.height + _runGap));
  }

  @override
  Size computeDryLayout(BoxConstraints constraints) => _layout(constraints, (c, b) => c.getDryLayout(b)).size;

  @override
  void performLayout() {
    final r = _layout(constraints, (c, b) {
      c.layout(b, parentUsesSize: true);
      return c.size;
    });
    size = r.size;
    (_lead.parentData! as _WrapParentData).offset = r.lead;
    (_trailing.parentData! as _WrapParentData).offset = r.trailing;
  }

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) => defaultHitTestChildren(result, position: position);
}
