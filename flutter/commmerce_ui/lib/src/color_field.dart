import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// A swatch in a [CmColorField]: a colour as `#rrggbb` and an optional name for its accessible name and tooltip.
@immutable
class CmColorSwatch {
  const CmColorSwatch(this.value, {this.name});
  final String value;
  final String? name;
}

/// A palette of swatches and a hex box, for colours that mean something to the merchant, such as the colour of
/// each lead status. The value is lowercase `#rrggbb`, or empty for none. Mirrors `<cm-color-field>` (the web
/// component's optional browser picker has no Flutter equivalent).
///
/// The swatches are a radio group: one Tab stop, the arrow keys move and choose (Left and Right follow the
/// reading direction), Home and End go to the ends. The hex box takes `#RGB`, `RRGGBB` or `#RRGGBB`: a complete
/// six-digit code is applied as it is typed; anything else is checked when the box is left or Enter is pressed.
class CmColorField extends StatefulWidget {
  const CmColorField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.semanticLabel,
    this.swatches,
    this.hint,
    this.helpText,
    this.error,
    this.required = false,
    this.enabled = true,
  });

  /// The colour as `#rrggbb` (`#ABC` and `ABCDEF` are accepted and shown normalised), or empty for none.
  final String value;

  /// Called with the new lowercase `#rrggbb` (or '' when the box is cleared).
  final ValueChanged<String>? onChanged;

  /// Visible label above the swatches, e.g. "Colour".
  final String? label;

  /// Accessible name when there is no visible [label].
  final String? semanticLabel;

  /// The palette. Default: 12 colours from the Commmerce tokens, named by [CmStrings.colorFieldNames].
  final List<CmColorSwatch>? swatches;

  /// Lowercase bracketed note after the label, e.g. "shown on the status tag".
  final String? hint;

  /// One sentence under the field.
  final String? helpText;

  /// Error message from your own validation (e.g. [CmStrings.colorFieldRequired]); announced to screen readers.
  final String? error;

  /// Shows a red asterisk after the label.
  final bool required;
  final bool enabled;

  /// The default palette: the hues of Commmerce's light theme tokens, keyed by their [CmStrings.colorFieldNames].
  static const defaultSwatches = <(String, String)>[
    ('#000000', 'black'),
    ('#707070', 'grey'),
    ('#c9c9c9', 'lightGrey'),
    ('#de0000', 'red'),
    ('#ad5500', 'darkOrange'),
    ('#f1a953', 'orange'),
    ('#ffc107', 'yellow'),
    ('#81bb47', 'lightGreen'),
    ('#3c7c00', 'green'),
    ('#5394d9', 'lightBlue'),
    ('#2e6faf', 'blue'),
    ('#446beb', 'indigo'),
  ];

  /// `#RGB`, `RRGGBB` or `#RRGGBB` (any case, spaces around) as `#rrggbb`; anything else null.
  static String? normalizeHex(String text) {
    final m = RegExp(r'^#?([0-9a-f]{3}|[0-9a-f]{6})$', caseSensitive: false).firstMatch(text.trim());
    if (m == null) return null;
    final h = m.group(1)!;
    final full = h.length == 3 ? h.split('').map((c) => '$c$c').join() : h;
    return '#${full.toLowerCase()}';
  }

  /// The [Color] for `#rrggbb`.
  static Color toColor(String hex) => Color(0xFF000000 | int.parse(hex.substring(1), radix: 16));

  /// Black or white, whichever contrasts more with the swatch (always 4.5:1 or more). The swatch colour is data,
  /// not a theme colour, so it is paired with plain black or white rather than a token.
  static Color checkColor(String hex) {
    final l = toColor(hex).computeLuminance();
    return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? const Color(0xFF000000) : const Color(0xFFFFFFFF);
  }

  @override
  State<CmColorField> createState() => _CmColorFieldState();
}

class _CmColorFieldState extends State<CmColorField> {
  final _controller = TextEditingController();
  final _hexFocus = FocusNode(debugLabel: 'CmColorField hex');
  final List<FocusNode> _nodes = [];
  bool _invalid = false;
  int? _focused;

  /// The value this field reported itself from the hex box; any other new value replaces the box's text.
  String? _typed;

  @override
  void initState() {
    super.initState();
    _controller.text = _current ?? widget.value;
    _hexFocus.addListener(() {
      if (!_hexFocus.hasFocus) _commit();
    });
  }

