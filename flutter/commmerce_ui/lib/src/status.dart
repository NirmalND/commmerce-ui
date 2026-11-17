import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

// ---------------------------------------------------------------------------------------------------------------------
// Tooltip

/// Which side of its child a [CmTooltip] prefers. It flips when there is no room.
enum CmTooltipPlacement { top, bottom }

/// Short text that names or explains a control, shown on hover (after 400ms), long press and keyboard focus; it
/// hides as soon as the pointer leaves. 12px text on a dark surface, 8 x 12 padding, 6px corners, at most 240 wide
/// (owner standard, 1.6). Mirrors `<cm-tooltip>`.
///
/// Wrap one control. The text is also given to screen readers as the control's tooltip (read after its
/// name), so they hear it too. Esc closes it. Text only: never put links or buttons in a tooltip.
/// An icon-only button still needs its own accessible name: the tooltip describes, it does not name.
class CmTooltip extends StatefulWidget {
  const CmTooltip({super.key, required this.message, required this.child, this.placement = CmTooltipPlacement.top, this.delay = const Duration(milliseconds: 400)});

  /// The tooltip text. Plain text, ideally under 80 characters.
  final String message;

  /// The control the tooltip belongs to.
  final Widget child;
  final CmTooltipPlacement placement;

  /// Wait before showing on hover. Keyboard focus shows it at once. Default 400ms (owner standard 1.6; was 300).
  final Duration delay;

  @override
  State<CmTooltip> createState() => _CmTooltipState();
}

