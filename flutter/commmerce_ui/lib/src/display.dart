import 'package:flutter/material.dart';

import 'button.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'theme.dart';

/// Meaning of a status colour. Information is orange and attention is blue in this system.
enum CmTone { neutral, attention, information, success, critical }

/// Uppercase status pill ("ORDER PLACED", "PAID"). Mirrors `<cm-badge>`.
class CmBadge extends StatelessWidget {
  const CmBadge(this.label, {super.key, this.tone = CmTone.neutral});
  final String label;
  final CmTone tone;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final (bg, fg) = switch (tone) {
      CmTone.neutral => (c.bgTag, c.textDefault),
      CmTone.attention => (c.bgAttention, c.textAttention),
      CmTone.information => (c.bgInformationSoft, c.textInformation),
      CmTone.success => (c.bgSuccessSoft, c.textSuccess),
      CmTone.critical => (c.bgCritical, c.textCritical),
    };
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: CmSpace.s10),
      decoration: BoxDecoration(color: Color.alphaBlend(bg, c.bgSurface), borderRadius: BorderRadius.circular(CmRadius.full)),
      // Centre without Container.alignment, which would stretch the badge to the full width it is offered.
      child: Center(widthFactor: 1, child: Text(label.toUpperCase(), style: cmCaps(10, fg), semanticsLabel: label)),
    );
  }
}

/// A chip for a value such as a product tag, optionally removable. Mirrors `<cm-tag>`.
class CmTag extends StatelessWidget {
  const CmTag(this.label, {super.key, this.onRemove});
  final String label;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Container(
      height: 26,
      padding: EdgeInsets.only(left: CmSpace.s10, right: onRemove == null ? CmSpace.s10 : 4),
      decoration: BoxDecoration(color: c.bgTag, border: Border.all(color: c.gray800), borderRadius: BorderRadius.circular(CmRadius.full)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: CmType.bodySm.copyWith(color: c.textDefault)),
        if (onRemove != null)
          Semantics(
            button: true,
            label: 'Remove $label',
            excludeSemantics: true, onTap: onRemove,
            child: InkWell(onTap: onRemove, customBorder: const CircleBorder(), child: Padding(padding: const EdgeInsets.all(3), child: CmIcon(CmIcons.close, size: 14, color: c.textDefault))),
          ),
      ]),
    );
  }
}

/// A full-width message about the page or a task. Mirrors `<cm-banner>`.
class CmBanner extends StatelessWidget {
  const CmBanner({super.key, required this.message, this.tone = CmTone.attention, this.heading, this.onDismiss, this.actions = const []});
  final String message;
  final CmTone tone;
  final String? heading;

  /// Shows a close button.
  final VoidCallback? onDismiss;

  /// Buttons under the message.
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final (bg, iconColor) = switch (tone) {
      CmTone.information => (c.bgInformation, c.textDefault),
      CmTone.success => (c.bgSuccess, c.textDefault),
      CmTone.critical => (c.bgCritical, c.iconCritical),
      _ => (c.bgAttention, c.textAttention),
    };
    final critical = tone == CmTone.critical;
    return Semantics(
      container: true,
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: CmSpace.s15),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(CmRadius.md)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: CmIcon(tone == CmTone.success ? CmIcons.check : CmIcons.alert, size: 20, color: iconColor)),
          const SizedBox(width: CmSpace.s15),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (heading != null)
                Text(heading!, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w600, color: critical ? c.textCritical : c.textDefault)),
              Text(message, style: CmType.bodyMd.copyWith(color: c.textDefault)),
              if (actions.isNotEmpty) Padding(padding: const EdgeInsets.only(top: CmSpace.s10), child: Wrap(spacing: CmSpace.s10, runSpacing: CmSpace.s10, children: actions)),
            ]),
          ),
          if (onDismiss != null)
            Semantics(
              button: true,
              label: 'Dismiss',
              excludeSemantics: true, onTap: onDismiss,
              child: InkWell(onTap: onDismiss, child: Padding(padding: const EdgeInsets.all(4), child: CmIcon(CmIcons.close, size: 16, color: c.textDefault))),
            ),
        ]),
      ),
    );
  }
}

