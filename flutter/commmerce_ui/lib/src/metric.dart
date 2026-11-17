import 'package:flutter/material.dart';

import 'display.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Direction of a [CmMetric]'s change.
enum CmMetricTrend { up, down, flat }

/// Whether a [CmMetric]'s change is good news. [auto]: up is positive (green), down negative (red), flat neutral.
enum CmMetricSentiment { auto, positive, negative, neutral }

/// Writes [n] with the digit grouping of [locale]: lakh grouping ("12,40,000") for Indian English and the
/// languages of India, groups of three ("1,240,000") otherwise. Keeps up to [decimals] decimal places.
String cmFormatNumber(num n, {Locale? locale, int decimals = 2}) {
  final negative = n < 0;
  var s = n.abs().toStringAsFixed(n is int ? 0 : decimals);
  if (s.contains('.')) s = s.replaceFirst(RegExp(r'\.?0+$'), '');
  final parts = s.split('.');
  var whole = parts[0];
  const indian = {'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as'};
  final lakh = locale != null && (locale.countryCode == 'IN' || indian.contains(locale.languageCode));
  if (lakh && whole.length > 3) {
    final last = whole.substring(whole.length - 3);
    var rest = whole.substring(0, whole.length - 3);
    final groups = <String>[];
    while (rest.length > 2) {
      groups.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) groups.insert(0, rest);
    whole = '${groups.join(',')},$last';
  } else {
    whole = whole.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  }
  return '${negative ? '-' : ''}$whole${parts.length > 1 ? '.${parts[1]}' : ''}';
}

/// One number with its name, for totals and KPIs: "SMB leads 1,240". A large figure in tabular numerals, an
/// optional hint line and an optional change ("+12%" with an arrow, coloured by whether it is good news). With
/// [onTap] the whole tile is one link, e.g. to the list behind the number. Put a row of them in a [CmGrid].
/// Mirrors `<cm-metric>`. Since 1.2.
class CmMetric extends StatelessWidget {
  const CmMetric({
    super.key,
    required this.label,
    this.value,
    this.hint,
    this.hintWidget,
    this.change,
    this.trend,
    this.sentiment = CmMetricSentiment.auto,
    this.onTap,
    this.loading = false,
    this.format,
  });

  /// What is counted, e.g. "SMB leads". Two to four words.
  final String label;

  /// The figure. A [num] is formatted for the app's locale ("1,240"; "12,40,000" in en-IN); any other value
  /// ("Rs. 2.4 L", "3 of 5") is shown as its `toString()`.
  final Object? value;

  /// One line under the figure in a quieter colour, e.g. "2 past demos need a result".
  final String? hint;

  /// A hint with markup (e.g. a bold count), used instead of [hint]. No links or buttons: with [onTap] the whole
  /// tile is already one link.
  final Widget? hintWidget;

  /// The change, written as you want it read: "+12%" or "-3 vs last week".
  final String? change;

  /// Direction of [change]. Adds an arrow and says the direction to screen readers.
  final CmMetricTrend? trend;

  /// Set [CmMetricSentiment.negative] when up is bad (more refunds), [CmMetricSentiment.positive] when down is good.
  final CmMetricSentiment sentiment;

  /// Makes the whole tile one link, named by the label and the figure.
  final VoidCallback? onTap;

  /// Shows a placeholder instead of the figure and announces "Loading <label>" politely.
  final bool loading;

  /// Formats a numeric [value] instead of [cmFormatNumber].
  final String Function(num value)? format;

  CmMetricSentiment get _sentiment => sentiment != CmMetricSentiment.auto
      ? sentiment
      : switch (trend) {
          CmMetricTrend.up => CmMetricSentiment.positive,
          CmMetricTrend.down => CmMetricSentiment.negative,
          _ => CmMetricSentiment.neutral,
        };

  String _figure(BuildContext context) {
    final v = value;
    if (v == null) return '';
    num? n = v is num ? v : null;
    if (n == null && v is String && RegExp(r'^\s*-?\d+(\.\d+)?\s*$').hasMatch(v)) n = num.parse(v.trim());
    if (n == null) return v.toString();
    return format?.call(n) ?? cmFormatNumber(n, locale: Localizations.maybeLocaleOf(context));
  }

  /// What a screen reader hears for the change: "Up +12%, good".
  String? _spoken(CmStrings s) {
    final t = trend;
    if (t == null) return change;
    final c = change ?? '';
    final said = switch (t) { CmMetricTrend.up => s.metricUp(c), CmMetricTrend.down => s.metricDown(c), CmMetricTrend.flat => s.metricFlat(c) }.trim();
    return switch (_sentiment) { CmMetricSentiment.positive => s.metricGood(said), CmMetricSentiment.negative => s.metricBad(said), _ => said };
  }

  @override
  Widget build(BuildContext context) {
    return _MetricTile(metric: this);
  }
}