class _CmTooltipState extends State<CmTooltip> {
  final _tip = GlobalKey<TooltipState>();

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    if (widget.message.isEmpty) return widget.child;
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (focused) {
        if (focused) {
          _tip.currentState?.ensureTooltipVisible();
        } else {
          Tooltip.dismissAllToolTips();
        }
      },
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent && event.logicalKey == LogicalKeyboardKey.escape && Tooltip.dismissAllToolTips()) return KeyEventResult.handled;
        return KeyEventResult.ignored;
      },
      child: Tooltip(
        key: _tip,
        message: widget.message,
        preferBelow: widget.placement == CmTooltipPlacement.bottom,
        verticalOffset: 0,
        margin: const EdgeInsets.all(8),
        waitDuration: widget.delay,
        showDuration: const Duration(milliseconds: 1500),
        exitDuration: Duration.zero,
        triggerMode: TooltipTriggerMode.longPress,
        enableFeedback: true,
        constraints: const BoxConstraints(maxWidth: 240),
        padding: const EdgeInsets.symmetric(horizontal: CmSpace.s12, vertical: CmSpace.s8),
        decoration: BoxDecoration(color: c.bgPanelHeader, borderRadius: BorderRadius.circular(CmRadius.sm), boxShadow: CmShadow.sm),
        textStyle: CmType.bodyXs.copyWith(color: c.textOnDark),
        child: widget.child,
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Toast

/// Toast tones: [neutral] (dark) for confirmations, [critical] for failures.
enum CmToastTone { neutral, critical }

/// How a toast closed, as [CmToastController.closed] completes. Mirrors the web's `ToastCloseReason`.
enum CmToastCloseReason {
  /// Its time ran out.
  timeout,

  /// Its close button, Esc or [CmToastController.dismiss].
  close,

  /// Its action was pressed.
  action,

  /// Taken off the screen while showing: pushed out by newer toasts, or its overlay went away. Since 1.7.
  removed,
}

/// The old name of [CmToastCloseReason], kept so existing code compiles.
typedef CmToastDismissReason = CmToastCloseReason;

/// The one action of a toast: its label ("Undo", "View") and what it does. Mirrors the web's `action: { label, onAction }`.
@immutable
class CmToastAction {
  const CmToastAction({required this.label, required this.onAction});
  final String label;
  final VoidCallback onAction;
}

/// A short confirmation that appears at the bottom of the screen and goes away on its own ("Product saved").
/// Usually shown with [showCmToast]. Each toast is announced to screen readers once, on its own, when it
/// appears. Hovering or focusing it pauses the timer; Esc closes it while it has focus. Mirrors `<cm-toast>`.
class CmToast extends StatefulWidget {
  const CmToast({
    super.key,
    required this.message,
    this.tone = CmToastTone.neutral,
    this.duration,
    this.actionLabel,
    this.onAction,
    this.onDismiss,
    this.announce = true,
    this.shortcutHint,
  });

  /// One short sentence, up to about 50 characters.
  final String message;

  /// [CmToastTone.critical] for failures. Never the only place an error is shown.
  final CmToastTone tone;

  /// How long it stays: 2–10 seconds. Default 5 seconds, or 10 with an action.
  final Duration? duration;

  /// One optional action ("Undo", "View").
  final String? actionLabel;
  final VoidCallback? onAction;

  /// Called when the toast closes, with the reason. Remove it from your tree here.
  final ValueChanged<CmToastCloseReason>? onDismiss;

  /// Announces [message] to screen readers when the toast first appears.
  final bool announce;

  /// Read after the message when the toast has an action: how to reach it from the keyboard. [showCmToast] passes
  /// [CmStrings.toastShortcut] ("Press F6 to reach it."). Since 1.7.
  final String? shortcutHint;

  /// [duration] clamped to 2–10 seconds.
  Duration get effectiveDuration {
    final ms = (duration?.inMilliseconds ?? (actionLabel != null ? 10000 : 5000)).clamp(2000, 10000);
    return Duration(milliseconds: ms);
  }

  @override
  State<CmToast> createState() => _CmToastState();
}

class _CmToastState extends State<CmToast> {
  Timer? _timer;
  late Duration _remaining = widget.effectiveDuration;
  final _clock = Stopwatch();
  bool _hover = false, _focus = false, _closed = false;
  final _actionFocus = FocusNode(debugLabel: 'CmToast action');
  final _closeFocus = FocusNode(debugLabel: 'CmToast close');

  bool get _hasFocus => _actionFocus.hasFocus || _closeFocus.hasFocus;

  @override
  void initState() {
    super.initState();
    _resume();
    if (widget.announce) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final dir = Directionality.maybeOf(context) ?? TextDirection.ltr;
        final hint = widget.shortcutHint;
        final text = widget.actionLabel != null && hint != null && hint.isNotEmpty ? '${widget.message}. $hint' : widget.message;
        SemanticsService.announce(text, dir);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _actionFocus.dispose();
    _closeFocus.dispose();
    super.dispose();
  }

  /// Moves focus to the action, or to the close button. Returns false when it can't.
  bool _focusToast() {
    final node = widget.actionLabel != null ? _actionFocus : _closeFocus;
    if (node.context == null) return false;
    node.requestFocus();
    return true;
  }

  void _resume() {
    _timer?.cancel();
    if (_closed || _hover || _focus) return;
    _clock
      ..reset()
      ..start();
    _timer = Timer(_remaining, () => _dismiss(CmToastCloseReason.timeout));
  }

  void _pause() {
    if (_timer == null) return;
    _timer!.cancel();
    _timer = null;
    final left = _remaining - _clock.elapsed;
    _remaining = left < const Duration(seconds: 1) ? const Duration(seconds: 1) : left;
  }

  void _dismiss(CmToastCloseReason reason) {
    if (_closed) return;
    _closed = true;
    _timer?.cancel();
    widget.onDismiss?.call(reason);
  }

  void _action() {
    widget.onAction?.call();
    _dismiss(CmToastCloseReason.action);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final critical = widget.tone == CmToastTone.critical;
    final fg = critical ? c.textDefault : c.textOnDark;
    final style = CmType.bodyMd.copyWith(height: 20 / 14, color: fg);
    final maxW = math.min(480.0, MediaQuery.sizeOf(context).width - 32);
    return MouseRegion(
      onEnter: (_) {
        _hover = true;
        _pause();
      },
      onExit: (_) {
        _hover = false;
        _resume();
      },
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (f) {
          _focus = f;
          f ? _pause() : _resume();
        },
        onKeyEvent: (node, event) {
          if (event is KeyDownEvent && event.logicalKey == LogicalKeyboardKey.escape) {
            _dismiss(CmToastCloseReason.close);
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: Semantics(
          container: true,
          explicitChildNodes: true,
          child: Container(
            constraints: BoxConstraints(minHeight: 48, maxWidth: maxW < 0 ? 0 : maxW),
            padding: const EdgeInsets.fromLTRB(CmSpace.s20, CmSpace.s8, CmSpace.s8, CmSpace.s8),
            decoration: BoxDecoration(
              color: critical ? c.bgErrorBar : c.bgDashboard,
              border: Border.all(color: critical ? c.borderCritical : c.navDivider),
              borderRadius: BorderRadius.circular(CmRadius.md),
              boxShadow: CmShadow.lg,
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (critical) ...[CmIcon(CmIcons.alert, size: 20, color: c.iconCritical), const SizedBox(width: CmSpace.s16)],
              Flexible(child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(widget.message, style: style))),
              const SizedBox(width: CmSpace.s16),
              if (widget.actionLabel != null)
                _ToastButton(
                  label: widget.actionLabel!,
                  hint: widget.shortcutHint,
                  onTap: _action,
                  critical: critical,
                  focusNode: _actionFocus,
                  child: Text(widget.actionLabel!, style: style.copyWith(fontWeight: FontWeight.w600, decoration: TextDecoration.underline, decorationColor: fg)),
                ),
              _ToastButton(
                label: CmStrings.of(context).dismiss,
                onTap: () => _dismiss(CmToastCloseReason.close),
                critical: critical,
                square: true,
                focusNode: _closeFocus,
                child: CmIcon(CmIcons.close, size: 16, color: fg),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

class _ToastButton extends StatefulWidget {
  const _ToastButton({required this.label, required this.onTap, required this.critical, required this.child, required this.focusNode, this.square = false, this.hint});
  final String label;
  final String? hint;
  final VoidCallback onTap;
  final bool critical, square;
  final Widget child;
  final FocusNode focusNode;

  @override
  State<_ToastButton> createState() => _ToastButtonState();
}

class _ToastButtonState extends State<_ToastButton> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final ring = widget.critical ? c.borderStrong : c.textOnDark;
    final hoverBg = widget.critical ? c.bgHover : c.textOnDark.withValues(alpha: 0.14);
    // Slim (32) inside the toast; on touch screens drawn 40 with a 44px hit area (owner standard 1.6).
    final h = cmButtonHeight(context, CmControlHeight.sm);
    final slop = cmTouchSlop(context);
    return Semantics(
      button: true,
      label: widget.label,
      hint: widget.hint == null || widget.hint!.isEmpty ? null : widget.hint,
      excludeSemantics: true,
      onTap: widget.onTap,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap(); return null; })},
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onTap,
          child: Padding(
            padding: EdgeInsets.all(slop),
            child: Container(
              constraints: BoxConstraints(minHeight: h, minWidth: widget.square ? h : 0),
              padding: EdgeInsets.symmetric(horizontal: widget.square ? 0 : CmSpace.s8),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _hover ? hoverBg : null,
                borderRadius: BorderRadius.circular(CmRadius.sm),
                border: _focus ? Border.all(color: ring, width: 2) : null,
              ),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

/// A toast shown with [showCmToast]: the handle to close it early ([dismiss]) or to wait for how it closed ([closed]).
class CmToastController {
  CmToastController._(this._region);
  final _CmToastRegion _region;
  final _key = GlobalKey<_CmToastState>();

  /// Closes the toast, as if its close button were pressed.
  void dismiss() => _region.remove(this, CmToastCloseReason.close);

  /// Completes when the toast closes, with the reason: [CmToastCloseReason.action] (its action was pressed),
  /// [CmToastCloseReason.close], [CmToastCloseReason.timeout] or [CmToastCloseReason.removed] (pushed out by newer
  /// toasts). Wait on it to act only once the toast is gone, e.g. really delete a record on timeout.
  Future<CmToastCloseReason> get closed => _closed.future;
  final _closed = Completer<CmToastCloseReason>();

  /// Whether the toast is still showing.
  bool get isOpen => !_closed.isCompleted;
}

class _ToastEntry {
  _ToastEntry(this.controller, this.toast);
  final CmToastController controller;
  final CmToast toast;
}

/// The bottom-centre toast area of one [Overlay]. Created on first use, removed when empty.
///
/// Keyboard, as on the web: F6 (or Shift+F6) moves focus to the newest toast with an action (else the newest toast)
/// and, pressed again, back to where it was. Esc closes the focused toast. When a focused toast closes, focus goes back.
class _CmToastRegion extends ChangeNotifier {
  _CmToastRegion(this.overlay);
  final OverlayState overlay;
  final entries = <_ToastEntry>[];
  OverlayEntry? _entry;
  int max = 3;
  FocusNode? _returnTo;
  bool _listening = false;

  static final _regions = Expando<_CmToastRegion>('CmToastRegion');
  static _CmToastRegion of(OverlayState o) => _regions[o] ??= _CmToastRegion(o);

  bool get _hasFocus => entries.any((e) => e.controller._key.currentState?._hasFocus ?? false);

  void add(_ToastEntry e) {
    entries.add(e);
    var hadFocus = false;
    while (entries.length > max) {
      final old = entries.removeAt(0);
      hadFocus = hadFocus || (old.controller._key.currentState?._hasFocus ?? false);
      if (!old.controller._closed.isCompleted) old.controller._closed.complete(CmToastCloseReason.removed);
    }
    _entry ??= OverlayEntry(builder: (context) => _ToastRegionView(region: this));
    if (!_entry!.mounted) overlay.insert(_entry!);
    if (!_listening) {
      HardwareKeyboard.instance.addHandler(_onKey);
      _listening = true;
    }
    notifyListeners();
    if (hadFocus) _giveFocusBack();
  }

  void remove(CmToastController c, CmToastCloseReason reason) {
    final before = entries.length;
    final hadFocus = c._key.currentState?._hasFocus ?? false;
    entries.removeWhere((e) => e.controller == c);
    if (!c._closed.isCompleted) c._closed.complete(reason);
    if (entries.length == before) return;
    if (entries.isEmpty) {
      if (_entry != null && _entry!.mounted) _entry!.remove();
      _entry = null;
      if (_listening) HardwareKeyboard.instance.removeHandler(_onKey);
      _listening = false;
    }
    notifyListeners();
    if (hadFocus) _giveFocusBack();
  }

  bool _onKey(KeyEvent e) {
    if (e is! KeyDownEvent || e.logicalKey != LogicalKeyboardKey.f6) return false;
    final kb = HardwareKeyboard.instance;
    if (kb.isControlPressed || kb.isAltPressed || kb.isMetaPressed) return false;
    return _hasFocus ? _giveFocusBack() : focusToast();
  }

  /// Focus where it was before it moved into a toast.
  bool _giveFocusBack() {
    final to = _returnTo;
    _returnTo = null;
    if (to == null || to.context == null || !to.canRequestFocus) {
      // Nowhere to go back to: leave the toast without keeping focus on a node that is going away.
      FocusManager.instance.primaryFocus?.unfocus();
      return to != null;
    }
    // After the frame, so a toast that is closing has gone from the tree.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (to.context != null) to.requestFocus();
    });
    to.requestFocus();
    return true;
  }

  /// Moves focus to the newest open toast with an action (else the newest toast).
  bool focusToast() {
    final open = entries.reversed.toList();
    if (open.isEmpty) return false;
    final t = open.firstWhere((e) => e.toast.actionLabel != null, orElse: () => open.first);
    final state = t.controller._key.currentState;
    if (state == null) return false;
    final from = FocusManager.instance.primaryFocus;
    if (from != null && !_hasFocus) _returnTo = from;
    return state._focusToast();
  }
}

class _ToastRegionView extends StatelessWidget {
  const _ToastRegionView({required this.region});
  final _CmToastRegion region;

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewPaddingOf(context).bottom;
    return Positioned(
      left: 0,
      right: 0,
      bottom: CmSpace.s20 + bottom,
      child: SafeArea(
        top: false,
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s16),
          child: ListenableBuilder(
            listenable: region,
            builder: (context, _) => Semantics(
              container: true,
              label: CmStrings.of(context).notifications,
              explicitChildNodes: true,
              child: FocusTraversalGroup(
                child: Column(mainAxisSize: MainAxisSize.min, spacing: CmSpace.s8, children: [
                  for (final e in region.entries) e.toast,
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Moves keyboard focus to the newest toast's action (else its close button), as F6 does. Returns false when no
/// toast is showing. Call it to offer another shortcut. Since 1.7.
bool cmFocusToast(BuildContext context) {
  final overlay = Overlay.maybeOf(context, rootOverlay: true);
  if (overlay == null) return false;
  return _CmToastRegion._regions[overlay]?.focusToast() ?? false;
}

CmToastController _showToast(
  OverlayState overlay,
  CmStrings strings,
  String message, {
  CmToastTone tone = CmToastTone.neutral,
  Duration? duration,
  String? actionLabel,
  VoidCallback? onAction,
  int max = 3,
}) {
  final region = _CmToastRegion.of(overlay)..max = math.max(1, max);
  final controller = CmToastController._(region);
  region.add(_ToastEntry(
    controller,
    CmToast(
      key: controller._key,
      message: message,
      tone: tone,
      duration: duration,
      actionLabel: actionLabel,
      onAction: onAction,
      shortcutHint: strings.toastShortcut,
      onDismiss: (reason) => region.remove(controller, reason),
    ),
  ));
  return controller;
}

/// Shows a toast at the bottom centre of the screen, above everything, and announces it to screen
/// readers. At most [max] toasts show at once; a new one removes the oldest. Mirrors `showToast()`.
///
/// Give it one [action] (or [actionLabel] and [onAction]): it then stays 10 seconds, F6 moves focus to the action
/// (and back), and screen readers hear "Press F6 to reach it." ([CmStrings.toastShortcut]). The returned controller
/// is the handle: [CmToastController.dismiss] closes it, and `await toast.closed` gives how it closed.
///
/// ```dart
/// showCmToast(context, 'Product saved');
/// showCmToast(context, 'Order archived', action: CmToastAction(label: 'Undo', onAction: undo));
/// ```
CmToastController showCmToast(
  BuildContext context,
  String message, {
  CmToastTone tone = CmToastTone.neutral,
  Duration? duration,
  CmToastAction? action,
  String? actionLabel,
  VoidCallback? onAction,
  int max = 3,
}) {
  assert(action == null || (actionLabel == null && onAction == null), 'Pass either action or actionLabel/onAction.');
  return _showToast(
    Overlay.of(context, rootOverlay: true),
    CmStrings.of(context),
    message,
    tone: tone,
    duration: duration,
    actionLabel: action?.label ?? actionLabel,
    onAction: action?.onAction ?? onAction,
    max: max,
  );
}

/// Undo instead of confirm: runs [doIt] at once, then shows [message] (what just happened, in the past tense: "Lead
/// archived") in a toast with Undo, and runs [undoIt] if Undo is pressed. Completes with how the toast closed once
/// that is known ([CmToastCloseReason.action] only after [undoIt] has finished), so a caller can, say, really delete
/// a record only on [CmToastCloseReason.timeout]. If [doIt] throws, no toast is shown and the future fails.
/// Mirrors `undoable()`. Since 1.7.
///
/// ```dart
/// await cmUndoable(context, () => api.archive(lead), () => api.unarchive(lead), message: 'Lead archived');
/// ```
Future<CmToastCloseReason> cmUndoable(
  BuildContext context,
  FutureOr<void> Function() doIt,
  FutureOr<void> Function() undoIt, {
  required String message,
  String? undoLabel,
  CmToastTone tone = CmToastTone.neutral,
  Duration? duration,
  int max = 3,
}) async {
  // Read what the toast needs now: the widget that called this may be gone once doIt has finished.
  final overlay = Overlay.of(context, rootOverlay: true);
  final strings = CmStrings.of(context);
  await doIt();
  final toast = _showToast(overlay, strings, message, tone: tone, duration: duration, actionLabel: undoLabel ?? strings.toastUndo, onAction: () {}, max: max);
  final reason = await toast.closed;
  if (reason == CmToastCloseReason.action) await undoIt();
  return reason;
}

// ---------------------------------------------------------------------------------------------------------------------
// Spinner

/// Spinner sizes: small 20 (inside buttons, rows and fields), large 44 (a section or page).
enum CmSpinnerSize { small, large }

/// Shows that something is loading when the wait is short or its length unknown. Announced to screen
/// readers through a live region with [label]. Mirrors `<cm-spinner>`.
class CmSpinner extends StatefulWidget {
  const CmSpinner({super.key, this.size = CmSpinnerSize.large, this.label = 'Loading'});
  final CmSpinnerSize size;

  /// What screen readers announce. Name what is loading when it helps: "Loading orders".
  final String label;

  @override
  State<CmSpinner> createState() => _CmSpinnerState();
}

class _CmSpinnerState extends State<CmSpinner> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Less motion: the web spinner turns three times slower.
    _a.duration = Duration(milliseconds: MediaQuery.of(context).disableAnimations ? 2400 : 800);
    _a.repeat();
  }

  @override
  void dispose() {
    _a.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final small = widget.size == CmSpinnerSize.small;
    final d = small ? 20.0 : 44.0;
    return Semantics(
      liveRegion: true,
      label: widget.label.isEmpty ? CmStrings.of(context).loading : widget.label,
      child: SizedBox.square(
        dimension: d,
        child: RotationTransition(
          turns: _a,
          child: CustomPaint(painter: _SpinnerPainter(track: c.borderSubtle, arc: c.borderStrong, stroke: (small ? 2.5 : 3) * d / 24)),
        ),
      ),
    );
  }
}

class _SpinnerPainter extends CustomPainter {
  _SpinnerPainter({required this.track, required this.arc, required this.stroke});
  final Color track, arc;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width * 10 / 24;
    final center = size.center(Offset.zero);
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawCircle(center, r, p..color = track);
    canvas.drawArc(Rect.fromCircle(center: center, radius: r), -math.pi / 2, math.pi / 2, false, p
      ..color = arc
      ..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(_SpinnerPainter old) => old.track != track || old.arc != arc || old.stroke != stroke;
}

// ---------------------------------------------------------------------------------------------------------------------
// Progress bar

/// Progress bar heights: small 4 (inside rows and cards), medium 8 (a page-level task).
enum CmProgressBarSize { small, medium }

/// Shows how far a longer task has got (an import, an upload, a bulk update), or that it is running when
/// the amount is unknown. Screen readers hear its label and value ("Importing products, 40%").
/// Mirrors `<cm-progress-bar>`.
class CmProgressBar extends StatefulWidget {
  const CmProgressBar({super.key, required this.label, this.value, this.labelHidden = false, this.showValue = false, this.size = CmProgressBarSize.medium});

  /// What is in progress, shown above the bar and used as its accessible name.
  final String label;

  /// Percent done, 0–100. Null for an indeterminate bar when the amount is unknown.
  final double? value;

  /// Keeps the label for screen readers only, when the surrounding text already says what is running.
  final bool labelHidden;

  /// Shows the percentage next to the label. Determinate bars only.
  final bool showValue;
  final CmProgressBarSize size;

  /// [value] clamped to 0–100, or null when indeterminate.
  double? get clampedValue => value == null || value!.isNaN ? null : value!.clamp(0, 100).toDouble();

  @override
  State<CmProgressBar> createState() => _CmProgressBarState();
}

class _CmProgressBarState extends State<CmProgressBar> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this);

  void _sync() {
    final still = MediaQuery.of(context).disableAnimations;
    _a.duration = Duration(milliseconds: still ? 4000 : 1400);
    if (widget.clampedValue == null) {
      if (!_a.isAnimating) _a.repeat();
    } else {
      _a.stop();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(CmProgressBar old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void dispose() {
    _a.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final still = MediaQuery.of(context).disableAnimations;
    final v = widget.clampedValue;
    final h = widget.size == CmProgressBarSize.small ? 4.0 : 8.0;
    final valueText = v == null ? CmStrings.of(context).inProgress : '${v.round()}%';
    final radius = BorderRadius.circular(CmRadius.full);
    final fill = DecoratedBox(decoration: BoxDecoration(color: c.actionPrimary, borderRadius: radius));
    final track = Container(
      height: h,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: c.bgInset, borderRadius: radius, border: Border.all(color: c.borderSubtle, width: 1, strokeAlign: BorderSide.strokeAlignInside)),
      child: v == null
          ? LayoutBuilder(builder: (context, box) => AnimatedBuilder(
                animation: _a,
                builder: (context, _) {
                  final w = box.maxWidth * 0.35;
                  // Slides from just off the start edge to past the end, like the web bar.
                  final x = -w + _a.value * (box.maxWidth + w);
                  return Stack(children: [PositionedDirectional(start: x, top: 0, bottom: 0, width: w, child: fill)]);
                },
              ))
          : Align(
              alignment: AlignmentDirectional.centerStart,
              child: AnimatedFractionallySizedBox(
                duration: still ? Duration.zero : const Duration(milliseconds: 200),
                widthFactor: v / 100,
                heightFactor: 1,
                child: fill,
              ),
            ),
    );
    final head = Padding(
      padding: const EdgeInsets.only(bottom: CmSpace.s8),
      child: Row(children: [
        Expanded(child: Text(widget.label, style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault))),
        if (widget.showValue && v != null) ...[
          const SizedBox(width: CmSpace.s8),
          Text('${v.round()}%', style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textTertiary, fontFeatures: const [FontFeature.tabularFigures()])),
        ],
      ]),
    );
    return Semantics(
      container: true,
      label: widget.label,
      value: valueText,
      excludeSemantics: true,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        if (!widget.labelHidden) head,
        track,
      ]),
    );
  }
}
