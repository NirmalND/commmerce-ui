import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// The widgets added for the Commmerce CRM in 1.1 and 1.2, with CRM content: the app frame with global search,
/// a collapsible side navigation and a notifications bell, metrics, an activity timeline, outcome buttons, an
/// inline empty state and a follow-up date and time.
class CrmPage extends StatefulWidget {
  const CrmPage({super.key});
  @override
  State<CrmPage> createState() => _CrmPageState();
}

class _Record {
  const _Record(this.kind, this.title, this.description, this.icon);
  final String kind, title, description, icon;
}

const _records = [
  _Record('Leads', 'Ravi Stores', 'Lead · Mumbai · +91 98200 12345', CmIcons.user),
  _Record('Leads', 'Rao Textiles', 'Lead · Surat · Asha Rao', CmIcons.user),
  _Record('Leads', 'Raghav Foods', 'Lead · Pune · Website form', CmIcons.user),
  _Record('Deals', 'Ravi Stores renewal', 'Deal · Rs. 2,40,000 · Proposal', CmIcons.handshake),
  _Record('Deals', 'Rao Textiles festive order', 'Deal · Rs. 85,000 · Won', CmIcons.handshake),
  _Record('Contacts', 'Asha Rao', 'Contact · Rao Textiles · asha@raotextiles.in', CmIcons.mail),
  _Record('Contacts', 'Ravi Menon', 'Contact · Ravi Stores · +91 98200 12345', CmIcons.mail),
];

class _CrmPageState extends State<CrmPage> {
  // One query per search box: the frame's header search and the standalone one below.
  final _frameQuery = TextEditingController();
  final _query = TextEditingController();
  Timer? _searchTimer;
  List<CmGlobalSearchGroup> _results = const [];
  bool _searching = false, _collapsed = false, _menu = false, _moreLoading = false, _hasMore = true;
  String _framePage = 'home', _note = '';
  int _olderPages = 0;
  DateTime? _followUp;
  var _notifications = const [
    CmNotification(label: 'Follow-up due with Asha Rao', description: 'Rao Textiles · today at 4 pm', icon: CmIcons.clock, time: '5 min', unread: true),
    CmNotification(label: 'Deal won: Rao Textiles festive order', tone: CmTone.success, time: '1 h', unread: true),
    CmNotification(label: 'New lead from the website form', description: 'Raghav Foods, Pune', icon: CmIcons.user, time: '3 h'),
  ];

  @override
  void dispose() {
    _searchTimer?.cancel();
    _query.dispose();
    _frameQuery.dispose();
    super.dispose();
  }

  void _say(String msg) => setState(() => _note = msg);

