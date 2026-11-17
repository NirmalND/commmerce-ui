import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:path_drawing/path_drawing.dart';

import 'display.dart';
import 'forms.dart';
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Heading used above option groups and file uploads: heading-sm semibold with a red asterisk when required.
class _GroupLabel extends StatelessWidget {
  const _GroupLabel(this.label, {this.required = false, this.hint});
  final String label;
  final bool required;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Text.rich(TextSpan(children: [
      TextSpan(text: label, style: CmText.of(context).headingSm.copyWith(fontWeight: FontWeight.w600, color: c.textDefault)),
      if (required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical), semanticsLabel: CmStrings.of(context).requiredSuffix),
      if (hint != null && hint!.isNotEmpty) TextSpan(text: '  $hint', style: CmType.bodySm.copyWith(color: c.textTertiary)),
    ]));
  }
}

/// A row of outlined buttons where exactly one is selected (black), used to switch a form between
/// types, such as offer types. Behaves like a radio group: one tab stop, arrow keys move and select.
/// Mirrors `<cm-option-group>`.
class CmOptionGroup<T> extends StatefulWidget {
  const CmOptionGroup({super.key, required this.options, required this.value, required this.onChanged, this.label, this.semanticLabel, this.required = false});

  final List<CmRadioOption<T>> options;

  /// The selected value; null when nothing is selected yet.
  final T? value;

  /// Null disables every option.
  final ValueChanged<T>? onChanged;

  /// Heading above the options, e.g. "Select offer type".
  final String? label;

  /// Accessible name when there is no visible [label] (the card title already asks the question).
  final String? semanticLabel;

  /// Shows a red asterisk after the label.
  final bool required;

  @override
  State<CmOptionGroup<T>> createState() => _CmOptionGroupState<T>();
}

class _CmOptionGroupState<T> extends State<CmOptionGroup<T>> {
  final List<FocusNode> _nodes = [];
  int? _hover, _focused;

  void _syncNodes() {
    while (_nodes.length < widget.options.length) {
      _nodes.add(FocusNode(debugLabel: 'CmOptionGroup option ${_nodes.length}'));
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
    int? next;
    if (k == LogicalKeyboardKey.arrowRight || k == LogicalKeyboardKey.arrowDown) {
      next = en[(pos + 1) % en.length];
    } else if (k == LogicalKeyboardKey.arrowLeft || k == LogicalKeyboardKey.arrowUp) {
      next = en[(pos - 1 + en.length) % en.length];
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
    _syncNodes();
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final opts = widget.options;
    final sel = opts.indexWhere((o) => o.value == widget.value && o.enabled);
    final stop = sel >= 0 ? sel : opts.indexWhere((o) => o.enabled);
    final buttons = <Widget>[
      for (var i = 0; i < opts.length; i++)
        Builder(builder: (context) {
          final o = opts[i];
          final on = o.value == widget.value;
          final enabled = _enabled(i);
          final Color bg, fg, border;
          if (!enabled) {
            bg = on ? c.actionDisabled : c.bgInputFilled;
            fg = on ? c.actionDisabledText : c.textSecondary;
            border = on ? c.actionDisabled : c.borderSubtle;
          } else if (o.tone == CmTone.success || o.tone == CmTone.critical) {
            // Tones (1.3), the same token pairs as the web option group: tone text and outline on bg-surface,
            // tinted on hover; filled with the tone when selected.
            final success = o.tone == CmTone.success;
            final tone = success ? c.textSuccess : c.textCritical;
            if (on) {
              bg = _hover == i ? Color.lerp(tone, c.textDefault, 0.2)! : tone;
              fg = c.actionPrimaryText;
              border = bg;
            } else {
              bg = _hover == i ? Color.alphaBlend(success ? c.bgSuccessSoft : c.bgCritical, c.bgSurface) : c.bgSurface;
              fg = tone;
              border = success ? c.textSuccess : c.borderCritical;
            }
          } else if (on) {
            bg = c.actionPrimary; fg = c.actionPrimaryText; border = c.actionPrimary;
          } else {
            bg = c.bgHover; fg = c.textDefault; border = _hover == i ? c.borderStrong : c.borderInput;
          }
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
                  onTap: enabled ? () => _select(i) : null,
                  child: Container(
                    height: phone ? 42 : 46,
                    padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s16 : CmSpace.s20),
                    decoration: BoxDecoration(
                      color: bg,
                      border: Border.all(color: border),
                      borderRadius: BorderRadius.circular(CmRadius.sm),
                      boxShadow: _focused == i ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(o.label, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: phone ? 14 : 16, fontWeight: FontWeight.w500, color: fg)),
                    ]),
                  ),
                ),
              ),
            ),
          );
        }),
    ];
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label ?? widget.semanticLabel,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        if (widget.label != null)
          Padding(padding: const EdgeInsets.only(bottom: CmSpace.s20), child: ExcludeSemantics(child: _GroupLabel(widget.label!, required: widget.required))),
        Wrap(spacing: phone ? CmSpace.s8 : CmSpace.s20, runSpacing: phone ? CmSpace.s8 : CmSpace.s20, children: buttons),
      ]),
    );
  }
}

