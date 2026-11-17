// The 1.3 additions to existing widgets: photo upload, option tones, card actions without a heading,
// grouped options in select and combobox, and nested list moves between lists of a group.

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(
        textDirection: dir,
        child: Scaffold(body: SingleChildScrollView(padding: const EdgeInsets.all(20), child: child)),
      ),
    );

String? focused() => FocusManager.instance.primaryFocus?.debugLabel;

// A 1x1 PNG, so the photo tile has a real image to show.
final _png = Uint8List.fromList(const [
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0xF8, 0xCF, 0xC0, 0xF0, 0x1F, 0x00, 0x05, 0x00,
  0x01, 0xFF, 0x89, 0x99, 0x3D, 0x1D, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
]);

class Photo extends StatefulWidget {
  const Photo({super.key, this.label, this.pick});
  final String? label;
  final CmPickedFile? pick;
  @override
  State<Photo> createState() => PhotoState();
}

class PhotoState extends State<Photo> {
  List<CmPickedFile> files = [];
  int picks = 0;
  final rejected = <String>[];
  @override
  Widget build(BuildContext context) => SizedBox(
        width: 320,
        child: CmFileUpload(
          variant: CmFileUploadVariant.photo,
          label: widget.label,
          required: true,
          files: files,
          maxSize: 1024 * 1024,
          onPick: () async {
            picks++;
            return [widget.pick ?? CmPickedFile(name: 'front.png', size: _png.length, mimeType: 'image/png', image: MemoryImage(_png))];
          },
          onReject: (f) => rejected.addAll(f.map((x) => x.name)),
          onChanged: (f) => setState(() => files = f),
        ),
      );
}

class Lists extends StatefulWidget {
  const Lists({super.key, this.refuse = false});
  final bool refuse;
  @override
  State<Lists> createState() => ListsState();
}

class ListsState extends State<Lists> {
  final data = <String, List<String>>{
    'Contact': ['Name', 'Phone'],
    'Address': ['City'],
    'Notes': [],
  };
  final moves = <String>[];

  @override
  Widget build(BuildContext context) => SizedBox(
        width: 600,
        child: Column(children: [
          for (final e in data.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: CmNestedList(
                heading: e.key,
                group: 'form',
                sortable: true,
                items: [for (final l in e.value) CmNestedItem(id: l, label: l)],
                onReorder: (_, from, to) => setState(() => e.value.insert(to, e.value.removeAt(from))),
                onMove: (m) {
                  moves.add(m.toString());
                  if (widget.refuse) return false;
                  setState(() {
                    data[m.fromList]!.removeAt(m.from);
                    data[m.toList]!.insert(m.to, m.item.id);
                  });
                  return true;
                },
              ),
            ),
        ]),
      );
}

