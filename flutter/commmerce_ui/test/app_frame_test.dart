import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void size(WidgetTester t, Size s) {
  t.view.physicalSize = s;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(textDirection: dir, child: Scaffold(body: child)),
    );

const nav = [
  CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
  CmNavItem(id: 'leads', label: 'Leads', icon: CmIcons.users, count: 4),
  CmNavItem(id: 'apps', label: 'Apps', icon: CmIcons.apps, badge: 'New'),
  CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart, children: [CmNavItem(id: 'sales', label: 'Sales'), CmNavItem(id: 'pipeline', label: 'Pipeline')]),
];
const tabs = [
  CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
  CmNavItem(id: 'leads', label: 'Leads', icon: CmIcons.users),
  CmNavItem(id: 'more', label: 'More', icon: CmIcons.more),
];

/// A CRM-like frame: header, side nav, bottom nav and the mobile menu opened from "More".
class Frame extends StatefulWidget {
  const Frame({super.key});
  @override
  State<Frame> createState() => FrameState();
}

class FrameState extends State<Frame> {
  bool menu = false, collapsed = false;
  String page = 'home';
  @override
  Widget build(BuildContext context) => CmAppFrame(
        header: CmHeaderBar(logo: const Text('COMMMERCE'), userName: 'Asha Rao'),
        navigation: CmSideNav(
          items: nav,
          selectedId: page,
          collapsed: collapsed,
          collapsible: true,
          width: 250,
          onCollapsedChanged: (v) => setState(() => collapsed = v),
          onSelected: (i) => setState(() => page = i.id),
        ),
        bottomNavigation: CmBottomNavigation(items: tabs, selectedId: page, onSelected: (i) => setState(() => i.id == 'more' ? menu = !menu : page = i.id)),
        mobileMenu: CmMobileMenu(sections: const [CmMenuSection(label: 'Records', items: [CmNavItem(id: 'deals', label: 'Deals', icon: CmIcons.handshake)])], onSelected: (i) => setState(() {
              page = i.id;
              menu = false;
            })),
        menuOpen: menu,
        onMenuOpenChanged: (v) => setState(() => menu = v),
        body: Builder(builder: (context) => Text('Page $page, wide ${CmAppFrame.isWide(context)}')),
      );
}

