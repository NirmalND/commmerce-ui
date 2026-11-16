import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(textDirection: dir, child: Scaffold(body: Align(alignment: Alignment.topLeft, child: child))),
    );

/// A pipeline whose data lives in the test, as an app's state would.
class Pipeline extends StatefulWidget {
  const Pipeline({super.key, this.onMove, this.hideEmpty = false, this.width = 1000, this.height});
  final FutureOr<bool?> Function(CmBoardMove m, PipelineState s)? onMove;
  final bool hideEmpty;
  final double width;
  final double? height;
  @override
  State<Pipeline> createState() => PipelineState();
}

class PipelineState extends State<Pipeline> {
  final boardKey = GlobalKey<CmBoardState>();
  Map<String, List<String>> data = {
    'new': ['Ravi Stores', 'Asha Mart'],
    'contacted': ['Kiran Foods', 'Meera Textiles'],
    'won': [],
  };
  final moves = <CmBoardMove>[];
  final loads = <String>[];
  bool loading = false;

  void apply(CmBoardMove m) => setState(() {
        data[m.from]!.remove(m.card.id);
        data[m.to]!.insert(m.toIndex, m.card.id);
      });

  @override
  Widget build(BuildContext context) {
    const headings = {'new': 'New', 'contacted': 'Contacted', 'won': 'Won'};
    final board = CmBoard(
      key: boardKey,
      label: 'Merchants by status',
      hideEmpty: widget.hideEmpty,
      onLoadMore: (id) => setState(() {
        loads.add(id);
        loading = true;
      }),
      onMove: (m) {
        moves.add(m);
        if (widget.onMove != null) return widget.onMove!(m, this);
        apply(m);
        return true;
      },
      columns: [
        for (final e in data.entries)
          CmBoardColumn(
            id: e.key,
            heading: headings[e.key]!,
            hasMore: e.key == 'contacted',
            loading: e.key == 'contacted' && loading,
            total: e.key == 'contacted' ? 12 : null,
            cards: [for (final n in e.value) CmBoardCard(id: n, heading: n, lines: const [Text('Bengaluru')])],
          ),
      ],
    );
    return SizedBox(width: widget.width, height: widget.height, child: board);
  }
}

String? focused() => FocusManager.instance.primaryFocus?.debugLabel;

Future<void> key(WidgetTester t, LogicalKeyboardKey k) async {
  await t.sendKeyEvent(k);
  await t.pump();
}