/// A file the app picked for a [CmFileUpload]. The widget never reads files itself: your app opens
/// its own picker (or drop target) and hands the results over.
@immutable
class CmPickedFile {
  const CmPickedFile({required this.name, required this.size, this.mimeType, this.image, this.data});

  /// File name with extension, e.g. "kurta-front.jpg".
  final String name;

  /// Size in bytes.
  final int size;

  /// MIME type if known, e.g. "image/jpeg".
  final String? mimeType;

  /// A thumbnail for images, e.g. `MemoryImage(bytes)`. Without it, the file shows as a document.
  final ImageProvider? image;

  /// Anything your app needs to upload it later (bytes, a path, a platform file object).
  final Object? data;

  /// True when [mimeType] or the extension says it is an image.
  bool get isImage => (mimeType?.startsWith('image/') ?? false) || _imageExt.any(name.toLowerCase().endsWith);

  static const _imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.heic'];
}

/// "300 KB" or "1.5 MB", as in the web component's messages. Units come from [strings].
String cmFileSize(int bytes, {CmStrings strings = const CmStrings()}) =>
    bytes >= 1024 * 1024 ? strings.megabytes(_trim((bytes / 1024 / 1024).toStringAsFixed(1))) : strings.kilobytes('${math.max(1, (bytes / 1024).round())}');

String _trim(String s) => s.endsWith('.0') ? s.substring(0, s.length - 2) : s;

/// Does [file] match an accept list such as `['image/*', '.pdf']`?
bool cmFileAccepted(CmPickedFile file, List<String> accept) {
  final rules = accept.map((a) => a.trim().toLowerCase()).where((a) => a.isNotEmpty).toList();
  if (rules.isEmpty) return true;
  final name = file.name.toLowerCase();
  final type = (file.mimeType ?? '').toLowerCase();
  return rules.any((a) {
    if (a.startsWith('.')) return name.endsWith(a);
    if (a.endsWith('/*')) {
      final family = a.substring(0, a.length - 1);
      return type.isNotEmpty ? type.startsWith(family) : (family == 'image/' && file.isImage);
    }
    return type == a;
  });
}

/// How a [CmFileUpload] looks: the drop zone with thumbnails, or one photo tile (1.3).
enum CmFileUploadVariant { standard, photo }

