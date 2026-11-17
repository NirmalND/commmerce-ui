import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(textDirection: dir, child: Scaffold(body: Padding(padding: const EdgeInsets.all(20), child: child))),
    );

class Holder extends StatefulWidget {
  const Holder({super.key, this.initial = '', this.swatches, this.enabled = true});
  final String initial;
  final List<CmColorSwatch>? swatches;
  final bool enabled;
  @override
  State<Holder> createState() => HolderState();
}

class HolderState extends State<Holder> {
  late String value = widget.initial;
  final changes = <String>[];
  @override
  Widget build(BuildContext context) => CmColorField(
        label: 'Colour',
        hint: 'shown on the status tag',
        required: true,
        value: value,
        swatches: widget.swatches,
        enabled: widget.enabled,
        onChanged: (v) => setState(() {
          changes.add(v);
          value = v;
        }),
      );
}

String? focused() => FocusManager.instance.primaryFocus?.debugLabel;

void main() {
  test('normalises hex codes and picks a contrasting check colour', () {
    expect(CmColorField.normalizeHex('#ABC'), '#aabbcc');
    expect(CmColorField.normalizeHex(' 2E6FAF '), '#2e6faf');
    expect(CmColorField.normalizeHex('#12345'), isNull);
    expect(CmColorField.normalizeHex('blue'), isNull);
    expect(CmColorField.checkColor('#000000'), const Color(0xFFFFFFFF));
    expect(CmColorField.checkColor('#ffc107'), const Color(0xFF000000));
    expect(CmColorField.checkColor('#2e6faf'), const Color(0xFFFFFFFF));
  });

  testWidgets('swatches are a named radio group with the default palette', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Holder(initial: '#2E6FAF')));
    final blue = t.getSemantics(find.bySemanticsLabel('Blue, #2e6faf')).getSemanticsData();
    expect(blue.hasFlag(SemanticsFlag.isInMutuallyExclusiveGroup), isTrue);
    expect(blue.hasFlag(SemanticsFlag.isChecked), isTrue);
    expect(blue.hasAction(SemanticsAction.tap), isTrue);
    expect(t.getSemantics(find.bySemanticsLabel('Red, #de0000')).getSemanticsData().hasFlag(SemanticsFlag.isChecked), isFalse);
    expect(find.bySemanticsLabel('Colour, required'), findsOneWidget);
    expect(find.bySemanticsLabel('Colour, hex code'), findsOneWidget);
    expect(find.text('#2e6faf'), findsOneWidget, reason: 'the hex box shows the normalised value');
    expect(find.byType(CmIcon), findsOneWidget, reason: 'one check mark, on the chosen swatch');
    final check = t.widget<CmIcon>(find.byType(CmIcon));
    expect(check.color, const Color(0xFFFFFFFF));
    handle.dispose();
  });

  testWidgets('tap and arrow keys choose a swatch; one Tab stop', (t) async {
    await t.pumpWidget(app(const Holder()));
    final s = t.state<HolderState>(find.byType(Holder));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    expect(focused(), 'CmColorField swatch 0', reason: 'nothing chosen: the first swatch is the stop');
    await t.sendKeyEvent(LogicalKeyboardKey.space);
    await t.pump();
    expect(s.value, '#000000');
    await t.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await t.pump();
    expect(s.value, '#707070');
    await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await t.pump();
    expect(s.value, '#446beb', reason: 'wraps to the last');
    await t.sendKeyEvent(LogicalKeyboardKey.home);
    await t.pump();
    expect(s.value, '#000000');
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    expect(focused(), 'CmColorField hex', reason: 'Tab leaves the group for the hex box');
    await t.tap(find.bySemanticsLabel('Green, #3c7c00'));
    await t.pump();
    expect(s.value, '#3c7c00');
  });

  testWidgets('right to left: Left moves to the next swatch', (t) async {
    await t.pumpWidget(app(const Holder(initial: '#000000'), dir: TextDirection.rtl));
    final s = t.state<HolderState>(find.byType(Holder));
    await t.sendKeyEvent(LogicalKeyboardKey.tab);
    await t.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await t.pump();
    expect(s.value, '#707070');
  });

  testWidgets('hex box: full codes apply as typed, short ones on leaving, invalid text shows an error', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Holder()));
    final s = t.state<HolderState>(find.byType(Holder));
    await t.enterText(find.byType(TextField), '2E6FAF');
    await t.pump();
    expect(s.value, '#2e6faf');
    expect(find.text('2E6FAF'), findsOneWidget, reason: 'the text being typed is kept');
    await t.enterText(find.byType(TextField), '#f0a');
    await t.pump();
    expect(s.value, '#2e6faf', reason: 'short codes wait');
    await t.testTextInput.receiveAction(TextInputAction.done);
    await t.pump();
    expect(s.value, '#ff00aa');
    expect(find.text('#ff00aa'), findsOneWidget);
    await t.enterText(find.byType(TextField), 'blue');
    await t.testTextInput.receiveAction(TextInputAction.done);
    await t.pump();
    expect(s.value, '#ff00aa');
    expect(find.text('Enter a colour as #RRGGBB, for example #2e6faf.'), findsOneWidget);
    final live = t.getSemantics(find.text('Enter a colour as #RRGGBB, for example #2e6faf.')).getSemanticsData();
    expect(live.hasFlag(SemanticsFlag.isLiveRegion), isTrue);
    await t.tap(find.bySemanticsLabel('Red, #de0000'));
    await t.pump();
    expect(find.textContaining('Enter a colour'), findsNothing, reason: 'a swatch clears the error');
    await t.enterText(find.byType(TextField), '');
    await t.testTextInput.receiveAction(TextInputAction.done);
    await t.pump();
    expect(s.value, '');
    handle.dispose();
  });

  testWidgets('custom swatches, disabled, dark theme', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(
      const Holder(initial: '#3c7c00', enabled: false, swatches: [CmColorSwatch('#3c7c00', name: 'Won'), CmColorSwatch('#DE0000', name: 'Lost'), CmColorSwatch('nope')]),
      theme: CmTheme.dark(),
    ));
    expect(find.bySemanticsLabel('Won, #3c7c00'), findsOneWidget);
    expect(find.bySemanticsLabel('Lost, #de0000'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('nope')), findsNothing, reason: 'invalid colours are left out');
    final won = t.getSemantics(find.bySemanticsLabel('Won, #3c7c00')).getSemanticsData();
    expect(won.hasFlag(SemanticsFlag.isEnabled), isFalse);
    await t.tap(find.bySemanticsLabel('Lost, #de0000'), warnIfMissed: false);
    await t.pump();
    expect(t.state<HolderState>(find.byType(Holder)).value, '#3c7c00');
    handle.dispose();
  });
}
