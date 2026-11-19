import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'shortcut.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// One record or action in the command palette ([showCmCommandPalette]). Mirrors the web's `CommandPaletteItem`.
@immutable
class CmCommandItem {
  const CmCommandItem({required this.title, this.description, this.icon, this.value, this.shortcut, this.keywords = const [], this.onRun});

  /// What it is or does: "Ravi Stores", "New lead", "Go to Tasks".
  final String title;

  /// A second line in smaller grey text: "Lead · Mumbai".
  final String? description;

  /// Icon name from [CmIcons], shown before the title.
  final String? icon;

  /// Identifies the item (an id or a route) when the palette completes.
  final Object? value;

  /// A key hint shown on the right as keycaps: `mod+shift+l` (⌘ ⇧ L on a Mac, Ctrl Shift L elsewhere), or `g t` for
  /// keys pressed one after the other. Only shown: your app listens for the shortcut itself.
  final String? shortcut;

  /// More words that find this action when typed: `['create', 'add']` for "New lead". Only used for actions.
  final List<String> keywords;

  /// Called when the item is chosen, after the palette has closed.
  final VoidCallback? onRun;
}

/// A group of items in the command palette: "Records", "Actions", "Navigate". Mirrors the web's `CommandPaletteGroup`.
@immutable
class CmCommandGroup {
  const CmCommandGroup({required this.label, required this.items, this.total, this.seeAll = false, this.seeAllLabel, this.value});

  /// Group heading: "Actions".
  final String label;

  /// The items, best first. Groups with no items are skipped.
  final List<CmCommandItem> items;

  /// For search results: how many records match in total, shown next to the heading. Not shown when null.
  final int? total;

  /// For search results: adds a "See all" row (your list page filtered by the query). Choosing it completes the
  /// palette with a [CmCommandSelection] whose item is null.
  final bool seeAll;

  /// Text of that row, instead of the palette's `seeAllLabel`.
  final String? seeAllLabel;

  /// Identifies the group in the [CmCommandSelection].
  final Object? value;
}

/// What was chosen in the command palette: an item, or a group's "See all" row ([item] null), and the query then.
@immutable
class CmCommandSelection {
  const CmCommandSelection({required this.group, required this.item, required this.query});
  final CmCommandGroup group;
  final CmCommandItem? item;
  final String query;
}

/// Finds records for a query: called as the merchant types (not for an empty box). Return groups of records.
typedef CmCommandSearch = Future<List<CmCommandGroup>> Function(String query);

const _fold = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ā': 'a', 'ă': 'a', 'ą': 'a',
  'ç': 'c', 'ć': 'c', 'č': 'c', 'ď': 'd', 'đ': 'd',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
  'ğ': 'g', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'į': 'i', 'ı': 'i',
  'ł': 'l', 'ñ': 'n', 'ń': 'n', 'ň': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'ō': 'o', 'ő': 'o',
  'ř': 'r', 'ś': 's', 'š': 's', 'ş': 's', 'ș': 's', 'ť': 't', 'ț': 't',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ū': 'u', 'ů': 'u', 'ű': 'u', 'ų': 'u',
  'ý': 'y', 'ÿ': 'y', 'ź': 'z', 'ż': 'z', 'ž': 'z', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe',
};

/// Lower-cases [s] and drops accents from Latin letters ("Café" → "cafe"), for matching.
String cmFoldText(String s) {
  final lower = s.toLowerCase();
  final b = StringBuffer();
  for (final ch in lower.split('')) {
    final code = ch.codeUnitAt(0);
    // Combining marks (U+0300–U+036F) on their own are dropped.
    if (code >= 0x300 && code <= 0x36F) continue;
    b.write(_fold[ch] ?? ch);
  }
  return b.toString();
}

/// Whether an action matches a query: every word of the query appears in the title or a keyword (any case, any
/// accents). Mirrors `commandMatches()`.
bool cmCommandMatches(CmCommandItem item, String query) {
  final words = cmFoldText(query).split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  if (words.isEmpty) return true;
  final hay = cmFoldText([item.title, ...item.keywords].join(' '));
  return words.every(hay.contains);
}

/// The command palette route that is open, so [CmCommandPaletteShortcut] can close it again.
Route<Object?>? _openPalette;

