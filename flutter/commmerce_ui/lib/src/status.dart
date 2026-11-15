import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'theme.dart';

// ---------------------------------------------------------------------------------------------------------------------
// Tooltip

/// Which side of its child a [CmTooltip] prefers. It flips when there is no room.
enum CmTooltipPlacement { top, bottom }

/// Short text that names or explains a control, shown on hover, long press and keyboard focus.
/// Mirrors `<cm-tooltip>`.
///
/// Wrap one control. The text is also given to screen readers as the control's tooltip (read after its
/// name), so they hear it too. Esc closes it. Text only: never put links or buttons in a tooltip.
/// An icon-only button still needs its own accessible name: the tooltip describes, it does not name.
class CmTooltip extends StatefulWidget {
  const CmTooltip({super.key, required this.message, required this.child, this.placement = CmTooltipPlacement.top, this.delay = const Duration(milliseconds: 300)});

  /// The tooltip text. Plain text, ideally under 80 characters.
  final String message;

  /// The control the tooltip belongs to.
  final Widget child;
  final CmTooltipPlacement placement;

  /// Wait before showing on hover. Keyboard focus shows it at once.
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
        exitDuration: const Duration(milliseconds: 100),
        triggerMode: TooltipTriggerMode.longPress,
        enableFeedback: true,
        constraints: const BoxConstraints(maxWidth: 280),
        padding: const EdgeInsets.symmetric(horizontal: CmSpace.s10, vertical: 6),
        decoration: BoxDecoration(color: c.bgPanelHeader, borderRadius: BorderRadius.circular(CmRadius.sm), boxShadow: CmShadow.s100),
        textStyle: CmType.bodySm.copyWith(height: 16 / 12, color: c.textOnDark),
        child: widget.child,
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Toast

/// Toast tones: [neutral] (dark) for confirmations, [critical] for failures.
enum CmToastTone { neutral, critical }

/// Why a toast closed.
enum CmToastDismissReason { timeout, close, action }

/// A short confirmation that appears at the bottom of the screen and goes away on its own ("Product saved").
/// Usually shown with [showCmToast]. Each toast is announced to screen readers once, on its own, when it
/// appears. Hovering or focusing it pauses the timer. Mirrors `<cm-toast>`.
class CmToast extends StatefulWidget {
  const CmToast({super.key, required this.message, this.tone = CmToastTone.neutral, this.duration, this.actionLabel, this.onAction, this.onDismiss, this.announce = true});

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
  final ValueChanged<CmToastDismissReason>? onDismiss;

  /// Announces [message] to screen readers when the toast first appears.
  final bool announce;

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

  @override
  void initState() {
    super.initState();
    _resume();
    if (widget.announce) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final dir = Directionality.maybeOf(context) ?? TextDirection.ltr;
        SemanticsService.announce(widget.message, dir);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _resume() {
    _timer?.cancel();
    if (_closed || _hover || _focus) return;
    _clock
      ..reset()
      ..start();
    _timer = Timer(_remaining, () => _dismiss(CmToastDismissReason.timeout));
  }

  void _pause() {
    if (_timer == null) return;
    _timer!.cancel();
    _timer = null;
    final left = _remaining - _clock.elapsed;
    _remaining = left < const Duration(seconds: 1) ? const Duration(seconds: 1) : left;
  }

  void _dismiss(CmToastDismissReason reason) {
    if (_closed) return;
    _closed = true;
    _timer?.cancel();
    widget.onDismiss?.call(reason);
  }

  void _action() {
    widget.onAction?.call();
    _dismiss(CmToastDismissReason.action);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final critical = widget.tone == CmToastTone.critical;
    final fg = critical ? c.textDefault : c.textOnDark;
    final style = CmType.bodyMd.copyWith(height: 20 / 14, color: fg);
    final maxW = math.min(480.0, MediaQuery.sizeOf(context).width - 32);
    return MouseRegion(
      onEnter: (_) { _hover = true; _pause(); },
      onExit: (_) { _hover = false; _resume(); },
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (f) { _focus = f; f ? _pause() : _resume(); },
        child: Semantics(
          container: true,
          explicitChildNodes: true,
          child: Container(
            constraints: BoxConstraints(minHeight: 48, maxWidth: maxW < 0 ? 0 : maxW),
            padding: const EdgeInsets.fromLTRB(CmSpace.s20, CmSpace.s10, CmSpace.s10, CmSpace.s10),
            decoration: BoxDecoration(
              color: critical ? c.bgErrorBar : c.bgDashboard,
              border: Border.all(color: critical ? c.borderCritical : c.navDivider),
              borderRadius: BorderRadius.circular(CmRadius.md),
              boxShadow: CmShadow.s100,
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (critical) ...[CmIcon(CmIcons.alert, size: 20, color: c.iconCritical), const SizedBox(width: CmSpace.s15)],
              Flexible(child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(widget.message, style: style))),
              const SizedBox(width: CmSpace.s15),
              if (widget.actionLabel != null)
                _ToastButton(
                  label: widget.actionLabel!,
                  onTap: _action,
                  critical: critical,
                  child: Text(widget.actionLabel!, style: style.copyWith(fontWeight: FontWeight.w600, decoration: TextDecoration.underline, decorationColor: fg)),
                ),
              _ToastButton(label: 'Dismiss', onTap: () => _dismiss(CmToastDismissReason.close), critical: critical, square: true, child: CmIcon(CmIcons.close, size: 16, color: fg)),
            ]),
          ),
        ),
      ),
    );
  }
}

