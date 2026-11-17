import 'package:flutter/material.dart';

import 'generated/tokens.g.dart';
import 'theme.dart';

/// Lays out children in a column (default) or a row, a spacing token apart. Mirrors `<cm-stack>`.
class CmStack extends StatelessWidget {
  const CmStack({
    super.key,
    required this.children,
    this.direction = Axis.vertical,
    this.gap = CmSpace.s20,
    this.align,
    this.justify = MainAxisAlignment.start,
    this.wrap = false,
  });

  final List<Widget> children;

  /// [Axis.vertical] stacks top to bottom; [Axis.horizontal] lays items out in a row (right to left in RTL).
  final Axis direction;

  /// Space between items: use a [CmSpace] token. Default [CmSpace.s20], the gap between cards.
  final double gap;

  /// Cross-axis alignment. Default stretch in a column and centre in a row.
  final CrossAxisAlignment? align;

  /// Main-axis distribution. [MainAxisAlignment.spaceBetween] pushes the first and last items to the edges.
  final MainAxisAlignment justify;

  /// Lets a row wrap onto more lines when it runs out of space.
  final bool wrap;

  @override
  Widget build(BuildContext context) {
    final vertical = direction == Axis.vertical;
    final cross = align ?? (vertical ? CrossAxisAlignment.stretch : CrossAxisAlignment.center);
    if (wrap && !vertical) {
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        alignment: switch (justify) {
          MainAxisAlignment.center => WrapAlignment.center,
          MainAxisAlignment.end => WrapAlignment.end,
          MainAxisAlignment.spaceBetween => WrapAlignment.spaceBetween,
          MainAxisAlignment.spaceAround => WrapAlignment.spaceAround,
          MainAxisAlignment.spaceEvenly => WrapAlignment.spaceEvenly,
          _ => WrapAlignment.start,
        },
        crossAxisAlignment: switch (cross) {
          CrossAxisAlignment.center => WrapCrossAlignment.center,
          CrossAxisAlignment.end => WrapCrossAlignment.end,
          _ => WrapCrossAlignment.start,
        },
        children: children,
      );
    }
    return Flex(
      direction: direction,
      spacing: gap,
      mainAxisSize: vertical ? MainAxisSize.min : MainAxisSize.max,
      mainAxisAlignment: justify,
      crossAxisAlignment: cross,
      textBaseline: cross == CrossAxisAlignment.baseline ? TextBaseline.alphabetic : null,
      children: children,
    );
  }
}

/// Equal-width columns, for tiles, cards and short fields side by side. Mirrors `<cm-grid>`.
///
/// Collapses to one column when the grid itself is 640px wide or less, so it also works inside a
/// narrow side column. With [minColumnWidth] it fits as many columns as there is room for instead.
class CmGrid extends StatelessWidget {
  const CmGrid({super.key, required this.children, this.columns = 2, this.minColumnWidth, this.gap = CmSpace.s20});

  /// The grid items, in reading order.
  final List<Widget> children;

  /// Number of columns. Default 2. Ignored when [minColumnWidth] is set.
  final int columns;

  /// Fit as many columns as there is room for, each at least this wide (never wider than the grid).
  final double? minColumnWidth;

  /// Space between items, across and down: use a [CmSpace] token.
  final double gap;

  /// How many columns a grid [width] pixels wide shows.
  static int columnsFor(double width, {int columns = 2, double? minColumnWidth, double gap = CmSpace.s20}) {
    if (!width.isFinite) return 1;
    if (minColumnWidth != null) {
      final min = minColumnWidth < width ? minColumnWidth : width;
      if (min <= 0) return 1;
      final n = ((width + gap) / (min + gap)).floor();
      return n < 1 ? 1 : n;
    }
    if (width <= 640) return 1;
    return columns < 1 ? 1 : columns;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final n = columnsFor(box.maxWidth, columns: columns, minColumnWidth: minColumnWidth, gap: gap);
      if (n == 1) return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, spacing: gap, children: children);
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, spacing: gap, children: [
        for (var start = 0; start < children.length; start += n)
          Row(crossAxisAlignment: CrossAxisAlignment.start, spacing: gap, children: [
            for (var i = start; i < start + n; i++) Expanded(child: i < children.length ? children[i] : const SizedBox.shrink()),
          ]),
      ]);
    });
  }
}

