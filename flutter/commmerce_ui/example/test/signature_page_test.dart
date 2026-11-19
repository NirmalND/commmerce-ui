import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:commmerce_ui_example/signature_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'semantics_audit_test.dart' show unactionable;

Widget page({ThemeData? theme}) => MaterialApp(theme: theme ?? CmTheme.light(), home: const Scaffold(body: SignaturePage()));

void main() {
  for (final size in const [Size(1440, 2400), Size(390, 3200)]) {
    for (final dark in [false, true]) {
      testWidgets('signature demo lays out at ${size.width.toInt()}px${dark ? ', dark' : ''}', (t) async {
        t.view.physicalSize = size;
        t.view.devicePixelRatio = 1;
        addTearDown(t.view.reset);
        await t.pumpWidget(page(theme: dark ? CmTheme.dark() : null));
        await t.pump();
        expect(t.takeException(), isNull);
        expect(find.byType(CmSignatureField), findsNWidgets(5));
        expect(find.text('Sign and accept'), findsOneWidget);
      });
    }
  }

  testWidgets('demo: Sign and accept is enabled once something is drawn', (t) async {
    t.view.physicalSize = const Size(1440, 2400);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    await t.pumpWidget(page());
    CmButton sign() => t.widget<CmButton>(find.widgetWithText(CmButton, 'Sign and accept'));
    expect(sign().onPressed, isNull);
    final pad = t.getRect(find.byWidgetPredicate((w) => w is Listener && w.onPointerMove != null && w.onPointerCancel != null).first);
    await t.dragFrom(pad.center, const Offset(120, 10));
    await t.pump();
    expect(sign().onPressed, isNotNull);
  });

  testWidgets('every control on the signature demo can be activated by a screen reader', (t) async {
    t.view.physicalSize = const Size(1440, 3200);
    t.view.devicePixelRatio = 1;
    addTearDown(t.view.reset);
    final handle = t.ensureSemantics();
    await t.pumpWidget(page());
    await t.pump();
    final seen = <String>{};
    final bad = unactionable(t, seen);
    handle.dispose();
    expect(bad, isEmpty, reason: 'announced but not activatable: ${bad.join(' | ')}');
    expect(seen, containsAll(['Draw', 'Type', 'Undo last stroke', 'Clear signature', 'Signature drawing area']));
  });
}
