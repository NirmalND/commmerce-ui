import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'button.dart';
import 'display.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Page shapes for [CmSkeletonDisplay].
enum CmSkeletonLayout {
  /// Main cards plus a side column, as on detail pages.
  twoColumn,

  /// One column, for lists and settings.
  oneColumn,
}

/// A whole-page loading placeholder: a page-header bar and grey cards laid out like a detail page.
/// Show it while the first data for a page loads. Announces [label] once to screen readers.
/// Mirrors `<cm-skeleton-display>`. On phones the columns stack and the navigation placeholder hides.
class CmSkeletonDisplay extends StatelessWidget {
  const CmSkeletonDisplay({super.key, this.layout = CmSkeletonLayout.twoColumn, this.navigation = false, this.label = 'Loading'});

  final CmSkeletonLayout layout;

  /// Adds a 250px side-navigation placeholder. Admin chrome: for Commmerce products only, not for apps.
  final bool navigation;

  /// What screen readers announce, e.g. "Loading order".
  final String label;

  // Card heights from the Figma "Skeleton Display" board.
  static const _main = [472.0, 90.0, 90.0, 251.0];
  static const _side = [94.0, 266.0, 134.0, 191.0, 138.0];

  @override
  Widget build(BuildContext context) {
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    Widget col(List<double> hs) => Column(children: [
          for (var i = 0; i < hs.length; i++) ...[if (i > 0) const SizedBox(height: CmSpace.s8), CmSkeleton(height: hs[i], radius: CmRadius.md)],
        ]);
    final main = col(layout == CmSkeletonLayout.oneColumn ? const [472, 251] : _main);
    final body = layout == CmSkeletonLayout.oneColumn
        ? main
        : phone
            ? Column(children: [main, const SizedBox(height: CmSpace.s8), col(_side)])
            : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(flex: 7, child: main),
                const SizedBox(width: CmSpace.s8),
                Expanded(flex: 3, child: col(_side)),
              ]);
    final page = Column(mainAxisSize: MainAxisSize.min, children: [CmSkeleton(height: phone ? 60 : 80, radius: CmRadius.md), const SizedBox(height: CmSpace.s8), body]);
    return Semantics(
      container: true,
      liveRegion: true,
      label: label,
      child: navigation && !phone
          ? IntrinsicHeight(
              child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const CmSkeleton(width: 250, height: double.infinity, radius: 14),
                const SizedBox(width: CmSpace.s8),
                Expanded(child: page),
              ]),
            )
          : page,
    );
  }
}

/// One entry in an order or customer timeline: when it was written, what it says and who wrote it.
/// Stack several 10px apart, or pass them to [CmCommentBox.comments]. Mirrors `<cm-comment>`.
class CmComment extends StatelessWidget {
  const CmComment({super.key, required this.text, this.author, this.time, this.dateTime});

  /// The comment text.
  final String text;

  /// Who wrote it: a staff name, "System" or an app name.
  final String? author;

  /// The date as shown. Leave null to format [dateTime] ("9 Feb 2023, 5:07 pm").
  final String? time;

  /// When it was written.
  final DateTime? dateTime;

  /// Formats a date the way comments show it: "9 Feb 2023, 5:07 pm". Month names and am/pm come from [strings].
  static String format(DateTime d, {CmStrings strings = const CmStrings()}) {
    final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final m = d.minute.toString().padLeft(2, '0');
    return '${d.day} ${strings.monthsShort[d.month - 1]} ${d.year}, $h:$m ${d.hour < 12 ? strings.am : strings.pm}';
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final shown = time ?? (dateTime == null ? null : format(dateTime!, strings: CmStrings.of(context)));
    final meta = CmType.bodySm.copyWith(color: c.textTertiary);
    return Semantics(
      container: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(CmSpace.s8),
        decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.sm)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (shown != null) ...[Text(shown, style: meta), const SizedBox(height: CmSpace.s4)],
          Text(text, style: CmType.bodyMd.copyWith(height: 16 / 14, color: c.textDefault)),
          if (author != null && author!.isNotEmpty) ...[const SizedBox(height: CmSpace.s4), Text('– $author', style: meta, semanticsLabel: CmStrings.of(context).commentBy(author!))],
        ]),
      ),
    );
  }
}

