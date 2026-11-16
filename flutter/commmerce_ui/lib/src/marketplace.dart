import 'package:flutter/material.dart';
import 'package:path_drawing/path_drawing.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// A card for one app in the Commmerce app marketplace: logo tile, name, developer, rating, pricing,
/// an optional offer, and actions (Sign Up, Contact, View Details). Mirrors `<cm-app-card>`.
/// In columns narrower than 380px the padding and logo tile shrink.
class CmAppCard extends StatelessWidget {
  const CmAppCard({
    super.key,
    required this.name,
    this.logo,
    this.developer,
    this.rating,
    this.reviews,
    this.onReviewsTap,
    this.pricing,
    this.offer,
    this.actions = const [],
    this.onViewDetails,
    this.status,
  });

  /// App name, the card's heading.
  final String name;

  /// The app's logo (an image with its semantic label set to the app name), shown in a 130×54 tile.
  final Widget? logo;

  /// Who made the app, shown as "By …".
  final String? developer;

  /// Average rating out of 5. Null for apps without reviews.
  final double? rating;

  /// Number of reviews.
  final int? reviews;

  /// Makes the reviews count a link.
  final VoidCallback? onReviewsTap;

  /// "Free plan available. 7-day free trial."
  final String? pricing;

  /// An offer on a pale blue line with a percent icon.
  final String? offer;

  /// Buttons: a primary "Sign Up" and a secondary "Contact".
  final List<Widget> actions;

  /// Shows the underlined "View Details" link.
  final VoidCallback? onViewDetails;

  /// Top-right corner, e.g. a [CmToggle] for an installed app.
  final Widget? status;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final text = CmType.bodySm.copyWith(color: c.textDefault);
    final s = CmStrings.of(context);
    final reviewsText = reviews == null ? null : s.reviews(reviews!);
    return LayoutBuilder(builder: (context, box) {
      final narrow = box.maxWidth <= 380;
      final pad = narrow ? CmSpace.s10 : CmSpace.s20;
      final children = <Widget>[
        Container(
          width: narrow ? 100 : 130, height: narrow ? 40 : 54,
          padding: EdgeInsets.all(narrow ? 6 : 8),
          decoration: BoxDecoration(color: c.bgInset, borderRadius: BorderRadius.circular(CmRadius.xs)),
          clipBehavior: Clip.antiAlias,
          child: logo == null ? null : FittedBox(fit: BoxFit.contain, child: logo),
        ),
        const SizedBox(height: 10),
        Semantics(header: true, child: Text(name, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, height: 1.3, color: c.textDefault))),
        if (developer != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(s.byDeveloper(developer!), style: text)),
        if (rating != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(children: [
              Semantics(
                label: s.rated(rating!),
                excludeSemantics: true,
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  CustomPaint(size: const Size.square(12), painter: _StarPainter(c.iconRating)),
                  const SizedBox(width: 5),
                  Text(rating!.toStringAsFixed(1), style: text),
                ]),
              ),
              if (reviewsText != null) ...[
                const SizedBox(width: 5),
                onReviewsTap == null ? Text(reviewsText, style: text) : _Link(label: reviewsText, onTap: onReviewsTap!, style: text),
              ],
            ]),
          ),
        if (pricing != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(pricing!, style: text)),
        if (offer != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Semantics(
              label: s.offer(offer!),
              excludeSemantics: true,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                decoration: BoxDecoration(color: c.bgOfferCard, borderRadius: BorderRadius.circular(CmRadius.xs)),
                child: Row(children: [
                  CmIcon(CmIcons.percent, size: 12, color: c.textDefault),
                  const SizedBox(width: 5),
                  Expanded(child: Text(offer!, style: CmType.bodyXs.copyWith(fontSize: 11, height: 1.3, color: c.textDefault))),
                ]),
              ),
            ),
          ),
        if (actions.isNotEmpty || onViewDetails != null)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Row(children: [
              Expanded(
                child: Wrap(spacing: narrow ? CmSpace.s10 : CmSpace.s20, runSpacing: CmSpace.s10, crossAxisAlignment: WrapCrossAlignment.center, children: [
                  ...actions,
                  if (onViewDetails != null && !narrow) _details(s, text),
                ]),
              ),
              if (onViewDetails != null && narrow) _details(s, text),
            ]),
          ),
      ];
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: name,
        child: Container(
          padding: EdgeInsets.all(pad),
          decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Stack(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: children),
            if (status != null) Positioned(top: 0, right: 0, child: status!),
          ]),
        ),
      );
    });
  }

  Widget _details(CmStrings s, TextStyle text) => _Link(label: s.viewDetails, semanticLabel: s.viewDetailsOf(name), onTap: onViewDetails!, style: text.copyWith(fontWeight: FontWeight.w500));
}

/// An underlined inline link with a focus outline.
class _Link extends StatefulWidget {
  const _Link({required this.label, required this.onTap, required this.style, this.semanticLabel});
  final String label;
  final String? semanticLabel;
  final VoidCallback onTap;
  final TextStyle style;

  @override
  State<_Link> createState() => _LinkState();
}

class _LinkState extends State<_Link> {
  bool _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Semantics(
      link: true,
      label: widget.semanticLabel ?? widget.label,
      excludeSemantics: true, onTap: widget.onTap,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            decoration: _focus ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2), borderRadius: BorderRadius.circular(CmRadius.xs)) : null,
            child: Text(widget.label, style: widget.style.copyWith(decoration: TextDecoration.underline, decorationColor: widget.style.color)),
          ),
        ),
      ),
    );
  }
}

/// The rating star, filled (line icons are stroked only).
class _StarPainter extends CustomPainter {
  _StarPainter(this.color);
  final Color color;
  static final Path _path = parseSvgPathData(cmIconPaths[CmIcons.star]!);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 24);
    canvas.drawPath(_path, Paint()..color = color);
    canvas.drawPath(_path, Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 1.6..strokeJoin = StrokeJoin.round);
  }

  @override
  bool shouldRepaint(_StarPainter old) => old.color != color;
}