/// Opens the command palette: a search box in a dialog for people who work from the keyboard, to jump to any record
/// or run an action without leaving the keys. Mirrors `<cm-command-palette>`. Since 1.7.
///
/// Two kinds of content, in groups:
/// - [actions]: things your app can do or places it can go ("New lead", "Go to Tasks"), set once. The palette filters
///   them itself as the merchant types: every typed word must appear in the title or a keyword (any case, any accents).
/// - records from [search]: called as the merchant types; return groups of records. "Loading" shows while it runs
///   (matching actions still show), and answers to older queries are dropped.
///
/// While the box is empty it shows [recent] items under "Recent", then every action. The first row is highlighted,
/// so Enter runs it. ↓/↑ move (wrapping), Home/End jump to the first and last row, Enter chooses, Esc closes. The
/// result count, "Loading" and "No results" are announced politely. On phone widths (640 or less) the palette is full
/// screen with a close button; elsewhere it is a 640px dialog 12% down the screen. The search box is 40 tall (44 and
/// 16px text on touch screens).
///
/// Completes with what was chosen (null when closed without a choice). A chosen item's [CmCommandItem.onRun] is called
/// after the palette has closed, so focus is back where it was first.
Future<CmCommandSelection?> showCmCommandPalette(
  BuildContext context, {
  List<CmCommandGroup> actions = const [],
  List<CmCommandItem> recent = const [],
  CmCommandSearch? search,
  Duration debounce = Duration.zero,
  String? label,
  String? placeholder,
  String? emptyText,
  String? loadingText,
  String? recentLabel,
  String? seeAllLabel,
  String initialQuery = '',
}) async {
  final s = CmStrings.of(context);
  final narrow = cmIsNarrow(context);
  final c = CmTheme.colorsOf(context);
  final name = label ?? s.commandPaletteLabel;
  final route = RawDialogRoute<CmCommandSelection>(
    barrierDismissible: true,
    barrierLabel: s.close,
    barrierColor: narrow ? Colors.transparent : c.overlay,
    transitionDuration: cmDuration(context, CmMotion.fast),
    transitionBuilder: (context, a, _, child) => FadeTransition(opacity: a, child: child),
    pageBuilder: (context, _, _) => CmCommandPalette(
      actions: actions,
      recent: recent,
      search: search,
      debounce: debounce,
      label: name,
      placeholder: placeholder,
      emptyText: emptyText,
      loadingText: loadingText,
      recentLabel: recentLabel,
      seeAllLabel: seeAllLabel,
      initialQuery: initialQuery,
      onClose: (sel) => Navigator.of(context).pop(sel),
    ),
  );
  _openPalette = route;
  final CmCommandSelection? sel;
  try {
    sel = await Navigator.of(context, rootNavigator: true).push<CmCommandSelection>(route);
  } finally {
    if (_openPalette == route) _openPalette = null;
  }
  sel?.item?.onRun?.call();
  return sel;
}

/// Closes the open command palette, if any, without a choice. Returns false when none is open.
bool closeCmCommandPalette() {
  final r = _openPalette;
  if (r == null || !r.isActive) return false;
  r.navigator?.removeRoute(r);
  return true;
}

/// Whether a command palette is open.
bool get isCmCommandPaletteOpen => _openPalette?.isActive ?? false;

class _Row {
  const _Row(this.group, this.item);
  final CmCommandGroup group;
  final CmCommandItem? item;
}

class _View {
  const _View(this.group, this.rows, {this.showTotal = false});
  final CmCommandGroup group;
  final List<_Row> rows;
  final bool showTotal;
}

/// The palette's content: the search box over the grouped list. Shown by [showCmCommandPalette]; use it directly only
/// to put the palette in your own route or layout.
class CmCommandPalette extends StatefulWidget {
  const CmCommandPalette({
    super.key,
    this.actions = const [],
    this.recent = const [],
    this.search,
    this.debounce = Duration.zero,
    this.label,
    this.placeholder,
    this.emptyText,
    this.loadingText,
    this.recentLabel,
    this.seeAllLabel,
    this.initialQuery = '',
    required this.onClose,
  });

  final List<CmCommandGroup> actions;
  final List<CmCommandItem> recent;
  final CmCommandSearch? search;

