import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

import 'button.dart';
import 'generated/tokens.g.dart';
import 'strings.dart';
import 'theme.dart';

/// Width of the pad over its height.
const double _ratio = 3;

/// Where the signing line sits, as a fraction of the pad's height from the top.
const double _baseline = 0.7;

/// Stroke width at pressure 0.5, as a fraction of the pad's width (3.3px on a 600px pad).
const double _lineWidth = 0.0055;

/// Ink of the exported image: always black on transparent, whatever the theme on screen (signatures go into
/// documents and PDFs, which are light). On screen the ink is `text-default` of the current theme.
const Color _exportInk = Color(0xFF000000);

/// Space around the ink in the exported image, in logical pixels (doubled with the 2x scale).
const double _exportPadding = 8;

/// Resolution of the exported image.
const double _exportScale = 2;

/// Typing waits this long before [CmSignatureField.onChanged].
const Duration _typeDelay = Duration(milliseconds: 400);

/// Font family of typed signatures: Dancing Script (SIL OFL 1.1), bundled with this package, the same typeface the
/// web component self-hosts. Latin letters only; other scripts fall back to the platform's default font.
const String cmSignatureFontFamily = 'Dancing Script';

/// How a [CmSignatureField] is being signed: [draw] (pointer, touch, pen) or [type] (keyboard).
enum CmSignatureMode { draw, type }

/// A point of a drawn stroke: [x] and [y] as fractions of the pad's width (so a resize scales the signature), and
/// pen [pressure] from 0 to 1 (0.5 for mice and fingers).
@immutable
class CmSignaturePoint {
  const CmSignaturePoint(this.x, this.y, [this.pressure = 0.5]);
  final double x, y, pressure;

  @override
  bool operator ==(Object other) => other is CmSignaturePoint && other.x == x && other.y == y && other.pressure == pressure;

  @override
  int get hashCode => Object.hash(x, y, pressure);
}

/// The signature a [CmSignatureField] holds: the web component's `value` (a PNG) plus the `cm-change` detail
/// (`empty`, `mode`) and the typed name.
@immutable
class CmSignatureValue {
  const CmSignatureValue({required this.mode, this.png, this.typedName = ''});

  /// Nothing signed.
  const CmSignatureValue.empty([this.mode = CmSignatureMode.draw])
      : png = null,
        typedName = '';

  /// The tab the signature was made in.
  final CmSignatureMode mode;

  /// The signature as PNG bytes: black ink on transparent at 2x the pad's size, cropped to the ink with 8px (16 image
  /// pixels) around it. Null when nothing is signed.
  final Uint8List? png;

  /// The name in the Type tab (kept while drawing, so switching back restores it).
  final String typedName;

  /// True when nothing is signed in [mode].
  bool get isEmpty => png == null;

  /// The PNG as a data URL (`data:image/png;base64,…`), as the web component's `value`; empty when nothing is signed.
  String get dataUrl => png == null ? '' : 'data:image/png;base64,${base64Encode(png!)}';

  @override
  bool operator ==(Object other) =>
      other is CmSignatureValue && other.mode == mode && other.typedName == typedName && listEquals(other.png, png);

  @override
  int get hashCode => Object.hash(mode, typedName, png == null ? 0 : Object.hashAll(png!));

  @override
  String toString() => 'CmSignatureValue($mode, ${png == null ? 'empty' : '${png!.length} bytes'}, "$typedName")';
}

class _Ping extends ChangeNotifier {
  void ping() => notifyListeners();
}

/// Holds what a [CmSignatureField] shows: the drawn strokes, a saved signature image, the typed name and the
/// selected tab; and exports the signature as a PNG. Mirrors the web component's properties and methods (`mode`,
/// `typedName`, `value`, `empty`, `clear()`, `undo()`, `toDataURL()`, `toBlob()`).
///
/// [value] follows every change, but a PNG is made asynchronously in Flutter (`Picture.toImage`), so it is updated
/// a moment after the change; await [toPng] or [export] for the signature as it is right now.
class CmSignatureController extends ChangeNotifier {
  /// [mode] is the tab to open on; [typedName] prefills the Type box (e.g. the signer's name from the record);
  /// [image] is a saved signature (PNG or any format Flutter decodes) shown in Draw, as the web's `value`.
  CmSignatureController({CmSignatureMode mode = CmSignatureMode.draw, String typedName = '', Uint8List? image})
      : _mode = mode,
        _typedName = typedName,
        _initialTyped = typedName,
        _initialImage = image == null || image.isEmpty ? null : image {
    _value = CmSignatureValue(mode: mode, typedName: typedName);
    _latest = Future.value(_value);
    if (_initialImage != null) {
      _setImage(_initialImage);
    }
    if (!isEmpty) _changed();
  }

  CmSignatureMode _mode;
  String _typedName;
  final String _initialTyped;
  final Uint8List? _initialImage;
  final List<List<CmSignaturePoint>> _strokes = [];
  Uint8List? _image;
  Future<ui.Image?>? _decoding;
  ui.Image? _decoded;
  late CmSignatureValue _value;
  late Future<CmSignatureValue> _latest;
  int _seq = 0;
  bool _disposed = false;

