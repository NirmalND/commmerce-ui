import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

/// Puts [child] in a scroll view [width] wide (with 24 padding above, like a CmPage), in a window [height] tall.
Future<ScrollController> pumpAt(WidgetTester t, double width, Widget child,
    {double windowWidth = 1600, double height = 1200, double after = 24, TextDirection dir = TextDirection.ltr}) async {
  t.view.physicalSize = Size(windowWidth, height);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  final scroll = ScrollController();
  addTearDown(scroll.dispose);
  await t.pumpWidget(MaterialApp(
    theme: CmTheme.light(),
    home: Directionality(
      textDirection: dir,
      child: Scaffold(
        body: SingleChildScrollView(
          controller: scroll,
          child: Padding(
            padding: EdgeInsets.only(top: 24, bottom: after),
            child: Align(alignment: AlignmentDirectional.topStart, child: SizedBox(width: width, child: child)),
          ),
        ),
      ),
    ),
  ));
  return scroll;
}

Widget box(String id, [double h = 50]) => SizedBox(key: ValueKey(id), height: h, child: Text(id));

Rect rectOf(WidgetTester t, String id) => t.getRect(find.byKey(ValueKey(id)));

CmRecordLayout record({
  CmAsidePosition position = CmAsidePosition.above,
  bool sticky = false,
  double mainHeight = 50,
  double asideHeight = 50,
  VoidCallback? onAside,
}) =>
    CmRecordLayout(
      asidePosition: position,
      stickyAside: sticky,
      aside: [
        box('aside', asideHeight),
        SizedBox(key: const ValueKey('aside 2'), height: 40, child: TextButton(onPressed: onAside, child: const Text('Edit'))),
      ],
      main: [box('main', mainHeight), box('main 2')],
    );

