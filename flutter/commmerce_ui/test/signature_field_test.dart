import 'dart:convert';
import 'dart:ui' as ui;

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr, CmStrings? strings, double width = 600}) {
  Widget tree = MaterialApp(
    theme: theme ?? CmTheme.light(),
    home: Scaffold(
      body: Directionality(
        textDirection: dir,
        child: SingleChildScrollView(child: Center(child: SizedBox(width: width, child: child))),
      ),
    ),
  );
  if (strings != null) tree = CmLocalizations(strings: strings, child: tree);
  return tree;
}

/// Lets the engine finish PNG exports (real async work), then delivers the results.
Future<void> settle(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await t.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 20)));
    await t.pump();
  }
}

/// The drawing surface (the pad inside its 1px border).
Finder get canvas => find.byWidgetPredicate((w) => w is Listener && w.onPointerMove != null && w.onPointerCancel != null);

Finder get pad => find.bySemanticsLabel(RegExp(r'^Signature drawing area'));

/// Draws a stroke across the pad from [from] to [to] (fractions of the pad's size) in [steps] moves.
Future<void> stroke(WidgetTester t, {Offset from = const Offset(0.2, 0.5), Offset to = const Offset(0.8, 0.6), int steps = 8, PointerDeviceKind kind = PointerDeviceKind.touch, double pressure = 0.5, int pointer = 1}) async {
  final box = t.getRect(canvas);
  Offset at(Offset f) => Offset(box.left + box.width * f.dx, box.top + box.height * f.dy);
  final g = await t.createGesture(kind: kind, pointer: pointer);
  await g.downWithCustomEvent(at(from), PointerDownEvent(position: at(from), kind: kind, pointer: pointer, pressure: pressure, buttons: kind == PointerDeviceKind.mouse ? kPrimaryMouseButton : kPrimaryButton));
  for (var i = 1; i <= steps; i++) {
    final p = at(Offset.lerp(from, to, i / steps)!);
    await g.updateWithCustomEvent(PointerMoveEvent(position: p, kind: kind, pointer: pointer, pressure: pressure, buttons: kind == PointerDeviceKind.mouse ? kPrimaryMouseButton : kPrimaryButton));
  }
  await g.up();
  await t.pump();
}

Future<ui.Image> decode(Uint8List png) async {
  final codec = await ui.instantiateImageCodec(png);
  return (await codec.getNextFrame()).image;
}

/// Records what screen readers are told to announce.
List<String> listenAnnouncements(WidgetTester t) {
  final said = <String>[];
  t.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<dynamic>(SystemChannels.accessibility, (dynamic m) async {
    final data = (m as Map)['data'] as Map;
    if (m['type'] == 'announce') said.add(data['message'] as String);
  });
  addTearDown(() => t.binding.defaultBinaryMessenger.setMockDecodedMessageHandler<dynamic>(SystemChannels.accessibility, null));
  return said;
}

