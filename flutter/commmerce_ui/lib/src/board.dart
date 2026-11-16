import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:path_drawing/path_drawing.dart';

import 'button.dart';
import 'display.dart';
import 'generated/tokens.g.dart';
import 'status.dart';
import 'strings.dart';
import 'theme.dart';

/// A place a card can be dropped: a column ([group]) and a position in it ([index]), both from 0.
@immutable
class CmMovePlace {
  const CmMovePlace(this.group, this.index);
  final int group, index;

  @override
  bool operator ==(Object other) => other is CmMovePlace && other.group == group && other.index == index;

  @override
  int get hashCode => Object.hash(group, index);

  @override
  String toString() => 'CmMovePlace($group, $index)';
}

/// Moving one item between groups without dragging: pick it up, choose a group and a position with the arrow
/// keys, drop it or cancel, with every step announced. The Flutter port of the web `MoveModel`
/// (packages/ui/src/move-model.ts): it knows nothing about boards, so a calendar can reuse it later.
///
/// Keys: Left/Right the previous/next group (pass them already flipped for right-to-left), Up/Down the
/// previous/next position, Home/End the first/last position, Space or Enter drop, Escape cancels. Tab cancels and
/// lets focus move on.
class CmMoveModel {
  CmMoveModel({
    required this.groupCount,
    required this.slotCount,
    required this.onDrop,
    required this.pickedUpMessage,
    required this.overMessage,
    required this.cancelledMessage,
    required this.announce,
    this.onTarget,
    this.onCancel,
  });

  /// How many groups there are now.
  final int Function() groupCount;

  /// How many positions a group offers the moving item: the items in it (not counting the moving item) plus one.
  /// A group the item can't go into returns 0 and is skipped.
  final int Function(int group) slotCount;

  /// The target changed (also on pick up, and with null when the move ends): draw the placeholder.
  final void Function(CmMovePlace? at)? onTarget;

  /// Dropped: commit the move. Called with the starting place and the chosen one, also when they are the same.
  final void Function(CmMovePlace from, CmMovePlace to) onDrop;

  /// Cancelled: the item stays where it was.
  final void Function(CmMovePlace from)? onCancel;

  /// Words to announce, in the widget's language.
  final String Function(CmMovePlace at) pickedUpMessage, overMessage, cancelledMessage;

  /// Speaks a message.
  final void Function(String text) announce;

  CmMovePlace? _from, _to;

  /// An item is picked up.
  bool get active => _from != null;

  /// Where the item started, while picked up.
  CmMovePlace? get from => _from;

  /// Where it would be dropped now, while picked up.
  CmMovePlace? get target => _to;

  int _slots(int g) => g >= 0 && g < groupCount() ? slotCount(g) : 0;

  /// Picks up the item at [at] and announces it. A move already under way is cancelled first.
  void pickUp(CmMovePlace at) {
    if (active) cancel();
    _from = at;
    _to = at;
    onTarget?.call(at);
    announce(pickedUpMessage(at));
  }

  /// Moves the target to [to] (clamped to the group's positions) and announces it.
  void moveTo(CmMovePlace to) {
    if (_to == null) return;
    final g = math.min(math.max(to.group, 0), math.max(0, groupCount() - 1));
    final n = _slots(g);
    if (n <= 0) return;
    _to = CmMovePlace(g, math.min(math.max(to.index, 0), n - 1));
    onTarget?.call(_to);
    announce(overMessage(_to!));
  }

  /// Drops at the current target.
  void drop() {
    final from = _from, to = _to;
    if (from == null || to == null) return;
    _from = _to = null;
    onTarget?.call(null);
    onDrop(from, to);
  }

  /// Puts the item back without moving it, and announces that unless [silent].
  void cancel({bool silent = false}) {
    final from = _from;
    if (from == null) return;
    final message = silent ? '' : cancelledMessage(from);
    _from = _to = null;
    onTarget?.call(null);
    onCancel?.call(from);
    if (message.isNotEmpty) announce(message);
  }

  /// Where an arrow, Home or End key takes the item: groups side by side, positions top to bottom.
  CmMovePlace? navigate(LogicalKeyboardKey key, CmMovePlace at) {
    int last(int g) => math.max(0, _slots(g) - 1);
    CmMovePlace step(int dir) {
      for (var g = at.group + dir; g >= 0 && g < groupCount(); g += dir) {
        if (_slots(g) > 0) return CmMovePlace(g, math.min(at.index, last(g)));
      }
      return at;
    }

    if (key == LogicalKeyboardKey.arrowRight) return step(1);
    if (key == LogicalKeyboardKey.arrowLeft) return step(-1);
    if (key == LogicalKeyboardKey.arrowDown) return CmMovePlace(at.group, math.min(at.index + 1, last(at.group)));
    if (key == LogicalKeyboardKey.arrowUp) return CmMovePlace(at.group, math.max(at.index - 1, 0));
    if (key == LogicalKeyboardKey.home) return CmMovePlace(at.group, 0);
    if (key == LogicalKeyboardKey.end) return CmMovePlace(at.group, last(at.group));
    return null;
  }

  /// Handles a key while an item is picked up. Pass Left/Right already flipped for right-to-left. Returns
  /// whether the key was used; Tab cancels but returns false, so focus moves on.
  bool handleKey(LogicalKeyboardKey key) {
    if (!active) return false;
    if (key == LogicalKeyboardKey.space || key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      drop();
      return true;
    }
    if (key == LogicalKeyboardKey.escape) {
      cancel();
      return true;
    }
    if (key == LogicalKeyboardKey.tab) {
      cancel();
      return false;
    }
    final next = navigate(key, _to!);
    if (next == null) return false;
    moveTo(next);
    return true;
  }
}