/// A drop zone for choosing files, with thumbnails of chosen images and a remove button on each.
/// Mirrors `<cm-file-upload>`.
///
/// Empty, it is one compact row (owner standard, 1.6): 72px tall, an icon, "Drag files here or Browse" and the [hint]
/// in 12px, with hover, drag-over ([CmFileUploadState.setDragOver]), focus, pressed and disabled states. Upload the
/// chosen files yourself: report progress with [CmFileUploadState.setProgress] (a bar and a Cancel button on that file's
/// tile; Cancel calls [onCancel] and removes the file) and a failed file with [CmFileUploadState.setFileError].
///
/// [CmFileUploadVariant.photo] is the phone capture pattern (`variant="photo"` on the web): one 4:3 tile with a
/// camera icon and the label; once a photo is chosen it fills the tile, with Retake and Remove buttons under it.
/// One file only, and [accept] defaults to `image/*`. Taking the photo is your app's job, in [onPick], since
/// Flutter has no built-in camera: with the `image_picker` package, for example,
///
/// ```dart
/// onPick: () async {
///   final shot = await ImagePicker().pickImage(source: ImageSource.camera); // the web's capture="environment"
///   if (shot == null) return null;
///   final bytes = await shot.readAsBytes();
///   return [CmPickedFile(name: shot.name, size: bytes.length, mimeType: shot.mimeType ?? 'image/jpeg', image: MemoryImage(bytes), data: bytes)];
/// },
/// ```
///
/// The package has no file-picker dependency: [onPick] opens your app's picker and returns the chosen
/// files. The widget filters them by [accept], [maxSize] and [maxFiles], then calls [onChanged] with
/// the new list and [onReject] with refused files. To add dropped files from a drop-target plugin,
/// call [CmFileUploadState.addFiles] through a `GlobalKey<CmFileUploadState>`.
class CmFileUpload extends StatefulWidget {
  const CmFileUpload({
    super.key,
    required this.files,
    required this.onChanged,
    this.onPick,
    this.onReject,
    this.label,
    this.hint,
    this.prompt,
    this.accept = const [],
    this.multiple = false,
    this.maxSize = 0,
    this.maxFiles = 0,
    this.required = false,
    this.enabled = true,
    this.error,
    this.variant = CmFileUploadVariant.standard,
    this.onCancel,
  });

  /// Called when the merchant cancels a file's upload (its Cancel button while [CmFileUploadState.setProgress] shows
  /// it uploading): stop the upload. The file is then removed. Since 1.7.
  final ValueChanged<CmPickedFile>? onCancel;

  /// [CmFileUploadVariant.photo] shows one photo tile with Retake and Remove (since 1.3). [prompt] is not used
  /// there: the empty tile shows the [label], or [CmStrings.takePhoto] without one.
  final CmFileUploadVariant variant;

  /// The chosen files. Pass `[]` to clear.
  final List<CmPickedFile> files;

  /// Called with the new list when files are added or removed.
  final ValueChanged<List<CmPickedFile>> onChanged;

  /// Opens your picker and returns the chosen files (null or empty when cancelled).
  final Future<List<CmPickedFile>?> Function()? onPick;

  /// Called with files refused for type, size or count.
  final ValueChanged<List<CmPickedFile>>? onReject;

  /// Heading above the zone, e.g. "Add product images".
  final String? label;

  /// Accepted types and size, e.g. "PNG or JPG, up to 2 MB": in the empty zone's row (since 1.7), next to the label
  /// once files are chosen, and under the label in the photo tile.
  final String? hint;

  /// Text inside the empty zone. Default: [CmStrings.fileUploadPrompt] ("Drag files here or Browse", "Browse" drawn
  /// like a link; "Click here to upload" before 1.7).
  final String? prompt;

  /// Allowed types: `['image/*']`, `['.pdf', '.csv']`. Empty allows everything.
  final List<String> accept;

  /// More than one file; new files are added to the list rather than replacing it.
  final bool multiple;

  /// Largest allowed file in bytes; 0 for no limit.
  final int maxSize;

  /// Most files allowed when [multiple]; 0 for no limit.
  final int maxFiles;

  /// Shows a red asterisk after the label. Check `files.isNotEmpty` in your own validation.
  final bool required;
  final bool enabled;

  /// Error message from your own validation; announced to screen readers.
  final String? error;

  @override
  State<CmFileUpload> createState() => CmFileUploadState();
}