/// White section card with optional heading, description and header actions. Mirrors `<cm-card>`.
class CmCard extends StatelessWidget {
  const CmCard({super.key, this.heading, this.description, this.actions = const [], this.adornment, this.flush = false, required this.child});
  final String? heading, description;
  final List<Widget> actions;

  /// Badge or icon next to the heading.
  final Widget? adornment;

  /// Removes body padding, for lists that run edge to edge.
  final bool flush;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final pad = CmBreakpoints.of(context) == CmScreen.phone ? CmSpace.s10 + 6 : CmSpace.s20;
    final head = heading == null && description == null
        ? null
        : Padding(
            padding: EdgeInsets.fromLTRB(flush ? pad : 0, flush ? pad : 0, flush ? pad : 0, CmSpace.s20),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (heading != null)
                    Semantics(header: true, child: Wrap(spacing: CmSpace.s10, crossAxisAlignment: WrapCrossAlignment.center, children: [
                      Text(heading!, style: CmText.of(context).headingSm.copyWith(fontWeight: FontWeight.w600, color: c.textDefault)),
                      if (adornment != null) adornment!,
                    ])),
                  if (description != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(description!, style: CmType.bodyLg.copyWith(color: c.textTertiary))),
                ]),
              ),
              if (actions.isNotEmpty) Wrap(spacing: CmSpace.s10, children: actions),
            ]),
          );
    return Container(
      width: double.infinity,
      padding: flush ? EdgeInsets.zero : EdgeInsets.all(pad),
      decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderCard), borderRadius: BorderRadius.circular(CmRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [if (head != null) head, child]),
    );
  }
}

/// A label/value pair in a [CmInfoPanel].
class CmInfoItem {
  const CmInfoItem(this.label, this.value, {this.half = false});
  final String label;
  final Widget value;

  /// Two half items sit side by side.
  final bool half;
}

/// The side card on detail pages listing label/value pairs. Mirrors `<cm-info-panel>`.
class CmInfoPanel extends StatelessWidget {
  const CmInfoPanel({super.key, required this.heading, required this.items, this.action, this.onAction});
  final String heading;
  final List<CmInfoItem> items;

  /// Uppercase text action, e.g. "REMOVE".
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return CmCard(
      heading: heading,
      actions: [if (action != null) TextButton(onPressed: onAction, child: Text(action!.toUpperCase(), style: cmCaps(12, c.textDefault)))],
      child: LayoutBuilder(builder: (context, box) {
        return Wrap(runSpacing: CmSpace.s20, children: [
          for (final i in items)
            SizedBox(
              width: i.half ? box.maxWidth / 2 : box.maxWidth,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(i.label, style: CmType.bodyLg.copyWith(color: c.textTertiary)),
                const SizedBox(height: 4),
                DefaultTextStyle.merge(style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, color: c.textDefault), child: i.value),
              ]),
            ),
        ]);
      }),
    );
  }
}

/// A breadcrumb link above a page title.
class CmBreadcrumb {
  const CmBreadcrumb(this.label, {this.onTap});
  final String label;
  final VoidCallback? onTap;
}