/// One record on a [CmBoard]: a title, secondary lines, badges, an avatar and a small control. Mirrors
/// `<cm-board-card>`.
@immutable
class CmBoardCard {
  const CmBoardCard({
    required this.id,
    required this.heading,
    this.label,
    this.lines = const [],
    this.badges = const [],
    this.avatar,
    this.action,
    this.onOpen,
    this.locked = false,
    this.pending = false,
  });

  /// Identifies the record in [CmBoardMove] (e.g. its id). Must be unique on the board.
  final String id;

  /// The title: the record's name.
  final String heading;

  /// The card's name for screen readers and announcements. Defaults to [heading].
  final String? label;

  /// Secondary lines under the title (owner, phone, city), shown in 12px tertiary text.
  final List<Widget> lines;

  /// [CmBadge]s (grade, tags) under the lines.
  final List<Widget> badges;

  /// A [CmAvatar] for the owner, at the end of the title line.
  final Widget? avatar;

  /// A small control at the end of the title line, e.g. a [CmActionMenu] with "Move to…".
  final Widget? action;

  /// Opens the record: tapping the title, Enter on the focused card, or a screen reader's double tap.
  final VoidCallback? onOpen;

  /// The card can't be moved (e.g. no permission). It can still be opened.
  final bool locked;

  /// The move is being saved: greyed with a spinner, and it can't be moved again until cleared. The board also
  /// sets this look itself while an [CmBoard.onMove] future runs.
  final bool pending;

  /// The name read by screen readers and in announcements.
  String get name => label ?? heading;
}

/// One column of a [CmBoard]: a heading with its count, the cards, and "Load more" when there are more cards
/// than are loaded. Mirrors `<cm-board-column>`.
@immutable
class CmBoardColumn {
  const CmBoardColumn({
    required this.id,
    required this.heading,
    this.cards = const [],
    this.total,
    this.hasMore = false,
    this.loading = false,
    this.headingLevel = 3,
    this.actions = const [],
    this.empty,
  });

  /// Identifies the column in [CmBoardMove] (e.g. the status id).
  final String id;

  /// The column's name, e.g. the status "Contacted".
  final String heading;
  final List<CmBoardCard> cards;

  /// How many cards the column has in all, when more than are loaded (shown as the count). Null: the number of
  /// cards. The board adds and takes one while it shows a move your data doesn't have yet.
  final int? total;

  /// Shows "Load more" ([CmBoard.onLoadMore]). Also shown when [total] is more than the cards loaded.
  final bool hasMore;

  /// Cards are loading: Load more shows a spinner, or placeholder cards show in an empty column. Announced.
  final bool loading;

  /// Level of the heading for screen readers (2 to 6).
  final int headingLevel;

  /// Small controls at the end of the heading row, e.g. an "Add" button.
  final List<Widget> actions;

  /// Shown in a column with no cards, instead of "No cards".
  final Widget? empty;

  /// The number shown in the heading: [total], or the cards loaded.
  int get count => total ?? cards.length;
}

/// How a card was moved: dragged with a pointer, moved with the keyboard, or by [CmBoardState.moveCard].
enum CmBoardMoveSource { pointer, keyboard, api }

/// A move reported to [CmBoard.onMove], before the board shows it.
@immutable
class CmBoardMove {
  const CmBoardMove({required this.card, required this.from, required this.to, required this.fromIndex, required this.toIndex, required this.source});

  /// The card moved.
  final CmBoardCard card;

  /// `id` of the column it leaves and of the column it goes to (the same when reordering).
  final String from, to;

  /// Its position in the column it leaves, and its position in the column it goes to once there (from 0).
  final int fromIndex, toIndex;
  final CmBoardMoveSource source;

  /// The card's id.
  String get cardId => card.id;

  @override
  String toString() => 'CmBoardMove(${card.id}: $from[$fromIndex] -> $to[$toIndex], ${source.name})';
}

/// Called before a card moves. Return `false` to refuse the move (the card stays and the refusal is announced).
/// Return a [Future] to save the move: the card shows at its new place as saving until it completes; if it
/// completes with `false` or throws, the card goes back and that is announced. `null` or `true` accepts.
///
/// Move the card in your own data, at once or when the save succeeds: the board shows a move your data doesn't
/// have yet only until you pass it new [CmBoard.columns].
typedef CmBoardMoveHandler = FutureOr<bool?> Function(CmBoardMove move);

class _Overlay {
  _Overlay(this.cardId, this.to, this.toIndex, this.pending);
  final String cardId, to;
  final int toIndex;
  bool pending;
}

class _Held {
  _Held(this.card, this.column, this.index);
  final CmBoardCard card;
  final String column;
  final int index;
}

class _Drag {
  _Drag(this.card, this.from, this.fromIndex, this.height, this.width);
  final CmBoardCard card;
  final int from, fromIndex;
  final double height, width;
  Offset pointer = Offset.zero;
  CmMovePlace? to;
}

/// A board of records by status (Kanban): one [CmBoardColumn] per status with its count, and [CmBoardCard]s that
/// move between columns, with a pointer or with the keyboard. Mirrors `<cm-board>`.
///
/// Moving: drag a card (with a mouse, or press and hold on touch), or focus it and press Space, choose a column
/// and position with the arrow keys (Left and Right follow the reading direction), and drop with Space or Enter
/// (Escape cancels). Every step is announced. Each move calls [onMove], which can refuse it or save it
/// asynchronously (see [CmBoardMoveHandler]).
///
/// Columns are [columnWidth] wide side by side and the board scrolls sideways; at 480 or less each column takes
/// nearly the whole width and the board snaps from column to column. In a box with a bounded height the columns
/// scroll on their own; otherwise they grow with their cards.
class CmBoard extends StatefulWidget {
  const CmBoard({
    super.key,
    required this.columns,
    this.onMove,
    this.onLoadMore,
    this.label,
    this.hideEmpty = false,
    this.columnWidth = 272,
  });

