import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// One result in a [CmGlobalSearch]: a record with its name and a second line.
@immutable
class CmGlobalSearchItem {
  const CmGlobalSearchItem({required this.title, this.description, this.icon, this.value});

  /// The record's name: "Ravi Stores".
  final String title;

  /// A second line in smaller grey text: "Lead · Mumbai · +91 98200 12345".
  final String? description;

  /// Icon name from [CmIcons], shown before the title.
  final String? icon;

  /// Identifies the result in [CmGlobalSearch.onSelected] (an id or a route).
  final Object? value;
}

/// A group of results of one kind ("Leads", "Deals") in a [CmGlobalSearch].
@immutable
class CmGlobalSearchGroup {
  const CmGlobalSearchGroup({required this.label, required this.items, this.total, this.seeAll = false, this.seeAllLabel, this.value});

  /// Group heading: "Leads".
  final String label;

  /// The results shown, best first. Keep to about five per group. Groups with no items are skipped.
  final List<CmGlobalSearchItem> items;

  /// How many records of this kind match in total, shown next to the heading. Defaults to the number of items.
  final int? total;

  /// Adds a "See all" row under the group, for your list page filtered by the query. Choosing it calls
  /// [CmGlobalSearch.onSelected] with a null item.
  final bool seeAll;

  /// Text of that row, instead of [CmGlobalSearch.seeAllLabel].
  final String? seeAllLabel;

  /// Identifies the group in [CmGlobalSearch.onSelected].
  final Object? value;
}

/// Called when a result is chosen; [item] is null for a group's "See all" row.
typedef CmGlobalSearchSelected = void Function(CmGlobalSearchGroup group, CmGlobalSearchItem? item);

/// Lets a search inside the [CmHeaderBar]'s full-screen search layer close it. [CmGlobalSearch] uses it to close
/// the layer after a result is chosen and to show its results in the layer instead of floating over the page.
class CmSearchLayerScope extends InheritedWidget {
  const CmSearchLayerScope({super.key, required this.close, required super.child});

  /// Closes the layer and returns focus to the search button.
  final VoidCallback close;

  /// The layer around [context], or null outside one.
  static CmSearchLayerScope? maybeOf(BuildContext context) => context.dependOnInheritedWidgetOfExactType<CmSearchLayerScope>();

  @override
  bool updateShouldNotify(CmSearchLayerScope oldWidget) => close != oldWidget.close;
}

class _Row {
  const _Row(this.group, this.item);
  final CmGlobalSearchGroup group;
  final CmGlobalSearchItem? item;
}

/// One box that searches everything (customers, orders, products…) and lists the matches grouped by kind.
/// Mirrors `<cm-global-search>`. Since 1.1.
///
/// Your app does the searching: [onSearch] is called as the merchant types (and with '' when the box is cleared);
/// fetch, then rebuild with [results] (and [loading] while it runs). Choosing a result calls [onSelected].
/// Put it in [CmHeaderBar.search]: on narrow bars it opens full screen behind a search button.
///
/// Keyboard, as on the web (WAI-ARIA combobox with a grouped listbox): focus stays in the box; ↓/↑ move through
/// the results and "See all" rows (wrapping), Enter chooses, Esc closes the results (then clears the box), Tab
/// closes them and moves on. A tap outside closes them too. Results are announced politely as they arrive.
class CmGlobalSearch extends StatefulWidget {
  const CmGlobalSearch({
    super.key,
    this.results = const [],
    this.loading = false,
    this.onSearch,
    this.onSelected,
    this.controller,
    this.focusNode,
    this.label,
    this.placeholder,
    this.emptyText,
    this.loadingText,
    this.seeAllLabel,
    this.shortcut,
    this.autofocus = false,
    this.inlineResults,
  });

  /// Results for the current query, grouped by kind.
  final List<CmGlobalSearchGroup> results;

  /// Shows "Loading" with a spinner in place of the results while you fetch them.
  final bool loading;

  /// Called with the query as the merchant types, and with '' when the box is cleared.
  final ValueChanged<String>? onSearch;

  /// Called when a result or a "See all" row is chosen. The results then close.
  final CmGlobalSearchSelected? onSelected;

  /// Holds the query. Pass one to keep the query when the header bar moves the search between the bar and its
  /// full-screen layer, or to set it yourself.
  final TextEditingController? controller;
  final FocusNode? focusNode;