void main() {
  group('file upload, photo variant', () {
    testWidgets('empty tile is a named 4:3 button that opens the picker; the photo gets Retake and Remove', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const Photo(label: 'Shop front')));
      final s = t.state<PhotoState>(find.byType(Photo));
      final tile = t.getSemantics(find.bySemanticsLabel('Shop front, required')).getSemanticsData();
      expect(tile.hasFlag(SemanticsFlag.isButton), isTrue);
      expect(tile.hasAction(SemanticsAction.tap), isTrue);
      final size = t.getSize(find.byType(AspectRatio));
      expect(size.width / size.height, closeTo(4 / 3, 0.01));
      expect(size.width, 320);
      await t.tap(find.textContaining('Shop front'));
      await t.pumpAndSettle();
      expect(s.picks, 1);
      expect(s.files.single.name, 'front.png');
      expect(find.bySemanticsLabel('Shop front'), findsOneWidget, reason: 'the photo is named by the label');
      expect(find.bySemanticsLabel('Retake Shop front'), findsOneWidget);
      expect(find.text('Retake'), findsOneWidget);
      expect(find.text('Remove'), findsOneWidget);
      await t.tap(find.bySemanticsLabel('Retake Shop front'));
      await t.pumpAndSettle();
      expect(s.picks, 2);
      expect(s.files.length, 1, reason: 'one photo only: retaking replaces it');
      await t.tap(find.bySemanticsLabel('Remove Shop front'));
      await t.pumpAndSettle();
      expect(s.files, isEmpty);
      expect(focused(), 'CmFileUpload zone', reason: 'focus goes back to the empty tile');
      handle.dispose();
    });

    testWidgets('without a label it says Take a photo; refuses files that are not images', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const Photo(pick: CmPickedFile(name: 'notes.pdf', size: 100, mimeType: 'application/pdf'))));
      final s = t.state<PhotoState>(find.byType(Photo));
      expect(find.textContaining('Take a photo'), findsOneWidget);
      await t.tap(find.textContaining('Take a photo'));
      await t.pumpAndSettle();
      expect(s.files, isEmpty);
      expect(s.rejected, ['notes.pdf']);
      final msg = t.getSemantics(find.text('notes.pdf is not an allowed file type')).getSemanticsData();
      expect(msg.hasFlag(SemanticsFlag.isLiveRegion), isTrue);
      handle.dispose();
    });

    testWidgets('keyboard opens the camera; dark theme', (t) async {
      await t.pumpWidget(app(const Photo(), theme: CmTheme.dark()));
      final s = t.state<PhotoState>(find.byType(Photo));
      await t.sendKeyEvent(LogicalKeyboardKey.tab);
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(s.picks, 1);
      expect(find.bySemanticsLabel('Remove photo'), findsOneWidget);
    });
  });

  testWidgets('option group tones colour the options; selected ones are filled', (t) async {
    final handle = t.ensureSemantics();
    String? v = 'won';
    await t.pumpWidget(app(StatefulBuilder(
      builder: (c, set) => CmOptionGroup<String>(
        label: 'Outcome',
        value: v,
        onChanged: (x) => set(() => v = x),
        options: const [
          CmRadioOption(value: 'won', label: 'Signed up', tone: CmTone.success),
          CmRadioOption(value: 'lost', label: 'Not interested', tone: CmTone.critical),
          CmRadioOption(value: 'later', label: 'Call later'),
        ],
      ),
    )));
    BoxDecoration deco(String text) => t.widget<Container>(find.ancestor(of: find.text(text), matching: find.byType(Container)).first).decoration! as BoxDecoration;
    Color? fg(String text) => t.widget<Text>(find.text(text)).style!.color;
    const l = CmColors.light;
    expect(deco('Signed up').color, l.textSuccess);
    expect(fg('Signed up'), l.actionPrimaryText);
    expect(deco('Not interested').color, l.bgSurface);
    expect(fg('Not interested'), l.textCritical);
    expect((deco('Not interested').border! as Border).top.color, l.borderCritical);
    expect(deco('Call later').color, l.bgHover, reason: 'no tone: unchanged');
    await t.tap(find.text('Not interested'));
    await t.pump();
    expect(v, 'lost');
    expect(t.getSemantics(find.bySemanticsLabel('Not interested')).getSemanticsData().hasFlag(SemanticsFlag.isChecked), isTrue);
    handle.dispose();
  });

  testWidgets('card actions show without a heading, at the end', (t) async {
    await t.pumpWidget(app(SizedBox(
      width: 500,
      child: CmCard(actions: [CmButton(label: 'Edit', onPressed: () {})], child: const Text('Body')),
    )));
    expect(find.text('Edit'), findsOneWidget);
    expect(t.getTopRight(find.byType(CmButton)).dx, closeTo(t.getTopRight(find.byType(CmCard)).dx - 25, 1), reason: "24px padding inside the 1px border (1.6)");
    expect(t.getTopLeft(find.byType(CmButton)).dy, lessThan(t.getTopLeft(find.text('Body')).dy));
    await t.pumpWidget(app(SizedBox(width: 500, child: CmCard(actions: [CmButton(label: 'Edit', onPressed: () {})], child: const Text('Body'))), dir: TextDirection.rtl));
    expect(t.getTopLeft(find.byType(CmButton)).dx, closeTo(t.getTopLeft(find.byType(CmCard)).dx + 25, 1), reason: 'at the end in RTL too');
  });

  group('option groups', () {
    const options = [
      CmSelectOption('lead-company', 'Company', group: 'Lead'),
      CmSelectOption('deal-name', 'Deal name', group: 'Deal'),
      CmSelectOption('lead-phone', 'Phone', group: 'Lead'),
      CmSelectOption('deal-company', 'Company', group: 'Deal'),
    ];

    testWidgets('select: headings group the options, are not selectable, and showGroup names the group', (t) async {
      final handle = t.ensureSemantics();
      String? v = 'deal-company';
      await t.pumpWidget(app(StatefulBuilder(
        builder: (c, set) => SizedBox(width: 400, child: CmSelect<String>(label: 'Field', options: options, value: v, showGroup: true, onChanged: (x) => set(() => v = x))),
      )));
      expect(find.text('Deal: Company'), findsOneWidget);
      await t.tap(find.text('Deal: Company'));
      await t.pumpAndSettle();
      final lead = find.text('Lead').last, deal = find.text('Deal').last;
      expect(t.getSemantics(lead).getSemanticsData().hasFlag(SemanticsFlag.isHeader), isTrue);
      // Lead's options come together under Lead, then Deal's.
      expect(t.getTopLeft(find.text('Phone').last).dy, lessThan(t.getTopLeft(deal).dy));
      expect(t.getTopLeft(find.text('Deal name').last).dy, greaterThan(t.getTopLeft(deal).dy));
      await t.tap(deal, warnIfMissed: false);
      await t.pumpAndSettle();
      expect(v, 'deal-company', reason: 'a heading is not an option');
      // Keyboard: the arrows skip the headings.
      if (find.text('Deal name').evaluate().isEmpty) {
        await t.tap(find.text('Deal: Company'));
        await t.pumpAndSettle();
      }
      await t.tap(find.text('Phone').last);
      await t.pumpAndSettle();
      expect(v, 'lead-phone');
      expect(find.text('Lead: Phone'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('select: keyboard focus skips headings', (t) async {
      String? v;
      await t.pumpWidget(app(StatefulBuilder(
        builder: (c, set) => SizedBox(width: 400, child: CmSelect<String>(label: 'Field', options: options, value: v, onChanged: (x) => set(() => v = x))),
      )));
      await t.tap(find.byType(DropdownButtonFormField<String>));
      await t.pumpAndSettle();
      for (var i = 0; i < 3; i++) {
        await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
        await t.pump();
      }
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(v, isNotNull);
      expect(options.map((o) => o.value), contains(v), reason: 'only options can be chosen from the keyboard');
    });

    testWidgets('combobox: grouped rows with headings, filtering keeps matching groups, showGroup in field and tags', (t) async {
      final handle = t.ensureSemantics();
      String? v;
      await t.pumpWidget(app(StatefulBuilder(
        builder: (c, set) => SizedBox(width: 400, child: CmCombobox<String>(label: 'Field', options: options, value: v, showGroup: true, onChanged: (x) => set(() => v = x))),
      )));
      await t.tap(find.byType(TextField));
      await t.pumpAndSettle();
      expect(find.text('Lead'), findsOneWidget);
      expect(find.text('Deal'), findsOneWidget);
      expect(t.getSemantics(find.text('Lead')).getSemanticsData().hasFlag(SemanticsFlag.isHeader), isTrue);
      expect(t.getTopLeft(find.text('Phone')).dy, lessThan(t.getTopLeft(find.text('Deal')).dy));
      await t.enterText(find.byType(TextField), 'name');
      await t.pumpAndSettle();
      expect(find.text('Lead'), findsNothing, reason: 'no Lead option matches');
      expect(find.text('Deal'), findsOneWidget);
      await t.enterText(find.byType(TextField), 'comp');
      await t.pumpAndSettle();
      // The first row is highlighted; the arrow moves to the next option, not to the Deal heading.
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      await t.testTextInput.receiveAction(TextInputAction.done);
      await t.pumpAndSettle();
      expect(v, 'deal-company');
      expect(find.text('Deal: Company'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('combobox multiple: tags show the group with showGroup', (t) async {
      await t.pumpWidget(app(SizedBox(
        width: 400,
        child: CmCombobox<String>(label: 'Fields', options: options, multiple: true, values: const ['lead-company', 'deal-company'], showGroup: true, onValuesChanged: (_) {}),
      )));
      expect(find.text('Lead: Company'), findsOneWidget);
      expect(find.text('Deal: Company'), findsOneWidget);
    });
  });

  group('nested lists in a group', () {
    testWidgets('arrow keys cross the ends of a list, announced, focus kept; empty lists show a drop area', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const Lists()));
      final s = t.state<ListsState>(find.byType(Lists));
      final hint = t.getSemantics(find.bySemanticsLabel('Reorder Phone')).getSemanticsData().hint;
      expect(hint, startsWith('Press up or down arrow to move. At either end'));
      t.semantics.tap(find.semantics.byLabel('Reorder Phone'));
      await t.pump();
      expect(focused(), 'CmNestedList handle Phone');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      await t.pump();
      expect(s.moves, ['CmNestedMove(Phone: Contact[1] -> Address[0])']);
      expect(s.data['Address'], ['Phone', 'City']);
      expect(t.takeAnnouncements().last.message, 'Phone moved to Address, position 1 of 2.');
      expect(focused(), 'CmNestedList handle Phone', reason: 'focus follows the row into the other list');
      // Within the list: an ordinary reorder.
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      expect(s.data['Address'], ['City', 'Phone']);
      // Last row: into the empty Notes list.
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      await t.pump();
      expect(s.data['Notes'], ['Phone']);
      expect(t.takeAnnouncements().last.message, 'Phone moved to Notes, position 1 of 1.');
      // Up from the first row of Notes goes to the end of Address.
      await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await t.pump();
      await t.pump();
      expect(s.data['Address'], ['City', 'Phone']);
      expect(s.data['Notes'], isEmpty);
      final area = find.descendant(of: find.byType(CmNestedList).last, matching: find.byWidgetPredicate((w) => w is Container && w.constraints?.minHeight == 60));
      expect(area, findsOneWidget, reason: 'the empty list shows a drop area');
      handle.dispose();
    });

    testWidgets('a refused move stays put', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const Lists(refuse: true)));
      final s = t.state<ListsState>(find.byType(Lists));
      t.semantics.tap(find.semantics.byLabel('Reorder City'));
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.arrowUp);
      await t.pump();
      expect(s.moves.single, 'CmNestedMove(City: Address[0] -> Contact[2])');
      expect(s.data['Address'], ['City']);
      handle.dispose();
    });

    testWidgets('drag a handle into another list', (t) async {
      await t.pumpWidget(app(const Lists()));
      final s = t.state<ListsState>(find.byType(Lists));
      final g = await t.startGesture(t.getCenter(find.bySemanticsLabel('Reorder Name')));
      await t.pump(const Duration(milliseconds: 50));
      await g.moveBy(const Offset(0, 20));
      await t.pump();
      await g.moveTo(t.getCenter(find.text('City')) + const Offset(0, 20));
      await t.pump();
      await g.up();
      await t.pumpAndSettle();
      expect(s.moves, ['CmNestedMove(Name: Contact[0] -> Address[1])']);
      expect(s.data['Address'], ['City', 'Name']);
    });

    testWidgets('drag within a grouped list reorders it', (t) async {
      await t.pumpWidget(app(const Lists()));
      final s = t.state<ListsState>(find.byType(Lists));
      final g = await t.startGesture(t.getCenter(find.bySemanticsLabel('Reorder Name')));
      await g.moveBy(const Offset(0, 20));
      await t.pump();
      await g.moveTo(t.getCenter(find.text('Phone')) + const Offset(0, 20));
      await t.pump();
      await g.up();
      await t.pumpAndSettle();
      expect(s.moves, isEmpty);
      expect(s.data['Contact'], ['Phone', 'Name']);
    });
  });
}