  final List<CmBoardColumn> columns;

  /// Called before each move; see [CmBoardMoveHandler]. Without it the board still shows moves until new
  /// [columns] arrive.
  final CmBoardMoveHandler? onMove;

  /// "Load more" in a column was pressed, with the column's id. Set its `loading`, add the cards, then clear it
  /// (and `hasMore` on the last page).
  final ValueChanged<String>? onLoadMore;

  /// Accessible name of the board, e.g. "Merchants by status". Default: [CmStrings.boardLabel].
  final String? label;

  /// Empty columns shrink to a narrow rail (heading on its side and the count). Rails still take cards.
  final bool hideEmpty;

  /// Width of each column on wide boards.
  final double columnWidth;

  @override
  State<CmBoard> createState() => CmBoardState();
}

/// State of a [CmBoard]: pick up, move and cancel from your own controls (a "Move to…" menu) through a
/// `GlobalKey<CmBoardState>`.
class CmBoardState extends State<CmBoard> {
  late final CmMoveModel _model = CmMoveModel(
    groupCount: () => _view.length,
    slotCount: (g) {
      final held = _held;
      if (held == null || g < 0 || g >= _view.length) return 0;
      return _view[g].cards.where((c) => c.id != held.card.id).length + 1;
    },
    onTarget: (at) => setState(() => _target = at),
    onDrop: _keyboardDrop,
    onCancel: (_) => _release(),
    pickedUpMessage: (at) => _say(at, picked: true),
    overMessage: (at) => _say(at),
    cancelledMessage: (from) => _strings.boardCancelled(_held?.card.name ?? '', _view[from.group].heading),
    announce: announce,
  );

  final List<_Overlay> _overlays = [];
  List<CmBoardColumn> _view = const [];
  _Held? _held;
  CmMovePlace? _target;
  _Drag? _drag;
  Timer? _scrollTimer;
  String _announcement = '';
  final Map<String, FocusNode> _nodes = {};
  final Map<String, GlobalKey> _cardKeys = {};
  final Map<String, GlobalKey> _columnKeys = {};
  final Map<String, ScrollController> _columnScroll = {};
  final _scroll = ScrollController();
  final _viewportKey = GlobalKey();
  final _dropKey = GlobalKey();

  CmStrings get _strings => CmStrings.of(context);

  /// The last message announced (for tests and logging).
  String get announcement => _announcement;

  /// The id of the card picked up with the keyboard, if any.
  String? get heldCard => _held?.card.id;

  /// Speaks [text] to screen readers, e.g. after your own "Move to" menu.
  void announce(String text) {
    _announcement = text;
    if (!mounted) return;
    SemanticsService.announce(text, Directionality.of(context), assertiveness: Assertiveness.assertive);
  }

  @override
  void initState() {
    super.initState();
    _rebuildView();
  }

  @override
  void didUpdateWidget(CmBoard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final old = oldWidget;
    if (!identical(old.columns, widget.columns)) {
      // New data from the app: it now shows the moves it accepted; keep only those still being saved.
      _overlays.removeWhere((o) => !o.pending);
    }
    _rebuildView();
    if (_held != null && _place(_held!.card.id) == null) _model.cancel(silent: true);
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    for (final n in _nodes.values) {
      n.dispose();
    }
    for (final s in _columnScroll.values) {
      s.dispose();
    }
    _scroll.dispose();
    super.dispose();
  }

  FocusNode _node(String id) => _nodes.putIfAbsent(id, () {
        final n = FocusNode(debugLabel: 'CmBoardCard $id');
        n.addListener(() => _onCardFocus(id, n));
        return n;
      });

  GlobalKey _cardKey(String id) => _cardKeys.putIfAbsent(id, () => GlobalKey(debugLabel: 'CmBoardCard $id'));
  GlobalKey _columnKey(String id) => _columnKeys.putIfAbsent(id, () => GlobalKey(debugLabel: 'CmBoardColumn $id'));
  ScrollController _columnController(String id) => _columnScroll.putIfAbsent(id, ScrollController.new);

  /// The columns as shown: the app's data with the moves it doesn't have yet.
  void _rebuildView() {
    final cols = [for (final c in widget.columns) (c, [...c.cards], c.total)];
    for (final o in _overlays) {
      final from = cols.indexWhere((e) => e.$2.any((x) => x.id == o.cardId));
      final to = cols.indexWhere((e) => e.$1.id == o.to);
      if (from < 0 || to < 0) continue;
      final card = cols[from].$2.firstWhere((x) => x.id == o.cardId);
      cols[from].$2.removeWhere((x) => x.id == o.cardId);
      cols[to].$2.insert(o.toIndex.clamp(0, cols[to].$2.length), card);
      if (from != to) {
        final f = cols[from], t = cols[to];
        cols[from] = (f.$1, f.$2, f.$3 == null ? null : math.max(0, f.$3! - 1));
        cols[to] = (t.$1, t.$2, t.$3 == null ? null : t.$3! + 1);
      }
    }
    _view = [
      for (final (c, cards, total) in cols)
        CmBoardColumn(
          id: c.id,
          heading: c.heading,
          cards: cards,
          total: total,
          hasMore: c.hasMore,
          loading: c.loading,
          headingLevel: c.headingLevel,
          actions: c.actions,
          empty: c.empty,
        ),
    ];
  }

  bool _pending(CmBoardCard card) => card.pending || _overlays.any((o) => o.cardId == card.id && o.pending);

