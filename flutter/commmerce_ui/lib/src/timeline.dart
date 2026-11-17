import 'dart:async';

import 'package:flutter/material.dart';

import 'button.dart';
import 'display.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// Times further than this many days away show as a date instead of "N days ago".
const int _relativeDays = 7;

/// One event in a [CmTimeline]: an icon for its kind, a title, when it happened, a meta line, an optional badge,
/// an optional body (clamped to [lines] lines with Show all / Show less) and optional actions.
/// Mirrors `<cm-timeline-item>`. Since 1.2.
///
/// The time is shown relative to now ("2 hours ago", then a date after a week) and moves on while the screen is
/// open. The full date and time shows in a tooltip on hover, long press and keyboard focus, and is read to screen
/// readers after the relative time.
class CmTimelineItem extends StatefulWidget {
  const CmTimelineItem({
    super.key,
    this.heading,
    this.headingWidget,
    this.icon,
    this.tone = CmTone.neutral,
    this.dateTime,
    this.time,
    this.meta,
    this.metaWidget,
    this.badge,
    this.body,
    this.lines = 3,
    this.initiallyExpanded = false,
    this.actions = const [],
    this.now,
  });

  /// What happened: "Email sent", "Status changed".
  final String? heading;

  /// A rich title (e.g. with a link), instead of [heading].
  final Widget? headingWidget;

  /// Icon name from [CmIcons] for the kind of event (mail, note, edit, chat). Null shows a small dot.
  final String? icon;

  /// Colours the icon: neutral (default), information, attention, success or critical.
  final CmTone tone;

  /// When it happened, in local time. Shown relative to now.
  final DateTime? dateTime;

  /// The time as shown, instead of the relative time worked out from [dateTime] (which still gives the full date
  /// in the tooltip).
  final String? time;

  /// A line under the title: "by Rahul Kumar · sent".
  final String? meta;

  /// A rich meta line, instead of [meta].
  final Widget? metaWidget;

  /// A [CmBadge] for the kind or state, after the title.
  final Widget? badge;

  /// The body: an email excerpt, a note, a call summary. Clamped to [lines] lines.
  final String? body;

  /// Lines of body shown before "Show all". 0 shows the whole body.
  final int lines;

  /// Starts with the whole body shown.
  final bool initiallyExpanded;

  /// Links or buttons under the body, e.g. "Read email".
  final List<Widget> actions;

  /// The current time, for tests and previews. Defaults to the clock.
  final DateTime? now;

  @override
  State<CmTimelineItem> createState() => _CmTimelineItemState();
}