/// Writes a new comment: a heading, a text box and a Post button. Ctrl/⌘ + Enter also posts.
/// Earlier [comments] are listed under the box. Mirrors `<cm-comment-box>`.
class CmCommentBox extends StatefulWidget {
  const CmCommentBox({
    super.key,
    required this.onSubmit,
    this.comments = const [],
    this.heading = 'Comments',
    this.label = 'Add a comment',
    this.placeholder,
    this.action = 'Post comment',
    this.controller,
    this.enabled = true,
  });

  /// Called with the trimmed text when Post is pressed with text. The box then clears; if saving
  /// fails, put the text back through your [controller].
  final ValueChanged<String>? onSubmit;

  /// Existing comments, usually [CmComment]s, newest first.
  final List<Widget> comments;
  final String heading;

  /// Accessible name of the text box.
  final String label;
  final String? placeholder;

  /// Text of the post button.
  final String action;
  final TextEditingController? controller;

  /// False blocks typing and posting (for example while the comment saves).
  final bool enabled;

  @override
  State<CmCommentBox> createState() => _CmCommentBoxState();
}

class _CmCommentBoxState extends State<CmCommentBox> {
  TextEditingController? _own;
  final _focus = FocusNode(debugLabel: 'CmCommentBox');
  TextEditingController get _ctrl => widget.controller ?? (_own ??= TextEditingController());

  @override
  void dispose() {
    _own?.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _submit() {
    if (!widget.enabled || widget.onSubmit == null) return;
    final text = _ctrl.text.trim();
    if (text.isEmpty) {
      _focus.requestFocus();
      return;
    }
    widget.onSubmit!(text);
    _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final gap = phone ? CmSpace.s8 : CmSpace.s20;
    final enabled = widget.enabled && widget.onSubmit != null;
    return Semantics(
      container: true,
      label: widget.heading,
      explicitChildNodes: true,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Semantics(header: true, child: Text(widget.heading, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: phone ? 16 : 20, fontWeight: FontWeight.w600, color: c.textDefault))),
        SizedBox(height: gap),
        CallbackShortcuts(
          bindings: {
            const SingleActivator(LogicalKeyboardKey.enter, control: true): _submit,
            const SingleActivator(LogicalKeyboardKey.enter, meta: true): _submit,
          },
          child: Semantics(
            label: widget.label,
            textField: true,
            child: TextField(
              controller: _ctrl,
              focusNode: _focus,
              enabled: widget.enabled,
              minLines: phone ? 4 : 5,
              maxLines: 12,
              keyboardType: TextInputType.multiline,
              style: CmType.bodyMd.copyWith(color: widget.enabled ? c.textDefault : c.textSecondary),
              decoration: InputDecoration(
                hintText: widget.placeholder,
                isDense: true,
                contentPadding: const EdgeInsets.all(CmSpace.s8),
                fillColor: widget.enabled ? c.bgSurface : c.bgInputFilled,
              ),
            ),
          ),
        ),
        SizedBox(height: gap),
        Align(
          alignment: phone ? Alignment.centerRight : Alignment.centerLeft,
          child: CmButton(label: widget.action, variant: CmButtonVariant.primary, size: CmButtonSize.large, onPressed: enabled ? _submit : null),
        ),
        if (widget.comments.isNotEmpty) ...[
          SizedBox(height: gap),
          for (var i = 0; i < widget.comments.length; i++) ...[if (i > 0) const SizedBox(height: CmSpace.s8), widget.comments[i]],
        ],
      ]),
    );
  }
}

/// A short, linked tip that points merchants to a guide or setting. The whole card is one link.
/// Group tips in [CmSmartTips]. Mirrors `<cm-smart-tip>`.
class CmSmartTip extends StatefulWidget {
  const CmSmartTip({super.key, required this.heading, this.description, required this.onTap, this.opensNewTab = false});