  /// Waits this long after the last key before calling [search].
  final Duration debounce;

  /// Accessible name of the dialog and its box. Default: [CmStrings.commandPaletteLabel] ("Command palette").
  final String? label;

  /// Text in the empty box. Default: [CmStrings.commandPalettePlaceholder] ("Search or run a command").
  final String? placeholder;

  /// Shown when nothing matches. Default: [CmStrings.noResults].
  final String? emptyText;

  /// Shown while [search] runs. Default: [CmStrings.loading].
  final String? loadingText;

  /// Heading of [recent]. Default: [CmStrings.recent].
  final String? recentLabel;

  /// Text of each results group's "See all" row. Default: [CmStrings.seeAll].
  final String? seeAllLabel;
  final String initialQuery;

  /// Called with the choice, or null for Esc and the close button.
  final ValueChanged<CmCommandSelection?> onClose;

  @override
  State<CmCommandPalette> createState() => _CmCommandPaletteState();
}

class _CmCommandPaletteState extends State<CmCommandPalette> {
  late final _text = TextEditingController(text: widget.initialQuery);
  final _focus = FocusNode(debugLabel: 'CmCommandPalette');
  final _scroll = ScrollController();
  final _rowKeys = <int, GlobalKey>{};
  List<CmCommandGroup> _results = const [];
  bool _loading = false;
  int _active = 0;
  int _seq = 0;
  Timer? _debounce;
  String _lastStatus = '';

  String get _query => _text.text.trim();