  /// Column index and position of a card, as shown.
  CmMovePlace? _place(String cardId) {
    for (var g = 0; g < _view.length; g++) {
      final i = _view[g].cards.indexWhere((c) => c.id == cardId);
      if (i >= 0) return CmMovePlace(g, i);
    }
    return null;
  }

  CmBoardCard? _card(String id) {
    final p = _place(id);
    return p == null ? null : _view[p.group].cards[p.index];
  }

  String _say(CmMovePlace at, {bool picked = false}) {
    final col = _view[at.group];
    final count = _model.slotCount(at.group);
    return picked
        ? _strings.boardPickedUp(_held?.card.name ?? '', col.heading, at.index + 1, count)
        : _strings.boardOver(col.heading, at.index + 1, count);
  }

  bool _collapsed(CmBoardColumn col) => widget.hideEmpty && col.cards.isEmpty && !col.loading && col.count <= 0;

  // ---------- Keyboard ----------

  /// Picks up a card for moving with the arrow keys, as Space does (e.g. from a "Move" item in your own menu),
  /// and focuses it. Returns false when the card is locked, saving or not on the board.
  bool pickUp(String cardId) {
    final card = _card(cardId);
    if (card == null || card.locked || _pending(card)) return false;
    final at = _place(cardId)!;
    _model.cancel(silent: true);
    setState(() => _held = _Held(card, _view[at.group].id, at.index));
    _node(cardId).requestFocus();
    _model.pickUp(at);
    return true;
  }

  /// Cancels a keyboard move in progress: the card stays where it was.
  void cancelMove() => _model.cancel();

  void _release() {
    if (_held != null) setState(() => _held = null);
  }