  /// Accessible name of the box. Default: [CmStrings.globalSearchLabel] ("Search").
  final String? label;

  /// Example query in the empty box: "Search leads, deals, contacts". Default: [CmStrings.globalSearchPlaceholder].
  final String? placeholder;

  /// Shown when a query has no results. Default: [CmStrings.noResults] ("No results").
  final String? emptyText;

  /// Shown while [loading]. Default: [CmStrings.loading] ("Loading").
  final String? loadingText;

  /// Text of each group's "See all" row. Default: [CmStrings.seeAll].
  final String? seeAllLabel;

  /// A character that moves focus to the box from anywhere, e.g. '/'. Off by default: turn it on for one search
  /// per screen. Ignored while the merchant types in a field or holds Ctrl, Alt or Cmd.
  final String? shortcut;
  final bool autofocus;

  /// Shows the results under the box in the layout, instead of floating over the page. Default: on inside the
  /// header bar's full-screen layer, off elsewhere.
  final bool? inlineResults;

  @override
  State<CmGlobalSearch> createState() => _CmGlobalSearchState();
}

class _CmGlobalSearchState extends State<CmGlobalSearch> {
  TextEditingController? _ownController;
  FocusNode? _ownFocus;
  final _portal = OverlayPortalController();
  final _link = LayerLink();
  final _scroll = ScrollController();
  final _rowKeys = <int, GlobalKey>{};
  bool _open = false, _focused = false;
  int _active = -1;
  double _width = 360;