  // Set by the field that shows this controller.
  final _Ping _ink = _Ping();
  double? _width;
  TextDirection _direction = TextDirection.ltr;
  TextStyle _typedStyle = const TextStyle(fontFamily: cmSignatureFontFamily, package: 'commmerce_ui');
  ValueChanged<CmSignatureValue>? _onEmit;

  /// The selected tab. Each tab keeps its own signature; [value] follows the selected one. Setting it from code
  /// doesn't call [CmSignatureField.onChanged] (the web fires events for user actions only).
  CmSignatureMode get mode => _mode;
  set mode(CmSignatureMode v) {
    if (v == _mode) return;
    _mode = v;
    _changed();
  }

  /// The name typed in the Type tab. Set it to prefill the box.
  String get typedName => _typedName;
  set typedName(String v) {
    if (v == _typedName) return;
    _typedName = v;
    _changed();
  }

  /// The drawn strokes, oldest first.
  List<List<CmSignaturePoint>> get strokes => List.unmodifiable([for (final s in _strokes) List<CmSignaturePoint>.unmodifiable(s)]);

  /// The saved signature shown under the strokes in Draw (from [loadImage]), or null.
  Uint8List? get image => _image;

  /// The latest exported signature (see the class comment: it follows changes asynchronously).
  CmSignatureValue get value => _value;

  /// True when the current tab has nothing signed: no strokes (or saved image) in Draw, no text in Type.
  bool get isEmpty => _mode == CmSignatureMode.type ? _typedName.trim().isEmpty : isDrawEmpty;

  /// True when the Draw tab has no strokes and no saved image (Undo is then disabled).
  bool get isDrawEmpty => _strokes.isEmpty && _image == null;

  /// Shows a saved signature in Draw (and selects Draw), replacing the strokes; null or empty clears both tabs.
  /// The web's `value = dataUrl` / `value = ''`.
  void loadImage(Uint8List? png) {
    _strokes.clear();
    if (png == null || png.isEmpty) {
      _image = null;
      _decoded = null;
      _decoding = null;
      _typedName = '';
    } else {
      _setImage(png);
      _mode = CmSignatureMode.draw;
    }
    _ink.ping();
    _changed();
  }

  /// Removes the current tab's signature (Draw: every stroke and any saved image; Type: the text) and reports it to
  /// [CmSignatureField.onChanged], like the web's `clear()`.
  void clear() {
    if (_mode == CmSignatureMode.type) {
      _typedName = '';
    } else {
      _strokes.clear();
      _image = null;
      _decoded = null;
      _decoding = null;
      _ink.ping();
    }
    _changed(emit: true);
  }

  /// Removes the last stroke in Draw (then the saved image, if one was loaded) and reports it to
  /// [CmSignatureField.onChanged], like the web's `undo()`.
  void undo() {
    if (_mode != CmSignatureMode.draw) return;
    if (_strokes.isNotEmpty) {
      _strokes.removeLast();
    } else {
      _image = null;
      _decoded = null;
      _decoding = null;
    }
    _ink.ping();
    _changed(emit: true);
  }

  /// Back to how the controller was created: no strokes, the initial image and typed name. The tab is kept, as
  /// the web's form reset does. Called by [FormState.reset].
  void reset() {
    _strokes.clear();
    _typedName = _initialTyped;
    if (_initialImage != null) {
      _setImage(_initialImage);
      _mode = CmSignatureMode.draw;
    } else {
      _image = null;
      _decoded = null;
      _decoding = null;
    }
    _ink.ping();
    _changed();
  }

  /// The signature as a PNG (see [CmSignatureValue.png]), or null when nothing is signed. The web's `toBlob()`.
  Future<Uint8List?> toPng() => _export();

  /// The signature as a PNG data URL, or '' when nothing is signed. The web's `toDataURL()` (async here).
  Future<String> toDataUrl() async => (await export()).dataUrl;

  /// The signature as it is right now: the PNG, the tab and the typed name.
  Future<CmSignatureValue> export() => _snapshot();

  @override
  void dispose() {
    _disposed = true;
    _ink.dispose();
    super.dispose();
  }

  // ---------- Internals used by the field ----------

  void _setImage(Uint8List png) {
    _image = png;
    _decoded = null;
    final decoding = _decoding = _decode(png);
    decoding.then((img) {
      if (_disposed || _decoding != decoding) return;
      _decoded = img;
      _ink.ping();
      notifyListeners();
    });
  }