void main() {
  testWidgets('1024 logical px and wider: side navigation; narrower: bottom navigation', (t) async {
    size(t, const Size(1280, 800));
    await t.pumpWidget(app(const Frame()));
    expect(find.byType(CmSideNav), findsOneWidget);
    expect(find.byType(CmBottomNavigation), findsNothing);
    expect(find.text('Page home, wide true'), findsOneWidget);
    // The side navigation sits under the header on the start side, 20px in.
    expect(t.getRect(find.byType(CmSideNav)).left, 20);
    expect(t.getRect(find.byType(CmSideNav)).top, greaterThanOrEqualTo(t.getRect(find.byType(CmHeaderBar)).bottom));
    // The frame follows its own width, not the window's.
    await t.pumpWidget(app(const Align(alignment: Alignment.topLeft, child: SizedBox(width: 1000, child: Frame()))));
    expect(find.byType(CmSideNav), findsNothing);
    expect(find.byType(CmBottomNavigation), findsOneWidget);
    expect(find.text('Page home, wide false'), findsOneWidget);
    // The bottom navigation sits at the bottom; the page ends above it.
    expect(t.getRect(find.byType(CmBottomNavigation)).bottom, 800);
    size(t, const Size(1024, 800));
    await t.pumpWidget(app(const Frame()));
    expect(find.byType(CmSideNav), findsOneWidget, reason: 'exactly 1024 is wide');
  });

  testWidgets('right to left: the side navigation is on the right', (t) async {
    size(t, const Size(1280, 800));
    await t.pumpWidget(app(const Frame(), dir: TextDirection.rtl));
    expect(t.getRect(find.byType(CmSideNav)).right, 1280 - 20);
  });

  testWidgets('mobile menu: covers header and page, focus moves in, Esc closes it and focus returns', (t) async {
    final handle = t.ensureSemantics();
    size(t, const Size(390, 844));
    await t.pumpWidget(app(const Frame()));
    expect(find.byType(CmMobileMenu), findsNothing);
    expect(find.bySemanticsLabel('Account: Asha Rao'), findsOneWidget);
    await t.tap(find.text('MORE'));
    await t.pumpAndSettle();
    expect(find.byType(CmMobileMenu), findsOneWidget);
    // The header and the page are out of reach behind the menu; the bottom navigation stays.
    expect(find.bySemanticsLabel('Account: Asha Rao'), findsNothing);
    expect(find.bySemanticsLabel(RegExp('Page home')), findsNothing);
    expect(find.bySemanticsLabel('More'), findsOneWidget);
    expect(t.getRect(find.byType(CmMobileMenu)).bottom, lessThanOrEqualTo(t.getRect(find.byType(CmBottomNavigation)).top));
    final focused = FocusManager.instance.primaryFocus!.context!;
    expect(find.descendant(of: find.byType(CmMobileMenu), matching: find.byWidget(focused.widget)), findsOneWidget, reason: 'focus moved into the menu');
    await t.sendKeyEvent(LogicalKeyboardKey.escape);
    await t.pumpAndSettle();
    expect(find.byType(CmMobileMenu), findsNothing);
    expect(t.state<FrameState>(find.byType(Frame)).menu, isFalse);
    // Choosing a row closes it (the app's onSelected).
    await t.tap(find.text('MORE'));
    await t.pumpAndSettle();
    await t.tap(find.text('Deals'));
    await t.pumpAndSettle();
    expect(find.text('Page deals, wide false'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('dark theme: page colour behind the frame', (t) async {
    size(t, const Size(1280, 800));
    await t.pumpWidget(app(const Frame(), theme: CmTheme.dark()));
    final material = t.widget<Material>(find.descendant(of: find.byType(CmAppFrame), matching: find.byType(Material)).first);
    expect(material.color, CmColors.dark.bgPage);
  });

  group('side navigation collapsed rail', () {
    testWidgets('the toggle collapses and expands; the rail shows counts and dots', (t) async {
      final handle = t.ensureSemantics();
      size(t, const Size(1280, 900));
      await t.pumpWidget(app(const Frame()));
      expect(t.getSize(find.byType(CmSideNav)).width, 250);
      await t.tap(find.bySemanticsLabel('Collapse menu'));
      await t.pumpAndSettle();
      expect(t.state<FrameState>(find.byType(Frame)).collapsed, isTrue);
      expect(t.getSize(find.byType(CmSideNav)).width, 76);
      expect(find.text('Home'), findsNothing, reason: 'icons only');
      expect(find.bySemanticsLabel('Expand menu'), findsOneWidget);
      // Labels stay the names; a count shows on the icon, a text badge as a dot.
      expect(find.bySemanticsLabel('Leads, 4 new'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      expect(find.bySemanticsLabel('Apps (New)'), findsOneWidget);
      expect(find.text('New'), findsNothing);
      // Choosing a section in the rail expands the menu with the section open.
      await t.tap(find.bySemanticsLabel(RegExp('^Reports')));
      await t.pumpAndSettle();
      expect(t.state<FrameState>(find.byType(Frame)).collapsed, isFalse);
      expect(find.text('Pipeline'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('right to left: the collapse chevron is mirrored', (t) async {
      size(t, const Size(1280, 900));
      await t.pumpWidget(app(const Frame(), dir: TextDirection.rtl));
      final flip = t.widget<Transform>(find.ancestor(of: find.byWidgetPredicate((w) => w is CmIcon && w.name == CmIcons.chevronLeft), matching: find.byType(Transform)).first);
      expect(flip.transform.storage[0], -1);
    });
  });

  group('button', () {
    testWidgets('icon-only: square, named by its label, with a count read out and "99+" over 99', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(Center(
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: 3, onPressed: () {}),
          const SizedBox(width: 20),
          CmButton.iconOnly(icon: CmIcons.inbox, label: 'Inbox', count: 120, onPressed: () {}),
          const SizedBox(width: 20),
          CmButton.iconOnly(icon: CmIcons.refresh, label: 'Refresh', onPressed: () {}),
        ]),
      )));
      expect(find.bySemanticsLabel('Notifications, 3 unread'), findsOneWidget);
      expect(find.bySemanticsLabel('Inbox, 120 unread'), findsOneWidget);
      expect(find.bySemanticsLabel('Refresh'), findsOneWidget);
      expect(find.text('99+'), findsOneWidget);
      expect(find.text('Refresh'), findsNothing, reason: 'the label is not shown');
      // Touch platforms (the test default, Android): at least 44 x 44.
      final sq = find.descendant(of: find.byWidgetPredicate((w) => w is CmButton && w.label == 'Refresh'), matching: find.byType(Container)).first;
      expect(t.getSize(sq), const Size(44, 44));
      handle.dispose();
    });

    testWidgets('icon-only on desktop: the size\'s height (32, 46, 24); the count sits on the end corner', (t) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
      Future<void> check(TextDirection dir) async {
        await t.pumpWidget(app(Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: 3, onPressed: () {}),
          CmButton.iconOnly(icon: CmIcons.bell, label: 'Large', size: CmButtonSize.large, onPressed: () {}),
          CmButton.iconOnly(icon: CmIcons.bell, label: 'Slim', size: CmButtonSize.slim, onPressed: () {}),
        ])), dir: dir));
        Size s(String l) => t.getSize(find.descendant(of: find.byWidgetPredicate((w) => w is CmButton && w.label == l), matching: find.byType(Container)).first);
        expect(s('Notifications'), const Size(32, 32));
        expect(s('Large'), const Size(46, 46));
        expect(s('Slim'), const Size(24, 24));
        final button = t.getRect(find.descendant(of: find.byWidgetPredicate((w) => w is CmButton && w.label == 'Notifications'), matching: find.byType(Container)).first);
        final count = t.getRect(find.text('3'));
        if (dir == TextDirection.ltr) {
          expect(count.right, greaterThan(button.right));
        } else {
          expect(count.left, lessThan(button.left));
        }
        expect(count.top, lessThan(button.top));
      }
      await check(TextDirection.ltr);
      await check(TextDirection.rtl);
      debugDefaultTargetPlatformOverride = null;
    });

    testWidgets('a count on a button with text is read after it', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(Center(child: CmButton(label: 'Inbox', icon: CmIcons.inbox, count: 7, onPressed: () {}))));
      expect(find.text('7'), findsOneWidget);
      expect(find.bySemanticsLabel('Inbox 7 unread'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('tones: critical and success, secondary and primary, light and dark', (t) async {
      for (final (theme, c) in [(CmTheme.light(), CmColors.light), (CmTheme.dark(), CmColors.dark)]) {
        await t.pumpWidget(app(Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          CmButton(label: 'Not interested', tone: CmButtonTone.critical, onPressed: () {}),
          CmButton(label: 'Sale closed', tone: CmButtonTone.success, onPressed: () {}),
          CmButton(label: 'Delete', tone: CmButtonTone.critical, variant: CmButtonVariant.primary, onPressed: () {}),
          const CmButton(label: 'Off', tone: CmButtonTone.critical),
        ])), theme: theme));
        await t.pumpAndSettle(); // the theme animates
        BoxDecoration deco(String l) => t.widget<Container>(find.descendant(of: find.widgetWithText(CmButton, l), matching: find.byType(Container)).first).decoration! as BoxDecoration;
        Color text(String l) => t.widget<Text>(find.text(l)).style!.color!;
        expect(text('Not interested'), c.textCritical);
        expect(deco('Not interested').color, c.bgSurface);
        expect((deco('Not interested').border! as Border).top.color, c.borderCritical);
        expect(text('Sale closed'), c.textSuccess);
        expect((deco('Sale closed').border! as Border).top.color, c.textSuccess);
        expect(deco('Delete').color, c.textCritical);
        expect(text('Delete'), c.actionPrimaryText);
        expect(deco('Off').color, c.actionDisabled, reason: 'disabled wins over the tone');
      }
    });
  });
}