  TextEditingController get _text => widget.controller ?? (_ownController ??= TextEditingController());
  FocusNode get _focus => widget.focusNode ?? (_ownFocus ??= FocusNode(debugLabel: 'CmGlobalSearch'));

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
    HardwareKeyboard.instance.addHandler(_onShortcut);
    // The overlay is always attached; it draws nothing while the results are hidden.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _portal.show();
    });
  }

  @override
  void didUpdateWidget(CmGlobalSearch old) {
    super.didUpdateWidget(old);
    if (old.focusNode != widget.focusNode) {
      (old.focusNode ?? _ownFocus)?.removeListener(_onFocus);
      _focus.addListener(_onFocus);
    }
    if (_active >= _rows().length) _active = -1;
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_onShortcut);
    _focus.removeListener(_onFocus);
    _ownController?.dispose();
    _ownFocus?.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _onFocus() {
    if (!mounted) return;
    setState(() {
      _focused = _focus.hasFocus;
      if (_focused && _text.text.trim().isNotEmpty) _open = true;
    });
  }

  bool _onShortcut(KeyEvent e) {
    final key = widget.shortcut;
    if (key == null || key.isEmpty || e is! KeyDownEvent || e.character != key || !mounted) return false;
    final kb = HardwareKeyboard.instance;
    if (kb.isControlPressed || kb.isAltPressed || kb.isMetaPressed) return false;
    final ctx = FocusManager.instance.primaryFocus?.context;
    if (ctx != null && (ctx.widget is EditableText || ctx.findAncestorWidgetOfExactType<EditableText>() != null)) return false;
    // Only when this search is on screen (not under another route).
    if (!(ModalRoute.of(context)?.isCurrent ?? true)) return false;
    _focus.requestFocus();
    return true;
  }

  /// Results in reading order: each group's items, then its "See all" row.
  List<_Row> _rows() {
    if (widget.loading) return const [];
    return [
      for (final g in widget.results.where((g) => g.items.isNotEmpty)) ...[
        for (final it in g.items) _Row(g, it),
        if (g.seeAll) _Row(g, null),
      ],
    ];
  }

  bool get _showing => _open && _text.text.trim().isNotEmpty;

  void _hide() => setState(() {
        _open = false;
        _active = -1;
      });

  void _onChanged(String v) {
    setState(() {
      _active = -1;
      _open = v.trim().isNotEmpty;
    });
    widget.onSearch?.call(v);
  }

  void _clear({bool focus = true}) {
    _text.clear();
    _hide();
    if (focus) _focus.requestFocus();
    widget.onSearch?.call('');
  }

  void _move(int step) {
    final n = _rows().length;
    setState(() {
      if (n == 0) {
        _active = -1;
      } else if (_active < 0) {
        _active = step > 0 ? 0 : n - 1;
      } else {
        _active = (_active + step + n) % n;
      }
    });
    final key = _rowKeys[_active];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final ctx = key?.currentContext;
      if (ctx == null || !ctx.mounted) return;
      // Like scrollIntoView({block: 'nearest'}): only scrolls when the row is out of view.
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd);
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart);
    });
  }

  void _choose(_Row row) {
    _hide();
    widget.onSelected?.call(row.group, row.item);
    CmSearchLayerScope.maybeOf(context)?.close();
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final k = e.logicalKey;
    if (k == LogicalKeyboardKey.arrowDown || k == LogicalKeyboardKey.arrowUp) {
      if (_text.text.trim().isEmpty) return KeyEventResult.handled;
      if (!_open) setState(() => _open = true);
      _move(k == LogicalKeyboardKey.arrowDown ? 1 : -1);
      return KeyEventResult.handled;
    }
    if (e is! KeyDownEvent) return KeyEventResult.ignored;
    if (k == LogicalKeyboardKey.enter || k == LogicalKeyboardKey.numpadEnter) {
      final rows = _rows();
      if (_showing && _active >= 0 && _active < rows.length) {
        _choose(rows[_active]);
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (k == LogicalKeyboardKey.escape) {
      if (_showing) {
        _hide();
        return KeyEventResult.handled;
      }
      if (_text.text.isNotEmpty) {
        _clear(focus: false);
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    }
    if (k == LogicalKeyboardKey.tab) _hide();
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final label = widget.label ?? s.globalSearchLabel;
    final inline = widget.inlineResults ?? CmSearchLayerScope.maybeOf(context) != null;
    final rows = _rows();
    final showing = _showing;
    final items = rows.where((r) => r.item != null).length;
    final status = widget.loading && showing
        ? (widget.loadingText ?? s.loading)
        : !showing
            ? ''
            : rows.isNotEmpty
                ? s.globalSearchResults(items)
                : (widget.emptyText ?? s.noResults);
    final hasText = _text.text.isNotEmpty;
    final shortcut = widget.shortcut;

    final box = Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: CmSpace.s10),
      decoration: BoxDecoration(
        color: c.bgPage,
        borderRadius: BorderRadius.circular(CmRadius.sm),
        border: Border.all(color: _focused ? c.borderStrong : c.borderInput, width: _focused ? 2 : 1),
      ),
      child: Row(children: [
        CmIcon(CmIcons.search, size: 14, color: c.iconSelected),
        const SizedBox(width: CmSpace.s10),
        Expanded(
          child: Focus(
            canRequestFocus: false,
            skipTraversal: true,
            onKeyEvent: _onKey,
            child: Semantics(
              label: label,
              expanded: showing,
              child: TextField(
                controller: _text,
                focusNode: _focus,
                autofocus: widget.autofocus || CmSearchLayerScope.maybeOf(context) != null,
                onChanged: _onChanged,
                onTap: () {
                  if (_text.text.trim().isNotEmpty) setState(() => _open = true);
                },
                onSubmitted: (_) {
                  final r = _rows();
                  if (_showing && _active >= 0 && _active < r.length) _choose(r[_active]);
                  _focus.requestFocus();
                },
                textInputAction: TextInputAction.search,
                autocorrect: false,
                enableSuggestions: false,
                style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault),
                cursorColor: c.textDefault,
                decoration: InputDecoration(
                  isCollapsed: true,
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  hintText: widget.placeholder ?? s.globalSearchPlaceholder,
                  hintStyle: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textTertiary),
                ),
              ),
            ),
          ),
        ),
        if (hasText)
          _ClearButton(label: s.clearSearch, onTap: _clear)
        else if (shortcut != null && shortcut.isNotEmpty && !_focused)
          ExcludeSemantics(
            child: Container(
              constraints: const BoxConstraints(minWidth: 20),
              padding: const EdgeInsets.symmetric(horizontal: 5),
              decoration: BoxDecoration(border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.xs)),
              child: Text(shortcut, textAlign: TextAlign.center, style: CmType.bodySm.copyWith(height: 18 / 12, color: c.textTertiary)),
            ),
          ),
      ]),
    );

    Widget panel(BuildContext context, {required bool floating}) {
      final maxH = floating ? math.min(480.0, MediaQuery.sizeOf(context).height - 140) : double.infinity;
      return Container(
        constraints: BoxConstraints(maxHeight: math.max(120, maxH)),
        decoration: BoxDecoration(
          color: c.bgSurface,
          border: Border.all(color: c.borderDefault),
          borderRadius: BorderRadius.circular(CmRadius.md),
          boxShadow: floating ? CmShadow.s100 : null,
        ),
        clipBehavior: Clip.antiAlias,
        child: Material(
          type: MaterialType.transparency,
          child: _results(context, rows, floating: floating),
        ),
      );
    }

    final field = TapRegion(
      groupId: this,
      onTapOutside: (_) {
        if (_open) _hide();
      },
      child: CompositedTransformTarget(link: _link, child: box),
    );

    final live = Semantics(liveRegion: true, label: status.isEmpty ? null : status, child: const SizedBox.shrink());

    if (inline) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        field,
        if (showing) ...[const SizedBox(height: CmSpace.s10), TapRegion(groupId: this, child: panel(context, floating: false))],
        live,
      ]);
    }
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return LayoutBuilder(builder: (context, box) {
      if (box.maxWidth.isFinite) _width = box.maxWidth;
      return OverlayPortal(
        controller: _portal,
        overlayChildBuilder: (context) {
          if (!showing) return const SizedBox.shrink();
          return Positioned(
            width: _width,
            child: CompositedTransformFollower(
              link: _link,
              showWhenUnlinked: false,
              targetAnchor: rtl ? Alignment.bottomRight : Alignment.bottomLeft,
              followerAnchor: rtl ? Alignment.topRight : Alignment.topLeft,
              offset: const Offset(0, CmSpace.s10),
              child: TapRegion(groupId: this, child: panel(context, floating: true)),
            ),
          );
        },
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [field, live]),
      );
    });
  }

  Widget _results(BuildContext context, List<_Row> rows, {required bool floating}) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    if (widget.loading || rows.isEmpty) {
      final msg = widget.loading ? (widget.loadingText ?? s.loading) : (widget.emptyText ?? s.noResults);
      // Announced by the live status instead.
      return ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: CmSpace.s15),
          child: Row(children: [
            if (widget.loading) ...[const CmSpinner(size: CmSpinnerSize.small), const SizedBox(width: CmSpace.s10)],
            Flexible(child: Text(msg, style: CmType.bodyMd.copyWith(color: c.textTertiary))),
          ]),
        ),
      );
    }
    var i = -1;
    final groups = widget.results.where((g) => g.items.isNotEmpty).toList();
    final children = <Widget>[];
    for (var gi = 0; gi < groups.length; gi++) {
      final g = groups[gi];
      final total = g.total ?? g.items.length;
      final groupRows = <Widget>[
        Semantics(
          header: true,
          label: '${g.label}, ${s.globalSearchResults(total)}',
          excludeSemantics: true,
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(CmSpace.s20, 6, CmSpace.s20, 2),
            child: Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Flexible(child: Text(g.label, style: CmType.bodySm.copyWith(height: 16 / 12, fontWeight: FontWeight.w600, color: c.textDefault))),
              const SizedBox(width: CmSpace.s10),
              Text(CmStrings.groupDigits(total), style: CmType.bodySm.copyWith(height: 16 / 12, color: c.textTertiary)),
            ]),
          ),
        ),
      ];
      for (final it in g.items) {
        i++;
        groupRows.add(_option(context, i, _Row(g, it)));
      }
      if (g.seeAll) {
        i++;
        groupRows.add(_option(context, i, _Row(g, null)));
      }
      children.add(Container(
        margin: EdgeInsets.only(top: gi == 0 ? 0 : 6),
        padding: EdgeInsets.only(top: gi == 0 ? 0 : 6),
        decoration: gi == 0 ? null : BoxDecoration(border: Border(top: BorderSide(color: c.borderDefault))),
        child: Semantics(container: true, explicitChildNodes: true, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: groupRows)),
      ));
    }
    return Semantics(
      label: widget.label ?? s.globalSearchLabel,
      container: true,
      explicitChildNodes: true,
      child: SingleChildScrollView(
        controller: _scroll,
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: children),
      ),
    );
  }

  Widget _option(BuildContext context, int index, _Row row) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final active = index == _active;
    final it = row.item;
    final key = _rowKeys.putIfAbsent(index, GlobalKey.new);
    final content = it == null
        ? Text(row.group.seeAllLabel ?? widget.seeAllLabel ?? s.seeAll,
            style: CmType.bodyMd.copyWith(fontSize: 13, height: 20 / 13, color: c.textDefault, decoration: TextDecoration.underline))
        : Row(children: [
            if (it.icon != null) ...[CmIcon(it.icon!, size: 16, color: c.iconSelected), const SizedBox(width: CmSpace.s10)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(it.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: CmType.bodyMd.copyWith(height: 20 / 14, color: c.textDefault)),
                if (it.description != null)
                  Text(it.description!, maxLines: 1, overflow: TextOverflow.ellipsis, style: CmType.bodySm.copyWith(height: 16 / 12, color: c.textTertiary)),
              ]),
            ),
          ]);
    final name = it == null ? (row.group.seeAllLabel ?? widget.seeAllLabel ?? s.seeAll) : [it.title, if (it.description != null) it.description!].join(', ');
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
            constraints: const BoxConstraints(minHeight: 40),
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20, vertical: 6),
            alignment: AlignmentDirectional.centerStart,
            decoration: BoxDecoration(
              color: active ? c.bgHover : null,
              border: active ? BorderDirectional(start: BorderSide(color: c.borderStrong, width: 2)) : null,
            ),
            child: content,
          ),
        ),
      ),
    );
  }
}

