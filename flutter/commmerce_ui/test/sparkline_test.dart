import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr, double width = 200, Locale? locale}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      locale: locale,
      supportedLocales: [locale ?? const Locale('en', 'US')],
      home: Directionality(
        textDirection: dir,
        child: Scaffold(body: Align(alignment: AlignmentDirectional.topStart, child: SizedBox(width: width, child: child))),
      ),
    );

Finder chart() => find.descendant(of: find.byType(CmSparkline), matching: find.byType(CustomPaint)).first;

// 200 x 32, four slots of 50 with a 2px gap, tallest value 4 over 30px (2px kept at the top).
RRect bar(double left, double height) => RRect.fromRectAndRadius(Rect.fromLTWH(left, 32 - height, 48, height), const Radius.circular(1));

const light = CmColors.light, dark = CmColors.dark;

void main() {
  testWidgets('bars: baseline, heights to scale, zero skipped, last bar in the text colour, 32 tall and full width', (t) async {
    await t.pumpWidget(app(const CmSparkline(values: [1, 0, 3, 4], label: 'Visits')));
    expect(t.getSize(find.byType(CmSparkline)), const Size(200, 32));
    expect(
      chart(),
      paints
        ..line(p1: const Offset(0, 31.5), p2: const Offset(200, 31.5), color: light.borderSubtle, strokeWidth: 1)
        ..rrect(rrect: bar(1, 7.5), color: light.iconDefault)
        ..rrect(rrect: bar(101, 22.5), color: light.iconDefault)
        ..rrect(rrect: bar(151, 30), color: light.textDefault),
    );
    expect(chart(), paintsExactlyCountTimes(#drawRRect, 3), reason: 'the zero bar draws nothing');
  });

  testWidgets('bars: a small value is at least 1.5 tall; the gap is at most 25% of a slot; height is settable', (t) async {
    await t.pumpWidget(app(const CmSparkline(values: [100, 1], height: 40)));
    expect(t.getSize(find.byType(CmSparkline)), const Size(200, 40));
    expect(chart(), paints..rrect()..rrect(rrect: RRect.fromRectAndRadius(const Rect.fromLTWH(101, 38.5, 98, 1.5), const Radius.circular(1))));

    // 100 slots of 2px: the gap is 0.5 (25% of the slot), not 2.
    await t.pumpWidget(app(CmSparkline(values: List.filled(100, 1))));
    expect(chart(), paints..rrect(rrect: RRect.fromRectAndRadius(const Rect.fromLTWH(0.25, 2, 1.5, 30), const Radius.circular(1))));
  });

  testWidgets('line: 1.5 round stroke and a dot on the last point', (t) async {
    await t.pumpWidget(app(const CmSparkline(values: [0, 2, 4], type: CmSparklineType.line)));
    expect(
      chart(),
      paints
        ..line(color: light.borderSubtle)
        ..path(color: light.iconDefault, strokeWidth: 1.5, style: PaintingStyle.stroke, includes: const [Offset(0, 32), Offset(100, 17), Offset(200, 2)])
        ..circle(x: 200, y: 2, radius: 2, color: light.textDefault),
    );
    final painter = t.widget<CustomPaint>(chart()).painter! as CmSparklinePainter;
    expect(painter.type, CmSparklineType.line);
  });

  testWidgets('screen readers hear one sentence, formatted for the locale', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const CmSparkline(values: [400, 1200, 840], label: 'Visits, last 3 days')));
    final node = find.bySemanticsLabel('Visits, last 3 days: 2,440 in all, peak 1,200, latest 840');
    expect(node, findsOneWidget);
    expect(t.getSemantics(node).getSemanticsData().hasFlag(SemanticsFlag.isImage), isTrue);

    await t.pumpWidget(app(const CmSparkline(values: [400, 1200, 840], labels: ['Mon', 'Tue', 'Wed'], label: 'Visits')));
    expect(find.bySemanticsLabel('Visits: 2,440 in all, peak 1,200 on Tue, latest 840'), findsOneWidget);
    expect(find.text('Tue: 1,200'), findsNothing, reason: 'hover text is not a separate node');

    await t.pumpWidget(app(const CmSparkline(values: [100000, 140000], label: 'Sales'), locale: const Locale('en', 'IN')));
    expect(find.bySemanticsLabel('Sales: 2,40,000 in all, peak 1,40,000, latest 1,40,000'), findsOneWidget);

    await t.pumpWidget(app(CmLocalizations(
      strings: CmStrings(sparklineSummary: (l, total, peak, latest) => '$l : $total au total, max $peak, dernier $latest'),
      child: const CmSparkline(values: [1, 2.5], label: 'Visites'),
    )));
    expect(find.bySemanticsLabel('Visites : 3.5 au total, max 2.5, dernier 2.5'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('empty data: baseline only and "no data"', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const CmSparkline(values: [], label: 'Visits')));
    expect(find.bySemanticsLabel('Visits: no data'), findsOneWidget);
    expect(chart(), paints..line(color: light.borderSubtle));
    expect(chart(), paintsExactlyCountTimes(#drawRRect, 0));
    expect(chart(), paintsExactlyCountTimes(#drawPath, 0));
    handle.dispose();
  });

  testWidgets('RTL keeps time left to right, bars and hover text alike', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const CmSparkline(values: [1, 0, 3, 4], labels: ['Mon', 'Tue', 'Wed', 'Thu'], label: 'Visits'), dir: TextDirection.rtl));
    expect(chart(), paints..line()..rrect(rrect: bar(1, 7.5))..rrect(rrect: bar(101, 22.5))..rrect(rrect: bar(151, 30), color: light.textDefault));
    final left = t.getTopLeft(find.byType(CmSparkline));
    await t.longPressAt(left + const Offset(10, 16));
    await t.pump(const Duration(milliseconds: 100));
    expect(find.text('Mon: 1'), findsOneWidget, reason: 'the leftmost bar is the oldest point');
    await t.pump(const Duration(seconds: 2));
    await t.pumpAndSettle();
    handle.dispose();
  });

  for (final (name, theme, colors) in [('light', CmTheme.light(), light), ('dark', CmTheme.dark(), dark)]) {
    testWidgets('tones in $name: neutral, information and success', (t) async {
      await t.pumpWidget(app(const CmSparkline(values: [2, 4]), theme: theme));
      expect(chart(), paints..line(color: colors.borderSubtle)..rrect(color: colors.iconDefault)..rrect(color: colors.textDefault));

      for (final (tone, c) in [(CmSparklineTone.information, colors.textInformation), (CmSparklineTone.success, colors.textSuccess)]) {
        await t.pumpWidget(app(CmSparkline(values: const [2, 4], tone: tone), theme: theme));
        expect(chart(), paints..line()..rrect(color: c.withValues(alpha: 0.55))..rrect(color: c));
        await t.pumpWidget(app(CmSparkline(values: const [2, 4], tone: tone, type: CmSparklineType.line), theme: theme));
        expect(chart(), paints..line()..path(color: c)..circle(color: c));
      }
      await t.pumpWidget(app(const CmSparkline(values: [2, 4], type: CmSparklineType.line), theme: theme));
      expect(chart(), paints..line()..path(color: colors.iconDefault)..circle(color: colors.textDefault));
    });
  }

  testWidgets('works without a bounded width', (t) async {
    await t.pumpWidget(app(const Row(children: [CmSparkline(values: [1, 2])])));
    expect(t.getSize(find.byType(CmSparkline)), const Size(120, 32));
  });
}