  void _onCardFocus(String id, FocusNode n) {
    if (n.hasFocus || _held?.card.id != id) return;
    // Focus left the held card (a click elsewhere, Tab): put it back. A rebuild that keeps the card is not a leave.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _model.active && _held?.card.id == id && !n.hasFocus) _model.cancel();
    });
  }

  void _keyboardDrop(CmMovePlace from, CmMovePlace to) {
    final held = _held;
    _release();
    if (held == null) return;
    _commit(held.card, from.group, from.index, to.group, to.index, CmBoardMoveSource.keyboard);
  }

  LogicalKeyboardKey _logical(LogicalKeyboardKey k) {
    if (Directionality.of(context) != TextDirection.rtl) return k;
    if (k == LogicalKeyboardKey.arrowLeft) return LogicalKeyboardKey.arrowRight;
    if (k == LogicalKeyboardKey.arrowRight) return LogicalKeyboardKey.arrowLeft;
    return k;
  }

  KeyEventResult _onKey(CmBoardCard card, KeyEvent e) {
    if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
    final hw = HardwareKeyboard.instance;
    if (hw.isAltPressed || hw.isControlPressed || hw.isMetaPressed) return KeyEventResult.ignored;
    final key = _logical(e.logicalKey);
    if (_model.active) {
      if (key == LogicalKeyboardKey.tab) {
        _model.cancel();
        return KeyEventResult.ignored;
      }
      return _model.handleKey(key) ? KeyEventResult.handled : KeyEventResult.ignored;
    }
    if (e is! KeyDownEvent) return KeyEventResult.ignored;
    if (key == LogicalKeyboardKey.space) {
      pickUp(card.id);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter || key == LogicalKeyboardKey.numpadEnter) {
      if (card.onOpen == null) return KeyEventResult.ignored;
      card.onOpen!();
      return KeyEventResult.handled;
    }
    final next = _neighbour(card.id, key);
    if (next == null) return KeyEventResult.ignored;
    _node(next.id).requestFocus();
    _reveal(next.id);
    return KeyEventResult.handled;
  }

  /// The card to focus from [id] with an arrow key: up/down in its column, the nearest one in the next column.
  CmBoardCard? _neighbour(String id, LogicalKeyboardKey key) {
    final at = _place(id);
    if (at == null) return null;
    final cards = _view[at.group].cards;
    bool movable(CmBoardCard c) => !c.locked || c.onOpen != null;
    if (key == LogicalKeyboardKey.arrowDown) return at.index + 1 < cards.length ? cards[at.index + 1] : null;
    if (key == LogicalKeyboardKey.arrowUp) return at.index > 0 ? cards[at.index - 1] : null;
    final dir = key == LogicalKeyboardKey.arrowRight ? 1 : key == LogicalKeyboardKey.arrowLeft ? -1 : 0;
    if (dir == 0) return null;
    for (var g = at.group + dir; g >= 0 && g < _view.length; g += dir) {
      final list = _view[g].cards.where(movable).toList();
      if (list.isNotEmpty) return list[math.min(at.index, list.length - 1)];
    }
    return null;
  }

  /// Scrolls the board and the column so the card (or the drop placeholder) shows, without moving focus.
  void _reveal(String? cardId) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final ctx = (cardId == null ? _dropKey : _cardKey(cardId)).currentContext ?? (cardId == null ? null : _cardKey(cardId).currentContext);
      if (ctx == null) return;
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd);
      Scrollable.ensureVisible(ctx, alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart);
    });
  }

  // ---------- Moving ----------

  /// Moves a card to a column and position (default: the end), as a drop would: calls [CmBoard.onMove] and shows
  /// the move unless it is refused. Use it for your own "Move to" menu. Returns false when the move was refused,
  /// went nowhere, or the card or column was not found.
  bool moveCard(String cardId, String toColumn, [int? index]) {
    final at = _place(cardId);
    final g = _view.indexWhere((c) => c.id == toColumn);
    if (at == null || g < 0) return false;
    final room = _view[g].cards.where((c) => c.id != cardId).length;
    return _commit(_view[at.group].cards[at.index], at.group, at.index, g, (index ?? room).clamp(0, room), CmBoardMoveSource.api);
  }

  bool _commit(CmBoardCard card, int fromG, int fromI, int toG, int toI, CmBoardMoveSource source) {
    final s = _strings;
    final from = _view[fromG], to = _view[toG];
    void refocus() {
      if (source != CmBoardMoveSource.keyboard) return;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _place(card.id) != null) {
          _node(card.id).requestFocus();
          _reveal(card.id);
        }
      });
    }

    if (fromG == toG && fromI == toI) {
      if (source != CmBoardMoveSource.api) announce(s.boardSameSpot(card.name));
      refocus();
      return false;
    }
    final move = CmBoardMove(card: card, from: from.id, to: to.id, fromIndex: fromI, toIndex: toI, source: source);
    FutureOr<bool?> result;
    try {
      result = widget.onMove?.call(move);
    } catch (_) {
      result = false;
    }
    if (result == false) {
      announce(s.boardRefused(card.name, to.heading));
      refocus();
      return false;
    }
    final count = to.cards.where((c) => c.id != card.id).length + 1;
    final overlay = _Overlay(card.id, to.id, toI, result is Future);
    setState(() {
      _overlays.removeWhere((o) => o.cardId == card.id);
      _overlays.add(overlay);
      _rebuildView();
    });
    refocus();
    announce(s.boardMoved(card.name, to.heading, toI + 1, count));
    if (result is Future<bool?>) {
      result.then((ok) => ok != false, onError: (Object _) => false).then((ok) {
        if (!mounted) return;
        setState(() {
          if (ok) {
            overlay.pending = false;
          } else {
            _overlays.remove(overlay);
          }
          _rebuildView();
        });
        if (!ok) announce(_strings.boardReverted(card.name, from.heading));
      });
    }
    return true;
  }

  // ---------- Pointer drag ----------

  void _dragStart(CmBoardCard card) {
    final at = _place(card.id);
    final box = _cardKey(card.id).currentContext?.findRenderObject() as RenderBox?;
    if (at == null) return;
    _model.cancel(silent: true);
    setState(() {
      _drag = _Drag(card, at.group, at.index, box?.size.height ?? 72, box?.size.width ?? widget.columnWidth - 20)..to = at;
    });
    announce(_strings.boardPickedUp(card.name, _view[at.group].heading, at.index + 1, _view[at.group].cards.length));
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 16), (_) => _autoScroll());
  }

  void _dragUpdate(Offset global) {
    final d = _drag;
    if (d == null) return;
    d.pointer = global;
    _updateDragTarget();
  }

  /// The column under the pointer (the nearest one sideways) and the position in it.
  void _updateDragTarget() {
    final d = _drag;
    if (d == null || _view.isEmpty) return;
    var best = 0;
    var bestDist = double.infinity;
    for (var g = 0; g < _view.length; g++) {
      final box = _columnKey(_view[g].id).currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) continue;
      final r = box.localToGlobal(Offset.zero) & box.size;
      final x = d.pointer.dx;
      final dist = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0.0);
      if (dist < bestDist) {
        best = g;
        bestDist = dist;
      }
    }
    final col = _view[best];
    final others = col.cards.where((c) => c.id != d.card.id).toList();
    var index = others.length;
    if (!_collapsed(col)) {
      for (var i = 0; i < others.length; i++) {
        final box = _cardKey(others[i].id).currentContext?.findRenderObject() as RenderBox?;
        if (box == null || !box.attached) continue;
        final top = box.localToGlobal(Offset.zero).dy;
        if (d.pointer.dy < top + box.size.height / 2) {
          index = i;
          break;
        }
      }
    } else {
      index = 0;
    }
    final next = CmMovePlace(best, index);
    if (next == d.to) return;
    final changedColumn = d.to?.group != best;
    setState(() => d.to = next);
    if (changedColumn) announce(_strings.boardOver(col.heading, index + 1, others.length + 1));
  }

  void _autoScroll() {
    final d = _drag;
    if (d == null || !mounted) return;
    const edge = 48.0, max = 16.0;
    double speed(double dist) => dist < edge ? ((edge - math.max(dist, 0)) / edge * max).ceilToDouble() : 0;
    var scrolled = false;
    final vp = _viewportKey.currentContext?.findRenderObject() as RenderBox?;
    if (vp != null && vp.attached && _scroll.hasClients) {
      final r = vp.localToGlobal(Offset.zero) & vp.size;
      final left = speed(d.pointer.dx - r.left), right = speed(r.right - d.pointer.dx);
      final p = _scroll.position;
      final rtl = Directionality.of(context) == TextDirection.rtl;
      final delta = left > 0 ? -left : right;
      final before = p.pixels;
      if (delta != 0) p.jumpTo((p.pixels + (rtl ? -delta : delta)).clamp(p.minScrollExtent, p.maxScrollExtent));
      scrolled |= p.pixels != before;
    }
    final to = d.to;
    if (to != null) {
      final sc = _columnScroll[_view[to.group].id];
      final box = _columnKey(_view[to.group].id).currentContext?.findRenderObject() as RenderBox?;
      if (sc != null && sc.hasClients && box != null && box.attached) {
        final r = box.localToGlobal(Offset.zero) & box.size;
        final up = speed(d.pointer.dy - r.top - 48), down = speed(r.bottom - d.pointer.dy);
        final p = sc.position;
        final before = p.pixels;
        if (up > 0) {
          p.jumpTo((p.pixels - up).clamp(p.minScrollExtent, p.maxScrollExtent));
        } else if (down > 0) {
          p.jumpTo((p.pixels + down).clamp(p.minScrollExtent, p.maxScrollExtent));
        }
        scrolled |= p.pixels != before;
      }
    }
    if (scrolled) _updateDragTarget();
  }

  void _dragEnd({required bool drop}) {
    final d = _drag;
    _scrollTimer?.cancel();
    _scrollTimer = null;
    if (d == null) return;
    setState(() => _drag = null);
    final to = d.to;
    if (drop && to != null && mounted) _commit(d.card, d.from, d.fromIndex, to.group, to.index, CmBoardMoveSource.pointer);
  }

  // ---------- Build ----------

  @override
  Widget build(BuildContext context) {
    final s = _strings;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label ?? s.boardLabel,
      child: LayoutBuilder(builder: (context, box) {
        final narrow = box.maxWidth.isFinite && box.maxWidth <= 480;
        final width = narrow ? box.maxWidth - 40 : widget.columnWidth;
        final gap = narrow ? CmSpace.s10 : CmSpace.s15;
        final bounded = box.hasBoundedHeight;
        final widths = [for (final c in _view) _collapsed(c) ? 48.0 : width];
        final row = Row(
          crossAxisAlignment: bounded ? CrossAxisAlignment.stretch : CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var g = 0; g < _view.length; g++) ...[
              if (g > 0) SizedBox(width: gap),
              SizedBox(width: widths[g], child: _column(context, g, bounded)),
            ],
          ],
        );
        final offsets = <double>[];
        var x = 0.0;
        for (final w in widths) {
          offsets.add(x);
          x += w + gap;
        }
        return SingleChildScrollView(
          key: _viewportKey,
          controller: _scroll,
          scrollDirection: Axis.horizontal,
          physics: narrow && _drag == null ? _SnapPhysics(offsets) : null,
          padding: const EdgeInsets.only(bottom: CmSpace.s10),
          child: bounded ? SizedBox(height: math.max(0, box.maxHeight - CmSpace.s10), child: row) : row,
        );
      }),
    );
  }

  Widget _column(BuildContext context, int g, bool bounded) {
    final c = CmTheme.colorsOf(context);
    final s = _strings;
    final col = _view[g];
    final collapsed = _collapsed(col);
    final dragging = _drag?.card;
    final moving = _held?.card ?? dragging;
    final at = _held != null ? _target : _drag?.to;
    final over = moving != null && at != null && at.group == g;
    final cards = col.cards;
    final from = moving == null ? -1 : cards.indexWhere((x) => x.id == moving.id);
    final showDrop = over && !collapsed && !(from >= 0 && at.index == from);
    final others = moving == null ? cards : cards.where((x) => x.id != moving.id).toList();
    final dropHeight = _drag?.height ?? (moving == null ? 40.0 : ((_cardKey(moving.id).currentContext?.findRenderObject() as RenderBox?)?.size.height ?? 40.0));
    final rows = <Widget>[];
    for (final card in cards) {
      if (showDrop && card.id != moving.id && others.indexOf(card) == at.index) rows.add(_placeholder(context, moving, dropHeight));
      rows.add(_cardTile(context, card));
    }
    if (showDrop && at.index >= others.length) rows.add(_placeholder(context, moving, dropHeight));
    final more = col.hasMore || col.count > cards.length;
    final level = col.headingLevel.clamp(2, 6);
    final countText = s.boardColumnCount(col.count);
    final title = Text(col.heading, style: CmType.bodyMd.copyWith(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: c.textDefault));
    final pill = Container(
      constraints: const BoxConstraints(minWidth: 24),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(CmRadius.full)),
      child: Text(CmStrings.groupDigits(col.count), textAlign: TextAlign.center, style: CmType.bodySm.copyWith(fontSize: 12, height: 20 / 12, color: c.textDefault, fontFeatures: const [FontFeature.tabularFigures()])),
    );
    final heading = Semantics(header: true, headingLevel: level, label: '${col.heading}, $countText', excludeSemantics: true, child: collapsed ? RotatedBox(quarterTurns: 1, child: title) : title);
    final header = Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: collapsed ? const EdgeInsets.symmetric(vertical: CmSpace.s10) : const EdgeInsets.symmetric(horizontal: CmSpace.s15, vertical: CmSpace.s10),
      child: collapsed
          ? Column(mainAxisSize: MainAxisSize.min, children: [heading, const SizedBox(height: CmSpace.s10), ExcludeSemantics(child: pill)])
          : Row(children: [
              Expanded(child: heading),
              const SizedBox(width: CmSpace.s10),
              ExcludeSemantics(child: pill),
              for (final a in col.actions) ...[const SizedBox(width: CmSpace.s10), a],
            ]),
    );
    final body = <Widget>[
      if (!collapsed) ...[
        for (var i = 0; i < rows.length; i++) ...[if (i > 0) const SizedBox(height: CmSpace.s10), rows[i]],
        if (col.loading && cards.isEmpty)
          ExcludeSemantics(
            child: Column(children: const [
              CmSkeleton(height: 72, radius: CmRadius.md),
              SizedBox(height: CmSpace.s10),
              CmSkeleton(height: 72, radius: CmRadius.md),
            ]),
          ),
        if (cards.isEmpty && !col.loading && !more && !showDrop)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s10, vertical: CmSpace.s15),
            child: Center(child: col.empty ?? Text(s.boardColumnEmpty, textAlign: TextAlign.center, style: CmType.bodySm.copyWith(fontSize: 12, color: c.textTertiary))),
          ),
        if (more)
          Padding(
            padding: const EdgeInsets.only(top: CmSpace.s10),
            child: Center(child: CmButton(label: s.boardColumnLoadMore, loading: col.loading, onPressed: widget.onLoadMore == null ? null : () => widget.onLoadMore!(col.id))),
          ),
      ],
    ];
    final list = Padding(
      padding: collapsed ? EdgeInsets.zero : const EdgeInsets.fromLTRB(CmSpace.s10, 0, CmSpace.s10, CmSpace.s10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: body),
    );
    final section = Container(
      key: _columnKey(col.id),
      decoration: BoxDecoration(
        color: c.bgPage,
        border: Border.all(color: c.borderCard),
        borderRadius: BorderRadius.circular(CmRadius.md),
      ),
      foregroundDecoration: collapsed && over ? BoxDecoration(border: Border.all(color: c.borderStrong, width: 2), borderRadius: BorderRadius.circular(CmRadius.md)) : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        header,
        if (bounded)
          Expanded(child: SingleChildScrollView(controller: _columnController(col.id), child: list))
        else
          list,
        if (col.loading) Semantics(liveRegion: true, label: s.boardColumnLoading(col.heading), child: const SizedBox.shrink()),
      ]),
    );
    return Semantics(container: true, explicitChildNodes: true, child: section);
  }

  Widget _placeholder(BuildContext context, CmBoardCard card, double height) {
    final c = CmTheme.colorsOf(context);
    return ExcludeSemantics(
      key: _dropKey,
      child: CustomPaint(
        foregroundPainter: _DashedRect(color: c.borderStrong, radius: CmRadius.md, width: 2),
        child: Container(
          constraints: BoxConstraints(minHeight: math.max(40, height)),
          padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15),
          alignment: Alignment.center,
          decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(CmRadius.md)),
          child: Text(card.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: CmType.bodySm.copyWith(fontSize: 12, color: c.textTertiary)),
        ),
      ),
    );
  }

  Widget _cardTile(BuildContext context, CmBoardCard card) {
    final pending = _pending(card);
    final moving = _held?.card.id == card.id || _drag?.card.id == card.id;
    final movable = !card.locked && !pending;
    final view = _CardView(
      card: card,
      pending: pending,
      moving: moving,
      focusNode: _node(card.id),
      held: _held?.card.id == card.id,
      onKey: (e) => _onKey(card, e),
      onTapSemantics: () {
        if (_held?.card.id == card.id) {
          _model.drop();
        } else if (card.onOpen != null) {
          card.onOpen!();
        } else if (movable) {
          pickUp(card.id);
        }
      },
      openable: card.onOpen != null,
    );
    Widget child = view;
    if (movable) {
      final width = (_cardKey(card.id).currentContext?.findRenderObject() as RenderBox?)?.size.width ?? widget.columnWidth - 20;
      final feedbackWidget = Directionality(
        textDirection: Directionality.of(context),
        child: SizedBox(width: width, child: _CardView(card: card, ghost: true)),
      );
      child = _MouseDraggable<String>(
        data: card.id,
        feedback: feedbackWidget,
        onDragStarted: () => _dragStart(card),
        onDragUpdate: (d) => _dragUpdate(d.globalPosition),
        onDragEnd: (_) => _dragEnd(drop: true),
        child: _TouchDraggable<String>(
          data: card.id,
          delay: const Duration(milliseconds: 300),
          feedback: feedbackWidget,
          onDragStarted: () => _dragStart(card),
          onDragUpdate: (d) => _dragUpdate(d.globalPosition),
          onDragEnd: (_) => _dragEnd(drop: true),
          child: view,
        ),
      );
    }
    return KeyedSubtree(key: _cardKey(card.id), child: child);
  }
}