/// Breadcrumbs, the page title and actions in one bar. On phones the breadcrumbs become a back arrow.
/// Mirrors `<cm-page-header>`.
class CmPageHeader extends StatelessWidget {
  const CmPageHeader({super.key, required this.title, this.breadcrumbs = const [], this.actions = const [], this.adornment});
  final String title;
  final List<CmBreadcrumb> breadcrumbs;
  final List<Widget> actions;
  final Widget? adornment;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final t = CmText.of(context);
    final titleRow = Wrap(spacing: CmSpace.s10, crossAxisAlignment: WrapCrossAlignment.center, children: [
      Semantics(header: true, child: Text(title, style: t.headingLg.copyWith(fontWeight: FontWeight.w600, color: c.textDefault))),
      if (adornment != null) adornment!,
    ]);
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(minHeight: phone ? 64 : 80),
      padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s15 : CmSpace.s20, vertical: CmSpace.s10),
      decoration: BoxDecoration(color: c.bgSurface, border: Border(bottom: BorderSide(color: c.borderDefault))),
      child: Row(children: [
        if (phone && breadcrumbs.isNotEmpty)
          Semantics(
            button: true,
            label: 'Back to ${breadcrumbs.last.label}',
            excludeSemantics: true, onTap: breadcrumbs.last.onTap,
            child: InkWell(onTap: breadcrumbs.last.onTap, child: Padding(padding: const EdgeInsets.all(8), child: CmIcon(CmIcons.chevronLeft, size: 20, color: c.textDefault))),
          ),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            if (!phone && breadcrumbs.isNotEmpty)
              Semantics(
                container: true,
                label: 'Breadcrumb',
                child: Wrap(children: [
                  for (final b in breadcrumbs) ...[
                    InkWell(onTap: b.onTap, child: Text(b.label, style: CmType.bodyMd.copyWith(color: c.textTertiary))),
                    Text('  /  ', style: CmType.bodyMd.copyWith(color: c.textTertiary)),
                  ],
                  Text(title, style: CmType.bodyMd.copyWith(color: c.textDefault)),
                ]),
              ),
            titleRow,
          ]),
        ),
        if (actions.isNotEmpty) Wrap(spacing: CmSpace.s10, runSpacing: CmSpace.s10, children: actions),
      ]),
    );
  }
}

/// A bar with a message, Discard and Save, shown while there are unsaved changes. Mirrors `<cm-save-bar>`.
class CmSaveBar extends StatelessWidget {
  const CmSaveBar({super.key, required this.visible, required this.onSave, required this.onDiscard, this.message = 'Unsaved changes', this.saving = false});
  final bool visible, saving;
  final VoidCallback onSave, onDiscard;
  final String message;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 150),
      child: !visible
          ? const SizedBox.shrink()
          : Semantics(
              container: true,
              liveRegion: true,
              label: message,
              child: Container(
                key: const ValueKey('bar'),
                padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: 12),
                decoration: BoxDecoration(color: c.bgSurface, border: Border(top: BorderSide(color: c.borderDefault)), boxShadow: CmShadow.s100),
                child: Row(children: [
                  Expanded(child: Text(message, style: CmType.bodyLg.copyWith(color: c.textDefault))),
                  CmButton(label: 'Discard', size: CmButtonSize.large, onPressed: saving ? null : onDiscard),
                  const SizedBox(width: CmSpace.s10),
                  CmButton(label: 'Save', size: CmButtonSize.large, variant: CmButtonVariant.primary, loading: saving, onPressed: onSave),
                ]),
              ),
            ),
    );
  }
}

/// Says what is missing and gives the one action that fills it. Mirrors `<cm-empty-state>`.
class CmEmptyState extends StatelessWidget {
  const CmEmptyState({super.key, required this.heading, this.message, this.icon = CmIcons.box, this.action, this.small = false});
  final String heading;
  final String? message;
  final String icon;
  final Widget? action;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final d = small ? 120.0 : 180.0;
    return Padding(
      padding: const EdgeInsets.all(CmSpace.s30),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: d, height: d, decoration: BoxDecoration(color: c.bgInset, shape: BoxShape.circle), alignment: Alignment.center, child: CmIcon(icon, size: d / 3, color: c.iconDefault)),
        const SizedBox(height: CmSpace.s20),
        Semantics(header: true, child: Text(heading, textAlign: TextAlign.center, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, color: c.textDefault))),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(message!, textAlign: TextAlign.center, style: CmType.bodyMd.copyWith(color: c.textTertiary))),
        if (action != null) Padding(padding: const EdgeInsets.only(top: CmSpace.s20), child: action!),
      ]),
    );
  }
}