  static Future<ui.Image?> _decode(Uint8List bytes) async {
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      codec.dispose();
      return frame.image;
    } catch (_) {
      return null;
    }
  }

  void _begin(CmSignaturePoint p) {
    _strokes.add([p]);
    _ink.ping();
    notifyListeners();
  }

  void _add(CmSignaturePoint p) {
    if (_strokes.isEmpty) return;
    _strokes.last.add(p);
    _ink.ping();
  }

  void _end() => _changed(emit: true);

  void _userMode(CmSignatureMode m) {
    if (m == _mode) return;
    _mode = m;
    _changed(emit: true);
  }

  /// Fires [_onEmit] once [to] has settled, when its PNG differs from [from]'s (as the web compares `value`).
  Future<void> _emitIfChanged(Future<CmSignatureValue> from, Future<CmSignatureValue> to) async {
    final a = await from;
    final b = await to;
    if (_disposed || listEquals(a.png, b.png)) return;
    _onEmit?.call(b);
  }

  /// Records a change: listeners rebuild now, [value] follows when the PNG is ready.
  void _changed({bool emit = false}) {
    if (_disposed) return;
    notifyListeners();
    final before = _latest;
    final seq = ++_seq;
    final after = _latest = _snapshot();
    after.then((v) {
      if (_disposed || seq != _seq || v == _value) return;
      _value = v;
      notifyListeners();
    });
    if (emit) _emitIfChanged(before, after);
  }

  /// Starts an export of the current state (read synchronously, so later changes don't leak into it).
  Future<CmSignatureValue> _snapshot() async {
    final mode = _mode;
    final typed = _typedName;
    final png = await _export();
    return CmSignatureValue(mode: mode, png: png, typedName: typed);
  }

  Future<Uint8List?> _export() async {
    if (isEmpty) return null;
    final w = math.max(_width ?? 600, 300).toDouble();
    final h = w / _ratio;
    final mode = _mode;
    final text = _typedName.trim();
    final strokes = [for (final s in _strokes) List<CmSignaturePoint>.of(s)];
    final style = _typedStyle;
    final direction = _direction;
    final decoding = _image == null ? null : _decoding;
    try {
      final img = decoding == null || mode == CmSignatureMode.type ? null : await decoding;
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.scale(_exportScale);
      if (mode == CmSignatureMode.type) {
        _paintTyped(canvas, text, w, h, style, direction);
      } else {
        _paintInk(canvas, w, h, _exportInk, strokes, img, tint: false);
      }
      final picture = recorder.endRecording();
      final full = await picture.toImage((w * _exportScale).round(), (h * _exportScale).round());
      picture.dispose();
      final png = await _crop(full, (_exportPadding * _exportScale).round());
      full.dispose();
      return png;
    } catch (_) {
      return null;
    }
  }
}

/// Draws a typed signature as the web's export does: centred on the signing line, at most 64px or 45% of the pad's
/// height, shrunk to fit the width.
void _paintTyped(Canvas canvas, String text, double w, double h, TextStyle style, TextDirection direction) {
  var size = math.min(h * 0.45, 64.0);
  TextPainter layout(double s) => TextPainter(
        text: TextSpan(text: text, style: style.copyWith(fontSize: s, height: 1, color: _exportInk, fontWeight: FontWeight.w400)),
        textDirection: direction,
        textAlign: TextAlign.center,
        maxLines: 1,
      )..layout();
  var tp = layout(size);
  final max = w - 2 * _exportPadding;
  if (tp.width > max) {
    size *= max / tp.width;
    tp.dispose();
    tp = layout(size);
  }
  final base = tp.computeDistanceToActualBaseline(TextBaseline.alphabetic);
  tp.paint(canvas, Offset((w - tp.width) / 2, h * _baseline - base));
  tp.dispose();
}

/// Draws the saved image and the strokes for a pad [w] wide. On screen ([tint]) a saved image is recoloured to the
/// screen's ink, so dark saved ink stays visible in the dark theme.
void _paintInk(Canvas canvas, double w, double h, Color ink, List<List<CmSignaturePoint>> strokes, ui.Image? img, {required bool tint}) {
  if (img != null && img.width > 0 && img.height > 0) {
    final k = math.min((w * 0.9) / img.width, (h * 0.9) / img.height);
    final iw = img.width * k, ih = img.height * k;
    final dst = Rect.fromLTWH((w - iw) / 2, (h - ih) / 2, iw, ih);
    final paint = Paint()..filterQuality = FilterQuality.medium;
    if (tint && ink.toARGB32() != _exportInk.toARGB32()) paint.colorFilter = ColorFilter.mode(ink, BlendMode.srcIn);
    canvas.drawImageRect(img, Rect.fromLTWH(0, 0, img.width.toDouble(), img.height.toDouble()), dst, paint);
  }
  for (final s in strokes) {
    _drawStroke(canvas, s, w, ink);
  }
}

/// Draws one stroke through the midpoints of its points (quadratic smoothing), each piece as wide as its pressure.
void _drawStroke(Canvas canvas, List<CmSignaturePoint> s, double w, Color ink) {
  if (s.isEmpty) return;
  double width(double p) => w * _lineWidth * (0.35 + p * 1.3);
  Offset at(CmSignaturePoint q) => Offset(q.x * w, q.y * w);
  if (s.length == 1) {
    canvas.drawCircle(at(s[0]), width(s[0].pressure) / 2, Paint()..color = ink);
    return;
  }
  final paint = Paint()
    ..color = ink
    ..style = PaintingStyle.stroke
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  var start = at(s[0]);
  for (var i = 1; i < s.length - 1; i++) {
    final c = at(s[i]);
    final end = (c + at(s[i + 1])) / 2;
    canvas.drawPath(Path()..moveTo(start.dx, start.dy)..quadraticBezierTo(c.dx, c.dy, end.dx, end.dy), paint..strokeWidth = width(s[i].pressure));
    start = end;
  }
  final last = at(s.last);
  canvas.drawLine(start, last, paint..strokeWidth = width(s.last.pressure));
}