  @override
  void didUpdateWidget(CmColorField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      if (widget.value != _typed) {
        _controller.text = _current ?? widget.value;
        _invalid = false;
      }
      _typed = null;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _hexFocus.dispose();
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  String? get _current => CmColorField.normalizeHex(widget.value);
  bool get _enabled => widget.enabled && widget.onChanged != null;

  List<CmColorSwatch> _items(CmStrings s) {
    final list = widget.swatches;
    if (list == null) return [for (final (v, k) in CmColorField.defaultSwatches) CmColorSwatch(v, name: s.colorFieldNames[k])];
    return [
      for (final o in list)
        if (CmColorField.normalizeHex(o.value) case final v?) CmColorSwatch(v, name: o.name),
    ];
  }

  void _syncNodes(int n) {
    while (_nodes.length < n) {
      _nodes.add(FocusNode(debugLabel: 'CmColorField swatch ${_nodes.length}'));
    }
    while (_nodes.length > n) {
      _nodes.removeLast().dispose();
    }
  }

  void _pick(List<CmColorSwatch> items, int i) {
    if (!_enabled || i < 0 || i >= items.length) return;
    _nodes[i].requestFocus();
    setState(() => _invalid = false);
    _controller.text = items[i].value;
    if (items[i].value != _current) widget.onChanged!(items[i].value);
  }

  KeyEventResult _onSwatchKey(List<CmColorSwatch> items, int i, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final n = items.length;
    var k = e.logicalKey;
    if (rtl && k == LogicalKeyboardKey.arrowLeft) {
      k = LogicalKeyboardKey.arrowRight;
    } else if (rtl && k == LogicalKeyboardKey.arrowRight) {
      k = LogicalKeyboardKey.arrowLeft;
    }
    int next;
    if (k == LogicalKeyboardKey.arrowRight || k == LogicalKeyboardKey.arrowDown) {
      next = (i + 1) % n;
    } else if (k == LogicalKeyboardKey.arrowLeft || k == LogicalKeyboardKey.arrowUp) {
      next = (i - 1 + n) % n;
    } else if (k == LogicalKeyboardKey.home) {
      next = 0;
    } else if (k == LogicalKeyboardKey.end) {
      next = n - 1;
    } else if (k == LogicalKeyboardKey.space || k == LogicalKeyboardKey.enter) {
      next = i;
    } else {
      return KeyEventResult.ignored;
    }
    _pick(items, next);
    return KeyEventResult.handled;
  }

  void _onHexChanged(String text) {
    // Live only for complete six-digit codes; shorter ones wait for the box to be left.
    final n = RegExp(r'^#?[0-9a-f]{6}$', caseSensitive: false).hasMatch(text.trim()) ? CmColorField.normalizeHex(text) : null;
    if (n != null && n != _current) {
      _typed = n;
      widget.onChanged?.call(n);
    }
    if (_invalid && (n != null || text.trim().isEmpty)) setState(() => _invalid = false);
  }

  void _commit() {
    if (!_enabled) return;
    final text = _controller.text.trim();
    if (text == (_current ?? '')) return;
    final n = text.isEmpty ? '' : CmColorField.normalizeHex(text);
    if (n == null) {
      setState(() => _invalid = true);
      return;
    }
    setState(() => _invalid = false);
    _controller.text = n;
    if (n != (_current ?? '')) {
      _typed = n;
      widget.onChanged!(n);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final t = CmText.of(context);
    final items = _items(s);
    _syncNodes(items.length);
    final current = _current;
    final sel = items.indexWhere((o) => o.value == current);
    final stop = sel >= 0 ? sel : 0;
    final message = (widget.error ?? '').isNotEmpty ? widget.error! : (_invalid || (widget.value.isNotEmpty && current == null) ? s.colorFieldInvalid : '');
    final named = widget.label ?? widget.semanticLabel;
    final swatches = <Widget>[
      for (var i = 0; i < items.length; i++)
        Builder(builder: (context) {
          final o = items[i];
          final on = i == sel;
          final name = o.name == null ? o.value : s.colorFieldSwatch(o.name!, o.value);
          final dot = Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: CmColorField.toColor(o.value),
              shape: BoxShape.circle,
              border: Border.all(color: c.borderInput),
              boxShadow: on ? [BoxShadow(color: c.borderStrong, spreadRadius: 4), BoxShadow(color: c.bgSurface, spreadRadius: 2)] : null,
            ),
            child: on ? Center(child: CmIcon(CmIcons.check, size: 18, color: CmColorField.checkColor(o.value))) : null,
          );
          return Semantics(
            inMutuallyExclusiveGroup: true,
            checked: on,
            enabled: _enabled,
            label: name,
            excludeSemantics: true,
            onTap: _enabled ? () => _pick(items, i) : null,
            child: Tooltip(
              message: o.name ?? o.value,
              excludeFromSemantics: true,
              child: Focus(
                focusNode: _nodes[i],
                canRequestFocus: _enabled,
                skipTraversal: i != stop,
                onKeyEvent: (_, e) => _onSwatchKey(items, i, e),
                onFocusChange: (f) => setState(() => _focused = f ? i : (_focused == i ? null : _focused)),
                child: MouseRegion(
                  cursor: _enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
                  child: GestureDetector(
                    onTap: _enabled ? () => _pick(items, i) : null,
                    child: Opacity(
                      opacity: widget.enabled ? 1 : 0.4,
                      // 5px around each swatch makes the 10px gap; the focus ring sits 6px outside it, as on the web.
                      child: Padding(
                        padding: const EdgeInsets.all(CmSpace.s4),
                        child: Stack(clipBehavior: Clip.none, children: [
                          dot,
                          if (_focused == i)
                            Positioned(
                              left: -8,
                              top: -8,
                              right: -8,
                              bottom: -8,
                              child: IgnorePointer(
                                child: DecoratedBox(decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.borderStrong, width: 2))),
                              ),
                            ),
                        ]),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
    ];
    final preview = Opacity(
      opacity: widget.enabled ? 1 : 0.4,
      child: Container(
        width: cmFieldHeight(context),
        height: cmFieldHeight(context),
        decoration: BoxDecoration(
          color: current == null ? c.bgInset : CmColorField.toColor(current),
          border: Border.all(color: c.borderInput),
          borderRadius: BorderRadius.circular(CmRadius.sm),
        ),
      ),
    );
    final hex = SizedBox(
      width: 120,
      child: Semantics(
        label: named == null ? s.colorFieldHex : s.colorFieldHexNamed(named),
        hint: message.isNotEmpty ? message : widget.helpText,
        child: TextField(
          controller: _controller,
          focusNode: _hexFocus,
          enabled: widget.enabled,
          readOnly: widget.onChanged == null,
          maxLength: 7,
          autocorrect: false,
          enableSuggestions: false,
          onChanged: _onHexChanged,
          onSubmitted: (_) => _commit(),
          inputFormatters: [LengthLimitingTextInputFormatter(7)],
          style: cmFieldText(context).copyWith(color: widget.enabled ? c.textDefault : c.textSecondary, fontFeatures: const [FontFeature.tabularFigures()]),
          decoration: InputDecoration(
            counterText: '',
            hintText: s.colorFieldPlaceholder,
            isDense: true,
            constraints: BoxConstraints(minHeight: cmFieldHeight(context)),
            contentPadding: cmFieldPadding(cmFieldHeight(context)),
            fillColor: widget.enabled ? c.bgSurface : c.bgInputFilled,
            enabledBorder: message.isNotEmpty
                ? OutlineInputBorder(borderRadius: BorderRadius.circular(CmRadius.sm), borderSide: BorderSide(color: c.borderCritical))
                : null,
          ),
        ),
      ),
    );
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      if (widget.label != null) ...[
        ExcludeSemantics(
          child: Text.rich(TextSpan(children: [
            TextSpan(text: widget.label, style: t.label.copyWith(color: c.textDefault)),
            if (widget.required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical)),
            if ((widget.hint ?? '').isNotEmpty) TextSpan(text: '  [${widget.hint!.toLowerCase()}]', style: CmType.bodySm.copyWith(color: c.textTertiary)),
          ])),
        ),
        const SizedBox(height: CmSpace.s8),
      ],
      if (items.isNotEmpty) ...[
        Semantics(
          container: true,
          explicitChildNodes: true,
          label: named == null ? null : '$named${widget.required ? s.requiredSuffix : ''}',
          hint: message.isNotEmpty ? message : widget.helpText,
          child: Transform.translate(
            offset: Offset(Directionality.of(context) == TextDirection.rtl ? 5 : -5, 0),
            child: Wrap(children: swatches),
          ),
        ),
        const SizedBox(height: CmSpace.s4),
      ],
      Row(mainAxisSize: MainAxisSize.min, children: [ExcludeSemantics(child: preview), const SizedBox(width: CmSpace.s8), hex]),
      if (message.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: CmSpace.s8),
          child: Semantics(liveRegion: true, child: Text(message, style: CmType.bodySm.copyWith(color: c.textCritical))),
        ),
      if ((widget.helpText ?? '').isNotEmpty)
        Padding(padding: const EdgeInsets.only(top: CmSpace.s8), child: ExcludeSemantics(child: Text(widget.helpText!, style: CmType.bodySm.copyWith(color: c.textTertiary)))),
    ]);
  }
}
