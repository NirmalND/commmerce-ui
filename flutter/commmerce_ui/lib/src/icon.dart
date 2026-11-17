import 'package:flutter/widgets.dart';
import 'package:path_drawing/path_drawing.dart';

import 'generated/icons.g.dart';

/// A Commmerce line icon (24px grid, 1.6px round stroke) in the surrounding text colour.
///
/// Decorative unless [semanticLabel] is set.
class CmIcon extends StatelessWidget {
  const CmIcon(this.name, {super.key, this.size = 18, this.color, this.semanticLabel});

  /// One of [CmIcons], e.g. `CmIcons.cart`.
  final String name;

  /// Size in logical pixels. Header icons are 18, buttons 16.
  final double size;

  /// Stroke colour. Defaults to the ambient [IconTheme] or text colour.
  final Color? color;

  /// Accessible name. Leave empty when nearby text says the same thing.
  final String? semanticLabel;

  static final Map<String, Path> _cache = {};

  @override
  Widget build(BuildContext context) {
    final c = color ?? IconTheme.of(context).color ?? DefaultTextStyle.of(context).style.color ?? const Color(0xFF000000);
    final path = _cache.putIfAbsent(name, () => parseSvgPathData(cmIconPaths[name] ?? cmIconPaths['more']!));
    final icon = CustomPaint(
      size: Size.square(size),
      painter: _IconPainter(path, c, cmDottedIcons.contains(name) ? 3 : 1.6),
    );
    return semanticLabel == null
        ? ExcludeSemantics(child: icon)
        : Semantics(label: semanticLabel, image: true, child: ExcludeSemantics(child: icon));
  }
}

class _IconPainter extends CustomPainter {
  _IconPainter(this.path, this.color, this.stroke);
  final Path path;
  final Color color;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    canvas.scale(scale);
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_IconPainter old) => old.path != path || old.color != color || old.stroke != stroke;
}