/// The image cut to its non-transparent pixels plus [pad] pixels each side, as PNG; null if it is blank.
Future<Uint8List?> _crop(ui.Image full, int pad) async {
  final data = await full.toByteData(format: ui.ImageByteFormat.rawRgba);
  if (data == null) return null;
  final width = full.width, height = full.height;
  var top = height, left = width, right = -1, bottom = -1;
  for (var y = 0; y < height; y++) {
    final row = y * width * 4;
    for (var x = 0; x < width; x++) {
      if (data.getUint8(row + x * 4 + 3) > 8) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        bottom = y;
      }
    }
  }
  if (right < 0) return null;
  final cw = right - left + 1, ch = bottom - top + 1;
  final recorder = ui.PictureRecorder();
  Canvas(recorder).drawImageRect(
    full,
    Rect.fromLTWH(left.toDouble(), top.toDouble(), cw.toDouble(), ch.toDouble()),
    Rect.fromLTWH(pad.toDouble(), pad.toDouble(), cw.toDouble(), ch.toDouble()),
    Paint(),
  );
  final picture = recorder.endRecording();
  final out = await picture.toImage(cw + 2 * pad, ch + 2 * pad);
  picture.dispose();
  final png = await out.toByteData(format: ui.ImageByteFormat.png);
  out.dispose();
  return png?.buffer.asUint8List(png.offsetInBytes, png.lengthInBytes);
}

/// Signature field: sign by drawing with a mouse, finger or pen, or by typing a name that is shown in a handwriting
/// font (Dancing Script, bundled). Gives a PNG of the signature cropped to the ink ([CmSignatureValue.png],
/// [CmSignatureValue.dataUrl]). For e-sign screens ("Sign now") and signing pages. Mirrors `<cm-signature-field>`.
///
/// Draw and Type are tabs: one Tab stop, Left and Right (either way: there are two), Home and End move and select.
/// The drawing area takes focus, so screen readers hear its name ("Signature drawing area", "…, signed" once drawn)
/// and the instructions; typing is the keyboard and screen reader way to sign. Undo ("Undo last stroke") and Clear
/// ("Clear signature") are disabled while there is nothing to undo or clear; when the one with focus becomes
/// disabled, focus moves to the selected tab (or the text box). "Last stroke removed" and "Signature cleared" are
/// announced. Drawing claims the pointer at once, so a finger on the pad doesn't scroll the page; only the first
/// finger draws, and only the primary mouse button. Pen pressure changes the stroke width.
///
/// Form behaviour: inside a [Form], [required] makes [FormState.validate] fail with "Please sign here."
/// ([CmStrings.signatureFieldRequired]) until something is signed, [validator] adds your own check, [onSaved]
/// receives the value and [FormState.reset] calls [CmSignatureController.reset].
///
/// Sizes: the pad keeps a 3:1 shape at the width it is given (600 if unbounded); tabs 32 tall and Undo / Clear slim
/// buttons (32), both 44 on touch screens; label 13/18, help and error 12/16; 8 between parts.
///
/// Differences from the web: the PNG is made asynchronously ([CmSignatureController.value] follows a moment after a
/// change; there is no native form submission, so the value is read from the controller or [onChanged]); the
/// saved signature is given as image bytes ([CmSignatureController.loadImage]) rather than a URL; tabs use Flutter's
/// tab / tab bar semantics roles but there is no `aria-controls` link to the panel; Undo and Clear are the standard
/// slim secondary [CmButton] (white with the field outline) where the web draws them grey with a dark outline;
/// characters Dancing Script lacks fall back to the platform font, not a cursive one.
class CmSignatureField extends StatefulWidget {
  const CmSignatureField({
    super.key,
    this.controller,
    this.label,
    this.semanticLabel,
    this.hint,
    this.helpText,
    this.error,
    this.required = false,
    this.enabled = true,
    this.onChanged,
    this.validator,
    this.onSaved,
    this.autovalidateMode,
    this.typedStyle,
  });

  /// Holds the signature; one is made inside the field when null.
  final CmSignatureController? controller;

  /// Visible label above the field, e.g. "Your signature".
  final String? label;

  /// Accessible name when there is no visible [label] (names the Draw / Type tab list; default "How to sign").
  final String? semanticLabel;

  /// Lowercase bracketed note after the label.
  final String? hint;

  /// One sentence under the field, e.g. what the signer agrees to: "By signing, you accept the quote."
  final String? helpText;

  /// Error message from your own validation: the pad's border turns critical and it is announced.
  final String? error;

  /// Shows a red asterisk; inside a [Form], validation fails until something is signed.
  final bool required;

  /// False blocks drawing, typing, the tabs and the buttons.
  final bool enabled;

  /// Called after a stroke is finished, Undo, Clear, a switch between Draw and Type that changes the value, or when
  /// typing stops for 400ms (or the box is left), with the new signature. The web's `cm-change`.
  final ValueChanged<CmSignatureValue>? onChanged;

  /// Your own check inside a [Form], run after the [required] check. It receives [CmSignatureController.value],
  /// which follows changes a moment later (the PNG is made asynchronously); read [CmSignatureController.mode],
  /// [CmSignatureController.typedName] or [CmSignatureController.isEmpty] for checks that must see the latest keystroke.
  final FormFieldValidator<CmSignatureValue>? validator;