void main() {
  group('CmRecordLayout', () {
    testWidgets('from 880 of its own width: main + 320 aside on the end side, 24 apart', (t) async {
      await pumpAt(t, 880, record());
      expect(rectOf(t, 'aside').width, 320);
      expect(rectOf(t, 'aside').left, 880 - 320);
      expect(rectOf(t, 'main').width, 880 - 320 - 24);
      expect(rectOf(t, 'main').left, 0);
      expect(rectOf(t, 'aside').top, rectOf(t, 'main').top, reason: 'side by side');
      expect(rectOf(t, 'main 2').top - rectOf(t, 'main').bottom, 24, reason: 'cards as far apart as the columns');
      expect(CmRecordLayout.sideBySide(880), isTrue);
      expect(CmRecordLayout.sideBySide(879), isFalse);
    });

    testWidgets('at 879 the columns stack, aside above by default, full width, 24 apart', (t) async {
      await pumpAt(t, 879, record());
      for (final id in ['aside', 'main', 'main 2']) {
        expect(rectOf(t, id).width, 879, reason: id);
      }
      expect(rectOf(t, 'main').top - rectOf(t, 'aside 2').bottom, 24);
      expect(rectOf(t, 'aside').top, lessThan(rectOf(t, 'main').top));
    });

    testWidgets('follows its own width, not the window', (t) async {
      await pumpAt(t, 800, record(), windowWidth: 1600);
      expect(rectOf(t, 'aside').width, 800, reason: 'stacked in an 800 column of a 1600 window');
    });

    testWidgets('aside below the main content with CmAsidePosition.below', (t) async {
      await pumpAt(t, 700, record(position: CmAsidePosition.below));
      expect(rectOf(t, 'aside').top - rectOf(t, 'main 2').bottom, 24);
      await pumpAt(t, 1000, record(position: CmAsidePosition.below));
      expect(rectOf(t, 'aside').top, rectOf(t, 'main').top, reason: 'side by side, whatever the position');
      expect(rectOf(t, 'aside').left, 1000 - 320);
    });

    testWidgets('gap 16 at 640 or less, 24 at 641', (t) async {
      await pumpAt(t, 640, record());
      expect(rectOf(t, 'main').top - rectOf(t, 'aside 2').bottom, 16);
      expect(rectOf(t, 'aside 2').top - rectOf(t, 'aside').bottom, 16, reason: 'cards too');
      await pumpAt(t, 641, record());
      expect(rectOf(t, 'main').top - rectOf(t, 'aside 2').bottom, 24);
      expect(CmRecordLayout.gapFor(640, 32), 32, reason: 'a gap other than 24 stays');
    });

    testWidgets('RTL: the aside is on the left', (t) async {
      await pumpAt(t, 1000, record(), dir: TextDirection.rtl, windowWidth: 1000);
      expect(rectOf(t, 'aside').left, 0);
      expect(rectOf(t, 'aside').width, 320);
      expect(rectOf(t, 'main').left, 320 + 24);
      expect(rectOf(t, 'main').right, 1000);
    });

    testWidgets('sticky aside stays 24 below the top of the scroll view while the main column scrolls, and stops at its end', (t) async {
      var taps = 0;
      final scroll = await pumpAt(t, 1000, record(sticky: true, mainHeight: 2000, asideHeight: 200, onAside: () => taps++), height: 800, after: 1000);
      expect(rectOf(t, 'aside').top, 24);
      scroll.jumpTo(500);
      await t.pump();
      expect(rectOf(t, 'aside').top, 24, reason: 'stuck');
      expect(rectOf(t, 'main').top, 24 - 500.0, reason: 'main scrolled');
      await t.tap(find.text('Edit'));
      expect(taps, 1, reason: 'the moved aside still takes taps where it is drawn');
      scroll.jumpTo(scroll.position.maxScrollExtent);
      await t.pump();
      // 1000 of other content follow the layout: the aside stops at the end of the row, with the main column.
      expect(rectOf(t, 'aside 2').bottom, closeTo(rectOf(t, 'main 2').bottom, 0.01));
      expect(rectOf(t, 'aside').top, lessThan(24));
    });

    testWidgets('without stickyAside the aside scrolls with the page', (t) async {
      final scroll = await pumpAt(t, 1000, record(mainHeight: 2000, asideHeight: 200), height: 800);
      scroll.jumpTo(500);
      await t.pump();
      expect(rectOf(t, 'aside').top, 24 - 500.0);
    });

    testWidgets('an aside taller than the scroll view scrolls with the page', (t) async {
      // 24 + 760 + 24 + 40 > 800.
      final scroll = await pumpAt(t, 1000, record(sticky: true, mainHeight: 2000, asideHeight: 760), height: 800);
      scroll.jumpTo(500);
      await t.pump();
      expect(rectOf(t, 'aside').top, 24 - 500.0);
    });

    testWidgets('an aside that just fits sticks', (t) async {
      // 24 (sticky top) + 712 + 24 + 40 = 800.
      final scroll = await pumpAt(t, 1000, record(sticky: true, mainHeight: 2000, asideHeight: 712), height: 800);
      scroll.jumpTo(500);
      await t.pump();
      expect(rectOf(t, 'aside').top, 24);
    });

    testWidgets('stacked columns never stick', (t) async {
      final scroll = await pumpAt(t, 879, record(sticky: true, mainHeight: 2000, asideHeight: 200), height: 800);
      scroll.jumpTo(500);
      await t.pump();
      expect(rectOf(t, 'aside').top, 24 - 500.0);
    });
  });

  group('CmPageHeader back link (1.7)', () {
    Future<void> pumpHeader(WidgetTester t, double width, Widget header) async {
      t.view.physicalSize = Size(width, 800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: Scaffold(body: Align(alignment: Alignment.topCenter, child: header))));
    }

    testWidgets('onBack shows "Back to {label}" at desktop width and calls back', (t) async {
      final handle = t.ensureSemantics();
      var back = 0;
      await pumpHeader(t, 1440, CmPageHeader(title: 'Asha Rao', onBack: () => back++, backLabel: 'Leads'));
      expect(find.bySemanticsLabel('Back to Leads'), findsOneWidget);
      await t.tap(find.bySemanticsLabel('Back to Leads'));
      expect(back, 1);
      final node = t.getSemantics(find.bySemanticsLabel('Back to Leads'));
      expect(node.hasFlag(SemanticsFlag.isButton), isTrue);
      handle.dispose();
    });

    testWidgets('without backLabel the arrow is named "Back"; it also shows on phones', (t) async {
      final handle = t.ensureSemantics();
      await pumpHeader(t, 375, CmPageHeader(title: 'Asha Rao', onBack: () {}));
      expect(find.bySemanticsLabel('Back'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('no onBack and no breadcrumbs: no arrow on desktop', (t) async {
      final handle = t.ensureSemantics();
      await pumpHeader(t, 1440, const CmPageHeader(title: 'Asha Rao', breadcrumbs: [CmBreadcrumb('Leads')]));
      expect(find.bySemanticsLabel('Back to Leads'), findsNothing);
      handle.dispose();
    });

    testWidgets('on phones a description puts the actions under it; without one they share the title row', (t) async {
      final actions = [CmButton(label: 'Convert', variant: CmButtonVariant.primary, onPressed: () {})];
      await pumpHeader(t, 375, CmPageHeader(title: 'Asha', onBack: () {}, description: 'Owner Ravi · Created 12 Nov', actions: actions));
      final desc = t.getRect(find.text('Owner Ravi · Created 12 Nov'));
      final button = t.getRect(find.byType(CmButton));
      expect(button.top, greaterThanOrEqualTo(desc.bottom), reason: 'actions under the description line');
      expect(desc.width, greaterThan(200), reason: 'the meta line gets the whole row, not a narrow column');

      await pumpHeader(t, 375, CmPageHeader(title: 'Asha', onBack: () {}, actions: actions));
      expect(t.getRect(find.byType(CmButton)).center.dy, closeTo(t.getRect(find.text('Asha')).center.dy, 1), reason: 'same row');

      await pumpHeader(t, 1440, CmPageHeader(title: 'Asha', description: 'Owner Ravi · Created 12 Nov', actions: actions));
      expect(t.getRect(find.byType(CmButton)).top, lessThan(t.getRect(find.text('Owner Ravi · Created 12 Nov')).top), reason: 'desktop keeps one row');
    });
  });

  group('CmInfoPanel rows (1.7)', () {
    testWidgets('compact rows: 16 padding, labels 13/18 on two fifths, values 14/20 medium, rows 12 apart', (t) async {
      t.view.physicalSize = const Size(1200, 800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(
        theme: CmTheme.light(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 320,
              child: CmInfoPanel(
                heading: 'Details',
                variant: CmCardVariant.compact,
                layout: CmInfoLayout.rows,
                items: [
                  CmInfoItem('Email', const Text('asha@raotextiles.in', key: ValueKey('email'))),
                  CmInfoItem('Company', const Text('Rao Textiles', key: ValueKey('company'))),
                ],
              ),
            ),
          ),
        ),
      ));
      final label = t.widget<Text>(find.text('Email'));
      expect(label.style!.fontSize, 13);
      expect(label.style!.height! * 13, closeTo(18, 0.01));
      final value = t.widget<DefaultTextStyle>(find.ancestor(of: find.byKey(const ValueKey('email')), matching: find.byType(DefaultTextStyle)).first).style;
      expect(value.fontSize, 14);
      expect(value.height! * 14, closeTo(20, 0.01));
      expect(value.fontWeight, FontWeight.w500);

      final panel = t.getRect(find.byType(CmInfoPanel));
      final labelBox = t.getRect(find.ancestor(of: find.text('Email'), matching: find.byType(Expanded)).first);
      final valueBox = t.getRect(find.ancestor(of: find.byKey(const ValueKey('email')), matching: find.byType(Expanded)).first);
      // Card border 1 + padding 16 on each side.
      final inner = panel.width - 2 * 16 - 2;
      expect(labelBox.left - panel.left, closeTo(17, 0.5));
      expect(labelBox.width, closeTo((inner - 12) * 2 / 5, 0.5));
      expect(valueBox.left - labelBox.right, closeTo(12, 0.5));
      expect(valueBox.width, closeTo((inner - 12) * 3 / 5, 0.5));
      Rect row(String label) => t.getRect(find.ancestor(of: find.text(label), matching: find.byType(Row)).first);
      expect(row('Company').top - row('Email').bottom, closeTo(12, 0.5));
    });

    testWidgets('a row reads as one item: label and value together', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(MaterialApp(
        theme: CmTheme.light(),
        home: Scaffold(body: CmInfoPanel(heading: 'Details', layout: CmInfoLayout.rows, items: [CmInfoItem('City', const Text('Bengaluru'))])),
      ));
      expect(find.semantics.byPredicate((n) => n.label.contains('City') && n.label.contains('Bengaluru')), findsOneWidget);
      handle.dispose();
    });
  });

  group('CmDataTable lines (1.7)', () {
    const long = 'Asked for a quote on 200 printed cotton tote bags with the store logo, delivery to Bengaluru by 5 December, '
        'and wants to know about GST invoices, sample bags and payment terms for repeat orders.';

    Future<void> pumpTable(WidgetTester t, {int? lines}) async {
      t.view.physicalSize = const Size(1200, 800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(MaterialApp(
        theme: CmTheme.light(),
        home: Scaffold(
          body: SizedBox(
            width: 900,
            child: CmDataTable(
              caption: 'Leads',
              columns: [
                const CmDataTableColumn(key: 'name', label: 'Name'),
                CmDataTableColumn(key: 'notes', label: 'Notes', lines: lines),
              ],
              rows: const [
                {'name': 'Asha Rao', 'notes': long},
                {'name': 'Vikram', 'notes': 'Call back'},
              ],
            ),
          ),
        ),
      ));
    }

    testWidgets('wraps onto up to N lines, then ends in an ellipsis with the full value in a tooltip', (t) async {
      await pumpTable(t, lines: 2);
      final text = t.widget<Text>(find.text(long));
      expect(text.maxLines, 2);
      expect(text.softWrap, isTrue);
      expect(text.overflow, TextOverflow.ellipsis);
      final h = t.getRect(find.text(long)).height;
      expect(h, closeTo(2 * 18, 1), reason: 'two 13/18 lines');
      expect(find.byWidgetPredicate((w) => w is Tooltip && w.message == long), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w is Tooltip && w.message == 'Call back'), findsNothing, reason: 'short values are not cut');
      // The long row grows to fit two lines (10 above and below + border); the short one keeps 48.
      final longRow = t.getRect(find.ancestor(of: find.text(long), matching: find.byType(Container)).first);
      expect(longRow.height, closeTo(2 * 18 + 21, 1));
      final shortRow = t.getRect(find.ancestor(of: find.text('Call back'), matching: find.byType(Container)).first);
      expect(shortRow.height, 48);
      expect(t.getRect(find.ancestor(of: find.text('Asha Rao'), matching: find.byType(Container)).first).height, longRow.height,
          reason: 'every cell in the row is as tall');
    });

    testWidgets('screen readers get the whole value', (t) async {
      final handle = t.ensureSemantics();
      await pumpTable(t, lines: 3);
      // The row reads as one line of cells; the notes cell's whole value is in it, not the cut-off text.
      expect(find.semantics.byPredicate((n) => n.label.contains(long)), findsOneWidget);
      handle.dispose();
    });

    testWidgets('without lines a text cell stays on one line', (t) async {
      await pumpTable(t);
      final text = t.widget<Text>(find.text(long));
      expect(text.maxLines, 1);
      expect(t.getRect(find.text(long)).height, closeTo(18, 1));
    });
  });
}