void main() {
  testWidgets('board, columns and cards have names, counts, headings and hints', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Pipeline()));
    expect(find.bySemanticsLabel('Merchants by status'), findsOneWidget);
    final heading = t.getSemantics(find.bySemanticsLabel('Contacted, 12 cards')).getSemanticsData();
    expect(heading.hasFlag(SemanticsFlag.isHeader), isTrue);
    expect(heading.headingLevel, 3);
    expect(find.bySemanticsLabel('New, 2 cards'), findsOneWidget);
    expect(find.bySemanticsLabel('Won, 0 cards'), findsOneWidget);
    expect(find.text('12'), findsOneWidget, reason: 'total, not the cards loaded');
    expect(find.text('No cards'), findsOneWidget);
    expect(find.text('Load more'), findsOneWidget);
    final card = t.getSemantics(find.bySemanticsLabel('Ravi Stores')).getSemanticsData();
    expect(card.hasFlag(SemanticsFlag.isButton), isTrue);
    expect(card.hasAction(SemanticsAction.tap), isTrue);
    expect(card.hint, startsWith('movable card. Press Space to pick up.'));
    handle.dispose();
  });

  testWidgets('keyboard: Space picks up, arrows choose, Space drops; every step announced; focus stays', (t) async {
    await t.pumpWidget(app(const Pipeline()));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    await t.tap(find.text('Ravi Stores'));
    await t.pump();
    expect(focused(), 'CmBoardCard Ravi Stores');
    t.takeAnnouncements();

    await key(t, LogicalKeyboardKey.space);
    expect(t.takeAnnouncements().single.message, 'Picked up Ravi Stores. Column New, position 1 of 2.');
    expect(s.boardKey.currentState!.heldCard, 'Ravi Stores');
    await key(t, LogicalKeyboardKey.arrowRight);
    expect(t.takeAnnouncements().single.message, 'Column Contacted, position 1 of 3.');
    expect(find.text('Ravi Stores'), findsNWidgets(2), reason: 'the card where it was, and the placeholder');
    await key(t, LogicalKeyboardKey.arrowDown);
    expect(t.takeAnnouncements().single.message, 'Column Contacted, position 2 of 3.');
    await key(t, LogicalKeyboardKey.end);
    expect(t.takeAnnouncements().single.message, 'Column Contacted, position 3 of 3.');
    await key(t, LogicalKeyboardKey.arrowUp);
    t.takeAnnouncements();
    await key(t, LogicalKeyboardKey.space);
    await t.pump();
    expect(s.moves.single.toString(), 'CmBoardMove(Ravi Stores: new[0] -> contacted[1], keyboard)');
    expect(s.data['contacted'], ['Kiran Foods', 'Ravi Stores', 'Meera Textiles']);
    expect(t.takeAnnouncements().single.message, 'Moved Ravi Stores to Contacted, position 2 of 3.');
    expect(focused(), 'CmBoardCard Ravi Stores', reason: 'focus follows the card');
    expect(s.boardKey.currentState!.heldCard, isNull);
  });

  testWidgets('keyboard: Escape cancels, dropping where it started says so, arrows move focus between cards', (t) async {
    await t.pumpWidget(app(const Pipeline()));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    await t.tap(find.text('Asha Mart'));
    await t.pump();
    await key(t, LogicalKeyboardKey.space);
    await key(t, LogicalKeyboardKey.arrowRight);
    t.takeAnnouncements();
    await key(t, LogicalKeyboardKey.escape);
    expect(t.takeAnnouncements().single.message, 'Move cancelled. Asha Mart is back in New.');
    expect(s.moves, isEmpty);
    await key(t, LogicalKeyboardKey.space);
    await key(t, LogicalKeyboardKey.enter);
    expect(t.takeAnnouncements().last.message, 'Asha Mart dropped where it started.');
    expect(s.moves, isEmpty);
    // Not moving: arrows walk the cards.
    await key(t, LogicalKeyboardKey.arrowUp);
    expect(focused(), 'CmBoardCard Ravi Stores');
    await key(t, LogicalKeyboardKey.arrowRight);
    expect(focused(), 'CmBoardCard Kiran Foods');
    await key(t, LogicalKeyboardKey.arrowRight);
    expect(focused(), 'CmBoardCard Kiran Foods', reason: 'the empty column is skipped and there is none after it');
  });

  testWidgets('right to left: the arrows follow the reading direction', (t) async {
    await t.pumpWidget(app(const Pipeline(), dir: TextDirection.rtl));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    final ravi = t.getRect(find.text('Ravi Stores'));
    final kiran = t.getRect(find.text('Kiran Foods'));
    expect(kiran.right, lessThan(ravi.left), reason: 'columns run right to left');
    await t.tap(find.text('Ravi Stores'));
    await t.pump();
    await key(t, LogicalKeyboardKey.space);
    await key(t, LogicalKeyboardKey.arrowLeft);
    expect(t.takeAnnouncements().last.message, 'Column Contacted, position 1 of 3.');
    await key(t, LogicalKeyboardKey.arrowLeft);
    expect(t.takeAnnouncements().last.message, 'Column Won, position 1 of 1.');
    await key(t, LogicalKeyboardKey.space);
    await t.pump();
    expect(s.data['won'], ['Ravi Stores']);
  });

  testWidgets('onMove returning false refuses the move', (t) async {
    await t.pumpWidget(app(Pipeline(onMove: (m, s) => false)));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    await t.tap(find.text('Ravi Stores'));
    await t.pump();
    await key(t, LogicalKeyboardKey.space);
    await key(t, LogicalKeyboardKey.arrowRight);
    await key(t, LogicalKeyboardKey.space);
    expect(t.takeAnnouncements().last.message, 'Ravi Stores can\'t be moved to Contacted.');
    expect(s.data['new'], ['Ravi Stores', 'Asha Mart']);
    expect(focused(), 'CmBoardCard Ravi Stores');
  });

  testWidgets('a future: the card shows saving at its new place, then goes back when the save fails', (t) async {
    final handle = t.ensureSemantics();
    final save = Completer<bool>();
    await t.pumpWidget(app(Pipeline(onMove: (m, s) => save.future)));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    expect(s.boardKey.currentState!.moveCard('Ravi Stores', 'won'), isTrue);
    await t.pump();
    expect(s.moves.single.source, CmBoardMoveSource.api);
    expect(find.bySemanticsLabel('Ravi Stores, Saving'), findsOneWidget);
    expect(find.bySemanticsLabel('Won, 1 card'), findsOneWidget, reason: 'shown in its new column while saving');
    expect(find.bySemanticsLabel('New, 1 card'), findsOneWidget);
    expect(t.takeAnnouncements().last.message, 'Moved Ravi Stores to Won, position 1 of 1.');
    save.completeError(Exception('offline'));
    await t.pump();
    await t.pump();
    expect(find.bySemanticsLabel('Won, 0 cards'), findsOneWidget);
    expect(find.bySemanticsLabel('Ravi Stores'), findsOneWidget);
    expect(t.takeAnnouncements().last.message, 'Couldn\'t move Ravi Stores. It is back in New.');
    handle.dispose();
  });

  testWidgets('a future that succeeds keeps the card in place; totals follow the move', (t) async {
    final handle = t.ensureSemantics();
    final save = Completer<bool>();
    await t.pumpWidget(app(Pipeline(onMove: (m, s) async {
      final ok = await save.future;
      s.apply(m);
      return ok;
    })));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    s.boardKey.currentState!.moveCard('Ravi Stores', 'contacted', 0);
    await t.pump();
    expect(find.bySemanticsLabel('Contacted, 13 cards'), findsOneWidget);
    save.complete(true);
    await t.pump();
    await t.pump();
    expect(s.data['contacted']!.first, 'Ravi Stores');
    expect(find.bySemanticsLabel('Ravi Stores'), findsOneWidget, reason: 'saved: no longer pending');
    handle.dispose();
  });

  testWidgets('drag with a mouse moves a card to the column under the pointer', (t) async {
    await t.pumpWidget(app(const Pipeline()));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    final from = t.getCenter(find.text('Asha Mart'));
    final to = t.getCenter(find.text('Kiran Foods'));
    final g = await t.startGesture(from, kind: PointerDeviceKind.mouse);
    await g.moveBy(const Offset(10, 0));
    await t.pump();
    expect(t.takeAnnouncements().last.message, 'Picked up Asha Mart. Column New, position 2 of 2.');
    await g.moveTo(to - const Offset(0, 10));
    await t.pump();
    expect(t.takeAnnouncements().last.message, 'Column Contacted, position 1 of 3.');
    await g.up();
    await t.pump();
    expect(s.moves.single.toString(), 'CmBoardMove(Asha Mart: new[1] -> contacted[0], pointer)');
    expect(s.data['contacted']!.first, 'Asha Mart');
  });

  testWidgets('touch needs a press and hold; a quick swipe does not move', (t) async {
    await t.pumpWidget(app(const Pipeline()));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    final from = t.getCenter(find.text('Ravi Stores'));
    var g = await t.startGesture(from);
    await g.moveBy(const Offset(300, 0));
    await g.up();
    await t.pump();
    expect(s.moves, isEmpty);
    g = await t.startGesture(from);
    await t.pump(const Duration(milliseconds: 350));
    await g.moveTo(t.getCenter(find.text('Meera Textiles')) + const Offset(0, 30));
    await t.pump();
    await g.up();
    await t.pump();
    expect(s.moves.single.toString(), 'CmBoardMove(Ravi Stores: new[0] -> contacted[2], pointer)');
  });

  testWidgets('hide empty: empty columns are 48px rails that still take cards from the keyboard', (t) async {
    await t.pumpWidget(app(const Pipeline(hideEmpty: true)));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    expect(find.text('No cards'), findsNothing);
    final rail = find.ancestor(of: find.text('Won'), matching: find.byType(SizedBox)).first;
    expect(t.getSize(rail).width, 48);
    expect(find.ancestor(of: find.text('Won'), matching: find.byType(RotatedBox)), findsOneWidget);
    await t.tap(find.text('Kiran Foods'));
    await t.pump();
    await key(t, LogicalKeyboardKey.space);
    await key(t, LogicalKeyboardKey.arrowRight);
    expect(t.takeAnnouncements().last.message, 'Column Won, position 1 of 1.');
    await key(t, LogicalKeyboardKey.space);
    await t.pump();
    expect(s.data['won'], ['Kiran Foods']);
  });

  testWidgets('Load more calls back with the column; loading is announced and shows a spinner', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Pipeline()));
    final s = t.state<PipelineState>(find.byType(Pipeline));
    await t.tap(find.text('Load more'));
    await t.pump();
    expect(s.loads, ['contacted']);
    final live = t.getSemantics(find.bySemanticsLabel('Loading Contacted')).getSemanticsData();
    expect(live.hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    final more = t.getSemantics(find.bySemanticsLabel('Load more')).getSemanticsData();
    expect(more.hasFlag(SemanticsFlag.isEnabled), isFalse, reason: 'busy while loading');
    handle.dispose();
  });

  testWidgets('phones: columns take nearly the whole width and snap; bounded height scrolls columns', (t) async {
    await t.pumpWidget(app(const Pipeline(width: 360, height: 500)));
    final col = find.ancestor(of: find.text('New'), matching: find.byType(SizedBox)).first;
    expect(t.getSize(col).width, 320);
    await t.drag(find.text('Ravi Stores'), const Offset(-200, 0));
    await t.pumpAndSettle();
    final pos = t.state<ScrollableState>(find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.right)).position;
    expect(pos.pixels, 330, reason: 'snapped to the start of the next column');
  });

  testWidgets('dark theme and a locked card', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(
      SizedBox(
        width: 700,
        child: CmBoard(columns: [
          CmBoardColumn(id: 'a', heading: 'Open', cards: [CmBoardCard(id: 'x', heading: 'Locked lead', locked: true, onOpen: () {})]),
        ]),
      ),
      theme: CmTheme.dark(),
    ));
    expect(find.bySemanticsLabel('Board'), findsOneWidget);
    final card = t.getSemantics(find.bySemanticsLabel('Locked lead')).getSemanticsData();
    expect(card.hint, 'Press Enter to open.');
    final box = t.widget<Container>(find.ancestor(of: find.text('Locked lead'), matching: find.byType(Container)).first);
    expect((box.decoration! as BoxDecoration).color, CmColors.dark.bgSurface);
    expect(t.state<CmBoardState>(find.byType(CmBoard)).pickUp('x'), isFalse);
    handle.dispose();
  });
}