void main() {
  testWidgets('renders a labelled tab list, a 3:1 pad, the signing line and the Sign here hint, empty', (t) async {
    final handle = t.ensureSemantics();
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, label: 'Your signature', helpText: 'By signing, you accept the quote.')));
    expect(find.text('Your signature'), findsOneWidget);
    expect(find.text('Draw'), findsOneWidget);
    expect(find.text('Type'), findsOneWidget);
    expect(find.text('Sign here'), findsOneWidget);
    expect(find.text('By signing, you accept the quote.'), findsOneWidget);
    final size = t.getSize(canvas);
    expect(size.width / size.height, closeTo(3, 0.01));
    expect(size.width, 598, reason: 'the pad fills its 600px column, inside a 1px border');

    final bar = t.getSemantics(find.bySemanticsLabel('Your signature'));
    expect(bar.getSemanticsData().role, SemanticsRole.tabBar);
    final draw = t.getSemantics(find.bySemanticsLabel('Draw'));
    expect(draw.getSemanticsData().role, SemanticsRole.tab);
    expect(draw.getSemanticsData().hasFlag(SemanticsFlag.isSelected), isTrue);
    expect(t.getSemantics(find.bySemanticsLabel('Type')).getSemanticsData().hasFlag(SemanticsFlag.isSelected), isFalse);

    final p = t.getSemantics(pad).getSemanticsData();
    expect(p.label, 'Signature drawing area');
    expect(p.hint, contains('To sign with the keyboard, choose Type.'));
    expect(p.hint, contains('By signing, you accept the quote.'));
    expect(p.hasFlag(SemanticsFlag.isImage), isTrue);
    expect(p.hasFlag(SemanticsFlag.isFocusable), isTrue);

    expect(t.getSemantics(find.bySemanticsLabel('Undo last stroke')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    expect(t.getSemantics(find.bySemanticsLabel('Clear signature')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    expect(ctrl.isEmpty, isTrue);
    expect(ctrl.value.isEmpty, isTrue);
    expect(ctrl.value.dataUrl, '');
    handle.dispose();
  });

  testWidgets('without a label the tab list is named "How to sign"', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const CmSignatureField()));
    expect(t.getSemantics(find.bySemanticsLabel('How to sign')).getSemanticsData().role, SemanticsRole.tabBar);
    await t.pumpWidget(app(const CmSignatureField(semanticLabel: 'Customer signature')));
    expect(find.bySemanticsLabel('Customer signature'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('a stroke puts ink on the pad, calls onChanged once and gives a cropped 2x black PNG', (t) async {
    final handle = t.ensureSemantics();
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    final changes = <CmSignatureValue>[];
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, label: 'Signature', onChanged: changes.add)));
    await stroke(t);
    expect(ctrl.strokes, hasLength(1));
    expect(ctrl.strokes.first.length, greaterThan(4));
    expect(find.text('Sign here'), findsNothing);
    await settle(t);
    expect(changes, hasLength(1));
    final v = changes.single;
    expect(v.mode, CmSignatureMode.draw);
    expect(v.isEmpty, isFalse);
    expect(v.dataUrl, startsWith('data:image/png;base64,'));
    expect(base64Decode(v.dataUrl.split(',').last), v.png);
    expect(ctrl.value, v);
    expect(t.getSemantics(pad).getSemanticsData().label, 'Signature drawing area, signed');
    expect(t.getSemantics(find.bySemanticsLabel('Undo last stroke')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isTrue);

    final img = (await t.runAsync(() => decode(v.png!)))!;
    // The stroke runs across 60% of a 598px pad (359px) at 2x, plus 16px padding each side, plus the line's width.
    expect(img.width, inInclusiveRange(718 + 32, 718 + 32 + 16));
    expect(img.width, lessThan(598 * 2), reason: 'cropped to the ink');
    final bytes = (await t.runAsync(() => img.toByteData(format: ui.ImageByteFormat.rawRgba)))!;
    var inked = 0;
    for (var i = 0; i < bytes.lengthInBytes; i += 4) {
      final a = bytes.getUint8(i + 3);
      if (a > 200) {
        inked++;
        expect([bytes.getUint8(i), bytes.getUint8(i + 1), bytes.getUint8(i + 2)], [0, 0, 0], reason: 'black ink');
      }
    }
    expect(inked, greaterThan(100));
    expect(bytes.getUint8(3), 0, reason: 'transparent around the ink');
    handle.dispose();
  });

  testWidgets('a single tap leaves a dot; a pen stroke with more pressure is thicker', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl)));
    await stroke(t, from: const Offset(0.5, 0.5), to: const Offset(0.5, 0.5), steps: 1);
    expect(ctrl.strokes.single, hasLength(1));
    expect(ctrl.isEmpty, isFalse);
    final dot = (await t.runAsync(ctrl.toPng))!;
    final dotImg = (await t.runAsync(() => decode(dot)))!;
    expect(dotImg.width, lessThan(60));

    Future<int> height(double pressure) async {
      ctrl.clear();
      await t.pump();
      await stroke(t, from: const Offset(0.2, 0.5), to: const Offset(0.8, 0.5), kind: PointerDeviceKind.stylus, pressure: pressure);
      final png = (await t.runAsync(ctrl.toPng))!;
      return (await t.runAsync(() => decode(png)))!.height;
    }

    final light = await height(0.1);
    final heavy = await height(1);
    expect(ctrl.strokes.single.first.pressure, 1);
    expect(heavy, greaterThan(light));
  });

  testWidgets('ignores secondary mouse buttons and a second finger while a stroke is in progress', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl)));
    final box = t.getRect(canvas);
    final right = await t.startGesture(box.center, kind: PointerDeviceKind.mouse, buttons: kSecondaryMouseButton);
    await right.moveBy(const Offset(40, 0));
    await right.up();
    await t.pump();
    expect(ctrl.strokes, isEmpty);

    final first = await t.startGesture(box.center - const Offset(100, 0), pointer: 1);
    final second = await t.startGesture(box.center + const Offset(100, 0), pointer: 2);
    await first.moveBy(const Offset(30, 5));
    await second.moveBy(const Offset(30, 5));
    await second.up();
    await first.moveBy(const Offset(30, 5));
    await first.up();
    await t.pump();
    expect(ctrl.strokes, hasLength(1));
    expect(ctrl.strokes.single, hasLength(3));
    expect(ctrl.strokes.single.first.x, closeTo((box.width / 2 - 100 - 1) / box.width, 0.01));
  });

  testWidgets('drawing on a phone does not scroll the page', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    final scroll = ScrollController();
    addTearDown(scroll.dispose);
    await t.pumpWidget(MaterialApp(
      theme: CmTheme.light(),
      home: Scaffold(
        body: ListView(controller: scroll, children: [
          const SizedBox(height: 200),
          CmSignatureField(controller: ctrl),
          const SizedBox(height: 2000),
        ]),
      ),
    ));
    await stroke(t, from: const Offset(0.5, 0.2), to: const Offset(0.5, 0.9));
    expect(scroll.offset, 0);
    expect(ctrl.strokes, hasLength(1));
    // Outside the pad the page still scrolls.
    await t.dragFrom(const Offset(400, 100), const Offset(0, -100));
    await t.pump();
    expect(scroll.offset, greaterThan(0));
  });

  testWidgets('Undo removes the last stroke, Clear removes all; both announce and call onChanged; buttons follow the state', (t) async {
    final handle = t.ensureSemantics();
    final said = listenAnnouncements(t);
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    final changes = <CmSignatureValue>[];
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, onChanged: changes.add)));
    await stroke(t);
    await stroke(t, from: const Offset(0.2, 0.3), to: const Offset(0.5, 0.3));
    await settle(t);
    expect(changes, hasLength(2));

    await t.tap(find.text('Undo'));
    await t.pump();
    expect(ctrl.strokes, hasLength(1));
    expect(said, ['Last stroke removed']);
    await settle(t);
    expect(changes, hasLength(3));
    expect(changes.last.isEmpty, isFalse);

    await stroke(t, from: const Offset(0.1, 0.8), to: const Offset(0.3, 0.8));
    await t.tap(find.text('Clear'));
    await t.pump();
    expect(ctrl.strokes, isEmpty);
    expect(said.last, 'Signature cleared');
    await settle(t);
    expect(changes.last.isEmpty, isTrue);
    expect(ctrl.value.isEmpty, isTrue);
    expect(t.getSemantics(find.bySemanticsLabel('Undo last stroke')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    expect(t.getSemantics(find.bySemanticsLabel('Clear signature')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    expect(find.text('Sign here'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('when the focused button becomes disabled, focus moves to the selected tab', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl)));
    await stroke(t);
    // Keyboard: Tab to the Draw tab, then Undo.
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.pump();
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmSignatureField undo');
    await t.sendKeyEvent(LogicalKeyboardKey.enter);
    await t.pump();
    await t.pump();
    expect(ctrl.strokes, isEmpty);
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmSignatureField draw tab');
  });

  testWidgets('the screen ink follows the theme; the export is always black', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl), theme: CmTheme.dark()));
    await stroke(t);
    final painter = t.widget<CustomPaint>(find.descendant(of: canvas, matching: find.byType(CustomPaint))).painter!;
    expect((painter as dynamic).ink, CmColors.dark.textDefault, reason: 'screen ink is text-default of the theme');
    final png = (await t.runAsync(ctrl.toPng))!;
    final img = (await t.runAsync(() => decode(png)))!;
    final bytes = (await t.runAsync(() => img.toByteData(format: ui.ImageByteFormat.rawRgba)))!;
    var dark = 0;
    for (var i = 0; i < bytes.lengthInBytes; i += 4) {
      if (bytes.getUint8(i + 3) > 200) {
        expect(bytes.getUint8(i), 0);
        dark++;
      }
    }
    expect(dark, greaterThan(100));
  });

  testWidgets('resizing redraws the strokes at the new size in the same place; the pad stays 3:1', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl)));
    await stroke(t);
    final before = ctrl.strokes;
    await t.pumpWidget(app(CmSignatureField(controller: ctrl), width: 302));
    final size = t.getSize(canvas);
    expect(size.width, 300);
    expect(size.height, 100);
    expect(ctrl.strokes, before, reason: 'strokes are kept as fractions of the width');
    expect(t.takeException(), isNull);
  });

  testWidgets('fits a 320px phone screen, with the buttons wrapping under the tabs if needed', (t) async {
    t.view.physicalSize = const Size(320, 800);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(MaterialApp(
      theme: CmTheme.light().copyWith(platform: TargetPlatform.iOS),
      home: const Scaffold(body: Padding(padding: EdgeInsets.all(16), child: CmSignatureField(label: 'Signature', required: true))),
    ));
    expect(t.takeException(), isNull);
    expect(t.getSize(canvas).width, 286);
    // Touch: tabs 44 tall; buttons drawn 40 with a 44 hit area.
    expect(t.getSize(find.ancestor(of: find.text('Draw'), matching: find.byType(SizedBox)).first).height, 44);
    expect(t.getSize(find.byType(CmButton).first).height, 44);
  });

  testWidgets('a saved image shows in Draw; loadImage(null) clears both tabs', (t) async {
    final handle = t.ensureSemantics();
    final source = CmSignatureController(mode: CmSignatureMode.type, typedName: 'Asha Rao');
    addTearDown(source.dispose);
    final ctrl = CmSignatureController(mode: CmSignatureMode.type, typedName: 'Asha Rao');
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl)));
    final saved = (await t.runAsync(source.toPng))!;
    ctrl.loadImage(saved);
    await t.pump();
    await settle(t);
    expect(ctrl.mode, CmSignatureMode.draw);
    expect(ctrl.isEmpty, isFalse);
    expect(ctrl.strokes, isEmpty);
    expect(ctrl.value.isEmpty, isFalse);
    expect(t.getSemantics(pad).getSemanticsData().label, 'Signature drawing area, signed');
    expect(find.text('Sign here'), findsNothing);
    // Undo removes the saved image.
    ctrl.undo();
    await t.pump();
    expect(ctrl.isDrawEmpty, isTrue);
    ctrl.loadImage(saved);
    ctrl.loadImage(null);
    await t.pump();
    expect(ctrl.isDrawEmpty, isTrue);
    expect(ctrl.typedName, '');
    handle.dispose();
  });

  testWidgets('Type: a named text box in the signature font; typing gives a PNG and a debounced onChanged', (t) async {
    final handle = t.ensureSemantics();
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    final changes = <CmSignatureValue>[];
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, label: 'Signature', required: true, onChanged: changes.add)));
    await t.tap(find.text('Type'));
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.type);
    expect(find.text('Sign here'), findsNothing);
    final field = t.widget<TextField>(find.byType(TextField));
    expect(field.style!.fontFamily, 'packages/commmerce_ui/Dancing Script');
    expect(field.style!.fontSize, 48, reason: '9% of the width, at most 48');
    expect(field.autofillHints, [AutofillHints.name]);
    expect(field.maxLength, 80);
    expect(find.bySemanticsLabel(RegExp('^Signature: Type your full name')), findsOneWidget);
    expect(find.text('Undo'), findsNothing, reason: 'Undo is for drawing only');

    await t.enterText(find.byType(TextField), 'Asha');
    await t.pump(const Duration(milliseconds: 100));
    await t.enterText(find.byType(TextField), 'Asha Rao');
    expect(ctrl.typedName, 'Asha Rao');
    await settle(t);
    expect(changes, isEmpty, reason: 'waits until typing stops');
    await t.pump(const Duration(milliseconds: 400));
    await settle(t);
    expect(changes, hasLength(1));
    expect(changes.single.mode, CmSignatureMode.type);
    expect(changes.single.typedName, 'Asha Rao');
    expect(changes.single.png, isNotNull);
    expect(ctrl.value.dataUrl, startsWith('data:image/png;base64,'));
    handle.dispose();
  });

  testWidgets('switching tabs keeps each tab\'s signature and changes the value', (t) async {
    final ctrl = CmSignatureController(typedName: 'Asha Rao');
    addTearDown(ctrl.dispose);
    final changes = <CmSignatureValue>[];
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, onChanged: changes.add)));
    await settle(t);
    expect(ctrl.isEmpty, isTrue, reason: 'Draw is selected and has no strokes');
    await stroke(t);
    await settle(t);
    expect(changes, hasLength(1));
    final drawn = ctrl.value;

    await t.tap(find.text('Type'));
    await t.pump();
    await settle(t);
    expect(changes, hasLength(2));
    expect(changes.last.mode, CmSignatureMode.type);
    expect(changes.last.typedName, 'Asha Rao');
    expect(t.widget<TextField>(find.byType(TextField)).controller!.text, 'Asha Rao');

    await t.tap(find.text('Draw'));
    await t.pump();
    await settle(t);
    expect(changes, hasLength(3));
    expect(ctrl.strokes, hasLength(1));
    expect(ctrl.value, drawn);
  });

  testWidgets('tabs: arrow keys, Home and End move and select; one Tab stop for the pair', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, label: 'Signature')));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.pump();
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmSignatureField draw tab');
    await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.type);
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmSignatureField type tab');
    await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.draw);
    await t.sendKeyEvent(LogicalKeyboardKey.end);
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.type);
    await t.sendKeyEvent(LogicalKeyboardKey.home);
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.draw);
    // The next Tab skips the other tab and the disabled buttons, and reaches the pad.
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.pump();
    expect(FocusManager.instance.primaryFocus?.debugLabel, 'CmSignatureField pad');
  });

  testWidgets('right-to-left: Sign here and the tabs start on the right; the keys still switch tabs', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, label: 'Signature'), dir: TextDirection.rtl));
    final padRect = t.getRect(canvas);
    expect(t.getRect(find.text('Sign here')).right, closeTo(padRect.right - 12, 1));
    expect(t.getRect(find.text('Draw')).left, greaterThan(t.getRect(find.text('Type')).left));
    expect(t.getRect(find.text('Clear')).left, lessThan(t.getRect(find.text('Type')).left));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.type);
  });

  testWidgets('required blocks Form.validate until signed; save gives the value; reset clears', (t) async {
    final ctrl = CmSignatureController();
    addTearDown(ctrl.dispose);
    final form = GlobalKey<FormState>();
    CmSignatureValue? saved;
    await t.pumpWidget(app(Form(key: form, child: CmSignatureField(controller: ctrl, label: 'Signature', required: true, onSaved: (v) => saved = v))));
    expect(form.currentState!.validate(), isFalse);
    await t.pump();
    expect(find.text('Please sign here.'), findsOneWidget);
    await stroke(t);
    await settle(t);
    expect(form.currentState!.validate(), isTrue);
    await t.pump();
    expect(find.text('Please sign here.'), findsNothing);
    form.currentState!.save();
    expect(saved!.png, isNotNull);
    form.currentState!.reset();
    await t.pump();
    expect(ctrl.strokes, isEmpty);
    expect(ctrl.isEmpty, isTrue);
  });

  testWidgets('required in Type: valid once a name is typed; a validator adds its own check', (t) async {
    final ctrl = CmSignatureController(mode: CmSignatureMode.type);
    addTearDown(ctrl.dispose);
    final form = GlobalKey<FormState>();
    await t.pumpWidget(app(Form(
      key: form,
      child: CmSignatureField(controller: ctrl, required: true, validator: (v) => v?.typedName == 'x' ? 'Type your full name' : null),
    )));
    expect(form.currentState!.validate(), isFalse);
    await t.enterText(find.byType(TextField), 'x');
    await settle(t);
    expect(form.currentState!.validate(), isFalse, reason: 'the validator sees the value once its PNG is made');
    await t.enterText(find.byType(TextField), 'Asha Rao');
    await t.pump(const Duration(milliseconds: 400));
    await settle(t);
    expect(form.currentState!.validate(), isTrue);
  });

  testWidgets('error: shown under the pad, announced, the pad outline turns critical, the text box is invalid', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const CmSignatureField(label: 'Signature', error: 'Sign with the name on the quote')));
    expect(find.text('Sign with the name on the quote'), findsOneWidget);
    final live = t.getSemantics(find.text('Sign with the name on the quote'));
    expect(live.getSemanticsData().hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    expect(t.getSemantics(pad).getSemanticsData().hint, contains('Sign with the name on the quote'));
    final box = t.widget<Container>(find.ancestor(of: canvas, matching: find.byType(Container)).first);
    expect(((box.decoration! as BoxDecoration).border! as Border).top.color, CmColors.light.borderCritical);
    await t.tap(find.text('Type'));
    await t.pump();
    expect(t.getSemantics(find.byType(TextField)).getSemanticsData().validationResult, SemanticsValidationResult.invalid);
    handle.dispose();
  });

  testWidgets('disabled: tabs, buttons, the text box and drawing do nothing', (t) async {
    final handle = t.ensureSemantics();
    final ctrl = CmSignatureController(typedName: 'Asha Rao');
    addTearDown(ctrl.dispose);
    await t.pumpWidget(app(CmSignatureField(controller: ctrl, enabled: false)));
    await stroke(t);
    expect(ctrl.strokes, isEmpty);
    await t.tap(find.text('Type'));
    await t.pump();
    expect(ctrl.mode, CmSignatureMode.draw);
    expect(t.getSemantics(find.bySemanticsLabel('Type')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    expect(t.getSemantics(find.bySemanticsLabel('Clear signature')).getSemanticsData().hasFlag(SemanticsFlag.isEnabled), isFalse);
    ctrl.mode = CmSignatureMode.type;
    await t.pump();
    expect(t.widget<TextField>(find.byType(TextField)).enabled, isFalse);
    handle.dispose();
  });

  testWidgets('every built-in string comes from CmStrings', (t) async {
    final handle = t.ensureSemantics();
    const fr = CmStrings(
      signatureFieldModes: 'Comment signer',
      signatureFieldDraw: 'Dessiner',
      signatureFieldType: 'Saisir',
      signatureFieldPad: 'Zone de signature',
      signatureFieldSignHere: 'Signez ici',
      signatureFieldUndo: 'Annuler',
      signatureFieldUndoLabel: 'Annuler le dernier trait',
      signatureFieldClear: 'Effacer',
      signatureFieldClearLabel: 'Effacer la signature',
      signatureFieldRequired: 'Veuillez signer ici.',
    );
    final form = GlobalKey<FormState>();
    await t.pumpWidget(app(Form(key: form, child: const CmSignatureField(required: true)), strings: fr));
    for (final s in ['Dessiner', 'Saisir', 'Signez ici', 'Annuler', 'Effacer']) {
      expect(find.text(s), findsOneWidget, reason: s);
    }
    expect(find.bySemanticsLabel('Comment signer'), findsOneWidget);
    expect(find.bySemanticsLabel('Zone de signature'), findsOneWidget);
    expect(find.bySemanticsLabel('Effacer la signature'), findsOneWidget);
    form.currentState!.validate();
    await t.pump();
    expect(find.text('Veuillez signer ici.'), findsOneWidget);
    handle.dispose();
  });

  test('CmSignatureValue: empty, data URL and equality', () {
    const empty = CmSignatureValue.empty();
    expect(empty.isEmpty, isTrue);
    expect(empty.dataUrl, '');
    final a = CmSignatureValue(mode: CmSignatureMode.type, png: Uint8List.fromList([1, 2, 3]), typedName: 'A');
    final b = CmSignatureValue(mode: CmSignatureMode.type, png: Uint8List.fromList([1, 2, 3]), typedName: 'A');
    expect(a, b);
    expect(a.hashCode, b.hashCode);
    expect(a.dataUrl, 'data:image/png;base64,AQID');
  });
}