class _MetricTile extends StatefulWidget {
  const _MetricTile({required this.metric});
  final CmMetric metric;
  @override
  State<_MetricTile> createState() => _MetricTileState();
}

class _MetricTileState extends State<_MetricTile> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final m = widget.metric;
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final figure = m._figure(context);
    final valueStyle = (phone ? CmTypeResponsive.headingLg : CmType.headingLg)
        .copyWith(height: 1.25, color: c.textDefault, fontFeatures: const [FontFeature.tabularFigures()]);
    final spoken = m._spoken(s);
    final sentiment = m._sentiment;
    final changeColor = switch (sentiment) {
      CmMetricSentiment.positive => c.textSuccess,
      CmMetricSentiment.negative => c.textCritical,
      _ => c.textTertiary,
    };
    final hasChange = (m.change != null && m.change!.isNotEmpty) || m.trend != null;
    final hasHint = m.hintWidget != null || (m.hint != null && m.hint!.isNotEmpty);
    final rtl = Directionality.of(context) == TextDirection.rtl;

    Widget? arrow;
    if (m.trend != null) {
      // up: the up-and-forward arrow; down: it turned a quarter clockwise (mirrored first in RTL, so turned the
      // other way); flat: arrow-left turned half round, which points forward in either direction.
      final name = m.trend == CmMetricTrend.flat ? CmIcons.arrowLeft : CmIcons.arrowUpRight;
      final turns = switch (m.trend!) { CmMetricTrend.up => 0.0, CmMetricTrend.down => rtl ? -0.25 : 0.25, CmMetricTrend.flat => 0.5 };
      arrow = RotationTransition(
        turns: AlwaysStoppedAnimation(turns),
        child: Transform.flip(flipX: rtl, child: CmIcon(name, size: 16, color: changeColor)),
      );
    }
    final changeW = !hasChange
        ? null
        : Semantics(
            label: spoken,
            excludeSemantics: true,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (arrow != null) ...[arrow, const SizedBox(width: 2)],
              Flexible(child: Text(m.change ?? '', style: CmType.bodySm.copyWith(fontWeight: FontWeight.w500, color: changeColor, fontFeatures: const [FontFeature.tabularFigures()]))),
            ]),
          );
    final hintStyle = CmType.bodySm.copyWith(color: c.textTertiary);
    final hintW = !hasHint ? null : DefaultTextStyle.merge(style: hintStyle, child: m.hintWidget ?? Text(m.hint!, style: hintStyle));

    final valueW = m.loading
        ? Padding(
            padding: EdgeInsets.symmetric(vertical: valueStyle.fontSize! * 0.175),
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: 1,
              child: CmSkeleton(width: valueStyle.fontSize! * 3.6, height: valueStyle.fontSize! * 0.9),
            ),
          )
        : Text(figure, style: valueStyle);
    final body = Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      Text(m.label, style: CmType.bodyMd.copyWith(fontWeight: FontWeight.w500, color: c.textDefault)),
      const SizedBox(height: 4),
      ConstrainedBox(constraints: BoxConstraints(minHeight: valueStyle.fontSize! * 1.25), child: valueW),
      if (changeW != null || hintW != null) ...[
        const SizedBox(height: 4),
        Wrap(spacing: CmSpace.s8, runSpacing: 2, crossAxisAlignment: WrapCrossAlignment.center, children: [?changeW, ?hintW]),
      ],
    ]);
    Widget tile = Container(
      width: double.infinity,
      padding: EdgeInsets.all(phone ? CmSpace.s16 : CmSpace.s20),
      decoration: BoxDecoration(
        color: c.bgSurface,
        border: Border.all(color: m.onTap != null && _hover ? c.borderStrong : c.borderSubtle),
        borderRadius: BorderRadius.circular(CmRadius.md),
        boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
      ),
      child: body,
    );
    final live = Semantics(liveRegion: true, label: m.loading ? s.metricLoading(m.label) : null, child: const SizedBox.shrink());
    if (m.onTap != null) {
      final foot = [if (hasChange) spoken ?? '', if (m.hint != null && m.hint!.isNotEmpty) m.hint!].where((t) => t.isNotEmpty).join(', ');
      tile = Semantics(
        link: true,
        label: m.loading ? m.label : '${m.label} $figure'.trim(),
        hint: foot.isEmpty ? null : foot,
        excludeSemantics: true,
        onTap: m.onTap,
        child: FocusableActionDetector(
          mouseCursor: SystemMouseCursors.click,
          onShowHoverHighlight: (v) => setState(() => _hover = v),
          onShowFocusHighlight: (v) => setState(() => _focus = v),
          actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { m.onTap!(); return null; })},
          child: GestureDetector(onTap: m.onTap, child: tile),
        ),
      );
    } else {
      tile = Semantics(container: true, explicitChildNodes: true, child: tile);
    }
    return Stack(children: [tile, Positioned(left: 0, top: 0, child: live)]);
  }
}