class _ToastButton extends StatefulWidget {
  const _ToastButton({required this.label, required this.onTap, required this.critical, required this.child, this.square = false});
  final String label;
  final VoidCallback onTap;
  final bool critical, square;
  final Widget child;

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
    return Semantics(
      button: true,
      label: widget.label,
      excludeSemantics: true,
      onTap: widget.onTap,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            constraints: BoxConstraints(minHeight: 32, minWidth: widget.square ? 32 : 0),
            padding: EdgeInsets.symmetric(horizontal: widget.square ? 0 : CmSpace.s10),
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
    );
  }
}

/// A toast shown with [showCmToast]. Close it early with [dismiss].
class CmToastController {
  CmToastController._(this._region);
  final _CmToastRegion _region;
  final _key = UniqueKey();

  /// Closes the toast, as if its close button were pressed.
  void dismiss() => _region.remove(this, CmToastDismissReason.close);

  /// Completes with the reason when the toast closes.
  Future<CmToastDismissReason> get closed => _closed.future;
  final _closed = Completer<CmToastDismissReason>();
}

class _ToastEntry {
  _ToastEntry(this.controller, this.toast);
  final CmToastController controller;
  final CmToast toast;
}

/// The bottom-centre toast area of one [Overlay]. Created on first use, removed when empty.
class _CmToastRegion extends ChangeNotifier {
  _CmToastRegion(this.overlay);
  final OverlayState overlay;
  final entries = <_ToastEntry>[];
  OverlayEntry? _entry;
  int max = 3;

  static final _regions = Expando<_CmToastRegion>('CmToastRegion');
  static _CmToastRegion of(OverlayState o) => _regions[o] ??= _CmToastRegion(o);

  void add(_ToastEntry e) {
    entries.add(e);
    while (entries.length > max) {
      final old = entries.removeAt(0);
      if (!old.controller._closed.isCompleted) old.controller._closed.complete(CmToastDismissReason.close);
    }
    _entry ??= OverlayEntry(builder: (context) => _ToastRegionView(region: this));
    if (!_entry!.mounted) overlay.insert(_entry!);
    notifyListeners();
  }

  void remove(CmToastController c, CmToastDismissReason reason) {
    final before = entries.length;
    entries.removeWhere((e) => e.controller == c);
    if (!c._closed.isCompleted) c._closed.complete(reason);
    if (entries.length == before) return;
    if (entries.isEmpty && _entry != null && _entry!.mounted) {
      _entry!.remove();
      _entry = null;
    }
    notifyListeners();
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
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15),
          child: ListenableBuilder(
            listenable: region,
            builder: (context, _) => Semantics(
              container: true,
              label: 'Notifications',
              explicitChildNodes: true,
              child: Column(mainAxisSize: MainAxisSize.min, spacing: CmSpace.s10, children: [
                for (final e in region.entries)
                  KeyedSubtree(key: e.controller._key, child: e.toast),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Shows a toast at the bottom centre of the screen, above everything, and announces it to screen
/// readers. At most [max] toasts show at once; a new one removes the oldest. Mirrors `showToast()`.
///
/// ```dart
/// showCmToast(context, 'Product saved');
/// showCmToast(context, 'Order archived', actionLabel: 'Undo', onAction: undo);
/// ```
CmToastController showCmToast(
  BuildContext context,
  String message, {
  CmToastTone tone = CmToastTone.neutral,
  Duration? duration,
  String? actionLabel,
  VoidCallback? onAction,
  int max = 3,
}) {
  final region = _CmToastRegion.of(Overlay.of(context, rootOverlay: true))..max = math.max(1, max);
  final controller = CmToastController._(region);
  region.add(_ToastEntry(
    controller,
    CmToast(
      message: message,
      tone: tone,
      duration: duration,
      actionLabel: actionLabel,
      onAction: onAction,
      onDismiss: (reason) => region.remove(controller, reason),
    ),
  ));
  return controller;
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
      label: widget.label.isEmpty ? 'Loading' : widget.label,
      child: SizedBox.square(
        dimension: d,
        child: RotationTransition(
          turns: _a,
          child: CustomPaint(painter: _SpinnerPainter(track: c.borderDefault, arc: c.borderStrong, stroke: (small ? 2.5 : 3) * d / 24)),
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
    final valueText = v == null ? 'In progress' : '${v.round()}%';
    final radius = BorderRadius.circular(CmRadius.full);
    final fill = DecoratedBox(decoration: BoxDecoration(color: c.actionPrimary, borderRadius: radius));
    final track = Container(
      height: h,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: c.bgInset, borderRadius: radius, border: Border.all(color: c.borderDefault, width: 1, strokeAlign: BorderSide.strokeAlignInside)),
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
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Expanded(child: Text(widget.label, style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault))),
        if (widget.showValue && v != null) ...[
          const SizedBox(width: CmSpace.s10),
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
