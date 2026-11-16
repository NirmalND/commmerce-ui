import 'package:flutter/material.dart';

import 'generated/tokens.g.dart';
import 'icon.dart';
import 'theme.dart';

/// Button styles: black primary (one per group) or outlined secondary.
enum CmButtonVariant { primary, secondary }

/// Button heights: large 46 (save bars), medium 32, slim 24.
enum CmButtonSize { large, medium, slim }

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
  });

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

  @override
  State<CmButton> createState() => _CmButtonState();
}

class _CmButtonState extends State<CmButton> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final enabled = widget.onPressed != null && !widget.loading;
    final primary = widget.variant == CmButtonVariant.primary;
    final (height, pad, font) = switch (widget.size) {
      CmButtonSize.large => (46.0, CmSpace.s20, 16.0),
      CmButtonSize.medium => (32.0, CmSpace.s15, 12.0),
      CmButtonSize.slim => (24.0, CmSpace.s10, 10.0),
    };
    final Color bg, fg, border;
    if (!enabled) {
      bg = c.actionDisabled; fg = c.actionDisabledText; border = c.actionDisabled;
    } else if (primary) {
      bg = _hover ? c.actionPrimaryHover : c.actionPrimary; fg = c.actionPrimaryText; border = bg;
    } else {
      bg = _hover ? c.bgSurface : c.bgHover; fg = c.textDefault; border = c.borderStrong;
    }
    final child = Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.center, children: [
      if (widget.loading)
        Padding(
          padding: const EdgeInsets.only(right: 6),
          child: SizedBox.square(dimension: font, child: CircularProgressIndicator(strokeWidth: 2, color: fg)),
        )
      else if (widget.icon != null)
        Padding(padding: const EdgeInsets.only(right: 6), child: CmIcon(widget.icon!, size: font + 4, color: fg)),
      Text(widget.label, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: font, fontWeight: FontWeight.w500, height: 1, color: fg)),
    ]);
    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel ?? widget.label,
      excludeSemantics: true, onTap: enabled ? widget.onPressed : null,
      child: FocusableActionDetector(
        enabled: enabled,
        mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onPressed?.call(); return null; })},
        child: GestureDetector(
          onTap: enabled ? widget.onPressed : null,
          child: Container(
            height: height,
            padding: EdgeInsets.symmetric(horizontal: pad),
            decoration: BoxDecoration(
              color: bg,
              border: Border.all(color: border),
              borderRadius: BorderRadius.circular(CmRadius.sm),
              boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
            ),
            // No `alignment`: a Container with alignment fills its parent; the button must hug its label.
            child: child,
          ),
        ),
      ),
    );
  }
}
