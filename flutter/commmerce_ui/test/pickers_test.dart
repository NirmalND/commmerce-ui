import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Scaffold(body: Center(child: Padding(padding: const EdgeInsets.all(20), child: SizedBox(width: 600, child: child)))),
    );

const tags = [
  CmSelectOption('cotton', 'Cotton'),
  CmSelectOption('summer', 'Summer'),
  CmSelectOption('sale', 'Sale'),
  CmSelectOption('handmade', 'Handmade'),
];

void main() {
  group('CmDatePicker', () {
    testWidgets('shows the date, opens a themed Material picker and returns the picked date', (t) async {
      DateTime? v = DateTime(2026, 11, 15);
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmDatePicker(
            label: 'Ship by',
            value: v,
            firstDate: DateTime(2026, 1, 1),
            lastDate: DateTime(2026, 12, 31),
            onChanged: (d) => set(() => v = d),
          ))));
      expect(find.text('Nov 15, 2026'), findsOneWidget);
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
      expect(find.byType(DatePickerDialog), findsOneWidget);
      final theme = Theme.of(t.element(find.byType(DatePickerDialog)));
      final c = CmColors.light;
      expect(theme.datePickerTheme.headerBackgroundColor, c.bgPanelHeader);
      expect(theme.datePickerTheme.dayBackgroundColor!.resolve({WidgetState.selected}), c.actionPrimary);
      expect(theme.datePickerTheme.rangeSelectionBackgroundColor, c.bgAttentionSoft);
      await t.tap(find.text('20'));
      await t.tap(find.text('OK'));
      await t.pumpAndSettle();
      expect(v, DateTime(2026, 11, 20));
      expect(find.text('Nov 20, 2026'), findsOneWidget);
    });

    testWidgets('typed entry mode accepts a typed date', (t) async {
      DateTime? v;
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmDatePicker(
            label: 'Ship by',
            value: v,
            firstDate: DateTime(2026, 1, 1),
            lastDate: DateTime(2026, 12, 31),
            initialEntryMode: DatePickerEntryMode.input,
            onChanged: (d) => set(() => v = d),
          ))));
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField).last, '12/24/2026');
      await t.tap(find.text('OK'));
      await t.pumpAndSettle();
      expect(v, DateTime(2026, 12, 24));
    });

    testWidgets('unselectable days and the date range are passed to the picker; null onChanged disables', (t) async {
      DateTime? v;
      await t.pumpWidget(app(Column(children: [
        CmDatePicker(
          label: 'Pickup',
          value: DateTime(2026, 11, 15), // a Sunday: the picker opens on the next selectable day
          firstDate: DateTime(2026, 11, 10),
          lastDate: DateTime(2026, 11, 30),
          selectableDayPredicate: (d) => d.weekday != DateTime.sunday,
          onChanged: (d) => v = d,
        ),
        CmDatePicker(label: 'Locked', value: null, firstDate: _first, lastDate: _last, onChanged: null),
      ])));
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
      final dialog = t.widget<DatePickerDialog>(find.byType(DatePickerDialog));
      expect(dialog.initialDate, DateTime(2026, 11, 16));
      expect(dialog.firstDate, DateTime(2026, 11, 10));
      expect(dialog.lastDate, DateTime(2026, 11, 30));
      await t.tap(find.text('Cancel'));
      await t.pumpAndSettle();
      expect(v, isNull);
      await t.tap(find.text('Locked'));
      await t.pumpAndSettle();
      expect(find.byType(DatePickerDialog), findsNothing);
    });

    testWidgets('semantics: a button named by the label with the full date as value, error as hint', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(CmDatePicker(
        label: 'Offer ends',
        value: DateTime(2026, 11, 15),
        firstDate: _first,
        lastDate: _last,
        required: true,
        error: 'Choose a later date',
        onChanged: (_) {},
      )));
      final node = t.getSemantics(find.bySemanticsLabel('Offer ends, required'));
      expect(node.value, 'Sunday, November 15, 2026');
      expect(node.hint, 'Choose a later date');
      expect(node.getSemanticsData().hasFlag(SemanticsFlag.isButton), isTrue);
      expect(find.text('Choose a later date'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('dark theme: the picker uses dark tokens', (t) async {
      await t.pumpWidget(app(CmDatePicker(label: 'D', value: null, firstDate: _first, lastDate: _last, onChanged: (_) {}), theme: CmTheme.dark()));
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
      expect(Theme.of(t.element(find.byType(DatePickerDialog))).datePickerTheme.backgroundColor, CmColors.dark.bgSurface);
    });
  });

  group('CmDateRangePicker', () {
    final today = DateTime(2026, 11, 15);

    testWidgets('presets set the range and show as selected', (t) async {
      final handle = t.ensureSemantics();
      DateTimeRange? v;
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmDateRangePicker(
            label: 'Order date',
            value: v,
            today: today,
            firstDate: DateTime(2025, 1, 1),
            lastDate: today,
            presets: CmDateRangePreset.standard,
            onChanged: (r) => set(() => v = r),
          ))));
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('Last 7 days'), findsOneWidget);
      expect(find.text('Last 30 days'), findsOneWidget);
      expect(find.text('This month'), findsOneWidget);
      await t.tap(find.text('Last 7 days'));
      await t.pump();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 9), end: today));
      expect(find.text('Nov 9, 2026 – Nov 15, 2026'), findsOneWidget);
      expect(t.getSemantics(find.text('Last 7 days')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
      await t.tap(find.text('Last 30 days'));
      await t.pump();
      expect(v!.start, DateTime(2026, 10, 17));
      await t.tap(find.text('This month'));
      await t.pump();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 1), end: today));
      await t.tap(find.text('Today'));
      await t.pump();
      expect(v, DateTimeRange(start: today, end: today));
      handle.dispose();
    });

    testWidgets('opens the themed range picker and returns the chosen range', (t) async {
      DateTimeRange? v = DateTimeRange(start: DateTime(2026, 11, 3), end: DateTime(2026, 11, 5));
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmDateRangePicker(
            label: 'Report period',
            value: v,
            today: today,
            firstDate: DateTime(2026, 1, 1),
            lastDate: DateTime(2026, 12, 31),
            onChanged: (r) => set(() => v = r),
          ))));
      await t.tap(find.byType(InkWell).first);
      await t.pumpAndSettle();
      expect(find.byType(DateRangePickerDialog), findsOneWidget);
      expect(Theme.of(t.element(find.byType(DateRangePickerDialog))).datePickerTheme.rangeSelectionBackgroundColor, CmColors.light.bgAttentionSoft);
      // Switch to typed entry: deterministic, unlike scrolling the month list.
      await t.tap(find.byIcon(Icons.edit_outlined));
      await t.pumpAndSettle();
      final fields = find.byType(TextField);
      await t.enterText(fields.at(fields.evaluate().length - 2), '11/10/2026');
      await t.enterText(fields.last, '11/14/2026');
      await t.tap(find.text('OK'));
      await t.pumpAndSettle();
      expect(v, DateTimeRange(start: DateTime(2026, 11, 10), end: DateTime(2026, 11, 14)));
    });

    testWidgets('presets are clamped to firstDate and lastDate', (t) async {
      DateTimeRange? v;
      await t.pumpWidget(app(CmDateRangePicker(
        label: 'Dates',
        value: null,
        today: today,
        firstDate: DateTime(2026, 11, 12),
        lastDate: today,
        presets: [CmDateRangePreset.last30Days],
        onChanged: (r) => v = r,
      )));
      await t.tap(find.text('Last 30 days'));
      expect(v, DateTimeRange(start: DateTime(2026, 11, 12), end: today));
    });
  });

  group('CmCombobox', () {
    testWidgets('filters as you type and picks one option', (t) async {
      String? v;
      final searches = <String>[];
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmCombobox<String>(
            label: 'Tag',
            options: tags,
            value: v,
            onSearch: searches.add,
            onChanged: (x) => set(() => v = x),
          ))));
      await t.enterText(find.byType(TextField), 'sa');
      await t.pumpAndSettle();
      expect(find.text('Sale'), findsOneWidget);
      expect(find.text('Cotton'), findsNothing);
      expect(searches, ['sa']);
      await t.tap(find.text('Sale'));
      await t.pumpAndSettle();
      expect(v, 'sale');
      expect(t.widget<TextField>(find.byType(TextField)).controller!.text, 'Sale');
    });

    testWidgets('keyboard: arrows highlight, Enter picks', (t) async {
      String? v;
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmCombobox<String>(
            label: 'Tag', options: tags, value: v, onChanged: (x) => set(() => v = x)))));
      await t.enterText(find.byType(TextField), 'm');
      await t.pumpAndSettle();
      expect(find.text('Summer'), findsOneWidget);
      expect(find.text('Handmade'), findsOneWidget);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      await t.testTextInput.receiveAction(TextInputAction.done);
      await t.pumpAndSettle();
      expect(v, 'handmade');
    });

    testWidgets('"No results" when nothing matches', (t) async {
      await t.pumpWidget(app(CmCombobox<String>(label: 'Tag', options: tags, emptyText: 'No tags match', onChanged: (_) {})));
      await t.enterText(find.byType(TextField), 'zzz');
      await t.pumpAndSettle();
      expect(find.text('No tags match'), findsOneWidget);
    });

    testWidgets('multiple: chips, toggling, Backspace removes the last chip, chip remove button', (t) async {
      var values = <String>['summer'];
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmCombobox<String>(
            label: 'Tags',
            options: tags,
            multiple: true,
            values: values,
            onValuesChanged: (x) => set(() => values = x),
          ))));
      expect(find.widgetWithText(CmTag, 'Summer'), findsOneWidget);
      await t.enterText(find.byType(TextField), 'cot');
      await t.pumpAndSettle();
      await t.tap(find.text('Cotton').last);
      await t.pumpAndSettle();
      expect(values, ['summer', 'cotton']);
      expect(find.widgetWithText(CmTag, 'Cotton'), findsOneWidget);
      expect(t.widget<TextField>(find.byType(TextField)).controller!.text, '');
      // Backspace in the empty field removes the last chip.
      await t.sendKeyEvent(LogicalKeyboardKey.backspace);
      await t.pumpAndSettle();
      expect(values, ['summer']);
      // The chip's remove button.
      await t.tap(find.bySemanticsLabel('Remove Summer'));
      await t.pumpAndSettle();
      expect(values, isEmpty);
    });

    testWidgets('allowCustom offers "Add …" and calls onCreate', (t) async {
      final created = <String>[];
      await t.pumpWidget(app(CmCombobox<String>(label: 'Tags', options: tags, multiple: true, allowCustom: true, onCreate: created.add, onValuesChanged: (_) {})));
      await t.enterText(find.byType(TextField), 'Diwali');
      await t.pumpAndSettle();
      expect(find.text('Add “Diwali”'), findsOneWidget);
      await t.tap(find.text('Add “Diwali”'));
      await t.pumpAndSettle();
      expect(created, ['Diwali']);
    });

    testWidgets('async: loading row, then new options appear without retyping', (t) async {
      var loading = false;
      var options = <CmSelectOption<String>>[];
      late StateSetter setOuter;
      await t.pumpWidget(app(StatefulBuilder(builder: (c, set) {
        setOuter = set;
        return CmCombobox<String>(
          label: 'Product',
          options: options,
          filter: CmComboboxFilter.none,
          loading: loading,
          onSearch: (_) => set(() => loading = true),
          onChanged: (_) {},
        );
      })));
      await t.enterText(find.byType(TextField), 'kur');
      await t.pump();
      await t.pump(const Duration(milliseconds: 100)); // the spinner animates, so no pumpAndSettle
      expect(find.text('Loading'), findsOneWidget);
      setOuter(() {
        loading = false;
        options = const [CmSelectOption('p1', 'Cotton kurta'), CmSelectOption('p2', 'Silk dupatta')];
      });
      await t.pumpAndSettle();
      expect(find.text('Loading'), findsNothing);
      expect(find.text('Cotton kurta'), findsOneWidget);
      expect(find.text('Silk dupatta'), findsOneWidget, reason: 'server-filtered: shown as given');
    });
  });
  group('localisation and RTL', () {
    const fr = CmStrings(
      notSet: 'Non définie',
      chooseDate: 'Choisir une date',
      presetRanges: 'Périodes',
      presetToday: "Aujourd'hui",
      presetLast7Days: '7 derniers jours',
      noResults: 'Aucun résultat',
      loading: 'Chargement',
      addValue: _ajouter,
      requiredSuffix: ', obligatoire',
    );
    Widget fr0(Widget child, {TextDirection dir = TextDirection.ltr}) =>
        CmLocalizations(strings: fr, child: app(Directionality(textDirection: dir, child: child)));

    testWidgets('date pickers read their text from CmLocalizations', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(fr0(Column(children: [
        CmDatePicker(label: 'Date', value: null, firstDate: _first, lastDate: _last, required: true, onChanged: (_) {}),
        CmDateRangePicker(label: 'Période', value: null, firstDate: _first, lastDate: _last, today: DateTime(2026, 11, 15), presets: CmDateRangePreset.standard, onChanged: (_) {}),
      ])));
      expect(find.text('Choisir une date'), findsOneWidget);
      expect(find.text("Aujourd'hui"), findsOneWidget);
      expect(find.text('7 derniers jours'), findsOneWidget);
      expect(find.text('Last 30 days'), findsOneWidget, reason: 'keys the app did not translate stay English');
      final node = t.getSemantics(find.bySemanticsLabel('Date, obligatoire'));
      expect(node.value, 'Non définie');
      expect(find.bySemanticsLabel('Périodes'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('combobox reads "No results", "Loading" and "Add …" from CmLocalizations', (t) async {
      await t.pumpWidget(fr0(CmCombobox<String>(label: 'Tags', options: tags, allowCustom: true, onChanged: (_) {})));
      await t.enterText(find.byType(TextField), 'Diwali');
      await t.pumpAndSettle();
      expect(find.text('Ajouter « Diwali »'), findsOneWidget);
      await t.pumpWidget(fr0(CmCombobox<String>(label: 'Tags', options: tags, onChanged: (_) {})));
      await t.enterText(find.byType(TextField), 'zzz');
      await t.pumpAndSettle();
      expect(find.text('Aucun résultat'), findsOneWidget);
    });

    testWidgets('RTL: combobox chips start at the right; the date box icon sits on the left', (t) async {
      await t.pumpWidget(fr0(
        Column(children: [
          CmCombobox<String>(label: 'Tags', options: tags, multiple: true, values: const ['cotton'], onValuesChanged: (_) {}),
          CmDatePicker(label: 'Date', value: null, firstDate: _first, lastDate: _last, onChanged: (_) {}),
        ]),
        dir: TextDirection.rtl,
      ));
      final box = t.getRect(find.byType(InputDecorator).first);
      final chip = t.getRect(find.byType(CmTag));
      expect(box.right - chip.right, lessThan(30));
      final dateBox = t.getRect(find.byType(InputDecorator).last);
      final icon = t.getRect(find.descendant(of: find.byType(InputDecorator).last, matching: find.byType(CmIcon)));
      expect(icon.left - dateBox.left, lessThan(dateBox.width / 2));
    });
  });

  group('CmCombobox tags (owner standard 1.6)', () {
    Widget box(List<String> Function() get, void Function(List<String>) set, {int maxTags = 3}) => Column(children: [
          StatefulBuilder(builder: (c, rebuild) => CmCombobox<String>(
                label: 'Tags',
                options: tags,
                multiple: true,
                maxTags: maxTags,
                values: get(),
                onValuesChanged: (x) => rebuild(() => set(x)),
              )),
          const TextField(key: Key('other')),
        ]);

    testWidgets('24px tags with 12px text; +N more while the box is not focused', (t) async {
      var values = <String>['cotton', 'summer', 'sale', 'handmade'];
      await t.pumpWidget(app(box(() => values, (x) => values = x)));
      expect(t.getSize(find.widgetWithText(CmTag, 'Cotton')).height, 24);
      expect(t.widget<Text>(find.text('Cotton')).style?.fontSize, 12);
      expect(find.widgetWithText(CmTag, 'Handmade'), findsNothing);
      expect(find.text('+1 more'), findsOneWidget);
      await t.tap(find.byType(TextField).first);
      await t.pump();
      expect(find.widgetWithText(CmTag, 'Handmade'), findsOneWidget, reason: 'every tag shows while focused');
      expect(find.text('+1 more'), findsNothing);
      await t.showKeyboard(find.byKey(const Key('other')));
      await t.pumpAndSettle();
      expect(find.text('+1 more'), findsOneWidget);
    });

    testWidgets('← from the start of the box moves to the tags; arrows, Delete and Backspace; tags are not Tab stops', (t) async {
      var values = <String>['cotton', 'summer', 'sale'];
      await t.pumpWidget(app(box(() => values, (x) => values = x)));
      await t.tap(find.byType(TextField).first);
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 2');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 1');
      await t.sendKeyEvent(LogicalKeyboardKey.home);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 0');
      await t.sendKeyEvent(LogicalKeyboardKey.delete);
      await t.pumpAndSettle();
      expect(values, ['summer', 'sale']);
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 0', reason: 'Delete focuses the tag that moved into its place');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 1');
      await t.sendKeyEvent(LogicalKeyboardKey.backspace);
      await t.pumpAndSettle();
      expect(values, ['summer']);
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox tag 0', reason: 'Backspace focuses the tag before');
      await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCombobox', reason: '→ past the last tag goes back to the box');
      // Tab from the box goes to the next field, never to a tag.
      await t.sendKeyEvent(LogicalKeyboardKey.tab);
      await t.pump();
      expect(FocusManager.instance.primaryFocus?.debugLabel?.startsWith('CmCombobox tag') ?? false, isFalse);
    });
  });
}

String _ajouter(String v) => 'Ajouter « $v »';

final _first = DateTime(2026, 1, 1);
final _last = DateTime(2026, 12, 31);
