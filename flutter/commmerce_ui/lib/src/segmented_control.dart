import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'forms.dart';
import 'generated/tokens.g.dart';
import 'theme.dart';

/// A compact switch between two to four views or filters of the same content ("Open / Done", "Board / List"): the
/// options sit side by side in one track and exactly one is selected. Mirrors `<cm-segmented-control>`. Since 1.6
/// (web 1.5).
///
/// A radio group with a different look: one tab stop; arrow keys (mirrored in right-to-left text), Home and End move
/// and select; [onChanged] fires on every new choice. Screen readers hear a radio group of radio buttons. Option
/// tones are not shown: a view switch has no good or bad answer.
///
/// The track is 36 tall ([small]: 32, for toolbars and filter rows); 44 on touch screens. Use it to change what a page
/// or card shows, right away. To pick a setting saved with a form, use [CmOptionGroup]; for five or more choices,
/// [CmSelect].
class CmSegmentedControl<T> extends StatefulWidget {
  const CmSegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label,
    this.semanticLabel,
    this.small = false,
  }) : assert(options.length >= 2 && options.length <= 4, 'A segmented control has two to four options.');

  /// Two to four options. [CmRadioOption.description] and [CmRadioOption.tone] are not shown.
  final List<CmRadioOption<T>> options;

  /// The selected value.
  final T? value;

  /// Null disables the control.
  final ValueChanged<T>? onChanged;

  /// Visible label above the track (14/20 medium).
  final String? label;

  /// Accessible name when there is no visible [label].
  final String? semanticLabel;

  /// The 32px track for toolbars, filter rows and card headers.
  final bool small;

  @override
  State<CmSegmentedControl<T>> createState() => _CmSegmentedControlState<T>();
}

class _CmSegmentedControlState<T> extends State<CmSegmentedControl<T>> {
  final List<FocusNode> _nodes = [];
  int? _hover, _focused;

  void _sync() {
    while (_nodes.length < widget.options.length) {
      _nodes.add(FocusNode(debugLabel: 'CmSegmentedControl option ${_nodes.length}'));
    }
    while (_nodes.length > widget.options.length) {
      _nodes.removeLast().dispose();
    }
  }

  @override
  void dispose() {
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  bool _enabled(int i) => widget.onChanged != null && widget.options[i].enabled;

  void _select(int i) {
    if (!_enabled(i)) return;
    _nodes[i].requestFocus();
    if (widget.options[i].value != widget.value) widget.onChanged!(widget.options[i].value);
  }

  KeyEventResult _onKey(int i, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    if (k == LogicalKeyboardKey.enter || k == LogicalKeyboardKey.space) {
      _select(i);
      return KeyEventResult.handled;
    }
    final en = [for (var j = 0; j < widget.options.length; j++) if (_enabled(j)) j];
    if (en.isEmpty) return KeyEventResult.ignored;
    final pos = en.indexOf(i);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    int step(int d) => en[((pos < 0 ? 0 : pos) + d + en.length) % en.length];
    int? next;
    if (k == LogicalKeyboardKey.arrowRight) {
      next = step(rtl ? -1 : 1);
    } else if (k == LogicalKeyboardKey.arrowLeft) {
      next = step(rtl ? 1 : -1);
    } else if (k == LogicalKeyboardKey.arrowDown) {
      next = step(1);
    } else if (k == LogicalKeyboardKey.arrowUp) {
      next = step(-1);
    } else if (k == LogicalKeyboardKey.home) {
      next = en.first;
    } else if (k == LogicalKeyboardKey.end) {
      next = en.last;
    } else {
      return KeyEventResult.ignored;
    }
    _select(next);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    _sync();
    final c = CmTheme.colorsOf(context);
    final opts = widget.options;
    final disabled = widget.onChanged == null;
    final h = cmIsTouch(context) ? CmControlHeight.touch : (widget.small ? CmControlHeight.sm : CmControlHeight.md);
    final sel = opts.indexWhere((o) => o.value == widget.value);
    final stop = sel >= 0 && opts[sel].enabled ? sel : opts.indexWhere((o) => o.enabled);
    final textStyle = (widget.small ? CmType.bodySm : CmType.bodyMd).copyWith(fontWeight: FontWeight.w500);
    // Segments shrink (with an ellipsis) only when the track has a width limit; in a Row or Wrap they take their size.
    List<Widget> segments(bool bounded) => <Widget>[
      for (var i = 0; i < opts.length; i++)
        (bounded ? (Widget w) => Flexible(child: w) : (Widget w) => w)(
          Builder(builder: (context) {
            final o = opts[i];
            final on = i == sel;
            final enabled = _enabled(i);
            final fg = !enabled ? c.textSecondary : (on || _hover == i ? c.textDefault : c.textTertiary);
            // Selected: a white segment with the control outline and dark text, so the choice doesn't rest on colour.
            final bg = on ? (enabled ? c.bgSurface : c.bgInputFilled) : Colors.transparent;
            final border = on ? (enabled ? c.borderInput : c.borderSubtle) : Colors.transparent;
            return Semantics(
              inMutuallyExclusiveGroup: true,
              checked: on,
              enabled: enabled,
              label: o.label,
              excludeSemantics: true,
              onTap: enabled ? () => _select(i) : null,
              child: Focus(
                focusNode: _nodes[i],
                canRequestFocus: enabled,
                skipTraversal: i != stop,
                onKeyEvent: (_, e) => _onKey(i, e),
                onFocusChange: (f) => setState(() => _focused = f ? i : (_focused == i ? null : _focused)),
                child: MouseRegion(
                  cursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
                  onEnter: (_) => setState(() => _hover = i),
                  onExit: (_) => setState(() => _hover = null),
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: enabled ? () => _select(i) : null,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: widget.small ? CmSpace.s8 : CmSpace.s12),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: bg,
                        border: Border.all(color: border),
                        borderRadius: BorderRadius.circular(CmRadius.xs),
                        boxShadow: _focused == i ? [BoxShadow(color: c.bgSurface, spreadRadius: 1), BoxShadow(color: c.borderStrong, spreadRadius: 3)] : null,
                      ),
                      child: Text(o.label, maxLines: 1, softWrap: false, overflow: TextOverflow.ellipsis, style: textStyle.copyWith(color: fg)),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
    ];
    final track = Container(
      height: h,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: disabled ? c.bgInputFilled : c.bgHover,
        border: Border.all(color: c.borderSubtle),
        borderRadius: BorderRadius.circular(CmRadius.sm),
      ),
      child: LayoutBuilder(builder: (context, box) => Row(mainAxisSize: MainAxisSize.min, spacing: 2, children: segments(box.maxWidth.isFinite))),
    );
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label ?? widget.semanticLabel,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        if (widget.label != null)
          Padding(
            padding: const EdgeInsets.only(bottom: CmSpace.s8),
            child: ExcludeSemantics(child: Text(widget.label!, style: CmType.bodyMd.copyWith(fontWeight: FontWeight.w500, color: c.textDefault))),
          ),
        track,
      ]),
    );
  }
}
