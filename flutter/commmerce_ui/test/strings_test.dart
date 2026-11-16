import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {CmStrings? strings, Size size = const Size(1280, 900)}) {
  final Widget tree = MediaQuery(
    data: MediaQueryData(size: size),
    child: MaterialApp(theme: CmTheme.light(), home: Scaffold(body: Center(child: SingleChildScrollView(child: child)))),
  );
  return strings == null ? tree : CmLocalizations(strings: strings, child: tree);
}

String _summary(int from, int to, int total, String resourceName) => 'Affichage de $from à $to sur $total $resourceName';
String _reviews(int n) => n <= 1 ? '$n avis' : '$n avis clients';
String _tagRemove(String label) => 'Retirer $label';

const french = CmStrings(
  saveBarSave: 'Enregistrer',
  saveBarDiscard: 'Annuler',
  paginationSummary: _summary,
  reviews: _reviews,
  tagRemove: _tagRemove,
  monthsShort: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
);

Widget widgets() => Column(children: [
      CmSaveBar(visible: true, onSave: () {}, onDiscard: () {}),
      CmPagination(page: 2, pageSize: 20, total: 290, onPageChanged: (_) {}),
      CmTag('Wholesale', onRemove: () {}),
      const SizedBox(width: 400, child: CmAppCard(name: 'New app', rating: 5, reviews: 1)),
      const SizedBox(width: 400, child: CmAppCard(name: 'Big app', rating: 4, reviews: 1284)),
    ]);

void main() {
  testWidgets('English defaults are unchanged', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(widgets()));
    expect(find.text('Save'), findsOneWidget);
    expect(find.text('Discard'), findsOneWidget);
    expect(find.text('Showing 21–40 of 290 items'), findsOneWidget);
    expect(find.text('Page 2 of 15'), findsOneWidget);
    expect(find.bySemanticsLabel('Remove Wholesale'), findsOneWidget);
    expect(find.text('1 Review'), findsOneWidget);
    expect(find.text('1,284 Reviews'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('CmLocalizations translates plain, interpolated and plural strings', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(widgets(), strings: french));
    expect(find.text('Enregistrer'), findsOneWidget);
    expect(find.text('Annuler'), findsOneWidget);
    expect(find.text('Save'), findsNothing);
    expect(find.text('Affichage de 21 à 40 sur 290 items'), findsOneWidget);
    expect(find.text('Page 2 of 15'), findsOneWidget, reason: 'fields left out keep their English default');
    expect(find.bySemanticsLabel('Retirer Wholesale'), findsOneWidget);
    expect(find.bySemanticsLabel('Remove Wholesale'), findsNothing);
    expect(find.text('1 avis'), findsOneWidget);
    expect(find.text('1284 avis clients'), findsOneWidget);
    handle.dispose();
  });

  test('static formatters take strings and default to English', () {
    final d = DateTime(2023, 2, 9, 17, 7);
    expect(CmComment.format(d), '9 Feb 2023, 5:07 pm');
    expect(CmComment.format(d, strings: french), '9 févr. 2023, 5:07 pm');
    expect(CmDataTable.format(d), '9 Feb 2023');
    expect(CmDataTable.format(d, strings: french), '9 févr. 2023');
    expect(cmFileSize(300 * 1024), '300 KB');
  });

  testWidgets('CmStrings.of without CmLocalizations returns English', (t) async {
    late CmStrings s;
    await t.pumpWidget(app(Builder(builder: (c) {
      s = CmStrings.of(c);
      return const SizedBox();
    })));
    expect(s.saveBarSave, 'Save');
    expect(s.paginationSummary(1, 20, 50, 'orders'), 'Showing 1–20 of 50 orders');
    expect(s.reviews(2), '2 Reviews');
    expect(s.itemsSelected(1, 'order'), '1 order selected');
    expect(s.itemsSelected(3, 'order'), '3 orders selected');
    expect(s.monthsShort.length, 12);
  });
}
