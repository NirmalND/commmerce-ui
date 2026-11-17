import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

final actions = [
  CmCommandGroup(label: 'Actions', items: [
    CmCommandItem(title: 'New lead', keywords: const ['create', 'add'], shortcut: 'mod+shift+l', icon: CmIcons.plus),
    const CmCommandItem(title: 'New task', keywords: ['todo']),
  ]),
  const CmCommandGroup(label: 'Navigate', items: [
    CmCommandItem(title: 'Go to Tasks', shortcut: 'g t'),
    CmCommandItem(title: 'Go to Café orders'),
  ]),
];

Widget app(Widget child, {Size size = const Size(1280, 900), TargetPlatform platform = TargetPlatform.linux}) => MediaQuery(
      data: MediaQueryData(size: size),
      child: MaterialApp(theme: CmTheme.light().copyWith(platform: platform), home: Scaffold(body: Center(child: child))),
    );

void main() {
  test('cmCommandMatches: every word, title or keywords, any case or accent', () {
    const it = CmCommandItem(title: 'Go to Café orders', keywords: ['kitchen']);
    expect(cmCommandMatches(it, 'cafe'), isTrue);
    expect(cmCommandMatches(it, 'CAFÉ ord'), isTrue);
    expect(cmCommandMatches(it, 'orders kitchen'), isTrue);
    expect(cmCommandMatches(it, 'orders bar'), isFalse);
    expect(cmCommandMatches(it, '  '), isTrue);
  });

  test('CmShortcut keys and activators', () {
    expect(CmShortcut.keys('mod+shift+l', apple: true), ['⇧', '⌘', 'L']);
    expect(CmShortcut.keys('mod+shift+l', apple: false), ['Ctrl', 'Shift', 'L']);
    expect(CmShortcut.keys('g t'), ['G', 'T']);
    expect(CmShortcut.spoken('mod+k', apple: false), 'Ctrl K');
    final a = CmShortcut.activator('mod+k', apple: true)!;
    expect(a.trigger, LogicalKeyboardKey.keyK);
    expect(a.meta, isTrue);
    expect(CmShortcut.activator('g t'), isNull);
  });

  group('showCmCommandPalette', () {
    Widget launcher({List<CmCommandItem> recent = const [], CmCommandSearch? search, void Function(CmCommandSelection?)? done}) => Builder(
          builder: (context) => CmButton(
            label: 'Open',
            onPressed: () async {
              final r = await showCmCommandPalette(context, actions: actions, recent: recent, search: search);
              done?.call(r);
            },
          ),
        );

    testWidgets('empty box: recent, then every action; 40px box; shortcut keycaps', (t) async {
      await t.pumpWidget(app(launcher(recent: const [CmCommandItem(title: 'Ravi Stores', description: 'Lead · Mumbai')])));
      await t.tap(find.text('Open'));
      await t.pumpAndSettle();
      expect(find.text('Recent'), findsOneWidget);
      expect(find.text('Ravi Stores'), findsOneWidget);
      expect(find.text('Actions'), findsOneWidget);
      expect(find.text('Navigate'), findsOneWidget);
      expect(find.text('Go to Tasks'), findsOneWidget);
      expect(find.text('Ctrl'), findsOneWidget, reason: 'mod is Ctrl off Apple');
      expect(find.text('Esc'), findsOneWidget);
      final box = t.getSize(find.ancestor(of: find.byType(TextField), matching: find.byType(Container)).first);
      expect(box.height, 40);
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmCommandPalette', reason: 'focus starts in the box');
    });

    testWidgets('filters actions, keyboard moves and Enter runs the item after closing', (t) async {
      final handle = t.ensureSemantics();
      var ran = 0;
      CmCommandSelection? got;
      final acts = [CmCommandGroup(label: 'Actions', items: [CmCommandItem(title: 'New lead', keywords: const ['create'], onRun: () => ran++), const CmCommandItem(title: 'New task')])];
      await t.pumpWidget(app(Builder(
        builder: (context) => CmButton(label: 'Open', onPressed: () async => got = await showCmCommandPalette(context, actions: acts)),
      )));
      await t.tap(find.text('Open'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'creat');
      await t.pump();
      expect(find.text('New lead'), findsOneWidget);
      expect(find.text('New task'), findsNothing);
      expect(t.takeAnnouncements().map((a) => a.message), contains('1 result'));
      await t.enterText(find.byType(TextField), 'new');
      await t.pump();
      await t.sendKeyEvent(LogicalKeyboardKey.end);
      await t.pump();
      expect(t.getSemantics(find.bySemanticsLabel('New task')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
      await t.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await t.pump();
      expect(t.getSemantics(find.bySemanticsLabel('New lead')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue, reason: 'wraps');
      await t.sendKeyEvent(LogicalKeyboardKey.enter);
      await t.pumpAndSettle();
      expect(find.byType(CmCommandPalette), findsNothing);
      expect(ran, 1);
      expect(got?.item?.title, 'New lead');
      expect(got?.query, 'new');

      await t.tap(find.text('Open'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'zzz');
      await t.pump();
      expect(find.text('No results'), findsOneWidget);
      expect(t.takeAnnouncements().map((a) => a.message), contains('No results'));
      await t.sendKeyEvent(LogicalKeyboardKey.escape);
      await t.pumpAndSettle();
      expect(find.byType(CmCommandPalette), findsNothing);
      expect(got, isNull);
      expect(find.text('Open'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('records from the async search: loading, groups with totals and See all, stale answers dropped', (t) async {
      final pending = <String, Completer<List<CmCommandGroup>>>{};
      CmCommandSelection? got;
      await t.pumpWidget(app(launcher(
        search: (q) => (pending[q] = Completer()).future,
        done: (r) => got = r,
      )));
      await t.tap(find.text('Open'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'ra');
      await t.pump();
      expect(find.text('Loading'), findsOneWidget);
      await t.enterText(find.byType(TextField), 'ravi');
      await t.pump();
      pending['ra']!.complete([const CmCommandGroup(label: 'Leads', items: [CmCommandItem(title: 'Old answer')])]);
      await t.pump();
      expect(find.text('Old answer'), findsNothing);
      pending['ravi']!.complete([const CmCommandGroup(label: 'Leads', total: 14, seeAll: true, items: [CmCommandItem(title: 'Ravi Stores', value: 7)])]);
      await t.pump();
      expect(find.text('Loading'), findsNothing);
      expect(find.text('Ravi Stores'), findsOneWidget);
      expect(find.text('14'), findsOneWidget);
      await t.tap(find.text('See all'));
      await t.pumpAndSettle();
      expect(got?.item, isNull);
      expect(got?.group.label, 'Leads');
    });

    testWidgets('full screen with a close button on phones; 44 box and 16px text on touch', (t) async {
      t.view.physicalSize = const Size(390, 800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      await t.pumpWidget(app(launcher(), size: const Size(390, 800), platform: TargetPlatform.iOS));
      await t.tap(find.text('Open'));
      await t.pumpAndSettle();
      expect(t.getSize(find.byType(CmCommandPalette)).width, 390);
      expect(find.descendant(of: find.byType(CmCommandPalette), matching: find.bySemanticsLabel('Close')), findsOneWidget);
      expect(find.text('Esc'), findsNothing);
      final field = t.widget<TextField>(find.byType(TextField));
      expect(field.style?.fontSize, 16);
      await t.tap(find.descendant(of: find.byType(CmCommandPalette), matching: find.bySemanticsLabel('Close')));
      await t.pumpAndSettle();
      expect(find.byType(CmCommandPalette), findsNothing);
    });

    testWidgets('CmCommandPaletteShortcut opens and closes with Ctrl+K', (t) async {
      await t.pumpWidget(MaterialApp(
        theme: CmTheme.light().copyWith(platform: TargetPlatform.windows),
        home: Builder(
          builder: (context) => CmCommandPaletteShortcut(
            onOpen: () => showCmCommandPalette(context, actions: actions),
            child: const Scaffold(body: Text('Page')),
          ),
        ),
      ));
      await t.pump();
      await t.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await t.sendKeyEvent(LogicalKeyboardKey.keyK);
      await t.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await t.pumpAndSettle();
      expect(find.byType(CmCommandPalette), findsOneWidget);
      expect(isCmCommandPaletteOpen, isTrue);
      await t.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await t.sendKeyEvent(LogicalKeyboardKey.keyK);
      await t.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await t.pumpAndSettle();
      expect(find.byType(CmCommandPalette), findsNothing);
      expect(isCmCommandPaletteOpen, isFalse);
    });
  });
}
