import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void size(WidgetTester t, Size s) {
  t.view.physicalSize = s;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(textDirection: dir, child: Scaffold(body: Align(alignment: Alignment.topCenter, child: child))),
    );

const leads = CmGlobalSearchGroup(label: 'Leads', total: 12, seeAll: true, value: 'leads', items: [
  CmGlobalSearchItem(title: 'Ravi Stores', description: 'Lead · Mumbai', icon: CmIcons.user, value: 'L1'),
  CmGlobalSearchItem(title: 'Ravi Traders', description: 'Lead · Pune', icon: CmIcons.user, value: 'L2'),
]);
const deals = CmGlobalSearchGroup(label: 'Deals', items: [CmGlobalSearchItem(title: 'Ravi Stores renewal', icon: CmIcons.handshake, value: 'D1')]);

/// A search that "finds" [leads] and [deals] for any query.
class Harness extends StatefulWidget {
  const Harness({super.key, this.onSelected, this.loading = false, this.empty = false});
  final CmGlobalSearchSelected? onSelected;
  final bool loading, empty;
  @override
  State<Harness> createState() => HarnessState();
}

class HarnessState extends State<Harness> {
  List<CmGlobalSearchGroup> results = const [];
  final queries = <String>[];
  @override
  Widget build(BuildContext context) => SizedBox(
        width: 480,
        child: CmGlobalSearch(
          placeholder: 'Search leads, deals',
          results: results,
          loading: widget.loading,
          onSearch: (q) => setState(() {
            queries.add(q);
            results = q.isEmpty || widget.empty ? const [] : const [leads, deals];
          }),
          onSelected: widget.onSelected,
        ),
      );
}