  /// Pretends to search the CRM: a short wait, then matches grouped by kind.
  void _search(String q) {
    _searchTimer?.cancel();
    if (q.trim().isEmpty) {
      setState(() {
        _results = const [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    _searchTimer = Timer(const Duration(milliseconds: 350), () {
      final needle = q.trim().toLowerCase();
      final groups = <CmGlobalSearchGroup>[];
      for (final kind in ['Leads', 'Deals', 'Contacts']) {
        final hits = _records.where((r) => r.kind == kind && '${r.title} ${r.description}'.toLowerCase().contains(needle)).toList();
        if (hits.isEmpty) continue;
        groups.add(CmGlobalSearchGroup(
          label: kind,
          value: kind,
          total: hits.length * (kind == 'Leads' ? 6 : 1),
          seeAll: kind == 'Leads',
          items: [for (final r in hits.take(5)) CmGlobalSearchItem(title: r.title, description: r.description, icon: r.icon, value: r.title)],
        ));
      }
      if (mounted) {
        setState(() {
          _results = groups;
          _searching = false;
        });
      }
    });
  }

  CmGlobalSearch _globalSearch({required TextEditingController controller, String? shortcut}) => CmGlobalSearch(
        controller: controller,
        placeholder: 'Search leads, deals, contacts',
        shortcut: shortcut,
        results: _results,
        loading: _searching,
        onSearch: _search,
        onSelected: (g, i) => _say(i == null ? 'See all ${g.label}' : 'Open ${i.title}'),
      );

  Future<void> _openNotifications(BuildContext context) async {
    await showCmNotificationPanel(
      context: context,
      notifications: _notifications,
      onSelected: (n) => _say('Open notification: ${n.label}'),
      onMore: () => _say('See more notifications'),
      onMarkAllRead: () => setState(() => _notifications = [for (final n in _notifications) n.copyWith(unread: false)]),
      footer: Builder(builder: (context) => CmToggle(value: true, onChanged: (_) {}, label: 'Push on this device')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    Widget section(String title, String web, Widget child, {String? description}) => Padding(
          padding: const EdgeInsets.only(bottom: CmSpace.s20),
          child: CmCard(heading: title, description: description ?? 'Mirrors <$web>.', child: child),
        );
    final unread = _notifications.where((n) => n.unread).length;
    return Column(children: [
      CmPageHeader(
        title: 'CRM widgets',
        breadcrumbs: const [CmBreadcrumb('Components')],
        adornment: const CmBadge('1.1 and 1.2', tone: CmTone.information),
        actions: [
          CmButton.iconOnly(icon: CmIcons.refresh, label: 'Refresh', onPressed: () => _say('Refreshed')),
          Builder(builder: (context) => CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: unread, onPressed: () => _openNotifications(context))),
        ],
      ),
      Expanded(
        child: ListView(padding: EdgeInsets.all(phone ? CmSpace.s15 : CmSpace.s20), children: [
          if (_note.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: CmSpace.s20), child: CmBanner(tone: CmTone.information, message: 'Last action: $_note')),
          section(
            'App frame',
            'cm-app-frame',
            description: 'Side navigation when the frame is 1024px wide or more (collapse it to icons), bottom navigation and the More menu below. Search sits in the header bar; on narrow bars it opens full screen.',
            SizedBox(
              height: 600,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(CmRadius.md),
                child: CmAppFrame(
                  header: CmHeaderBar(
                    logo: const Text('COMMMERCE CRM'),
                    userName: 'Asha Rao',
                    onUserTap: () => _say('Account menu'),
                    search: _globalSearch(controller: _frameQuery),
                    end: [Builder(builder: (context) => CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: unread, onPressed: () => _openNotifications(context)))],
                  ),
                  navigation: CmSideNav(
                    width: 250,
                    collapsible: true,
                    collapsed: _collapsed,
                    onCollapsedChanged: (v) => setState(() => _collapsed = v),
                    selectedId: _framePage,
                    onSelected: (i) => setState(() => _framePage = i.id),
                    items: const [
                      CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
                      CmNavItem(id: 'leads', label: 'Leads', icon: CmIcons.user, count: 12),
                      CmNavItem(id: 'deals', label: 'Deals', icon: CmIcons.handshake),
                      CmNavItem(id: 'inbox', label: 'Inbox', icon: CmIcons.inbox, badge: 'New'),
                      CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart, children: [
                        CmNavItem(id: 'pipeline', label: 'Pipeline'),
                        CmNavItem(id: 'activity', label: 'Activity'),
                      ]),
                    ],
                  ),
                  bottomNavigation: CmBottomNavigation(
                    selectedId: _menu ? 'more' : _framePage,
                    onSelected: (i) => setState(() {
                      if (i.id == 'more') {
                        _menu = !_menu;
                      } else {
                        _framePage = i.id;
                        _menu = false;
                      }
                    }),
                    items: const [
                      CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
                      CmNavItem(id: 'leads', label: 'Leads', icon: CmIcons.user),
                      CmNavItem(id: 'deals', label: 'Deals', icon: CmIcons.handshake),
                      CmNavItem(id: 'more', label: 'More', icon: CmIcons.more),
                    ],
                  ),
                  mobileMenu: CmMobileMenu(
                    userName: 'Asha Rao',
                    userEmail: 'asha@commmerce.com',
                    selectedId: _framePage,
                    onSelected: (i) => setState(() {
                      _framePage = i.id;
                      _menu = false;
                    }),
                    sections: const [
                      CmMenuSection(label: 'Records', items: [
                        CmNavItem(id: 'inbox', label: 'Inbox', icon: CmIcons.inbox, badge: 'New'),
                        CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart),
                      ]),
                    ],
                  ),
                  menuOpen: _menu,
                  onMenuOpenChanged: (v) => setState(() => _menu = v),
                  body: SingleChildScrollView(
                    padding: const EdgeInsets.all(CmSpace.s20),
                    child: CmGrid(minColumnWidth: 200, children: [
                      CmMetric(label: 'Open leads', value: 1240, change: '+12%', trend: CmMetricTrend.up, hint: 'Page: $_framePage', onTap: () => _say('Open leads list')),
                      const CmMetric(label: 'Pipeline', value: 'Rs. 24.6 L', change: '-3 vs last week', trend: CmMetricTrend.down),
                    ]),
                  ),
                ),
              ),
            ),
          ),
          section('Global search', 'cm-global-search', description: 'Type "ra". Arrow keys move through the results, Enter opens one, Esc closes; press / to jump here.', Align(
            alignment: AlignmentDirectional.centerStart,
            child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 480), child: _globalSearch(controller: _query, shortcut: '/')),
          )),
          section('Metric', 'cm-metric', CmGrid(minColumnWidth: 220, children: [
            CmMetric(label: 'SMB leads', value: 1240000, change: '+12%', trend: CmMetricTrend.up, hint: '2 past demos need a result', onTap: () => _say('Open SMB leads')),
            const CmMetric(label: 'Refund requests', value: 38, change: '+5', trend: CmMetricTrend.up, sentiment: CmMetricSentiment.negative),
            const CmMetric(label: 'Win rate', value: '31%', change: '0%', trend: CmMetricTrend.flat, hint: 'Same as last month'),
            const CmMetric(label: 'Calls today', loading: true),
          ])),
          section('Timeline', 'cm-timeline', _timeline()),
          section('Button', 'cm-button', description: 'Icon-only buttons with a count, and tones for outcome choices (since 1.2).', Wrap(spacing: CmSpace.s10, runSpacing: CmSpace.s10, crossAxisAlignment: WrapCrossAlignment.center, children: [
            CmButton(label: 'Sale closed', icon: CmIcons.check, tone: CmButtonTone.success, onPressed: () => _say('Sale closed')),
            CmButton(label: 'Not interested', tone: CmButtonTone.critical, onPressed: () => _say('Not interested')),
            CmButton(label: 'Delete lead', tone: CmButtonTone.critical, variant: CmButtonVariant.primary, onPressed: () => _say('Delete lead')),
            CmButton(label: 'Inbox', icon: CmIcons.inbox, count: 7, onPressed: () => _say('Inbox')),
            CmButton.iconOnly(icon: CmIcons.chat, label: 'Messages', count: 120, onPressed: () => _say('Messages')),
            CmButton.iconOnly(icon: CmIcons.edit, label: 'Edit lead', size: CmButtonSize.slim, onPressed: () => _say('Edit lead')),
          ])),
          section('Empty state, inline', 'cm-empty-state size="inline"', CmEmptyState(
            inline: true,
            icon: CmIcons.tasks,
            heading: 'No open tasks.',
            message: 'Tasks for this lead show here.',
            actionLabel: 'Add task',
            onAction: () => _say('Add task'),
          )),
          section('Date picker with time', 'cm-date-picker time', ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: CmDatePicker(
              label: 'Follow up',
              time: true,
              step: 15,
              minNow: true,
              value: _followUp,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 365)),
              helpText: 'In 15-minute steps, from now on.',
              onChanged: (v) => setState(() => _followUp = v),
            ),
          )),
        ]),
      ),
    ]);
  }

  Widget _timeline() {
    final now = DateTime.now();
    final items = [
      CmTimelineItem(
        heading: 'Email sent: Quote for festive gift boxes',
        icon: CmIcons.mail,
        tone: CmTone.information,
        dateTime: now.subtract(const Duration(minutes: 12)),
        meta: 'by Rahul Kumar · to asha@raotextiles.in',
        badge: const CmBadge('Email', tone: CmTone.information),
        body: 'Hi Asha, following up on the quote for 40 cartons of the festive gift boxes. We can deliver by the 28th if you '
            'confirm by Friday. The price includes printing on two sides and GST. Let me know if you want samples first; we '
            'can send them to the Andheri office this week.',
        actions: [CmButton(label: 'Read email', size: CmButtonSize.slim, onPressed: () => _say('Read email'))],
      ),
      CmTimelineItem(heading: 'Call logged, 6 min', icon: CmIcons.phone, dateTime: now.subtract(const Duration(hours: 3)), meta: 'by Asha Rao', body: 'Interested in 40 cartons. Wants samples.'),
      CmTimelineItem(heading: 'Status changed to Qualified', icon: CmIcons.edit, tone: CmTone.success, dateTime: now.subtract(const Duration(days: 2))),
      CmTimelineItem(heading: 'Follow-up call', icon: CmIcons.clock, tone: CmTone.attention, dateTime: now.add(const Duration(hours: 4)), badge: const CmBadge('Due', tone: CmTone.attention)),
      for (var p = 0; p < _olderPages; p++)
        CmTimelineItem(heading: 'Lead created from the website form', icon: CmIcons.note, dateTime: now.subtract(Duration(days: 12 + p * 7))),
    ];
    return CmTimeline(
      label: 'Activity for Rao Textiles',
      items: items,
      hasMore: _hasMore,
      loading: _moreLoading,
      onLoadMore: () {
        setState(() => _moreLoading = true);
        Timer(const Duration(milliseconds: 500), () {
          if (!mounted) return;
          setState(() {
            _moreLoading = false;
            _olderPages++;
            _hasMore = _olderPages < 2;
          });
        });
      },
    );
  }
}