class _CardView extends StatefulWidget {
  const _CardView({
    required this.card,
    this.pending = false,
    this.moving = false,
    this.ghost = false,
    this.held = false,
    this.openable = false,
    this.focusNode,
    this.onKey,
    this.onTapSemantics,
  });
  final CmBoardCard card;
  final bool pending, moving, ghost, held, openable;
  final FocusNode? focusNode;
  final KeyEventResult Function(KeyEvent e)? onKey;
  final VoidCallback? onTapSemantics;

  @override
  State<_CardView> createState() => _CardViewState();
}

class _CardViewState extends State<_CardView> {
  bool _focus = false;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final card = widget.card;
    final pending = widget.pending;
    final moving = widget.moving;
    final titleStyle = CmType.bodyMd.copyWith(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, color: c.textDefault);
    final content = Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(
          child: card.onOpen == null || widget.ghost
              ? ExcludeSemantics(child: Text(card.heading, style: titleStyle))
              : ExcludeSemantics(
                  child: MouseRegion(
                    cursor: SystemMouseCursors.click,
                    child: GestureDetector(onTap: card.onOpen, child: Text(card.heading, style: titleStyle)),
                  ),
                ),
        ),
        if (card.avatar != null) ...[const SizedBox(width: CmSpace.s10), card.avatar!],
        if (card.action != null && !widget.ghost) ...[const SizedBox(width: CmSpace.s10), card.action!],
      ]),
      if (card.lines.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: DefaultTextStyle(
            style: CmType.bodySm.copyWith(fontSize: 12, height: 16 / 12, color: c.textTertiary),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: card.lines),
          ),
        ),
      if (card.badges.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Wrap(spacing: 4, runSpacing: 4, children: card.badges)),
    ]);
    final box = Container(
      padding: const EdgeInsets.symmetric(horizontal: CmSpace.s15, vertical: CmSpace.s12),
      decoration: BoxDecoration(
        color: pending || moving ? c.bgPage : c.bgSurface,
        border: moving ? null : Border.all(color: widget.ghost ? c.borderDefault : c.borderCard),
        borderRadius: BorderRadius.circular(CmRadius.md),
        boxShadow: widget.ghost
            ? const [BoxShadow(color: Color(0x2E000000), blurRadius: 24, offset: Offset(0, 8))]
            : _focus
                ? [BoxShadow(color: c.bgSurface, spreadRadius: 2), BoxShadow(color: c.borderStrong, spreadRadius: 4)]
                : null,
      ),
      child: Stack(clipBehavior: Clip.none, children: [
        Padding(
          padding: EdgeInsetsDirectional.only(end: pending ? 24 : 0),
          child: Opacity(opacity: moving ? 0.5 : 1, child: content),
        ),
        if (pending)
          PositionedDirectional(top: -2, end: -5, child: ExcludeSemantics(child: CmSpinner(size: CmSpinnerSize.small, label: s.boardCardSaving))),
      ]),
    );
    final painted = moving ? CustomPaint(foregroundPainter: _DashedRect(color: c.borderStrong, radius: CmRadius.md, width: 1), child: box) : box;
    if (widget.ghost) return Material(type: MaterialType.transparency, child: painted);
    final focusable = !card.locked || card.onOpen != null;
    // A locked card isn't movable: it is only a way to open the record.
    final hint = [
      if (!card.locked) '${s.boardCardRoleDescription}.',
      if (widget.openable) s.boardCardOpenHint,
      if (!card.locked) s.boardCardInstructions,
    ].join(' ');
    return Semantics(
      container: true,
      explicitChildNodes: true,
      button: focusable,
      focusable: focusable,
      label: pending ? '${card.name}, ${s.boardCardSaving}' : card.name,
      hint: hint,
      onTap: focusable ? widget.onTapSemantics : null,
      child: Focus(
        focusNode: widget.focusNode,
        canRequestFocus: focusable,
        skipTraversal: !focusable,
        onKeyEvent: (_, e) => widget.onKey?.call(e) ?? KeyEventResult.ignored,
        onFocusChange: (f) => setState(() => _focus = f),
        child: MouseRegion(
          cursor: card.locked ? SystemMouseCursors.basic : (pending ? SystemMouseCursors.progress : SystemMouseCursors.grab),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: focusable ? () => widget.focusNode?.requestFocus() : null,
            child: painted,
          ),
        ),
      ),
    );
  }
}

