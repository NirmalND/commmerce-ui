import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {ThemeData? theme, TextDirection dir = TextDirection.ltr, double width = 600}) => MaterialApp(
      theme: theme ?? CmTheme.light(),
      home: Directionality(
        textDirection: dir,
        child: Scaffold(body: SingleChildScrollView(child: Align(alignment: AlignmentDirectional.topStart, child: SizedBox(width: width, child: child)))),
      ),
    );

final now = DateTime(2026, 11, 16, 12, 0);
const long = 'Hi Asha, following up on the quote for 40 cartons of the festive gift boxes. We can deliver by the 28th if '
    'you confirm by Friday. The price includes printing on two sides and the GST. Let me know if you want samples first, '
    'we can send them to the Andheri office.';

void main() {
  group('timeline', () {
    testWidgets('relative times, full time for screen readers, meta, badge, actions', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(CmTimeline(label: 'Activity for Asha Rao', items: [
        CmTimelineItem(heading: 'Email sent', icon: CmIcons.mail, tone: CmTone.information, dateTime: now.subtract(const Duration(minutes: 5)), now: now, meta: 'by Rahul Kumar · sent', badge: const CmBadge('Email'), actions: [CmButton(label: 'Read email', size: CmButtonSize.slim, onPressed: () {})]),
        CmTimelineItem(heading: 'Call logged', icon: CmIcons.phone, dateTime: now.subtract(const Duration(hours: 2)), now: now),
        CmTimelineItem(heading: 'Status changed', dateTime: now.subtract(const Duration(days: 3)), now: now),
        CmTimelineItem(heading: 'Follow-up due', icon: CmIcons.clock, dateTime: now.add(const Duration(hours: 2)), now: now),
        CmTimelineItem(heading: 'Lead created', dateTime: DateTime(2026, 10, 2, 9, 15), now: now),
        CmTimelineItem(heading: 'Imported', time: 'Last year', now: now),
        CmTimelineItem(heading: 'Just happened', dateTime: now, now: now),
      ])));
      expect(find.text('5 minutes ago'), findsOneWidget);
      expect(find.text('2 hours ago'), findsOneWidget);
      expect(find.text('3 days ago'), findsOneWidget);
      expect(find.text('In 2 hours'), findsOneWidget);
      expect(find.text('Oct 2, 2026'), findsOneWidget, reason: 'over a week away: a date');
      expect(find.text('Last year'), findsOneWidget);
      expect(find.text('Just now'), findsOneWidget);
      expect(find.bySemanticsLabel('5 minutes ago, Monday, November 16, 2026, 11:55 AM'), findsOneWidget);
      expect(find.text('by Rahul Kumar · sent'), findsOneWidget);
      expect(find.text('EMAIL'), findsOneWidget);
      expect(find.text('Read email'), findsOneWidget);
      expect(find.bySemanticsLabel('Activity for Asha Rao'), findsOneWidget);
      // The icon circle is 32px.
      final circle = find.descendant(of: find.byType(CmTimelineItem).first, matching: find.byType(Container)).first;
      expect(t.getSize(circle), const Size(32, 32));
      handle.dispose();
    });

    testWidgets('long bodies clamp to three lines with Show all / Show less', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(CmTimeline(items: [CmTimelineItem(heading: 'Email received', body: long, now: now, time: '1 hour ago')]), width: 360));
      final clamped = t.getSize(find.text(long)).height;
      expect(clamped, closeTo(60, 1), reason: 'three 20px lines');
      final toggle = t.getSemantics(find.bySemanticsLabel('Show all')).getSemanticsData();
      expect(toggle.hasFlag(SemanticsFlag.hasExpandedState), isTrue);
      expect(toggle.hasFlag(SemanticsFlag.isExpanded), isFalse);
      await t.tap(find.text('Show all'));
      await t.pump();
      expect(t.getSize(find.text(long)).height, greaterThan(clamped));
      expect(find.text('Show less'), findsOneWidget);
      // A short body has no toggle.
      await t.pumpWidget(app(CmTimeline(items: [CmTimelineItem(heading: 'Note', body: 'Call back after 4.', now: now, time: 'now')])));
      expect(find.text('Show all'), findsNothing);
      handle.dispose();
    });

    testWidgets('Show more, loading placeholders and the empty slot', (t) async {
      final handle = t.ensureSemantics();
      var more = 0;
      await t.pumpWidget(app(CmTimeline(hasMore: true, onLoadMore: () => more++, items: [CmTimelineItem(heading: 'Email sent', now: now, time: 'now')])));
      await t.tap(find.text('Show more'));
      expect(more, 1);
      // The line runs on past the last item when there is more.
      expect(find.byType(ColoredBox), findsWidgets);
      await t.pumpWidget(app(const CmTimeline(loading: true, items: [])));
      expect(find.byType(CmSkeleton), findsNWidgets(9)); // three rows: a circle and two lines each
      expect(find.bySemanticsLabel('Loading activity'), findsOneWidget);
      await t.pumpWidget(app(const CmTimeline(items: [], empty: CmEmptyState(inline: true, heading: 'No activity yet'))));
      expect(find.text('No activity yet'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('right to left: the icon is on the right; dark theme tone colours', (t) async {
      await t.pumpWidget(app(CmTimeline(items: [CmTimelineItem(heading: 'Deal won', icon: CmIcons.check, tone: CmTone.success, time: 'now', now: now)]), dir: TextDirection.rtl, theme: CmTheme.dark()));
      final circle = find.descendant(of: find.byType(CmTimelineItem), matching: find.byType(Container)).first;
      expect(t.getRect(circle).right, t.getRect(find.byType(CmTimeline)).right);
      expect(t.getRect(find.text('Deal won')).right, lessThan(t.getRect(circle).left));
      final icon = t.widget<CmIcon>(find.byType(CmIcon).first);
      expect(icon.color, CmColors.dark.textSuccess);
    });
  });

  group('metric', () {
    test('numbers are grouped for the locale: lakh grouping in en-IN', () {
      expect(cmFormatNumber(1240), '1,240');
      expect(cmFormatNumber(1240000), '1,240,000');
      expect(cmFormatNumber(1240000, locale: const Locale('en', 'IN')), '12,40,000');
      expect(cmFormatNumber(-3.5), '-3.5');
      expect(cmFormatNumber(1234567.25, locale: const Locale('hi')), '12,34,567.25');
    });

    testWidgets('figure, hint, change with arrow and meaning', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const Column(children: [
        CmMetric(label: 'SMB leads', value: 1240, change: '+12%', trend: CmMetricTrend.up, hint: '2 past demos need a result'),
        CmMetric(label: 'Refunds', value: '38', change: '+3', trend: CmMetricTrend.up, sentiment: CmMetricSentiment.negative),
        CmMetric(label: 'Pipeline', value: 'Rs. 2.4 L', change: '0%', trend: CmMetricTrend.flat),
      ])));
      expect(find.text('1,240'), findsOneWidget);
      expect(find.text('38'), findsOneWidget);
      expect(find.text('Rs. 2.4 L'), findsOneWidget);
      expect(find.bySemanticsLabel('Up +12%, good'), findsOneWidget);
      expect(find.bySemanticsLabel('Up +3, bad'), findsOneWidget);
      expect(find.bySemanticsLabel('No change 0%'), findsOneWidget);
      expect(t.widget<Text>(find.text('+12%')).style!.color, CmColors.light.textSuccess);
      expect(t.widget<Text>(find.text('+3')).style!.color, CmColors.light.textCritical);
      expect(t.widget<Text>(find.text('0%')).style!.color, CmColors.light.textTertiary);
      expect(t.widget<Text>(find.text('1,240')).style!.fontSize, 26);
      handle.dispose();
    });

    testWidgets('as a link the whole tile is one link named by the label and figure', (t) async {
      final handle = t.ensureSemantics();
      var taps = 0;
      await t.pumpWidget(app(CmMetric(label: 'Open deals', value: 18, change: '-2', trend: CmMetricTrend.down, onTap: () => taps++)));
      final node = t.getSemantics(find.bySemanticsLabel('Open deals 18')).getSemanticsData();
      expect(node.hasFlag(SemanticsFlag.isLink), isTrue);
      expect(node.hint, 'Down -2, bad');
      await t.tap(find.text('18'));
      expect(taps, 1);
      handle.dispose();
    });

    testWidgets('loading shows a placeholder and is announced; dark and right to left', (t) async {
      final handle = t.ensureSemantics();
      await t.pumpWidget(app(const CmMetric(label: 'SMB leads', loading: true, trend: CmMetricTrend.down, change: '-4'), theme: CmTheme.dark(), dir: TextDirection.rtl));
      expect(find.byType(CmSkeleton), findsOneWidget);
      expect(find.bySemanticsLabel('Loading SMB leads'), findsOneWidget);
      final tile = t.widget<Container>(find.descendant(of: find.byType(CmMetric), matching: find.byType(Container)).first);
      expect((tile.decoration! as BoxDecoration).color, CmColors.dark.bgSurface);
      expect(t.getRect(find.text('SMB leads')).right, closeTo(t.getRect(find.byType(CmMetric)).right - 20, 1));
      // Down turns the other way in RTL (a quarter anticlockwise).
      final turn = t.widget<RotationTransition>(find.descendant(of: find.byType(CmMetric), matching: find.byType(RotationTransition)));
      expect(turn.turns.value, -0.25);
      handle.dispose();
    });
  });
}