/// A grey placeholder that keeps the layout while content loads. Hidden from screen readers.
/// Mirrors `<cm-skeleton>`.
class CmSkeleton extends StatefulWidget {
  const CmSkeleton({super.key, this.width = double.infinity, this.height = 16, this.radius = CmRadius.sm});
  final double width, height, radius;

  @override
  State<CmSkeleton> createState() => _CmSkeletonState();
}

class _CmSkeletonState extends State<CmSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);

  @override
  void dispose() { _a.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final still = MediaQuery.of(context).disableAnimations;
    return ExcludeSemantics(
      child: AnimatedBuilder(
        animation: _a,
        builder: (context, _) => Container(
          width: widget.width, height: widget.height,
          decoration: BoxDecoration(
            color: still ? c.bgInputFilled : Color.lerp(c.bgInputFilled, c.thumbBg, _a.value),
            borderRadius: BorderRadius.circular(widget.radius),
          ),
        ),
      ),
    );
  }
}

/// One status in [CmStatusTabs].
class CmStatusTab {
  const CmStatusTab(this.value, this.label, {this.count});
  final String value, label;
  final int? count;
}

/// Statuses with counts that filter a list. Mirrors `<cm-status-tabs>`.
class CmStatusTabs extends StatelessWidget {
  const CmStatusTabs({super.key, required this.tabs, required this.value, required this.onChanged});
  final List<CmStatusTab> tabs;
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final size = CmBreakpoints.of(context) == CmScreen.phone ? 15.0 : 18.0;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        for (final t in tabs)
          Padding(
            padding: const EdgeInsets.only(right: CmSpace.s20),
            child: Semantics(
              selected: t.value == value,
              button: true,
              label: t.count == null ? t.label : '${t.label}, ${t.count}',
              excludeSemantics: true, onTap: () => onChanged(t.value),
              child: InkWell(
                onTap: () => onChanged(t.value),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: t.value == value ? c.borderStrong : Colors.transparent, width: 2))),
                  child: Text(t.count == null ? t.label : '${t.label} (${t.count})',
                      style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: size, fontWeight: FontWeight.w500, color: t.value == value ? c.textDefault : c.textTertiary)),
                ),
              ),
            ),
          ),
      ]),
    );
  }
}

/// "Showing 21–40 of 290" with previous and next. Mirrors `<cm-pagination>`.
class CmPagination extends StatelessWidget {
  const CmPagination({super.key, required this.page, required this.pageSize, required this.total, required this.onPageChanged, this.resourceName = 'items'});
  final int page, pageSize, total;
  final ValueChanged<int> onPageChanged;
  final String resourceName;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final pages = (total / pageSize).ceil().clamp(1, 1 << 30);
    final from = total == 0 ? 0 : (page - 1) * pageSize + 1;
    final to = (page * pageSize).clamp(0, total);
    Widget arrow(String icon, String label, bool enabled, int target) => Semantics(
          button: true, enabled: enabled, label: label, excludeSemantics: true, onTap: enabled ? () => onPageChanged(target) : null,
          child: InkWell(
            onTap: enabled ? () => onPageChanged(target) : null,
            child: Container(
              width: 32, height: 32,
              decoration: BoxDecoration(border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.sm), color: c.bgHover),
              child: Center(child: CmIcon(icon, size: 16, color: enabled ? c.textDefault : c.textSecondary)),
            ),
          ),
        );
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15),
      child: Row(children: [
        Expanded(child: Semantics(liveRegion: true, child: Text('Showing $from–$to of $total $resourceName', style: CmType.bodyMd.copyWith(color: c.textDefault)))),
        Text('Page $page of $pages', style: CmType.bodyMd.copyWith(color: c.textDefault)),
        const SizedBox(width: CmSpace.s10),
        arrow(CmIcons.chevronLeft, 'Previous page', page > 1, page - 1),
        const SizedBox(width: 6),
        arrow(CmIcons.chevronRight, 'Next page', page < pages, page + 1),
      ]),
    );
  }
}