void main() {
  testWidgets('typing searches; results are grouped with heading, total, two lines and See all', (t) async {
    final handle = t.ensureSemantics();
    size(t, const Size(1280, 900));
    await t.pumpWidget(app(const Harness()));
    await t.pump();
    // The text field is named by the label (the placeholder follows it).
    expect(find.bySemanticsLabel(RegExp(r'^Search')), findsOneWidget);
    expect(find.text('Search leads, deals'), findsOneWidget);
    await t.enterText(find.byType(TextField), 'ravi');
    await t.pump();
    expect(t.state<HarnessState>(find.byType(Harness)).queries, ['ravi']);
    expect(find.text('Leads'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('Lead · Mumbai'), findsOneWidget);
    expect(find.text('See all'), findsOneWidget);
    expect(find.bySemanticsLabel('Leads, 12 results'), findsOneWidget);
    expect(find.bySemanticsLabel('Deals, 1 result'), findsOneWidget);
    expect(find.bySemanticsLabel('Ravi Stores, Lead · Mumbai'), findsOneWidget);
    // Announced politely: three results (See all rows don't count).
    expect(find.bySemanticsLabel('3 results'), findsOneWidget);
    // Options are 40px or taller; the panel floats 10px under the box, as wide as it.
    expect(t.getSize(find.ancestor(of: find.text('Ravi Traders'), matching: find.byType(Container)).first).height, greaterThanOrEqualTo(40));
    final box = t.getRect(find.byType(CmGlobalSearch));
    final panelTop = t.getRect(find.text('Leads')).top;
    expect(panelTop, greaterThan(box.bottom));
    // Clear button empties the box and searches with ''.
    await t.tap(find.bySemanticsLabel('Clear search'));
    await t.pump();
    expect(find.text('Leads'), findsNothing);
    expect(t.state<HarnessState>(find.byType(Harness)).queries.last, '');
    handle.dispose();
  });

  testWidgets('keyboard: arrows move (wrapping), Enter chooses, Esc closes then clears', (t) async {
    final handle = t.ensureSemantics();
    size(t, const Size(1280, 900));
    final chosen = <(Object?, Object?)>[];
    await t.pumpWidget(app(Harness(onSelected: (g, i) => chosen.add((g.value, i?.value)))));
    await t.pump();
    await t.enterText(find.byType(TextField), 'ravi');
    await t.pump();
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.pump();
    expect(t.getSemantics(find.bySemanticsLabel('Ravi Stores, Lead · Mumbai')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await t.pump();
    // Wrapped to the last row (the Deals group has no See all).
    expect(t.getSemantics(find.bySemanticsLabel('Ravi Stores renewal')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await t.pump();
    expect(t.getSemantics(find.bySemanticsLabel('See all')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pump();
    expect(chosen, [('leads', null)]);
    expect(find.text('Leads'), findsNothing, reason: 'choosing closes the results');
    // Focus stays in the box: typing again reopens; Esc closes the results, a second Esc clears the box.
    await t.enterText(find.byType(TextField), 'ravi s');
    await t.pump();
    expect(find.text('Leads'), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pump();
    expect(find.text('Leads'), findsNothing);
    expect(find.text('ravi s'), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pump();
    expect(find.text('ravi s'), findsNothing);
    // Tapping a result chooses it too.
    await t.enterText(find.byType(TextField), 'ravi');
    await t.pump();
    await t.tap(find.text('Ravi Traders'));
    await t.pump();
    expect(chosen.last, ('leads', 'L2'));
    handle.dispose();
  });

  testWidgets('loading and empty states', (t) async {
    final handle = t.ensureSemantics();
    size(t, const Size(1280, 900));
    await t.pumpWidget(app(const Harness(loading: true)));
    await t.pump();
    await t.enterText(find.byType(TextField), 'ravi');
    await t.pump();
    expect(find.text('Loading'), findsOneWidget);
    expect(find.byType(CmSpinner), findsOneWidget);
    expect(find.text('Ravi Stores'), findsNothing);
    await t.pumpWidget(app(const Harness(empty: true)));
    await t.pump();
    await t.enterText(find.byType(TextField), 'zzz');
    await t.pump();
    expect(find.text('No results'), findsOneWidget);
    expect(find.bySemanticsLabel('No results'), findsOneWidget, reason: 'announced by the live status');
    handle.dispose();
  });

  testWidgets('right to left: the results line up with the box on the right; dark theme colours', (t) async {
    size(t, const Size(1280, 900));
    await t.pumpWidget(app(const Harness(), theme: CmTheme.dark(), dir: TextDirection.rtl));
    await t.pump();
    final box = t.widget<Container>(find.descendant(of: find.byType(CmGlobalSearch), matching: find.byType(Container)).first);
    expect((box.decoration! as BoxDecoration).color, CmColors.dark.bgPage);
    await t.enterText(find.byType(TextField), 'ravi');
    await t.pump();
    final field = t.getRect(find.byType(CmGlobalSearch));
    // The search icon sits at the right edge of the box.
    expect(t.getRect(find.byType(CmIcon).first).right, closeTo(field.right - 10, 2));
    // The group heading starts at the right of the panel.
    expect(t.getRect(find.text('Leads')).right, closeTo(field.right - 21, 3));
  });

  testWidgets('shortcut key focuses the box unless typing in a field', (t) async {
    size(t, const Size(1280, 900));
    await t.pumpWidget(app(const SizedBox(width: 480, child: CmGlobalSearch(shortcut: '/'))));
    await t.pump();
    expect(find.text('/'), findsOneWidget);
    await t.sendKeyEvent(LogicalKeyboardKey.slash, character: '/');
    await t.pump();
    final field = t.widget<TextField>(find.byType(TextField));
    expect(field.focusNode!.hasFocus, isTrue);
    expect(find.text('/'), findsNothing, reason: 'the hint hides while the box has focus');
  });

  group('header bar search', () {
    Widget bar({Widget? search, double width = 1280}) => SizedBox(
          width: width,
          child: CmHeaderBar(logo: const Text('COMMMERCE'), userName: 'Asha Rao', search: search, end: [CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: 3, onPressed: () {})]),
        );

    testWidgets('wide bars show the search inline; no search button', (t) async {
      final handle = t.ensureSemantics();
      size(t, const Size(1280, 900));
      await t.pumpWidget(app(bar(search: const CmGlobalSearch())));
      await t.pump();
      expect(find.byType(CmGlobalSearch), findsOneWidget);
      expect(t.getSize(find.byType(CmGlobalSearch)).width, lessThanOrEqualTo(560));
      expect(find.bySemanticsLabel('Notifications, 3 unread'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('at 900px and narrower a search button opens a full-screen layer; Esc closes it', (t) async {
      final handle = t.ensureSemantics();
      size(t, const Size(800, 900));
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      var results = <CmGlobalSearchGroup>[];
      final toggles = <bool>[];
      CmGlobalSearchItem? chosen;
      await t.pumpWidget(app(StatefulBuilder(builder: (context, set) => SizedBox(
            width: 800,
            child: CmHeaderBar(
              logo: const Text('COMMMERCE'),
              onSearchToggle: toggles.add,
              search: CmGlobalSearch(
                controller: controller,
                results: results,
                onSearch: (q) => set(() => results = q.isEmpty ? [] : const [leads]),
                onSelected: (g, i) => chosen = i,
              ),
            ),
          ))));
      await t.pump();
      expect(find.byType(CmGlobalSearch), findsNothing);
      await t.tap(find.bySemanticsLabel('Search'));
      await t.pumpAndSettle();
      expect(toggles, [true]);
      expect(find.byType(CmGlobalSearch), findsOneWidget);
      expect(t.getSize(find.byType(CmSearchLayer)), const Size(800, 900), reason: 'full screen');
      expect(find.bySemanticsLabel('Close'), findsOneWidget);
      // The box has focus in the layer; results that arrive later show in it, under the box.
      expect(t.widget<TextField>(find.byType(TextField)).focusNode!.hasFocus, isTrue);
      await t.enterText(find.byType(TextField), 'ravi');
      await t.pumpAndSettle();
      expect(find.text('Ravi Stores'), findsOneWidget);
      // Choosing a result closes the layer.
      await t.tap(find.text('Ravi Stores'));
      await t.pumpAndSettle();
      expect(chosen?.value, 'L1');
      expect(find.byType(CmSearchLayer), findsNothing);
      expect(toggles, [true, false]);
      // Esc closes it too; the query is kept by the controller.
      await t.tap(find.bySemanticsLabel('Search'));
      await t.pumpAndSettle();
      expect(find.text('ravi'), findsOneWidget);
      await t.sendKeyEvent(LogicalKeyboardKey.escape); // closes the results first
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.escape); // clears the box
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.escape); // closes the layer
      await t.pumpAndSettle();
      expect(find.byType(CmSearchLayer), findsNothing);
      handle.dispose();
    });
  });
}