/// Drags at once with a mouse or trackpad; ignores touch, so a swipe still scrolls the board.
class _MouseDraggable<T extends Object> extends Draggable<T> {
  const _MouseDraggable({super.data, required super.feedback, required super.child, super.onDragStarted, super.onDragUpdate, super.onDragEnd});

  @override
  MultiDragGestureRecognizer createRecognizer(GestureMultiDragStartCallback onStart) =>
      ImmediateMultiDragGestureRecognizer(supportedDevices: const {PointerDeviceKind.mouse, PointerDeviceKind.trackpad})..onStart = onStart;
}

/// Touch and pen: press and hold first (300ms, as on the web), so a swipe still scrolls.
class _TouchDraggable<T extends Object> extends LongPressDraggable<T> {
  const _TouchDraggable({super.data, required super.feedback, required super.child, super.delay, super.onDragStarted, super.onDragUpdate, super.onDragEnd});

  @override
  DelayedMultiDragGestureRecognizer createRecognizer(GestureMultiDragStartCallback onStart) =>
      DelayedMultiDragGestureRecognizer(
        delay: delay,
        supportedDevices: const {PointerDeviceKind.touch, PointerDeviceKind.stylus, PointerDeviceKind.invertedStylus, PointerDeviceKind.unknown},
      )..onStart = (Offset position) {
          final result = onStart(position);
          if (result != null) HapticFeedback.selectionClick();
          return result;
        };
}