  @override
  void initState() {
    super.initState();
    if (_query.isNotEmpty) _runSearch(_query);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focus.requestFocus();
      _text.selection = TextSelection(baseOffset: 0, extentOffset: _text.text.length);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _text.dispose();
    _focus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  List<_View> _view() {
    final s = CmStrings.of(context);
    final q = _query;
    final out = <_View>[];
    if (q.isEmpty) {
      if (widget.recent.isNotEmpty) {
        final g = CmCommandGroup(label: widget.recentLabel ?? s.recent, items: widget.recent);
        out.add(_View(g, [for (final it in widget.recent) _Row(g, it)]));
      }
    } else if (!_loading) {
      for (final g in _results.where((g) => g.items.isNotEmpty)) {
        out.add(_View(g, [for (final it in g.items) _Row(g, it), if (g.seeAll) _Row(g, null)], showTotal: g.total != null));
      }
    }
    for (final g in widget.actions) {
      final items = q.isEmpty ? g.items : g.items.where((it) => cmCommandMatches(it, q)).toList();
      if (items.isNotEmpty) out.add(_View(g, [for (final it in items) _Row(g, it)]));
    }
    return out;
  }

  List<_Row> _rows([List<_View>? view]) => [for (final v in view ?? _view()) ...v.rows];

  void _runSearch(String q) {
    final search = widget.search;
    _debounce?.cancel();
    final seq = ++_seq;
    if (search == null || q.isEmpty) {
      _results = const [];
      _loading = false;
      return;
    }
    _loading = true;
    Future<void> go() async {
      try {
        final r = await search(q);
        if (!mounted || seq != _seq) return;
        setState(() {
          _results = r;
          _loading = false;
          _fixActive();
        });
      } catch (_) {
        if (!mounted || seq != _seq) return;
        setState(() {
          _results = const [];
          _loading = false;
          _fixActive();
        });
      }
    }

    if (widget.debounce == Duration.zero) {
      go();
    } else {
      _debounce = Timer(widget.debounce, go);
    }
  }

  void _fixActive() {
    final n = _rows().length;
    if (_active >= n || _active < 0) _active = n > 0 ? 0 : -1;
  }

  void _onChanged(String v) {
    setState(() {
      _runSearch(v.trim());
      _active = _rows().isNotEmpty ? 0 : -1;
    });
  }

  void _move(int to) {
    final n = _rows().length;
    if (n == 0) return;
    setState(() => _active = to);
    final key = _rowKeys[_active];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = key?.currentContext;
      if (ctx == null || !ctx.mounted) return;
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd);
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart);
    });
  }

  void _choose(_Row row) => widget.onClose(CmCommandSelection(group: row.group, item: row.item, query: _query));

  KeyEventResult _onKey(FocusNode node, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    final n = _rows().length;
    if (k == LogicalKeyboardKey.arrowDown || k == LogicalKeyboardKey.arrowUp) {
      if (n > 0) _move(_active < 0 ? 0 : (_active + (k == LogicalKeyboardKey.arrowDown ? 1 : -1) + n) % n);
      return KeyEventResult.handled;
    }
    if ((k == LogicalKeyboardKey.home || k == LogicalKeyboardKey.end) && !HardwareKeyboard.instance.isShiftPressed && n > 0) {
      _move(k == LogicalKeyboardKey.home ? 0 : n - 1);
      return KeyEventResult.handled;
    }
    if (e is! KeyDownEvent) return KeyEventResult.ignored;
    if (k == LogicalKeyboardKey.enter || k == LogicalKeyboardKey.numpadEnter) {
      final rows = _rows();
      if (_active >= 0 && _active < rows.length) _choose(rows[_active]);
      return KeyEventResult.handled;
    }
    if (k == LogicalKeyboardKey.escape) {
      widget.onClose(null);
      return KeyEventResult.handled;
    }
    // The page-wide shortcut closes the palette again.
    for (final a in CmCommandPaletteShortcut._active) {
      if (a.accepts(e, HardwareKeyboard.instance)) {
        widget.onClose(null);
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  void _announce(String status) {
    if (status == _lastStatus) return;
    _lastStatus = status;
    if (status.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      SemanticsService.announce(status, Directionality.of(context));
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final narrow = cmIsNarrow(context);
    final touch = cmIsTouch(context);
    final size = MediaQuery.sizeOf(context);
    final label = widget.label ?? s.commandPaletteLabel;
    final view = _view();
    final rows = _rows(view);
    final q = _query;
    final items = rows.where((r) => r.item != null).length;
    final loadingText = widget.loadingText ?? s.loading;
    final emptyText = widget.emptyText ?? s.noResults;
    final status = q.isEmpty ? '' : _loading ? loadingText : rows.isNotEmpty ? s.globalSearchResults(items) : emptyText;
    _announce(status);

    final fieldStyle = CmType.bodyMd.copyWith(fontSize: touch ? 16 : 14, height: 20 / (touch ? 16 : 14), color: c.textDefault);
    final box = Container(
      height: touch ? CmControlHeight.touch : CmControlHeight.lg,
      padding: const EdgeInsetsDirectional.only(start: CmSpace.s12, end: CmSpace.s8),
      decoration: BoxDecoration(
        color: c.bgPage,
        borderRadius: BorderRadius.circular(CmRadius.sm),
        border: Border.all(color: c.borderStrong, width: 2),
      ),
      child: Row(children: [
        CmIcon(CmIcons.search, size: 16, color: c.iconSelected),
        const SizedBox(width: CmSpace.s8),
        Expanded(
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: _onKey,
            child: Semantics(
              label: label,
              child: TextField(
                controller: _text,
                focusNode: _focus,
                onChanged: _onChanged,
                textInputAction: TextInputAction.go,
                onSubmitted: (_) {
                  final r = _rows();
                  if (_active >= 0 && _active < r.length) _choose(r[_active]);
                },
                autocorrect: false,
                enableSuggestions: false,
                style: fieldStyle,
                cursorColor: c.textDefault,
                decoration: InputDecoration(
                  isCollapsed: true,
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  hintText: widget.placeholder ?? s.commandPalettePlaceholder,
                  hintStyle: fieldStyle.copyWith(color: c.textTertiary),
                ),
              ),
            ),
          ),
        ),
        if (!narrow) ...[const SizedBox(width: CmSpace.s8), const CmKeys('escape')],
      ]),
    );

    final top = Container(
      padding: const EdgeInsets.all(CmSpace.s12),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.borderSubtle))),
      child: Row(children: [
        Expanded(child: box),
        if (narrow) ...[const SizedBox(width: CmSpace.s8), _CloseButton(label: s.close, onTap: () => widget.onClose(null))],
      ]),
    );

    var i = -1;
    final list = <Widget>[];
    for (var gi = 0; gi < view.length; gi++) {
      final v = view[gi];
      final total = v.group.total;
      final groupRows = <Widget>[
        Semantics(
          header: true,
          label: v.showTotal && total != null ? '${v.group.label}, ${s.globalSearchResults(total)}' : v.group.label,
          excludeSemantics: true,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(CmSpace.s12, CmSpace.s8, CmSpace.s12, CmSpace.s4),
            child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Flexible(child: Text(v.group.label, style: CmType.bodyXs.copyWith(fontWeight: FontWeight.w500, color: c.textTertiary))),
              if (v.showTotal && total != null) ...[
                const SizedBox(width: CmSpace.s8),
                Text(CmStrings.groupDigits(total), style: CmType.bodyXs.copyWith(color: c.textTertiary)),
              ],
            ]),
          ),
        ),
      ];
      for (final r in v.rows) {
        i++;
        groupRows.add(_option(context, i, r, touch));
      }
      list.add(Container(
        margin: EdgeInsets.only(top: gi == 0 ? 0 : CmSpace.s4),
        padding: EdgeInsets.only(top: gi == 0 ? 0 : CmSpace.s4),
        decoration: gi == 0 ? null : BoxDecoration(border: Border(top: BorderSide(color: c.borderSubtle))),
        child: Semantics(container: true, explicitChildNodes: true, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: groupRows)),
      ));
    }

    Widget message(String text, {bool spinner = false}) => ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s12, vertical: CmSpace.s12),
            child: Row(children: [
              if (spinner) ...[const CmSpinner(size: CmSpinnerSize.small), const SizedBox(width: CmSpace.s8)],
              Flexible(child: Text(text, style: CmType.bodyMd.copyWith(color: c.textTertiary))),
            ]),
          ),
        );

    final results = SingleChildScrollView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(CmSpace.s8, 0, CmSpace.s8, CmSpace.s4),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        if (_loading && q.isNotEmpty) message(loadingText, spinner: true),
        if (list.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: CmSpace.s4), child: Semantics(container: true, explicitChildNodes: true, label: label, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: list))),
        if (q.isNotEmpty && !_loading && rows.isEmpty) message(emptyText),
      ]),
    );

    final panel = Material(
      color: c.bgSurface,
      borderRadius: narrow ? null : BorderRadius.circular(CmRadius.lg),
      clipBehavior: Clip.antiAlias,
      child: Column(mainAxisSize: narrow ? MainAxisSize.max : MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        top,
        if (narrow) Expanded(child: results) else Flexible(child: results),
      ]),
    );

    final dialog = Semantics(
      scopesRoute: true,
      namesRoute: true,
      explicitChildNodes: true,
      label: label,
      child: narrow
          ? SafeArea(child: panel)
          : Align(
              alignment: Alignment.topCenter,
              child: Padding(
                padding: EdgeInsets.only(top: math.max(CmSpace.s16, size.height * 0.12)),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: math.min(640, size.width - 32), maxHeight: math.max(160, size.height * 0.88 - 32)),
                  child: DecoratedBox(
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(CmRadius.lg), boxShadow: CmShadow.lg),
                    child: panel,
                  ),
                ),
              ),
            ),
    );
    return narrow ? ColoredBox(color: c.bgSurface, child: dialog) : dialog;
  }

  Widget _option(BuildContext context, int index, _Row row, bool touch) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final active = index == _active;
    final it = row.item;
    final key = _rowKeys.putIfAbsent(index, GlobalKey.new);
    final seeAll = row.group.seeAllLabel ?? widget.seeAllLabel ?? s.seeAll;
    final content = it == null
        ? Text(seeAll, style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault, decoration: TextDecoration.underline))
        : Row(children: [
            if (it.icon != null) ...[CmIcon(it.icon!, size: 16, color: c.iconSelected), const SizedBox(width: CmSpace.s8)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(it.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault)),
                if (it.description != null)
                  Text(it.description!, maxLines: 1, overflow: TextOverflow.ellipsis, style: CmType.bodyXs.copyWith(color: c.textTertiary)),
              ]),
            ),
            if (it.shortcut != null && it.shortcut!.isNotEmpty) ...[const SizedBox(width: CmSpace.s8), CmKeys(it.shortcut!)],
          ]);
    final spoken = it?.shortcut == null ? '' : CmShortcut.spoken(it!.shortcut!, apple: CmShortcut.isApple(Theme.of(context).platform));
    final name = it == null ? seeAll : [it.title, if (it.description != null) it.description!, if (spoken.isNotEmpty) spoken].join(', ');
    return Semantics(
      key: key,
      button: true,
      selected: active,
      label: name,
      excludeSemantics: true,
      onTap: () => _choose(row),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _active = index),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => _choose(row),
          child: Container(
            constraints: BoxConstraints(minHeight: touch ? CmControlHeight.touch : CmControlHeight.md),
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s12, vertical: CmSpace.s8),
            alignment: AlignmentDirectional.centerStart,
            decoration: BoxDecoration(
              color: active ? c.bgHover : null,
              borderRadius: BorderRadius.circular(CmRadius.sm),
              border: active ? BorderDirectional(start: BorderSide(color: c.borderStrong, width: 2)) : null,
            ),
            child: content,
          ),
        ),
      ),
    );
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final d = cmIsTouch(context) ? CmControlHeight.touch : CmControlHeight.md;
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(CmRadius.sm),
        hoverColor: c.bgHover,
        child: SizedBox.square(dimension: d, child: Center(child: CmIcon(CmIcons.close, size: 18, color: c.iconSelected))),
      ),
    );
  }
}

