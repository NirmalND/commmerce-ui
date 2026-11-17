import 'package:flutter/material.dart';

import 'display.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// A row that shows or hides extra detail, used in side panels and cards. Mirrors `<cm-accordion>`.
///
/// Uncontrolled by default (starts closed, or open with [initiallyOpen]). Pass [open] to control it.
class CmAccordion extends StatefulWidget {
  const CmAccordion({super.key, required this.heading, required this.child, this.open, this.initiallyOpen = false, this.onToggle, this.enabled = true});

  /// The always-visible row text: a short statement, e.g. "Found in 2 orders".
  final String heading;

  /// The detail shown when open.
  final Widget child;

  /// Controls the open state. Leave null to let the accordion manage it.
  final bool? open;
  final bool initiallyOpen;

  /// Called after it opens or closes, with the new state.
  final ValueChanged<bool>? onToggle;

  /// False blocks opening and closing.
  final bool enabled;

  @override
  State<CmAccordion> createState() => _CmAccordionState();
}

class _CmAccordionState extends State<CmAccordion> {
  late bool _open = widget.open ?? widget.initiallyOpen;
  bool _focus = false;

  bool get _isOpen => widget.open ?? _open;

  void _toggle() {
    if (!widget.enabled) return;
    final next = !_isOpen;
    if (widget.open == null) setState(() => _open = next);
    widget.onToggle?.call(next);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final still = MediaQuery.of(context).disableAnimations;
    final open = _isOpen;
    final fg = widget.enabled ? c.textDefault : c.textSecondary;
    final chev = phone ? 28.0 : 34.0;
    final row = Container(
      constraints: BoxConstraints(minHeight: phone ? 50 : 60),
      padding: const EdgeInsets.fromLTRB(CmSpace.s20, CmSpace.s12, CmSpace.s16, CmSpace.s12),
      foregroundDecoration: _focus ? BoxDecoration(borderRadius: BorderRadius.circular(CmRadius.md), border: Border.all(color: c.borderStrong, width: 2)) : null,
      child: Row(children: [
        Expanded(child: Text(widget.heading, style: CmType.bodyLg.copyWith(fontSize: phone ? 14 : 16, color: fg))),
        const SizedBox(width: CmSpace.s16),
        AnimatedRotation(
          turns: open ? 0.5 : 0,
          duration: still ? Duration.zero : CmMotion.fast,
          curve: CmMotion.standard,
          child: Container(
            width: chev, height: chev,
            decoration: BoxDecoration(color: c.bgPage, shape: BoxShape.circle),
            child: Center(child: CmIcon(CmIcons.chevronDown, size: 16, color: widget.enabled ? c.iconSelected : c.textSecondary)),
          ),
        ),
      ]),
    );
    return Container(
      decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Semantics(
          header: true,
          button: true,
          enabled: widget.enabled,
          expanded: open,
          label: widget.heading,
          hint: open ? CmStrings.of(context).expanded : CmStrings.of(context).collapsed,
          excludeSemantics: true, onTap: widget.enabled ? _toggle : null,
          child: FocusableActionDetector(
            enabled: widget.enabled,
            mouseCursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
            onShowFocusHighlight: (v) => setState(() => _focus = v),
            actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { _toggle(); return null; })},
            child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: widget.enabled ? _toggle : null, child: row),
          ),
        ),
        if (open)
          Semantics(
            container: true,
            label: widget.heading,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: CmSpace.s16),
              decoration: BoxDecoration(border: Border(top: BorderSide(color: c.borderSubtle))),
              child: DefaultTextStyle.merge(style: CmType.bodyMd.copyWith(color: c.textDefault), child: widget.child),
            ),
          ),
      ]),
    );
  }
}