/// Snaps a horizontal scroll to the start of a column.
class _SnapPhysics extends ScrollPhysics {
  const _SnapPhysics(this.offsets, {super.parent});
  final List<double> offsets;

  @override
  _SnapPhysics applyTo(ScrollPhysics? ancestor) => _SnapPhysics(offsets, parent: buildParent(ancestor));

  double _target(ScrollMetrics p, double velocity) {
    final candidates = [for (final o in offsets) o.clamp(p.minScrollExtent, p.maxScrollExtent)];
    if (candidates.isEmpty) return p.pixels;
    if (velocity.abs() > 50) {
      if (velocity > 0) {
        return candidates.firstWhere((o) => o > p.pixels + 1, orElse: () => p.maxScrollExtent);
      }
      return candidates.lastWhere((o) => o < p.pixels - 1, orElse: () => p.minScrollExtent);
    }
    return candidates.reduce((a, b) => (a - p.pixels).abs() <= (b - p.pixels).abs() ? a : b);
  }

  @override
  Simulation? createBallisticSimulation(ScrollMetrics position, double velocity) {
    if ((velocity <= 0 && position.pixels <= position.minScrollExtent) || (velocity >= 0 && position.pixels >= position.maxScrollExtent)) {
      return super.createBallisticSimulation(position, velocity);
    }
    final target = _target(position, velocity);
    if ((target - position.pixels).abs() < toleranceFor(position).distance) return null;
    return ScrollSpringSimulation(spring, position.pixels, target, velocity, tolerance: toleranceFor(position));
  }

  @override
  bool get allowImplicitScrolling => false;
}

class _DashedRect extends CustomPainter {
  _DashedRect({required this.color, required this.radius, required this.width});
  final Color color;
  final double radius, width;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)).deflate(width / 2);
    final path = dashPath(Path()..addRRect(rect), dashArray: CircularIntervalList<double>([5, 4]));
    canvas.drawPath(path, Paint()..style = PaintingStyle.stroke..strokeWidth = width..color = color);
  }

  @override
  bool shouldRepaint(_DashedRect old) => old.color != color || old.radius != radius || old.width != width;
}
