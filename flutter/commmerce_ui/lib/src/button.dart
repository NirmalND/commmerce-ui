import 'package:flutter/material.dart';

import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Button styles: black primary (one per group) or outlined secondary.
enum CmButtonVariant { primary, secondary }

/// Button heights: large 46 (save bars), medium 32, slim 24.
enum CmButtonSize { large, medium, slim }

/// Colours a button by the outcome it records: [critical] (red: delete, "Not interested") or [success]
/// (green: "Sale closed"). The label must still say what happens. Since 1.2.
enum CmButtonTone { critical, success }

/// Highest count a button shows in full; above it the button shows "99+".
const int _countMax = 99;

/// Triggers an action. Mirrors `<cm-button>`.
class CmButton extends StatefulWidget {
  const CmButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = CmButtonVariant.secondary,
    this.size = CmButtonSize.medium,
    this.icon,
    this.loading = false,
    this.semanticLabel,
    this.iconOnly = false,
    this.count = 0,
    this.tone,
  }) : assert(!iconOnly || icon != null, 'An icon-only CmButton needs an icon.');

  /// A square button that shows only [icon] (bell, refresh, search, row actions), named by [label] for screen
  /// readers. [label] is required: it is the button's accessible name. Mirrors `<cm-button icon-only>`.
  const CmButton.iconOnly({
    super.key,
    required String this.icon,
    required this.label,
    this.onPressed,
    this.variant = CmButtonVariant.secondary,
    this.size = CmButtonSize.medium,
    this.loading = false,
    this.count = 0,
    this.tone,
  })  : iconOnly = true,
        semanticLabel = null;

  /// Short, verb first: "Save", "Add product".
  final String label;

  /// Called on tap, Enter or Space. Null disables the button.
  final VoidCallback? onPressed;
  final CmButtonVariant variant;
  final CmButtonSize size;

  /// Optional leading icon name from [CmIcons].
  final String? icon;

  /// Shows a spinner and ignores presses while an action runs.
  final bool loading;

  /// Overrides the accessible name (defaults to [label]).
  final String? semanticLabel;

  /// Shows only [icon], in a square the size's height (44 x 44 at least on touch screens). [label] is then not
  /// shown but stays the accessible name. Use [CmButton.iconOnly].
  final bool iconOnly;

  /// A small counter on the button, e.g. unread notifications. Hidden at 0; over 99 shows "99+". Screen readers
  /// hear the exact number ("Notifications, 3 unread").
  final int count;

  /// Colours the button by meaning. Null: the standard black and white.
  final CmButtonTone? tone;

  @override
  State<CmButton> createState() => _CmButtonState();
}

class _CmButtonState extends State<CmButton> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final strings = CmStrings.of(context);
    final enabled = widget.onPressed != null && !widget.loading;
    final primary = widget.variant == CmButtonVariant.primary;
    final (height, pad, font) = switch (widget.size) {
      CmButtonSize.large => (46.0, CmSpace.s20, 16.0),
      CmButtonSize.medium => (32.0, CmSpace.s15, 12.0),
      CmButtonSize.slim => (24.0, CmSpace.s10, 10.0),
    };
    final Color bg, fg, border;
    final toneColor = switch (widget.tone) { CmButtonTone.critical => c.textCritical, CmButtonTone.success => c.textSuccess, null => null };
    if (!enabled) {
      bg = c.actionDisabled; fg = c.actionDisabledText; border = c.actionDisabled;
    } else if (toneColor != null && primary) {
      // Filled in the tone; hover darkens it towards text-default (web: color-mix 80%).
      bg = _hover ? Color.lerp(toneColor, c.textDefault, 0.2)! : toneColor; fg = c.actionPrimaryText; border = bg;
    } else if (toneColor != null) {
      // On bg-surface, not bg-hover: text-critical on bg-hover is under 4.5:1 in dark. Success has no border token.
      final hoverBg = widget.tone == CmButtonTone.critical ? Color.alphaBlend(c.bgCritical, c.bgSurface) : Color.alphaBlend(c.bgSuccessSoft, c.bgSurface);
      bg = _hover ? hoverBg : c.bgSurface; fg = toneColor; border = widget.tone == CmButtonTone.critical ? c.borderCritical : c.textSuccess;
    } else if (primary) {
      bg = _hover ? c.actionPrimaryHover : c.actionPrimary; fg = c.actionPrimaryText; border = bg;
    } else {
      bg = _hover ? c.bgSurface : c.bgHover; fg = c.textDefault; border = c.borderStrong;
    }
    final count = widget.count > 0 ? widget.count : 0;
    final countText = count > _countMax ? strings.buttonCountOverflow(_countMax) : CmStrings.groupDigits(count);
    Widget? counter;
    if (count > 0) {
      counter = Container(
        constraints: const BoxConstraints(minWidth: 18),
        height: 18,
        padding: const EdgeInsets.symmetric(horizontal: 5),
        decoration: BoxDecoration(
          color: c.navBadge,
          borderRadius: BorderRadius.circular(CmRadius.full),
          boxShadow: widget.iconOnly ? [BoxShadow(color: c.bgSurface, spreadRadius: 2)] : null,
        ),
        child: Center(
          widthFactor: 1,
          child: Text(countText, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: 11, fontWeight: FontWeight.w600, height: 1, color: c.textOnDark, fontFeatures: const [FontFeature.tabularFigures()])),
        ),
      );
    }
    final iconSize = font + 4;
    final Widget? lead = widget.loading
        ? SizedBox.square(dimension: font, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
        : widget.icon != null
            ? CmIcon(widget.icon!, size: iconSize, color: fg)
            : null;
    final Widget child;
    final String name;
    if (widget.iconOnly) {
      child = Center(child: lead);
      name = widget.semanticLabel ?? (count > 0 ? strings.buttonLabelWithCount(widget.label, count) : widget.label);
    } else {
      child = Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.center, children: [
        if (lead != null) Padding(padding: const EdgeInsetsDirectional.only(end: 6), child: lead),
        Text(widget.label, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: font, fontWeight: FontWeight.w500, height: 1, color: fg)),
        if (counter != null) Padding(padding: const EdgeInsetsDirectional.only(start: 6), child: counter),
      ]);
      name = widget.semanticLabel ?? (count > 0 ? '${widget.label} ${strings.buttonCount(count)}' : widget.label);
    }
    // Icon-only buttons are squares; on touch screens at least 44 x 44.
    final side = widget.iconOnly && _touch(context) ? (height < 44 ? 44.0 : height) : height;
    Widget box = Container(
      height: side,
      width: widget.iconOnly ? side : null,
      padding: widget.iconOnly ? EdgeInsets.zero : EdgeInsets.symmetric(horizontal: pad),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(CmRadius.sm),
        boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
      ),
      // No `alignment`: a Container with alignment fills its parent; the button must hug its label.
      child: child,
    );
    if (widget.iconOnly && counter != null) {
      box = Stack(clipBehavior: Clip.none, children: [box, PositionedDirectional(top: -7, end: -7, child: IgnorePointer(child: counter))]);
    }
    return Semantics(
      button: true,
      enabled: enabled,
      label: name,
      excludeSemantics: true, onTap: enabled ? widget.onPressed : null,
      child: FocusableActionDetector(
        enabled: enabled,
        mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onPressed?.call(); return null; })},
        child: GestureDetector(onTap: enabled ? widget.onPressed : null, child: box),
      ),
    );
  }

  static bool _touch(BuildContext context) => switch (Theme.of(context).platform) {
        TargetPlatform.android || TargetPlatform.iOS || TargetPlatform.fuchsia => true,
        _ => false,
      };
}
