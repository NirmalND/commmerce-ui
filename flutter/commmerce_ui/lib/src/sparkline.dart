import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'metric.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// How a [CmSparkline] draws its points: [bars] for counts per day or week, [line] for a level that moves.
enum CmSparklineType { bars, line }

/// Colour of a [CmSparkline]: [neutral] (the icon colour, with the latest bar in the text colour), [information]
/// or [success].
enum CmSparklineTone { neutral, information, success }

/// A word-sized chart of one series over time, for a summary card: "Visits, last 30 days" beside the facts it sums
/// up. Bars (the default) for counts, a line for a level (a balance, a score). It has no axes or numbers of its own:
/// put the figure it explains next to it, for example in a [CmMetric]. Time runs left to right in every language.
/// Screen readers hear one sentence: the total, the peak (and when, with [labels]) and the latest value; with
/// [labels], hovering or long-pressing a bar shows its label and value. Mirrors `<cm-sparkline>`. Since 1.10.
class CmSparkline extends StatelessWidget {
  const CmSparkline({
    super.key,
    required this.values,
    this.labels = const [],
    this.label = '',
    this.type = CmSparklineType.bars,
    this.tone = CmSparklineTone.neutral,
    this.height = 32,
    this.width,
    this.format,
  });

  /// The points, oldest first. Values that aren't finite count as 0; negative values are drawn as 0.
  final List<num> values;

  /// Optional name of each point, oldest first ("12 Nov"), for the summary and the hover text.
  final List<String> labels;

  /// What the series is, e.g. "Visits, last 30 days". Used in the accessible summary.
  final String label;

  /// [CmSparklineType.bars] (default) for counts; [CmSparklineType.line] for a level.
  final CmSparklineType type;

  /// [CmSparklineTone.neutral] (default), [CmSparklineTone.information] or [CmSparklineTone.success].
  final CmSparklineTone tone;

  /// Height of the chart. Default 32 (web: `--cm-sparkline-height`).
  final double height;

  /// Width of the chart. Default: the width of the parent (120 when the parent's width is unbounded).
  final double? width;

  /// Formats the numbers in the summary and hover text instead of [cmFormatNumber].
  final String Function(num value)? format;

  List<double> get _points => [for (final v in values) v.isFinite ? v.toDouble() : 0.0];

  String _num(BuildContext context, num n) {
    if (format != null) return format!(n);
    final whole = n == n.roundToDouble() ? n.round() : n;
    return cmFormatNumber(whole, locale: Localizations.maybeLocaleOf(context));
  }

  /// The sentence screen readers hear.
  String summary(BuildContext context) {
    final s = CmStrings.of(context);
    final v = _points;
    if (v.isEmpty) return s.sparklineEmpty(label);
    final total = v.fold<double>(0, (a, b) => a + b);
    final peak = v.reduce(math.max);
    final at = v.indexOf(peak);
    final when = at < labels.length ? labels[at] : '';
    final t = _num(context, total), p = _num(context, peak), l = _num(context, v.last);
    return when.isNotEmpty ? s.sparklineSummaryAt(label, t, p, when, l) : s.sparklineSummary(label, t, p, l);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final v = _points;
    final toned = switch (tone) {
      CmSparklineTone.information => c.textInformation,
      CmSparklineTone.success => c.textSuccess,
      CmSparklineTone.neutral => null,
    };
    final painter = CmSparklinePainter(
      values: v,
      type: type,
      color: toned?.withValues(alpha: type == CmSparklineType.bars ? 0.55 : 1) ?? c.iconDefault,
      lastColor: toned ?? c.textDefault,
      baseColor: c.borderSubtle,
    );
    Widget chart = CustomPaint(painter: painter, child: const SizedBox.expand());
    if (type == CmSparklineType.bars && labels.isNotEmpty && v.isNotEmpty) {
      chart = Stack(children: [
        Positioned.fill(child: chart),
        // One hover target per slot, always left to right (oldest first) like the bars.
        Positioned.fill(
          child: Row(textDirection: TextDirection.ltr, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (var i = 0; i < v.length; i++)
              Expanded(
                child: i < labels.length && labels[i].isNotEmpty
                    ? CmTooltip(message: '${labels[i]}: ${_num(context, v[i])}', child: const SizedBox.expand())
                    : const SizedBox.expand(),
              ),
          ]),
        ),
      ]);
    }
    return Semantics(
      image: true,
      label: summary(context),
      excludeSemantics: true,
      child: LayoutBuilder(builder: (context, box) {
        final w = width ?? (box.hasBoundedWidth ? box.maxWidth : 120.0);
        return SizedBox(width: w, height: height, child: chart);
      }),
    );
  }
}

/// Paints a [CmSparkline]: a 1px baseline along the bottom, then bars or a line, always oldest on the left.
/// Public so tests and custom charts can reuse it; most apps use [CmSparkline].
class CmSparklinePainter extends CustomPainter {
  const CmSparklinePainter({
    required this.values,
    required this.type,
    required this.color,
    required this.lastColor,
    required this.baseColor,
  });

  final List<double> values;
  final CmSparklineType type;

  /// Colour of the bars and the line.
  final Color color;

  /// Colour of the latest bar and the dot on the last point.
  final Color lastColor;

  /// Colour of the baseline.
  final Color baseColor;

  /// Space kept above the tallest point.
  static const double top = 2;

  /// Shortest a bar with a value above 0 can be.
  static const double minBar = 1.5;

  /// Line stroke and the radius of the dot on the last point.
  static const double stroke = 1.5, dot = 2;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    canvas.drawLine(Offset(0, h - 0.5), Offset(w, h - 0.5), Paint()..color = baseColor..strokeWidth = 1);
    final n = values.length;
    if (n == 0) return;
    final max = math.max(1.0, values.map((x) => math.max(0.0, x)).reduce(math.max));
    double y(double x) => h - (math.max(0.0, x) / max) * (h - top);
    if (type == CmSparklineType.line) {
      final step = n > 1 ? w / (n - 1) : 0.0;
      final pts = [for (var i = 0; i < n; i++) Offset(n > 1 ? i * step : w / 2, y(values[i]))];
      final path = Path()..moveTo(pts.first.dx, pts.first.dy);
      for (final p in pts.skip(1)) {
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke
          ..strokeJoin = StrokeJoin.round
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawCircle(pts.last, dot, Paint()..color = lastColor);
      return;
    }
    final slot = w / n;
    final gap = n > 1 ? math.min(slot * 0.25, 2.0) : 0.0;
    final bar = Paint()..color = color;
    final last = Paint()..color = lastColor;
    for (var i = 0; i < n; i++) {
      final bh = math.max(values[i] > 0 ? minBar : 0.0, h - y(values[i]));
      if (bh <= 0) continue;
      final rect = Rect.fromLTWH(i * slot + gap / 2, h - bh, slot - gap, bh);
      canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(1)), i == n - 1 ? last : bar);
    }
  }

  @override
  bool shouldRepaint(CmSparklinePainter old) =>
      old.type != type || old.color != color || old.lastColor != lastColor || old.baseColor != baseColor || !_same(old.values, values);

  static bool _same(List<double> a, List<double> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