class _CmTimelineItemState extends State<CmTimelineItem> {
  late bool _expanded = widget.initiallyExpanded;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tick();
  }

  @override
  void didUpdateWidget(CmTimelineItem old) {
    super.didUpdateWidget(old);
    _tick();
  }

  /// "2 minutes ago" moves on while the item is shown.
  void _tick() {
    final needs = widget.dateTime != null && widget.time == null && widget.now == null;
    if (needs && _timer == null) {
      _timer = Timer.periodic(const Duration(minutes: 1), (_) {
        if (mounted) setState(() {});
      });
    } else if (!needs) {
      _timer?.cancel();
      _timer = null;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _relative(BuildContext context, DateTime d) {
    final s = CmStrings.of(context);
    final diff = (widget.now ?? DateTime.now()).difference(d);
    final future = diff.isNegative;
    final min = diff.inMinutes.abs();
    if (min < 1) return s.justNow;
    if (min < 60) return future ? s.inMinutes(min) : s.minutesAgo(min);
    final hours = min ~/ 60;
    if (hours < 24) return future ? s.inHours(hours) : s.hoursAgo(hours);
    final days = hours ~/ 24;
    if (days < _relativeDays) return future ? s.inDays(days) : s.daysAgo(days);
    // "Oct 2, 2026" (web: dateStyle medium).
    return MaterialLocalizations.of(context).formatShortDate(d);
  }

  String _full(BuildContext context, DateTime d) {
    final l = MaterialLocalizations.of(context);
    final t = l.formatTimeOfDay(TimeOfDay.fromDateTime(d), alwaysUse24HourFormat: MediaQuery.alwaysUse24HourFormatOf(context));
    return '${l.formatFullDate(d)}, $t';
  }

  @override
  Widget build(BuildContext context) {
    final w = widget;
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final (bg, fg, border) = switch (w.tone) {
      CmTone.information => (c.bgInformationSoft, c.textInformation, null),
      CmTone.attention => (c.bgAttention, c.textAttention, null),
      CmTone.success => (c.bgSuccessSoft, c.textSuccess, null),
      CmTone.critical => (c.bgCritical, c.textCritical, null),
      CmTone.neutral => (c.bgInset, c.iconDefault, c.borderSubtle),
    };
    final icon = ExcludeSemantics(
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: Color.alphaBlend(bg, c.bgSurface), shape: BoxShape.circle, border: border == null ? null : Border.all(color: border)),
        child: Center(
          child: w.icon != null
              ? CmIcon(w.icon!, size: 16, color: fg)
              : Container(width: 10, height: 10, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
        ),
      ),
    );
    final d = w.dateTime;
    final shown = w.time ?? (d == null ? null : _relative(context, d));
    final full = d == null ? null : _full(context, d);
    final timeStyle = CmType.bodySm.copyWith(height: 16 / 12, color: c.textTertiary);
    Widget? timeW;
    if (shown != null) {
      timeW = Text(shown, style: timeStyle, maxLines: 1);
      if (full != null) {
        timeW = Semantics(
          label: '$shown, $full',
          excludeSemantics: true,
          child: Focus(child: CmTooltip(message: full, child: timeW)),
        );
      }
    }
    final title = DefaultTextStyle.merge(
      style: CmType.bodyMd.copyWith(height: 20 / 14, fontWeight: FontWeight.w500, color: c.textDefault),
      child: w.headingWidget ?? Text(w.heading ?? ''),
    );
    final head = Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(
        child: Wrap(spacing: CmSpace.s8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Semantics(header: true, child: title),
          if (w.badge != null) w.badge!,
        ]),
      ),
      if (timeW != null) ...[const SizedBox(width: CmSpace.s8), Padding(padding: const EdgeInsets.only(top: 2), child: timeW)],
    ]);
    final metaStyle = CmType.bodySm.copyWith(height: 16 / 12, color: c.textTertiary);
    final hasMeta = w.metaWidget != null || (w.meta != null && w.meta!.isNotEmpty);
    final bodyStyle = CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault);
    final hasBody = w.body != null && w.body!.trim().isNotEmpty;
    Widget? bodyW;
    if (hasBody) {
      bodyW = LayoutBuilder(builder: (context, box) {
        final clamp = w.lines > 0 && !_expanded;
        var overflow = false;
        if (w.lines > 0) {
          final tp = TextPainter(
            text: TextSpan(text: w.body, style: bodyStyle),
            maxLines: w.lines,
            textDirection: Directionality.of(context),
            textScaler: MediaQuery.textScalerOf(context),
          )..layout(maxWidth: box.maxWidth);
          overflow = tp.didExceedMaxLines;
          tp.dispose();
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(w.body!, style: bodyStyle, maxLines: clamp ? w.lines : null, overflow: clamp ? TextOverflow.ellipsis : null),
          if (overflow) _ToggleButton(label: _expanded ? s.showLess : s.showAll, expanded: _expanded, onTap: () => setState(() => _expanded = !_expanded)),
        ]);
      });
    }
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      icon,
      const SizedBox(width: CmSpace.s16),
      Expanded(
        child: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            head,
            if (hasMeta) Padding(padding: const EdgeInsets.only(top: 2), child: DefaultTextStyle.merge(style: metaStyle, child: w.metaWidget ?? Text(w.meta!, style: metaStyle))),
            if (bodyW != null) Padding(padding: const EdgeInsets.only(top: CmSpace.s8), child: bodyW),
            if (w.actions.isNotEmpty)
              Padding(padding: const EdgeInsets.only(top: CmSpace.s8), child: Wrap(spacing: CmSpace.s8, runSpacing: CmSpace.s8, children: w.actions)),
          ]),
        ),
      ),
    ]);
  }
}