  /// Tip title as the outcome, at most two short lines: "Shipping and delivery".
  final String heading;

  /// One or two lines on what the merchant gets from the guide.
  final String? description;

  /// Opens the guide.
  final VoidCallback? onTap;

  /// Tells screen readers the guide opens in a new tab or the browser.
  final bool opensNewTab;

  @override
  State<CmSmartTip> createState() => _CmSmartTipState();
}

class _CmSmartTipState extends State<CmSmartTip> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final hot = _hover || _focus;
    final label = [widget.heading, if (widget.description != null) widget.description!, if (widget.opensNewTab) CmStrings.of(context).opensInNewTab].join('. ');
    return Semantics(
      link: true,
      label: label,
      excludeSemantics: true, onTap: widget.onTap,
      child: FocusableActionDetector(
        enabled: widget.onTap != null,
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { widget.onTap?.call(); return null; })},
        child: GestureDetector(
          onTap: widget.onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 104),
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s8, vertical: CmSpace.s20),
            decoration: BoxDecoration(
              color: c.bgSurface,
              border: Border.all(color: c.borderSubtle),
              borderRadius: BorderRadius.circular(CmRadius.md),
              boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
            ),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(widget.heading,
                      style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, height: 17 / 16, color: c.textDefault, decoration: _hover ? TextDecoration.underline : null)),
                  if (widget.description != null) ...[
                    const SizedBox(height: 4),
                    Text(widget.description!, style: CmType.bodyMd.copyWith(height: 16 / 14, color: c.textTertiary)),
                  ],
                ]),
              ),
              const SizedBox(width: CmSpace.s8),
              Transform.translate(
                offset: const Offset(0, -10),
                child: Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(color: hot ? c.actionPrimary : c.bgIcon, shape: BoxShape.circle),
                  child: Center(child: CmIcon(CmIcons.arrowUpRight, size: 16, color: hot ? c.actionPrimaryText : c.iconSelected)),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// The "Smart tips" card on the home page: an optional dark tour banner, then a list of [CmSmartTip]s.
/// Mirrors `<cm-smart-tips>`.
class CmSmartTips extends StatelessWidget {
  const CmSmartTips({super.key, required this.tips, this.heading = 'Smart tips', this.tourHeading, this.tourAction = 'Start', this.onTour});

  final List<Widget> tips;

  /// Title above the tips, shown in capitals.
  final String heading;

  /// Text of the dark tour banner ("Take a tour of Commmerce"). Null for no banner.
  final String? tourHeading;
  final String tourAction;
  final VoidCallback? onTour;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      if (tourHeading != null) ...[
        Container(
          constraints: const BoxConstraints(minHeight: 60),
          padding: const EdgeInsets.fromLTRB(CmSpace.s20, CmSpace.s12, CmSpace.s12, CmSpace.s12),
          decoration: BoxDecoration(color: c.bgPanelHeader, borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Row(children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(color: c.navActive, shape: BoxShape.circle), child: Center(child: CmIcon(CmIcons.rocket, size: 18, color: c.textOnDark))),
            const SizedBox(width: CmSpace.s8),
            Expanded(child: Text(tourHeading!, style: CmType.bodyMd.copyWith(fontWeight: FontWeight.w500, height: 1, color: c.textOnDark))),
            const SizedBox(width: CmSpace.s8),
            CmButton(label: tourAction, onPressed: onTour),
          ]),
        ),
        const SizedBox(height: CmSpace.s8),
      ],
      Semantics(
        container: true,
        label: heading,
        explicitChildNodes: true,
        child: Container(
          padding: const EdgeInsets.all(CmSpace.s8),
          decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
            Padding(
              padding: const EdgeInsets.only(top: CmSpace.s8, bottom: CmSpace.s20),
              child: Semantics(header: true, child: Text(heading, textAlign: TextAlign.center, style: CmType.headingSm.copyWith(color: c.textDefault))),
            ),
            for (var i = 0; i < tips.length; i++) ...[if (i > 0) const SizedBox(height: CmSpace.s8), tips[i]],
          ]),
        ),
      ),
    ]);
  }
}