/// A row in a [CmResourceList].
class CmResourceItem {
  const CmResourceItem({required this.id, required this.child, this.semanticLabel, this.onTap, this.media});
  final String id;
  final Widget child;

  /// Accessible name for the row (e.g. "Order #1042").
  final String? semanticLabel;
  final VoidCallback? onTap;

  /// A 50px thumbnail.
  final Widget? media;
}

/// Selectable rows with bulk actions once something is selected. Mirrors `<cm-resource-list>`.
class CmResourceList extends StatelessWidget {
  const CmResourceList({super.key, required this.items, this.selected = const {}, this.onSelectionChanged, this.bulkActions = const [], this.resourceName = 'item', this.empty, this.loading = false});
  final List<CmResourceItem> items;
  final Set<String> selected;

  /// Makes rows selectable when set.
  final ValueChanged<Set<String>>? onSelectionChanged;
  final List<Widget> bulkActions;
  final String resourceName;

  /// Shown when there are no items (e.g. a [CmEmptyState]).
  final Widget? empty;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final selectable = onSelectionChanged != null;
    final all = items.isNotEmpty && selected.length == items.length;
    final rows = loading
        ? List.generate(3, (_) => const Padding(padding: EdgeInsets.all(CmSpace.s15), child: CmSkeleton(height: 20)))
        : items.map((i) {
            final isSel = selected.contains(i.id);
            return MergeSemantics(
              child: Material(
                color: isSel ? c.bgInset : c.bgSurface,
                child: InkWell(
                  onTap: i.onTap ?? (selectable ? () => onSelectionChanged!(isSel ? ({...selected}..remove(i.id)) : {...selected, i.id}) : null),
                  hoverColor: c.bgInset,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15, vertical: 14),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.borderDefault))),
                    child: Row(children: [
                      if (selectable)
                        Padding(
                          padding: const EdgeInsets.only(right: CmSpace.s15),
                          child: Checkbox(
                            value: isSel,
                            onChanged: (v) => onSelectionChanged!(v == true ? {...selected, i.id} : ({...selected}..remove(i.id))),
                            side: BorderSide(color: c.borderStrong),
                            checkColor: c.textDefault,
                            fillColor: WidgetStateProperty.all(c.bgSurface),
                            semanticLabel: 'Select ${i.semanticLabel ?? i.id}',
                          ),
                        ),
                      if (i.media != null) Padding(padding: const EdgeInsets.only(right: CmSpace.s15), child: SizedBox.square(dimension: 50, child: i.media)),
                      Expanded(child: DefaultTextStyle.merge(style: CmType.bodyLg.copyWith(color: c.textDefault), child: i.child)),
                    ]),
                  ),
                ),
              ),
            );
          }).toList();
    return Container(
      decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderCard), borderRadius: BorderRadius.circular(CmRadius.md)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (selectable && items.isNotEmpty)
          Padding(
            padding: const EdgeInsets.all(CmSpace.s15),
            child: Wrap(spacing: CmSpace.s15, runSpacing: CmSpace.s10, crossAxisAlignment: WrapCrossAlignment.center, children: [
              CmButton(
                label: all ? 'Deselect all' : 'Select all',
                icon: all ? CmIcons.check : null,
                onPressed: () => onSelectionChanged!(all ? {} : items.map((e) => e.id).toSet()),
              ),
              if (selected.isNotEmpty) ...[
                Semantics(liveRegion: true, child: Text('${selected.length} $resourceName${selected.length == 1 ? '' : 's'} selected', style: CmType.bodyMd.copyWith(color: c.textDefault))),
                ...bulkActions,
              ],
            ]),
          ),
        if (!loading && items.isEmpty && empty != null) empty! else ...rows,
      ]),
    );
  }
}