class _ToggleButton extends StatefulWidget {
  const _ToggleButton({required this.label, required this.expanded, required this.onTap});
  final String label;
  final bool expanded;
  final VoidCallback onTap;
  @override
  State<_ToggleButton> createState() => _ToggleButtonState();
}

class _ToggleButtonState extends State<_ToggleButton> {
  bool _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Semantics(
      button: true,
      expanded: widget.expanded,
      label: widget.label,
      excludeSemantics: true,
      onTap: widget.onTap,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            margin: const EdgeInsets.only(top: 4),
            constraints: const BoxConstraints(minHeight: 24),
            padding: const EdgeInsets.symmetric(vertical: 2),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(CmRadius.xs), border: _focus ? Border.all(color: c.borderStrong, width: 2) : null),
            child: Text(widget.label, style: CmType.bodySm.copyWith(height: 16 / 12, fontWeight: FontWeight.w500, color: c.textDefault, decoration: TextDecoration.underline)),
          ),
        ),
      ),
    );
  }
}

/// An activity feed for a record page: one [CmTimelineItem] per event (emails, calls, notes, field changes),
/// newest first, joined by a vertical line, with "Show more" at the end for older events.
/// Mirrors `<cm-timeline>`. Since 1.2.
///
/// It is a named list for screen readers; the line between icons is decoration only.
class CmTimeline extends StatelessWidget {
  const CmTimeline({
    super.key,
    required this.items,
    this.label,
    this.hasMore = false,
    this.loading = false,
    this.onLoadMore,
    this.moreLabel,
    this.empty,
  });

  /// The events, in the order to show them.
  final List<CmTimelineItem> items;

  /// Name of the list, e.g. "Activity for Asha Rao". Default: [CmStrings.timelineLabel] ("Activity").
  final String? label;

  /// There are older events: shows the "Show more" button, which calls [onLoadMore].
  final bool hasMore;

  /// Events are loading: the Show more button shows a spinner, or placeholder rows show when there are no items
  /// yet. Announced politely.
  final bool loading;

  /// Fetch the next page, add the items and clear [loading]; clear [hasMore] on the last page.
  final VoidCallback? onLoadMore;

  /// Text of the Show more button. Default: [CmStrings.showMore].
  final String? moreLabel;

  /// Shown when there are no items and nothing is loading, e.g. an inline [CmEmptyState].
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final children = <Widget>[];
    if (items.isNotEmpty) {
      final rows = <Widget>[];
      for (var i = 0; i < items.length; i++) {
        final last = i == items.length - 1;
        final line = !last || hasMore;
        rows.add(Stack(children: [
          if (line) PositionedDirectional(start: 15, top: 32, bottom: 0, width: 2, child: ColoredBox(color: c.borderSubtle)),
          Padding(padding: EdgeInsets.only(bottom: line ? CmSpace.s20 : 0), child: Semantics(container: true, explicitChildNodes: true, child: items[i])),
        ]));
      }
      children.add(Semantics(
        container: true,
        explicitChildNodes: true,
        label: label ?? s.timelineLabel,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: rows),
      ));
    } else if (loading) {
      children.add(ExcludeSemantics(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: EdgeInsets.only(bottom: i < 2 ? CmSpace.s20 : 0),
              child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CmSkeleton(width: 32, height: 32, radius: CmRadius.full),
                SizedBox(width: CmSpace.s16),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [CmSkeleton(), SizedBox(height: 8), FractionallySizedBox(widthFactor: 0.6, child: CmSkeleton())])),
              ]),
            ),
        ]),
      ));
    } else if (empty != null) {
      children.add(empty!);
    }
    if (hasMore && items.isNotEmpty) {
      children.add(Padding(
        padding: EdgeInsetsDirectional.only(start: phone ? 0 : 47),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: CmButton(label: moreLabel ?? s.showMore, loading: loading, onPressed: loading ? null : onLoadMore),
        ),
      ));
    }
    children.add(Semantics(liveRegion: true, label: loading ? s.loadingActivity : null, child: const SizedBox.shrink()));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: children);
  }
}