  /// Receives the latest value on [FormState.save].
  final FormFieldSetter<CmSignatureValue>? onSaved;
  final AutovalidateMode? autovalidateMode;

  /// Style of typed signatures, merged over Dancing Script (the web's `--cm-signature-font`). Only the family (and
  /// package) is used: the size follows the pad.
  final TextStyle? typedStyle;

  @override
  State<CmSignatureField> createState() => _CmSignatureFieldState();
}

class _SignatureFormField extends FormField<CmSignatureValue> {
  const _SignatureFormField({
    super.key,
    required super.builder,
    required this.onReset,
    super.validator,
    super.onSaved,
    super.enabled,
    super.autovalidateMode,
  });
  final VoidCallback onReset;

  @override
  FormFieldState<CmSignatureValue> createState() => _SignatureFormFieldState();
}

class _SignatureFormFieldState extends FormFieldState<CmSignatureValue> {
  @override
  void reset() {
    super.reset();
    (widget as _SignatureFormField).onReset();
  }
}

class _CmSignatureFieldState extends State<CmSignatureField> {
  CmSignatureController? _own;
  CmSignatureController get _ctrl => widget.controller ?? (_own ??= CmSignatureController());

  final _fieldKey = GlobalKey<FormFieldState<CmSignatureValue>>();
  final _text = TextEditingController();
  final _drawTab = FocusNode(debugLabel: 'CmSignatureField draw tab');
  final _typeTab = FocusNode(debugLabel: 'CmSignatureField type tab');
  final _padNode = FocusNode(debugLabel: 'CmSignatureField pad');
  final _textNode = FocusNode(debugLabel: 'CmSignatureField text');
  final _undoNode = FocusNode(debugLabel: 'CmSignatureField undo');
  final _clearNode = FocusNode(debugLabel: 'CmSignatureField clear');

  int? _pointer;
  double _padWidth = 0;
  Timer? _typeTimer;
  Future<CmSignatureValue>? _typeFrom;
  CmSignatureMode? _hoverTab;

  @override
  void initState() {
    super.initState();
    _attach(_ctrl);
    _text.text = _ctrl.typedName;
    _textNode.addListener(_onTextFocus);
    for (final n in [_drawTab, _typeTab, _padNode]) {
      n.addListener(_rebuild);
    }
    FocusManager.instance.addHighlightModeListener(_onHighlightMode);
  }

  @override
  void didUpdateWidget(CmSignatureField old) {
    super.didUpdateWidget(old);
    final before = old.controller ?? _own;
    if (before != _ctrl) {
      _detach(before);
      if (widget.controller != null) {
        _own?.dispose();
        _own = null;
      }
      _attach(_ctrl);
      _syncText();
    }
  }

  @override
  void dispose() {
    _typeTimer?.cancel();
    _detach(_ctrl);
    _own?.dispose();
    _text.dispose();
    FocusManager.instance.removeHighlightModeListener(_onHighlightMode);
    for (final n in [_drawTab, _typeTab, _padNode, _textNode, _undoNode, _clearNode]) {
      n.dispose();
    }
    super.dispose();
  }

  void _attach(CmSignatureController c) {
    c.addListener(_onController);
    c._onEmit = _emit;
  }