/// State of a [CmFileUpload]; use [addFiles] to add files from outside (e.g. drag and drop).
class CmFileUploadState extends State<CmFileUpload> {
  final _zoneFocus = FocusNode(debugLabel: 'CmFileUpload zone');
  String _rejected = '';
  bool _hover = false, _focus = false, _pressed = false, _over = false;
  final _progress = <CmPickedFile, double>{};
  final _fileErrors = <CmPickedFile, String>{};

  /// Shows a chosen file uploading (since 1.7): a progress bar from 0 to 100 on its tile, with a Cancel button in
  /// place of Remove. `null` ends it (the upload finished, or failed: then call [setFileError]).
  void setProgress(CmPickedFile file, double? percent) {
    setState(() {
      if (percent == null) {
        _progress.remove(file);
      } else {
        _progress[file] = percent.clamp(0, 100).toDouble();
      }
    });
  }

  /// Marks one chosen file as failed (since 1.7): its tile turns red with [message] under it, announced. `''` clears it.
  void setFileError(CmPickedFile file, String message) {
    setState(() {
      if (message.isEmpty) {
        _fileErrors.remove(file);
      } else {
        _fileErrors[file] = message;
      }
    });
    if (message.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) SemanticsService.announce(message, Directionality.of(context));
      });
    }
  }

  /// Whether a file is uploading ([setProgress]).
  bool isUploading(CmPickedFile file) => _progress.containsKey(file);

  /// Shows the drag-over state ("Drop files to upload", a solid border) while files are dragged over the zone. Call it
  /// from your drop-target plugin's drag enter and leave; add the dropped files with [addFiles]. Since 1.7.
  void setDragOver(bool over) {
    if (_over != over) setState(() => _over = over);
  }

  void _cancel(CmPickedFile f) {
    widget.onCancel?.call(f);
    setState(() => _progress.remove(f));
    _remove(f);
  }

  @override
  void dispose() {
    _zoneFocus.dispose();
    super.dispose();
  }

  /// Adds files as if the merchant had chosen them: filters by type, size and count, then reports changes.
  void addFiles(List<CmPickedFile> incoming) {
    final w = widget;
    final ok = <CmPickedFile>[], refused = <CmPickedFile>[], reasons = <String>[];
    final s = CmStrings.of(context);
    for (final f in incoming) {
      if (!cmFileAccepted(f, _accept)) {
        refused.add(f);
        reasons.add(s.fileTypeNotAllowed(f.name));
      } else if (w.maxSize > 0 && f.size > w.maxSize) {
        refused.add(f);
        reasons.add(s.fileTooLarge(f.name, cmFileSize(w.maxSize, strings: s)));
      } else {
        ok.add(f);
      }
    }
    var next = _multiple ? [...w.files, ...ok] : (ok.isEmpty ? w.files : [ok.last]);
    if (_multiple && w.maxFiles > 0 && next.length > w.maxFiles) {
      refused.addAll(next.sublist(w.maxFiles));
      reasons.add(s.maxFiles(w.maxFiles));
      next = next.sublist(0, w.maxFiles);
    }
    setState(() => _rejected = reasons.join('. '));
    if (refused.isNotEmpty) w.onReject?.call(refused);
    final changed = next.length != w.files.length || [for (var i = 0; i < next.length; i++) next[i] != w.files[i]].any((d) => d);
    if (changed) w.onChanged(next);
  }

  bool get _photo => widget.variant == CmFileUploadVariant.photo;
  List<String> get _accept => widget.accept.isEmpty && _photo ? const ['image/*'] : widget.accept;
  bool get _multiple => widget.multiple && !_photo;

  void _remove(CmPickedFile f) {
    setState(() {
      _rejected = '';
      _progress.remove(f);
      _fileErrors.remove(f);
    });
    widget.onChanged([...widget.files]..remove(f));
    if (_photo) {
      // The empty tile comes back on the next frame: focus it then.
      WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) _zoneFocus.requestFocus(); });
    } else {
      _zoneFocus.requestFocus();
    }
  }

  Future<void> _pick() async {
    if (!widget.enabled || widget.onPick == null) return;
    final picked = await widget.onPick!();
    if (!mounted || picked == null || picked.isEmpty) return;
    addFiles(picked);
  }

  Widget _zone(BuildContext context, {required bool tile, double? size, String msg = ''}) {
    final c = CmTheme.colorsOf(context);
    final st = CmStrings.of(context);
    final enabled = widget.enabled && widget.onPick != null;
    final fg = widget.enabled ? c.textDefault : c.textSecondary;
    final hot = widget.enabled && (_hover || _over);
    final invalid = msg.isNotEmpty && !tile;
    final hasHint = (widget.hint ?? '').isNotEmpty;
    final prompt = widget.prompt;
    final browse = st.fileUploadBrowse;
    final full = _over ? st.fileUploadDrop : (prompt ?? st.fileUploadPrompt(browse));
    final text = tile ? st.addMore : full;
    // "Browse" is drawn like a link inside the built-in prompt.
    Widget words() {
      final style = CmType.bodyMd.copyWith(height: 20 / 14, color: fg);
      final at = prompt == null && !_over ? full.indexOf(browse) : -1;
      if (at < 0) return Text(full, style: style);
      return Text.rich(TextSpan(style: style, children: [
        TextSpan(text: full.substring(0, at)),
        TextSpan(text: browse, style: const TextStyle(fontWeight: FontWeight.w500, decoration: TextDecoration.underline)),
        TextSpan(text: full.substring(at + browse.length)),
      ]));
    }

    final border = !widget.enabled ? c.borderSubtle : invalid ? c.borderCritical : hot ? c.borderStrong : c.borderInput;
    final bg = !widget.enabled ? c.bgInputFilled : _pressed ? Color.lerp(c.bgHover, c.textDefault, 0.08)! : hot ? c.bgHover : c.bgSurface;
    return Semantics(
      button: true,
      enabled: enabled,
      label: [if (widget.label != null) widget.label!, text].join(', '),
      hint: [if (hasHint && !tile) widget.hint!, if (invalid) msg].join('. '),
      excludeSemantics: true, onTap: enabled ? _pick : null,
      child: FocusableActionDetector(
        focusNode: _zoneFocus,
        enabled: enabled,
        mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
        onShowHoverHighlight: (v) => setState(() => _hover = v),
        onShowFocusHighlight: (v) => setState(() => _focus = v),
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { _pick(); return null; })},
        child: GestureDetector(
          onTap: enabled ? _pick : null,
          onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
          onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
          onTapCancel: enabled ? () => setState(() => _pressed = false) : null,
          child: CustomPaint(
            foregroundPainter: _over ? null : _DashedBorder(color: border, radius: CmRadius.md),
            child: Container(
              width: size ?? double.infinity,
              height: size,
              constraints: tile ? null : const BoxConstraints(minHeight: 72),
              padding: tile ? const EdgeInsets.all(CmSpace.s12) : const EdgeInsets.symmetric(horizontal: CmSpace.s16, vertical: CmSpace.s12),
              decoration: BoxDecoration(
                color: bg,
                border: _over ? Border.all(color: c.borderStrong, width: 2) : null,
                borderRadius: BorderRadius.circular(CmRadius.md),
                boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
              ),
              child: tile
                  ? Column(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                      CmIcon(CmIcons.plus, size: 24, color: fg),
                      const SizedBox(height: CmSpace.s8),
                      Text(text, textAlign: TextAlign.center, style: CmType.bodyMd.copyWith(color: fg)),
                    ])
                  : Row(children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: c.bgInset, borderRadius: BorderRadius.circular(CmRadius.md)),
                        child: Center(child: CmIcon(CmIcons.upload, size: 20, color: widget.enabled ? c.iconSelected : c.textSecondary)),
                      ),
                      const SizedBox(width: CmSpace.s12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                          words(),
                          if (hasHint) ...[const SizedBox(height: 2), Text(widget.hint!, style: CmType.bodyXs.copyWith(color: c.textTertiary))],
                        ]),
                      ),
                    ]),
            ),
          ),
        ),
      ),
    );
  }

  /// A file's upload progress bar: 4px, 8 in from the tile's edges.
  Widget _bar(BuildContext context, CmPickedFile f) {
    final c = CmTheme.colorsOf(context);
    final pct = _progress[f] ?? 0;
    return Positioned(
      left: CmSpace.s8,
      right: CmSpace.s8,
      bottom: CmSpace.s8,
      child: Semantics(
        label: CmStrings.of(context).fileUploading(f.name),
        value: '${pct.round()}%',
        child: Container(
          height: 4,
          decoration: BoxDecoration(color: c.bgInset, borderRadius: BorderRadius.circular(CmRadius.full), boxShadow: [BoxShadow(color: c.bgSurface, spreadRadius: 1)]),
          alignment: AlignmentDirectional.centerStart,
          child: FractionallySizedBox(
            widthFactor: pct / 100,
            child: Container(decoration: BoxDecoration(color: c.actionPrimary, borderRadius: BorderRadius.circular(CmRadius.full))),
          ),
        ),
      ),
    );
  }

  Widget _file(BuildContext context, CmPickedFile f, double size) {
    final c = CmTheme.colorsOf(context);
    final st = CmStrings.of(context);
    final busy = isUploading(f);
    final err = _fileErrors[f] ?? '';
    final box = Container(
      width: size, height: size,
      decoration: BoxDecoration(color: c.bgInset, border: Border.all(color: err.isNotEmpty ? c.borderCritical : c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
      clipBehavior: Clip.antiAlias,
      child: f.image != null
          // Uploading: the picture fades; text stays full strength (contrast).
          ? Opacity(opacity: busy ? 0.6 : 1, child: Image(image: f.image!, fit: BoxFit.cover, semanticLabel: f.name, errorBuilder: (_, _, _) => const SizedBox()))
          : Semantics(
              label: '${f.name}, ${cmFileSize(f.size, strings: CmStrings.of(context))}',
              excludeSemantics: true,
              child: Padding(
                padding: const EdgeInsets.all(CmSpace.s8),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  CmIcon(CmIcons.book, size: 24, color: c.textDefault),
                  const SizedBox(height: CmSpace.s4),
                  Text(f.name, textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis, style: CmType.bodyXs.copyWith(color: c.textDefault)),
                  Text(cmFileSize(f.size, strings: CmStrings.of(context)), style: CmType.bodyXs.copyWith(color: c.textTertiary)),
                ]),
              ),
            ),
    );
    final onTap = busy ? () => _cancel(f) : () => _remove(f);
    // The cell is 10px larger than the thumbnail so the remove button, which overhangs the corner, stays tappable.
    final tile = SizedBox(
      width: size + 10, height: size + 10,
      child: Stack(children: [
        Positioned(left: 0, bottom: 0, width: size, height: size, child: Stack(children: [Positioned.fill(child: box), if (busy) _bar(context, f)])),
        if (widget.enabled)
          Positioned(
            top: 0, right: 0,
            child: Semantics(
              button: true,
              label: busy ? st.fileUploadCancel(f.name) : st.removeFile(f.name),
              hint: err.isEmpty ? null : err,
              excludeSemantics: true, onTap: onTap,
              child: Material(
                color: c.bgSurface,
                shape: CircleBorder(side: BorderSide(color: c.borderInput)),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onTap,
                  child: SizedBox.square(dimension: 24, child: Center(child: CmIcon(CmIcons.close, size: 12, color: c.iconSelected))),
                ),
              ),
            ),
          ),
      ]),
    );
    if (err.isEmpty) return tile;
    return SizedBox(
      width: size + 10,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        tile,
        const SizedBox(height: CmSpace.s4),
        Padding(padding: const EdgeInsets.only(right: CmSpace.s8), child: Text(err, style: CmType.bodyXs.copyWith(color: c.textCritical))),
      ]),
    );
  }

  /// The photo variant: an empty 4:3 tile, or the photo with Retake and Remove.
  Widget _photoTile(BuildContext context, String msg) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final f = widget.files.isEmpty ? null : widget.files.first;
    final name = (widget.label ?? '').isNotEmpty ? widget.label! : s.photo;
    final enabled = widget.enabled && widget.onPick != null;
    final fg = widget.enabled ? c.textDefault : c.textSecondary;
    if (f == null) {
      final text = (widget.label ?? '').isNotEmpty ? widget.label! : s.takePhoto;
      return Semantics(
        button: true,
        enabled: enabled,
        label: '$text${widget.required ? s.requiredSuffix : ''}',
        hint: [if ((widget.hint ?? '').isNotEmpty) widget.hint!, if (msg.isNotEmpty) msg].join('. '),
        excludeSemantics: true,
        onTap: enabled ? _pick : null,
        child: FocusableActionDetector(
          focusNode: _zoneFocus,
          enabled: enabled,
          mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.forbidden,
          onShowHoverHighlight: (v) => setState(() => _hover = v),
          onShowFocusHighlight: (v) => setState(() => _focus = v),
          actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { _pick(); return null; })},
          child: GestureDetector(
            onTap: enabled ? _pick : null,
            // Empty, the tile is 4:3 up to 120 tall (owner standard, 1.6): a full-width strip in a wide column.
            // Longer text (or larger type) makes it taller rather than cutting it off.
            child: LayoutBuilder(builder: (context, box) => ConstrainedBox(
              constraints: BoxConstraints(minHeight: math.min(120, (box.maxWidth.isFinite ? box.maxWidth : 160) * 3 / 4)),
              child: CustomPaint(
                foregroundPainter: _DashedBorder(color: msg.isNotEmpty ? c.borderCritical : (widget.enabled ? c.borderStrong : c.borderSubtle), radius: CmRadius.md),
                child: Container(
                  padding: const EdgeInsets.all(CmSpace.s12),
                  decoration: BoxDecoration(
                    color: !widget.enabled ? c.bgInputFilled : (_hover ? c.bgHover : c.bgSurface),
                    borderRadius: BorderRadius.circular(CmRadius.md),
                    boxShadow: _focus ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)] : null,
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    CmIcon(CmIcons.camera, size: 24, color: fg),
                    const SizedBox(height: CmSpace.s4),
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(text: text),
                        if (widget.required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical)),
                      ]),
                      textAlign: TextAlign.center,
                      style: CmType.bodyMd.copyWith(fontSize: 14, fontWeight: FontWeight.w500, color: fg),
                    ),
                    if ((widget.hint ?? '').isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(widget.hint!, textAlign: TextAlign.center, style: CmType.bodyXs.copyWith(color: c.textTertiary)),
                      ),
                  ]),
                ),
              ),
            )),
          ),
        ),
      );
    }
    Widget action(String icon, String text, String semantic, VoidCallback onTap) => Expanded(
          child: Semantics(
            button: true,
            label: semantic,
            hint: msg.isNotEmpty ? msg : null,
            excludeSemantics: true,
            onTap: onTap,
            child: Material(
              color: c.bgHover,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.sm), side: BorderSide(color: c.borderStrong)),
              child: InkWell(
                onTap: onTap,
                hoverColor: c.bgSurface,
                borderRadius: BorderRadius.circular(CmRadius.sm),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 40),
                  padding: const EdgeInsets.symmetric(horizontal: CmSpace.s16),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                    CmIcon(icon, size: 16, color: c.textDefault),
                    const SizedBox(width: CmSpace.s8),
                    Flexible(child: Text(text, style: CmType.bodyMd.copyWith(fontSize: 14, fontWeight: FontWeight.w500, color: c.textDefault))),
                  ]),
                ),
              ),
            ),
          ),
        );
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      AspectRatio(
        aspectRatio: 4 / 3,
        child: Container(
          decoration: BoxDecoration(color: c.bgInset, border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
          clipBehavior: Clip.antiAlias,
          child: f.image != null
              ? Image(image: f.image!, fit: BoxFit.cover, semanticLabel: name, errorBuilder: (_, _, _) => const SizedBox())
              : Semantics(
                  label: '${f.name}, ${cmFileSize(f.size, strings: s)}',
                  excludeSemantics: true,
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    CmIcon(CmIcons.book, size: 24, color: c.textDefault),
                    const SizedBox(height: CmSpace.s4),
                    Text(f.name, textAlign: TextAlign.center, style: CmType.bodySm.copyWith(color: c.textDefault)),
                    Text(cmFileSize(f.size, strings: s), style: CmType.bodySm.copyWith(color: c.textTertiary)),
                  ]),
                ),
        ),
      ),
      if ((widget.label ?? '').isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: CmSpace.s8),
          child: ExcludeSemantics(child: Text(widget.label!, style: CmType.bodyMd.copyWith(fontSize: 14, fontWeight: FontWeight.w500, color: c.textDefault))),
        ),
      if (widget.enabled)
        Padding(
          padding: const EdgeInsets.only(top: CmSpace.s8),
          child: Row(children: [
            if (widget.onPick != null) ...[
              action(CmIcons.camera, s.retakePhoto, s.retakePhotoOf(name), _pick),
              const SizedBox(width: CmSpace.s8),
            ],
            action(CmIcons.trash, s.removePhoto, s.removePhotoOf(name), () => _remove(f)),
          ]),
        ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final msg = (widget.error != null && widget.error!.isNotEmpty) ? widget.error! : _rejected;
    final files = widget.files;
    if (_photo) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        _photoTile(context, msg),
        if (msg.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: CmSpace.s8),
            child: Semantics(liveRegion: true, child: Text(msg, style: CmType.bodySm.copyWith(color: c.textCritical))),
          ),
      ]);
    }
    final hasLabel = (widget.label ?? '').isNotEmpty;
    // The hint sits in the empty zone's row; next to the label once files are chosen.
    final hasHint = (widget.hint ?? '').isNotEmpty && files.isNotEmpty;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      if (hasLabel || hasHint)
        Padding(
          padding: const EdgeInsets.only(bottom: CmSpace.s8),
          child: ExcludeSemantics(child: hasLabel ? _GroupLabel(widget.label!, required: widget.required, hint: hasHint ? widget.hint : null) : Text(widget.hint!, style: CmType.bodyXs.copyWith(color: c.textTertiary))),
        ),
      if (files.isEmpty)
        _zone(context, tile: false, msg: msg)
      else
        LayoutBuilder(builder: (context, box) {
          // Tiles of 112–140px, 16px apart, as the web grid's auto-fill (1.6). Each cell is 10px wider than its tile
          // for the remove button that overhangs the corner, so cells are 6 apart.
          const spacing = CmSpace.s16 - 10;
          final n = math.max(1, ((box.maxWidth + spacing) / (112 + 10 + spacing)).floor());
          final cell = math.min(140.0 + 10, (box.maxWidth - (n - 1) * spacing) / n);
          final size = cell - 10;
          return Semantics(
            container: true,
            label: CmStrings.of(context).chosenFiles,
            explicitChildNodes: true,
            child: Wrap(spacing: spacing, runSpacing: spacing, children: [
              for (final f in files) _file(context, f, size),
              if (widget.multiple) SizedBox(width: cell, height: cell, child: Align(alignment: Alignment.bottomLeft, child: _zone(context, tile: true, size: size))),
            ]),
          );
        }),
      if (msg.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: CmSpace.s8),
          child: Semantics(liveRegion: true, child: Text(msg, style: CmType.bodySm.copyWith(color: c.textCritical))),
        ),
    ]);
  }
}

class _DashedBorder extends CustomPainter {
  _DashedBorder({required this.color, required this.radius});
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)).deflate(0.5);
    final path = dashPath(Path()..addRRect(rect), dashArray: CircularIntervalList<double>([4, 3]));
    canvas.drawPath(path, Paint()..style = PaintingStyle.stroke..strokeWidth = 1..color = color);
  }

  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color || old.radius != radius;
}