/// The intent [CmCommandPaletteShortcut] maps its shortcut to.
class CmOpenCommandPaletteIntent extends Intent {
  const CmOpenCommandPaletteIntent();
}

/// Opens the command palette from anywhere below it with a page-wide shortcut: `mod+k` (Cmd+K on a Mac, Ctrl+K
/// elsewhere) by default. Pressed again while the palette is open, it closes it. Built with [Shortcuts] and [Actions]
/// (the shortcut maps to [CmOpenCommandPaletteIntent]), so it only fires while focus is below it; it gives focus to
/// its child when nothing else has it, so the shortcut works straight away. Since 1.7.
///
/// Wrap your pages once (inside `MaterialApp`, e.g. in `builder` or around your home page), and keep a visible
/// button that opens the palette too:
///
/// ```dart
/// CmCommandPaletteShortcut(
///   onOpen: () => showCmCommandPalette(navigatorKey.currentContext!, actions: actions, search: searchRecords),
///   child: child,
/// )
/// ```
class CmCommandPaletteShortcut extends StatefulWidget {
  const CmCommandPaletteShortcut({super.key, required this.onOpen, required this.child, this.shortcut = 'mod+k'});

  /// Opens the palette, usually with [showCmCommandPalette].
  final VoidCallback onOpen;