/// The bar at the bottom of a long form or record page that repeats what the page is about and its
/// main actions, so they stay in reach (the Figma "Bottom Tab"). Mirrors `<cm-action-bar>`.
///
/// With `tone: CmTone.critical` it explains a blocking error, announced to screen readers, and offers
/// the action that fixes it. Other tones look like the default white bar.
class CmActionBar extends StatelessWidget {
  const CmActionBar({
    super.key,
    this.eyebrow,
    this.heading,
    this.adornment,
    this.child,
    this.actions = const [],
    this.tone = CmTone.neutral,
    this.sticky = false,
    this.semanticLabel,
  });

  /// Small line above the heading: the page or record ID ("Add product", "#1042").
  final String? eyebrow;

  /// The record name, or the error message when critical.
  final String? heading;

  /// A badge next to the eyebrow, e.g. the order status.
  final Widget? adornment;

  /// Extra content under the heading, such as an amount.
  final Widget? child;

  /// Buttons, secondary first and the primary action last (large size).
  final List<Widget> actions;

  /// [CmTone.critical] draws the pink error bar; anything else the white bar.
  final CmTone tone;

  /// Adds the raised shadow used when the bar is pinned to the bottom of a scrolling page.
  /// Position it yourself (e.g. under an [Expanded] scroll view).
  final bool sticky;

  /// Accessible name of the bar. Defaults to the heading.
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final critical = tone == CmTone.critical;
    final gap = phone ? CmSpace.s8 : CmSpace.s20;
    final lead = Row(children: [
      if (critical) ...[
        Container(
          width: phone ? 30 : 40, height: phone ? 30 : 40,
          decoration: BoxDecoration(color: c.bgSurface, shape: BoxShape.circle),
          child: Center(child: CmIcon(CmIcons.alert, size: 20, color: c.iconCritical)),
        ),
        const SizedBox(width: CmSpace.s8),
      ],
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          if (eyebrow != null && eyebrow!.isNotEmpty)
            Wrap(spacing: CmSpace.s8, crossAxisAlignment: WrapCrossAlignment.center, children: [
              Text(eyebrow!, style: CmType.bodyMd.copyWith(fontSize: phone ? 12 : 14, fontWeight: FontWeight.w500, color: c.textDefault)),
              if (adornment != null) adornment!,
            ]),
          if (heading != null && heading!.isNotEmpty) ...[
            if (eyebrow != null && eyebrow!.isNotEmpty) const SizedBox(height: CmSpace.s8),
            Semantics(
              liveRegion: critical,
              child: Text(heading!,
                  style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: phone ? 14 : 20, height: 1.3, fontWeight: critical ? FontWeight.w400 : FontWeight.w600, color: c.textDefault)),
            ),
          ],
          if (child != null) ...[const SizedBox(height: CmSpace.s8), DefaultTextStyle.merge(style: TextStyle(color: c.textDefault), child: child!)],
        ]),
      ),
    ]);
    final buttons = Wrap(alignment: WrapAlignment.end, spacing: gap, runSpacing: gap, crossAxisAlignment: WrapCrossAlignment.center, children: actions);
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: semanticLabel ?? heading ?? eyebrow ?? CmStrings.of(context).actions,
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(minHeight: phone ? 68 : 80),
        padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s8 : CmSpace.s20, vertical: phone ? CmSpace.s8 : CmSpace.s16),
        decoration: BoxDecoration(
          color: critical ? c.bgErrorBar : c.bgSurface,
          border: critical ? Border(top: BorderSide(color: c.borderCritical)) : Border.all(color: c.borderSubtle),
          borderRadius: critical ? null : BorderRadius.circular(CmRadius.md),
          boxShadow: sticky ? CmShadow.sm : null,
        ),
        child: LayoutBuilder(builder: (context, box) {
          // The web bar wraps the actions under the text once the text would get narrower than 280px.
          if (actions.isEmpty) return lead;
          if (box.maxWidth >= 560) {
            return Row(children: [Expanded(child: lead), SizedBox(width: gap), buttons]);
          }
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            lead,
            SizedBox(height: gap),
            Align(alignment: Alignment.centerRight, child: buttons),
          ]);
        }),
      ),
    );
  }
}