class _ClearButton extends StatefulWidget {
  const _ClearButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  State<_ClearButton> createState() => _ClearButtonState();
}

class _ClearButtonState extends State<_ClearButton> {
  bool _hover = false, _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
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
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _hover ? c.bgHover : null,
              borderRadius: BorderRadius.circular(CmRadius.sm),
              border: _focus ? Border.all(color: c.borderStrong, width: 2) : null,
            ),
            child: Center(child: CmIcon(CmIcons.close, size: 14, color: c.iconSelected)),
          ),
        ),
      ),
    );
  }
}

/// Opens [search] in a full-screen layer with a close button, as [CmHeaderBar] does on narrow bars. [search] is
/// read again whenever [refresh] notifies, so results that arrive later show in the layer. Completes when the
/// layer closes (Esc, the close button, or a chosen result).
Future<void> showCmSearchLayer({
  required BuildContext context,
  required Widget Function() search,
  String? label,
  Listenable? refresh,
}) {
  return Navigator.of(context).push(PageRouteBuilder<void>(
    opaque: true,
    pageBuilder: (context, _, _) => refresh == null
        ? CmSearchLayer(label: label, child: search())
        : ListenableBuilder(listenable: refresh, builder: (context, _) => CmSearchLayer(label: label, child: search())),
    transitionsBuilder: (context, a, _, child) => FadeTransition(opacity: a, child: child),
    transitionDuration: const Duration(milliseconds: 150),
    reverseTransitionDuration: const Duration(milliseconds: 100),
  ));
}