/// Width of a [CmLayoutSection] on wide layouts.
enum CmLayoutVariant {
  full(6),
  oneHalf(3),
  oneThird(2),
  twoThirds(4);

  const CmLayoutVariant(this.span);

  /// Columns out of six.
  final int span;
}

/// The body of an admin page: sections side by side, for example the main and side columns of a detail
/// page. Mirrors `<cm-layout>`.
///
/// Sections stack into one column, in source order, when the layout itself is narrower than 768px
/// (measured with a [LayoutBuilder], so it follows the space the layout gets, not the window).
/// Put the main section first.
class CmLayout extends StatelessWidget {
  const CmLayout({super.key, required this.children, this.gap = CmSpace.s20});

  /// [CmLayoutSection]s, in reading order.
  final List<CmLayoutSection> children;

  /// Space between sections, across and down: use a [CmSpace] token.
  final double gap;

  /// Layouts narrower than this stack their sections.
  static const double stackBelow = 768;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final w = box.maxWidth;
      if (!w.isFinite || w < stackBelow) {
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, spacing: gap, children: children);
      }
      // A six-column grid: sections fill rows in order and start a new row when they don't fit.
      final col = (w - 5 * gap) / 6;
      final rows = <List<CmLayoutSection>>[];
      var used = 6;
      for (final s in children) {
        if (used + s.variant.span > 6) {
          rows.add([]);
          used = 0;
        }
        rows.last.add(s);
        used += s.variant.span;
      }
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, spacing: gap, children: [
        for (final row in rows)
          Row(crossAxisAlignment: CrossAxisAlignment.start, spacing: gap, children: [
            for (var i = 0; i < row.length; i++)
              // A full row's last section takes the rest, so rounding never overflows.
              if (i == row.length - 1 && row.fold<int>(0, (a, s) => a + s.variant.span) == 6)
                Expanded(child: row[i])
              else
                SizedBox(width: row[i].variant.span * col + (row[i].variant.span - 1) * gap, child: row[i]),
          ]),
      ]);
    });
  }
}

/// One column of a [CmLayout]. Its children are stacked [CmSpace.s20] apart (cards on the page).
/// Mirrors `<cm-layout-section>`.
class CmLayoutSection extends StatelessWidget {
  const CmLayoutSection({super.key, this.variant = CmLayoutVariant.full, required this.children});

  /// Width on wide layouts. A detail page is a [CmLayoutVariant.twoThirds] main section and a
  /// [CmLayoutVariant.oneThird] side section. Every section is full width once the layout stacks.
  final CmLayoutVariant variant;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, spacing: CmSpace.s20, children: children);
}

/// A whole admin page: the page header across the top, then the content on the page background with page
/// padding ([CmSpace.s20], or [CmSpace.s10] when the page is 640px wide or less). Mirrors `<cm-page>`.
///
/// ```dart
/// CmPage(header: const CmPageHeader(title: 'Orders'), child: CmLayout(children: [...]))
/// ```
class CmPage extends StatelessWidget {
  const CmPage({super.key, this.header, required this.child, this.footer, this.fullWidth = false, this.narrow = false, this.scrollable = true});

  /// A [CmPageHeader]. Runs edge to edge.
  final Widget? header;

  /// The page content, usually a [CmLayout].
  final Widget child;

  /// A [CmSaveBar] or [CmActionBar], after the content. With [scrollable] it stays at the bottom.
  final Widget? footer;

  /// Lets the content use every pixel of width (wide tables, reports). By default it stops at 1600px, centred.
  final bool fullWidth;

  /// Content at most 800px wide, centred: for settings and single-column forms.
  final bool narrow;

  /// Scrolls the content between the header and footer. Turn it off when the page sits inside your own
  /// scroll view.
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return ColoredBox(
      color: c.bgPage,
      child: LayoutBuilder(builder: (context, box) {
        final pad = box.maxWidth <= 640 ? CmSpace.s10 : CmSpace.s20;
        final max = fullWidth ? double.infinity : (narrow ? 800.0 : 1600.0);
        final content = Padding(
          padding: EdgeInsets.all(pad),
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(constraints: BoxConstraints(maxWidth: max), child: SizedBox(width: double.infinity, child: child)),
          ),
        );
        if (scrollable && box.maxHeight.isFinite) {
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            ?header,
            Expanded(child: SingleChildScrollView(child: content)),
            ?footer,
          ]);
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [?header, content, ?footer]);
      }),
    );
  }
}