  void _detach(CmSignatureController? c) {
    if (c == null) return;
    c.removeListener(_onController);
    if (c._onEmit == _emit) c._onEmit = null;
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  void _onHighlightMode(FocusHighlightMode _) {
    if (_padNode.hasFocus || _drawTab.hasFocus || _typeTab.hasFocus) _rebuild();
  }

  void _onController() {
    _syncText();
    _rebuild();
  }

  void _syncText() {
    final v = _ctrl.typedName;
    if (_text.text != v) _text.value = TextEditingValue(text: v, selection: TextSelection.collapsed(offset: v.length));
  }

  void _emit(CmSignatureValue v) {
    if (!mounted) return;
    _fieldKey.currentState?.didChange(v);
    widget.onChanged?.call(v);
  }

  void _onTextFocus() {
    if (!_textNode.hasFocus) _typed();
    _rebuild();
  }

  // ---------- Drawing ----------

  CmSignaturePoint _point(PointerEvent e) {
    final w = _padWidth <= 0 ? 1.0 : _padWidth;
    // Pressure only from pens: mice and most touch screens report a fixed value.
    final pen = e.kind == PointerDeviceKind.stylus || e.kind == PointerDeviceKind.invertedStylus;
    final p = pen && e.pressure > 0 ? e.pressure.clamp(0.0, 1.0).toDouble() : 0.5;
    return CmSignaturePoint(e.localPosition.dx / w, e.localPosition.dy / w, p);
  }

  void _onDown(PointerDownEvent e) {
    if (!widget.enabled || _pointer != null) return;
    if (e.kind == PointerDeviceKind.mouse && e.buttons != kPrimaryMouseButton) return;
    _pointer = e.pointer;
    _ctrl._begin(_point(e));
  }

  void _onMove(PointerEvent e) {
    if (e.pointer != _pointer) return;
    final pt = _point(e);
    final strokes = _ctrl._strokes;
    if (strokes.isEmpty) return;
    final last = strokes.last.last;
    // Skip points under 1.5px apart: they add noise, not shape.
    if (math.sqrt(math.pow(pt.x - last.x, 2) + math.pow(pt.y - last.y, 2)) * _padWidth < 1.5) return;
    _ctrl._add(pt);
  }

  void _onUp(PointerEvent e) {
    if (e.pointer != _pointer) return;
    if (e is PointerUpEvent) _onMove(e);
    _pointer = null;
    _ctrl._end();
  }

  // ---------- Typing ----------

  void _onType(String v) {
    if (_typeTimer == null) {
      _typeFrom = _ctrl._latest;
    } else {
      _typeTimer!.cancel();
    }
    _ctrl.typedName = v;
    _typeTimer = Timer(_typeDelay, _typed);
  }

  /// Typing stopped (or the box was left): report the value if it moved since typing started.
  void _typed() {
    final timer = _typeTimer, from = _typeFrom;
    if (timer == null || from == null) return;
    timer.cancel();
    _typeTimer = null;
    _typeFrom = null;
    _ctrl._emitIfChanged(from, _ctrl._latest);
  }

  // ---------- Tabs and buttons ----------

  void _select(CmSignatureMode m, {bool focus = false}) {
    if (!widget.enabled) return;
    if (focus) (m == CmSignatureMode.draw ? _drawTab : _typeTab).requestFocus();
    _ctrl._userMode(m);
  }

  KeyEventResult _onTabKey(CmSignatureMode tab, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    final other = _ctrl.mode == CmSignatureMode.draw ? CmSignatureMode.type : CmSignatureMode.draw;
    final CmSignatureMode next;
    // With two tabs, Left and Right both go to the other one, so right-to-left text needs no mirroring.
    if (k == LogicalKeyboardKey.arrowLeft || k == LogicalKeyboardKey.arrowRight) {
      next = other;
    } else if (k == LogicalKeyboardKey.home) {
      next = CmSignatureMode.draw;
    } else if (k == LogicalKeyboardKey.end) {
      next = CmSignatureMode.type;
    } else if (k == LogicalKeyboardKey.enter || k == LogicalKeyboardKey.space) {
      next = tab;
    } else {
      return KeyEventResult.ignored;
    }
    _select(next, focus: true);
    return KeyEventResult.handled;
  }

  void _announce(String text) => SemanticsService.announce(text, Directionality.of(context));

  /// After Undo or Clear: if the button that had focus is now disabled, move focus to the tab or the text box.
  void _keepFocus(bool undoHadFocus, bool clearHadFocus) {
    final lost = (undoHadFocus && _ctrl.isDrawEmpty) || (clearHadFocus && _ctrl.isEmpty);
    if (!lost) return;
    (_ctrl.mode == CmSignatureMode.type ? _textNode : (_ctrl.mode == CmSignatureMode.draw ? _drawTab : _typeTab)).requestFocus();
  }

  void _onUndo() {
    if (!widget.enabled || _ctrl.mode != CmSignatureMode.draw || _ctrl.isDrawEmpty) return;
    final u = _undoNode.hasFocus, c = _clearNode.hasFocus;
    _ctrl.undo();
    _announce(CmStrings.of(context).signatureFieldUndone);
    _keepFocus(u, c);
  }

  void _onClear() {
    if (!widget.enabled || _ctrl.isEmpty) return;
    final u = _undoNode.hasFocus, c = _clearNode.hasFocus;
    _typeTimer?.cancel();
    _typeTimer = null;
    _typeFrom = null;
    _ctrl.clear();
    _announce(CmStrings.of(context).signatureFieldCleared);
    _keepFocus(u, c);
  }

  // ---------- Build ----------

  @override
  Widget build(BuildContext context) {
    final s = CmStrings.of(context);
    return _SignatureFormField(
      key: _fieldKey,
      enabled: widget.enabled,
      autovalidateMode: widget.autovalidateMode,
      validator: (_) {
        if (widget.required && _ctrl.isEmpty) return s.signatureFieldRequired;
        return widget.validator?.call(_ctrl.value);
      },
      onSaved: widget.onSaved == null ? null : (_) => widget.onSaved!(_ctrl.value),
      onReset: () {
        _typeTimer?.cancel();
        _typeTimer = null;
        _typeFrom = null;
        _ctrl.reset();
      },
      builder: (field) => _field(context, field.errorText),
    );
  }

  Widget _field(BuildContext context, String? fieldError) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final t = CmText.of(context);
    final ctrl = _ctrl;
    ctrl._direction = Directionality.of(context);
    ctrl._typedStyle = const TextStyle(fontFamily: cmSignatureFontFamily, package: 'commmerce_ui').merge(widget.typedStyle);
    final enabled = widget.enabled;
    final message = (widget.error ?? '').isNotEmpty ? widget.error! : (fieldError ?? '');
    final help = widget.helpText ?? '';
    final named = widget.label ?? widget.semanticLabel;
    final drawMode = ctrl.mode == CmSignatureMode.draw;
    final describedBy = [if (message.isNotEmpty) message, if (help.isNotEmpty) help].join('\n');

    Widget tab(CmSignatureMode m, String text) {
      final on = ctrl.mode == m;
      final node = m == CmSignatureMode.draw ? _drawTab : _typeTab;
      final focused = node.hasFocus && FocusManager.instance.highlightMode == FocusHighlightMode.traditional;
      final color = !enabled ? c.textSecondary : (on || _hoverTab == m ? c.textDefault : c.textTertiary);
      return Semantics(
        role: SemanticsRole.tab,
        selected: on,
        enabled: enabled,
        focusable: enabled,
        label: text,
        excludeSemantics: true,
        onTap: enabled ? () => _select(m, focus: true) : null,
        child: Focus(
          focusNode: node,
          canRequestFocus: enabled,
          skipTraversal: !on,
          onKeyEvent: (_, e) => _onTabKey(m, e),
          child: MouseRegion(
            cursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
            onEnter: (_) => setState(() => _hoverTab = m),
            onExit: (_) => setState(() => _hoverTab = null),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: enabled ? () => _select(m, focus: true) : null,
              child: SizedBox(
                height: cmControlHeight(context, CmControlHeight.sm),
                child: Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text(text, style: CmType.bodyMd.copyWith(fontWeight: FontWeight.w500, color: color)),
                  ),
                  if (on)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 2,
                      height: 2,
                      child: DecoratedBox(decoration: BoxDecoration(color: c.borderStrong, borderRadius: BorderRadius.circular(CmRadius.full))),
                    ),
                  if (focused)
                    Positioned(
                      left: -4,
                      right: -4,
                      top: 0,
                      bottom: 0,
                      child: IgnorePointer(
                        child: DecoratedBox(decoration: BoxDecoration(border: Border.all(color: c.borderStrong, width: 2), borderRadius: BorderRadius.circular(CmRadius.xs))),
                      ),
                    ),
                ]),
              ),
            ),
          ),
        ),
      );
    }

    final tabs = Semantics(
      role: SemanticsRole.tabBar,
      container: true,
      explicitChildNodes: true,
      label: named == null ? s.signatureFieldModes : '$named${widget.required ? s.requiredSuffix : ''}',
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        tab(CmSignatureMode.draw, s.signatureFieldDraw),
        const SizedBox(width: CmSpace.s20),
        tab(CmSignatureMode.type, s.signatureFieldType),
      ]),
    );
    final actions = Row(mainAxisSize: MainAxisSize.min, children: [
      if (drawMode) ...[
        CmButton(
          label: s.signatureFieldUndo,
          semanticLabel: s.signatureFieldUndoLabel,
          size: CmButtonSize.slim,
          focusNode: _undoNode,
          onPressed: enabled && !ctrl.isDrawEmpty ? _onUndo : null,
        ),
        const SizedBox(width: CmSpace.s8),
      ],
      CmButton(
        label: s.signatureFieldClear,
        semanticLabel: s.signatureFieldClearLabel,
        size: CmButtonSize.slim,
        focusNode: _clearNode,
        onPressed: enabled && !ctrl.isEmpty ? _onClear : null,
      ),
    ]);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      if (widget.label != null) ...[
        ExcludeSemantics(
          child: Text.rich(TextSpan(children: [
            TextSpan(text: widget.label, style: t.label.copyWith(color: c.textDefault)),
            if (widget.required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical)),
            if ((widget.hint ?? '').isNotEmpty) TextSpan(text: '  [${widget.hint!.toLowerCase()}]', style: CmType.bodyXs.copyWith(color: c.textTertiary)),
          ])),
        ),
        const SizedBox(height: CmSpace.s8),
      ],
      // Tabs at the start, buttons at the end; on a narrow screen the buttons wrap under the tabs, at the end.
      OverflowBar(
        alignment: MainAxisAlignment.spaceBetween,
        overflowAlignment: OverflowBarAlignment.end,
        spacing: CmSpace.s8,
        overflowSpacing: CmSpace.s8,
        children: [tabs, actions],
      ),
      const SizedBox(height: CmSpace.s8),
      LayoutBuilder(builder: (context, constraints) {
        final w = constraints.maxWidth.isFinite ? constraints.maxWidth : 600.0;
        final inner = math.max(w - 2, 1.0);
        _padWidth = inner;
        ctrl._width = inner;
        return drawMode ? _drawPad(context, w, inner, message, describedBy) : _typePad(context, w, inner, message, describedBy, named);
      }),
      if (message.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: CmSpace.s8),
          child: Semantics(liveRegion: true, child: Text(message, style: CmType.bodyXs.copyWith(color: c.textCritical))),
        ),
      if (help.isNotEmpty)
        Padding(padding: const EdgeInsets.only(top: CmSpace.s8), child: ExcludeSemantics(child: Text(help, style: CmType.bodyXs.copyWith(color: c.textTertiary)))),
    ]);
  }

  BoxDecoration _padDecoration(CmColors c, {required bool focused, required bool error}) => BoxDecoration(
        color: widget.enabled ? c.bgSurface : c.bgInputFilled,
        border: Border.all(color: !widget.enabled ? c.borderSubtle : (error ? c.borderCritical : (focused ? c.borderStrong : c.borderInput))),
        borderRadius: BorderRadius.circular(CmRadius.sm),
        boxShadow: focused && widget.enabled ? [BoxShadow(color: c.borderStrong, spreadRadius: 1)] : null,
      );

  Widget _line(CmColors c, double inner) => Positioned(
        left: CmSpace.s12,
        right: CmSpace.s12,
        top: inner / _ratio * _baseline,
        height: 1,
        child: IgnorePointer(child: CustomPaint(painter: _DashPainter(c.borderInput))),
      );

  Widget _drawPad(BuildContext context, double w, double inner, String message, String describedBy) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final ctrl = _ctrl;
    final enabled = widget.enabled;
    final drawEmpty = ctrl.isDrawEmpty;
    final focused = _padNode.hasFocus && FocusManager.instance.highlightMode == FocusHighlightMode.traditional;
    final h = inner / _ratio;
    return Semantics(
      container: true,
      image: true,
      focusable: enabled,
      focused: _padNode.hasFocus,
      label: drawEmpty ? s.signatureFieldPad : s.signatureFieldPadSigned,
      hint: [s.signatureFieldInstructions, if (describedBy.isNotEmpty) describedBy].join('\n'),
      excludeSemantics: true,
      child: Focus(
        focusNode: _padNode,
        canRequestFocus: enabled,
        child: Container(
          width: w,
          height: h + 2,
          decoration: _padDecoration(c, focused: focused, error: message.isNotEmpty),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(CmRadius.sm - 1),
            child: Stack(children: [
              _line(c, inner),
              if (drawEmpty)
                PositionedDirectional(
                  start: CmSpace.s12,
                  bottom: h * (1 - _baseline) + CmSpace.s4,
                  child: IgnorePointer(child: Text(s.signatureFieldSignHere, style: CmType.bodyXs.copyWith(color: c.textTertiary))),
                ),
              Positioned.fill(
                child: MouseRegion(
                  cursor: enabled ? SystemMouseCursors.precise : SystemMouseCursors.forbidden,
                  // Claims every pointer on the pad at once, so a finger drawing here never scrolls the page.
                  child: RawGestureDetector(
                    behavior: HitTestBehavior.opaque,
                    gestures: enabled
                        ? {EagerGestureRecognizer: GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(EagerGestureRecognizer.new, (_) {})}
                        : const {},
                    child: Listener(
                      behavior: HitTestBehavior.opaque,
                      onPointerDown: _onDown,
                      onPointerMove: _onMove,
                      onPointerUp: _onUp,
                      onPointerCancel: _onUp,
                      child: CustomPaint(painter: _PadPainter(ctrl, c.textDefault)),
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _typePad(BuildContext context, double w, double inner, String message, String describedBy, String? named) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final enabled = widget.enabled;
    final h = inner / _ratio;
    // A typed signature scales with the pad, like handwriting: 9% of the width, 24 to 48.
    final size = (inner * 0.09).clamp(24.0, 48.0);
    final style = _ctrl._typedStyle.copyWith(fontSize: size, height: 1.25, fontWeight: FontWeight.w400, color: enabled ? c.textDefault : c.textSecondary);
    final name = named == null ? s.signatureFieldTypeLabel : '$named: ${s.signatureFieldTypeLabel}';
    return Container(
      width: w,
      height: h + 2,
      decoration: _padDecoration(c, focused: _textNode.hasFocus, error: message.isNotEmpty),
      child: Stack(children: [
        _line(c, inner),
        Positioned(
          left: CmSpace.s12,
          right: CmSpace.s12,
          bottom: h * (1 - _baseline) - 0.18 * size,
          child: Semantics(
            label: '$name${widget.required ? s.requiredSuffix : ''}',
            hint: describedBy.isEmpty ? null : describedBy,
            validationResult: message.isNotEmpty ? SemanticsValidationResult.invalid : SemanticsValidationResult.none,
            child: TextField(
              controller: _text,
              focusNode: _textNode,
              enabled: enabled,
              maxLength: 80,
              maxLengthEnforcement: MaxLengthEnforcement.enforced,
              autofillHints: const [AutofillHints.name],
              autocorrect: false,
              enableSuggestions: false,
              textAlign: TextAlign.center,
              style: style,
              strutStyle: StrutStyle(fontSize: size, height: 1.25, forceStrutHeight: true),
              cursorColor: c.textDefault,
              onChanged: _onType,
              onSubmitted: (_) => _typed(),
              decoration: InputDecoration(
                isCollapsed: true,
                filled: false,
                counterText: '',
                hintText: s.signatureFieldTypePlaceholder,
                hintStyle: CmType.bodyMd.copyWith(color: c.textTertiary),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

/// The dashed signing line.
class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    for (double x = 0; x < size.width; x += 8) {
      canvas.drawLine(Offset(x, 0.5), Offset(math.min(x + 4, size.width), 0.5), paint);
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}

/// Paints the saved image and the strokes in the screen's ink, at the pad's current width (never a stretched bitmap).
class _PadPainter extends CustomPainter {
  _PadPainter(this.ctrl, this.ink) : super(repaint: ctrl._ink);
  final CmSignatureController ctrl;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) => _paintInk(canvas, size.width, size.width / _ratio, ink, ctrl._strokes, ctrl._decoded, tint: true);

  @override
  bool shouldRepaint(_PadPainter old) => old.ctrl != ctrl || old.ink != ink;
}
