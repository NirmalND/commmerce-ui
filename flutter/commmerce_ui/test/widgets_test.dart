import 'dart:ui';
import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {Size size = const Size(1280, 900), ThemeData? theme}) => MediaQuery(
      data: MediaQueryData(size: size),
      child: MaterialApp(theme: theme ?? CmTheme.light(), home: Scaffold(body: Center(child: SingleChildScrollView(child: child)))),
    );

const nav = [
  CmNavItem(id: 'dashboard', label: 'Dashboard', icon: CmIcons.home),
  CmNavItem(id: 'catalog', label: 'Catalog', icon: CmIcons.box, children: [
    CmNavItem(id: 'products', label: 'Products'),
    CmNavItem(id: 'categories', label: 'Categories'),
  ]),
  CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart),
];

void main() {
  testWidgets('theme exposes Commmerce tokens in light and dark', (t) async {
    late CmColors light, dark;
    await t.pumpWidget(app(Builder(builder: (c) { light = CmTheme.colorsOf(c); return const SizedBox(); })));
    await t.pumpWidget(app(Builder(builder: (c) { dark = CmTheme.colorsOf(c); return const SizedBox(); }), theme: CmTheme.dark()));
    await t.pumpAndSettle(); // MaterialApp animates theme changes
    expect(light.actionPrimary, const Color(0xFF000000));
    expect(dark.actionPrimary, isNot(light.actionPrimary));
    expect(light.borderInput, const Color(0xFF8B8B8B));
  });

  testWidgets('button: tap, disabled and loading', (t) async {
    var taps = 0;
    await t.pumpWidget(app(Column(children: [
      CmButton(label: 'Save', variant: CmButtonVariant.primary, onPressed: () => taps++),
      const CmButton(label: 'Publish', onPressed: null),
      CmButton(label: 'Saving', loading: true, onPressed: () => taps += 10),
    ])));
    await t.tap(find.text('Save'));
    await t.tap(find.text('Publish'));
    await t.tap(find.text('Saving'));
    expect(taps, 1);
    expect(find.bySemanticsLabel('Save'), findsOneWidget);
  });

  testWidgets('button works from the keyboard', (t) async {
    var taps = 0;
    await t.pumpWidget(app(CmButton(label: 'Save', onPressed: () => taps++)));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(taps, 1);
  });

  testWidgets('text field: label, hint, required, error', (t) async {
    String? value;
    await t.pumpWidget(app(SizedBox(width: 400, child: CmTextField(label: 'Ordered', hint: 'Points per rupee', required: true, error: 'Enter a number', onChanged: (v) => value = v))));
    expect(find.textContaining('[points per rupee]', findRichText: true), findsOneWidget);
    expect(find.text('Enter a number'), findsOneWidget);
    await t.enterText(find.byType(TextFormField), '12');
    expect(value, '12');
  });

  testWidgets('checkbox and toggle report changes', (t) async {
    bool? checked = false;
    var on = false;
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => Column(children: [
          CmCheckbox(label: 'Track quantity', value: checked, onChanged: (v) => set(() => checked = v)),
          CmToggle(label: 'Show on store', value: on, onChanged: (v) => set(() => on = v)),
        ]))));
    await t.tap(find.text('Track quantity'));
    await t.tap(find.text('Show on store'));
    await t.pump();
    expect(checked, true);
    expect(on, true);
  });

  testWidgets('radio group selects one value', (t) async {
    String? v = 'track';
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => CmRadioGroup<String>(
          label: 'Inventory',
          value: v,
          onChanged: (x) => set(() => v = x),
          options: const [CmRadioOption(value: 'track', label: 'Track quantity'), CmRadioOption(value: 'none', label: "Don't track")],
        ))));
    await t.tap(find.text("Don't track"));
    expect(v, 'none');
  });

  testWidgets('side navigation expands groups and selects items', (t) async {
    var selected = 'dashboard';
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => SizedBox(height: 500, child: CmSideNav(items: nav, selectedId: selected, onSelected: (i) => set(() => selected = i.id))))));
    expect(find.text('Products'), findsNothing);
    await t.tap(find.text('Catalog'));
    await t.pump();
    expect(find.text('Products'), findsOneWidget);
    await t.tap(find.text('Categories'));
    await t.pump();
    expect(selected, 'categories');
    final sem = t.getSemantics(find.bySemanticsLabel('Catalog'));
    expect(sem.hint, 'Expanded');
  });

  testWidgets('resource list selection and bulk count', (t) async {
    var sel = <String>{};
    await t.pumpWidget(app(StatefulBuilder(builder: (c, set) => SizedBox(width: 700, child: CmResourceList(
          resourceName: 'order',
          selected: sel,
          onSelectionChanged: (s) => set(() => sel = s),
          bulkActions: const [CmButton(label: 'Print invoices', onPressed: null)],
          items: const [
            CmResourceItem(id: '1042', child: Text('#1042 Priya Sharma')),
            CmResourceItem(id: '1041', child: Text('#1041 Rahul Mehta')),
          ],
        )))));
    await t.tap(find.text('Select all'));
    await t.pump();
    expect(sel, {'1042', '1041'});
    expect(find.text('2 orders selected'), findsOneWidget);
    expect(find.text('Print invoices'), findsOneWidget);
  });

  testWidgets('admin scaffold: sidebar on desktop, rail on tablet, drawer on phone', (t) async {
    Widget shell(Size size) => app(
          SizedBox(width: size.width, height: size.height, child: CmAdminScaffold(
            header: (c, menu) => CmHeaderBar(logo: const Text('COMMMERCE'), storeName: 'preprod.commmerce.com', userName: 'Demo user', onMenuTap: menu),
            navItems: nav,
            selectedId: 'dashboard',
            onNavSelected: (_) {},
            body: const Text('Welcome to your Dashboard'),
          )),
          size: size,
        );
    void screen(Size s) { t.view.physicalSize = s; t.view.devicePixelRatio = 1; }
    addTearDown(t.view.reset);
    screen(const Size(1440, 900));
    await t.pumpWidget(shell(const Size(1440, 900)));
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.bySemanticsLabel('Open navigation'), findsNothing);

    screen(const Size(900, 900));
    await t.pumpWidget(shell(const Size(900, 900)));
    expect(find.text('Dashboard'), findsNothing); // icons only
    expect(find.byType(Tooltip), findsWidgets);

    screen(const Size(390, 844));
    await t.pumpWidget(shell(const Size(390, 844)));
    expect(find.text('Dashboard'), findsNothing);
    await t.tap(find.bySemanticsLabel('Open navigation'));
    await t.pumpAndSettle();
    expect(find.text('Dashboard'), findsOneWidget);
  });

  testWidgets('banner and badge render tones; empty state shows its action', (t) async {
    await t.pumpWidget(app(Column(children: [
      const CmBanner(tone: CmTone.critical, heading: 'Payment failed', message: 'The card was declined.'),
      const CmBadge('Paid', tone: CmTone.success),
      CmEmptyState(heading: 'No orders yet', action: CmButton(label: 'Share your store', onPressed: () {})),
    ])));
    expect(find.text('Payment failed'), findsOneWidget);
    expect(find.text('PAID'), findsOneWidget);
    expect(find.text('Share your store'), findsOneWidget);
  });

  testWidgets('search: field and filter button are separate, actionable semantics nodes', (t) async {
    var filters = 0;
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(SizedBox(width: 500, child: CmSearch(label: 'Search orders', onFilter: () => filters++, filterCount: 2))));
    final button = t.getSemantics(find.bySemanticsLabel('Filters, 2 applied'));
    expect(button.hasFlag(SemanticsFlag.isButton), isTrue);
    expect(button.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    final field = t.getSemantics(find.bySemanticsLabel(RegExp(r'^Search orders')));
    expect(field.label.contains('Filters'), isFalse); // the button is no longer folded into the field
    await t.tap(find.bySemanticsLabel('Filters, 2 applied'));
    expect(filters, 1);
    handle.dispose();
  });

  testWidgets('badge hugs its label, even in a wide Wrap or page header', (t) async {
    await t.pumpWidget(MaterialApp(theme: CmTheme.light(), home: Scaffold(body: SizedBox(width: 1000, child: Column(children: [
      Wrap(children: const [CmBadge('Paid', tone: CmTone.success)]),
      CmPageHeader(title: 'Order #1042', adornment: const CmBadge('Unfulfilled', tone: CmTone.attention)),
    ])))));
    for (final b in t.widgetList<CmBadge>(find.byType(CmBadge))) {
      expect(t.getSize(find.byWidget(b)).width, lessThan(160));
    }
  });
}