/// The full-screen search layer's content: the search box with a close button, on a white page. Esc closes it
/// when the search has nothing of its own to close. Used by [CmHeaderBar] and [showCmSearchLayer].
class CmSearchLayer extends StatelessWidget {
  const CmSearchLayer({super.key, required this.child, this.label});

  /// Usually a [CmGlobalSearch].
  final Widget child;

  /// Name of the layer. Default: [CmStrings.headerBarSearch] ("Search").
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    void close() => Navigator.of(context).maybePop();
    return CallbackShortcuts(
      bindings: {const SingleActivator(LogicalKeyboardKey.escape): close},
      child: FocusScope(
        autofocus: true,
        child: Semantics(
          scopesRoute: true,
          namesRoute: true,
          explicitChildNodes: true,
          label: label ?? s.headerBarSearch,
          child: Material(
            color: c.bgSurface,
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15, vertical: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(child: CmSearchLayerScope(close: close, child: child)),
                  const SizedBox(width: CmSpace.s10),
                  _LayerClose(label: s.close, onTap: close),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LayerClose extends StatelessWidget {
  const _LayerClose({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(CmRadius.sm),
        hoverColor: c.bgHover,
        child: SizedBox.square(dimension: 44, child: Center(child: CmIcon(CmIcons.close, size: 20, color: c.iconSelected))),
      ),
    );
  }
}