  /// The shortcut, written as for [CmShortcut] (`mod+k`, `ctrl+shift+p`). Use one with Ctrl, Cmd or Alt.
  final String shortcut;
  final Widget child;

  static final _active = <SingleActivator>{};

  @override
  State<CmCommandPaletteShortcut> createState() => _CmCommandPaletteShortcutState();
}

class _CmCommandPaletteShortcutState extends State<CmCommandPaletteShortcut> {
  SingleActivator? _activator;

  void _register(TargetPlatform platform) {
    if (_activator != null) CmCommandPaletteShortcut._active.remove(_activator);
    _activator = CmShortcut.activator(widget.shortcut, apple: CmShortcut.isApple(platform));
    if (_activator != null) CmCommandPaletteShortcut._active.add(_activator!);
  }

  @override
  void dispose() {
    if (_activator != null) CmCommandPaletteShortcut._active.remove(_activator);
    super.dispose();
  }

  void _toggle() {
    if (!closeCmCommandPalette()) widget.onOpen();
  }

  @override
  Widget build(BuildContext context) {
    final platform = Theme.of(context).platform;
    _register(platform);
    final a = _activator;
    if (a == null) return widget.child;
    return Shortcuts(
      shortcuts: {a: const CmOpenCommandPaletteIntent()},
      child: Actions(
        actions: {
          CmOpenCommandPaletteIntent: CallbackAction<CmOpenCommandPaletteIntent>(onInvoke: (_) {
            _toggle();
            return null;
          }),
        },
        child: Focus(autofocus: true, skipTraversal: true, child: widget.child),
      ),
    );
  }
}
