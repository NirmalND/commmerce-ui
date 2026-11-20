import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// The record page pattern (web 1.7, docs Patterns > Record page) with a CRM lead: a page header with a back arrow
/// to the leads list, the status badge and the meta line; a [CmRecordLayout] with tabs over the activity timeline and
/// the related deals and tasks in the main column, and the Details, Owner and Tags cards in a sticky aside.
///
/// From 880 of the layout's own width the aside is a 320 column on the end side; narrower it stacks above the
/// activity, so the key facts come first.
class RecordPage extends StatefulWidget {
  const RecordPage({super.key, this.onBack, this.now});

  /// Goes back to the leads list.
  final VoidCallback? onBack;

  /// "Now" for the relative times in the timeline (tests pass a fixed date).
  final DateTime? now;

  @override
  State<RecordPage> createState() => _RecordPageState();
}

class _Activity {
  const _Activity(this.icon, this.tone, this.heading, this.at, this.meta, {this.badge, this.body, this.email = false});
  final String icon, heading, meta;
  final CmTone tone;
  final DateTime at;
  final String? badge, body;
  final bool email;
}

final _activity = [
  _Activity(CmIcons.mail, CmTone.information, 'Quote for 200 cotton tote bags', DateTime(2026, 11, 16, 11, 20), 'by Ravi Kumar · sent',
      badge: 'Email', email: true, body: 'Hi Asha, here is the quote for 200 printed cotton tote bags. Prices include GST and delivery to Bengaluru.'),
  _Activity(CmIcons.phone, CmTone.success, 'Call: discussed bulk pricing', DateTime(2026, 11, 15, 16, 5), 'by Ravi Kumar · outgoing · 12 min',
      badge: 'Call', body: 'Needs 200 bags by 5 December for a store opening.'),
  _Activity(CmIcons.check, CmTone.success, 'Task done: send the catalogue', DateTime(2026, 11, 14, 12, 30), 'by Ravi Kumar'),
  _Activity(CmIcons.mail, CmTone.neutral, 'Welcome email opened', DateTime(2026, 11, 13, 9, 40), 'by Asha Rao · 2 times', email: true),
  _Activity(CmIcons.note, CmTone.neutral, 'Note: prefers WhatsApp for quick questions', DateTime(2026, 11, 12, 19, 10), 'by Ravi Kumar',
      body: 'Asked for samples of the natural and black cotton before confirming the colour.'),
  _Activity(CmIcons.note, CmTone.neutral, 'Lead created from the website form', DateTime(2026, 11, 12, 18, 2), 'System'),
];

class _RecordPageState extends State<RecordPage> {
  String _tab = 'overview';

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final shown = _tab == 'emails' ? _activity.where((a) => a.email).toList() : _activity;
    final emails = _activity.where((a) => a.email).length;
    return CmPage(
      header: CmPageHeader(
        title: 'Asha Rao',
        onBack: widget.onBack ?? () {},
        backLabel: 'Leads',
        adornment: const CmBadge('Qualified', tone: CmTone.attention),
        description: 'Owner Ravi Kumar · Created 12 Nov 2026 · Source Website form',
        actions: [
          CmButton(label: 'Log call', onPressed: () {}),
          CmButton(label: 'Convert', variant: CmButtonVariant.primary, onPressed: () {}),
        ],
      ),
      child: CmRecordLayout(
        stickyAside: true,
        // Key facts: phones show them first (CmAsidePosition.above, the default).
        aside: [
          CmInfoPanel(
            heading: 'Details',
            variant: CmCardVariant.compact,
            layout: CmInfoLayout.rows,
            action: 'Edit',
            onAction: () {},
            items: const [
              CmInfoItem('Email', Text('asha@raotextiles.in')),
              CmInfoItem('Phone', Text('+91 98450 12345')),
              CmInfoItem('Company', Text('Rao Textiles')),
              CmInfoItem('City', Text('Bengaluru')),
              CmInfoItem('Lead source', Text('Website form')),
              CmInfoItem('Deal value', Text('Rs. 1,80,000')),
            ],
          ),
          CmCard(
            heading: 'Owner',
            variant: CmCardVariant.compact,
            actions: [CmButton(label: 'Change', size: CmButtonSize.slim, onPressed: () {})],
            child: Row(spacing: CmSpace.s8, children: [
              const CmAvatar(name: 'Ravi Kumar', size: CmAvatarSize.small, decorative: true),
              Text('Ravi Kumar', style: CmType.bodyMd.copyWith(color: c.textDefault)),
            ]),
          ),
          CmCard(
            heading: 'Tags',
            variant: CmCardVariant.compact,
            actions: [CmButton(label: 'Add', size: CmButtonSize.slim, onPressed: () {})],
            child: const Wrap(spacing: CmSpace.s8, runSpacing: CmSpace.s8, children: [CmTag('Wholesale'), CmTag('Bengaluru'), CmTag('Diwali 2026')]),
          ),
        ],
        main: [
          CmCard(
            variant: CmCardVariant.compact,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              CmStatusTabs(
                semanticLabel: 'Activity filter',
                value: _tab,
                onChanged: (v) => setState(() => _tab = v),
                tabs: [
                  const CmStatusTab('overview', 'Overview'),
                  CmStatusTab('activity', 'Activity', count: _activity.length),
                  CmStatusTab('emails', 'Emails', count: emails),
                ],
              ),
              const SizedBox(height: CmSpace.s16),
              CmTimeline(
                label: 'Activity for Asha Rao',
                items: [
                  for (final a in shown)
                    CmTimelineItem(
                      key: ValueKey(a.heading),
                      icon: a.icon,
                      tone: a.tone,
                      heading: a.heading,
                      dateTime: a.at,
                      meta: a.meta,
                      badge: a.badge == null ? null : CmBadge(a.badge!, tone: a.tone),
                      body: a.body,
                      now: widget.now,
                    ),
                ],
              ),
            ]),
          ),
          CmCard(
            heading: 'Deals',
            variant: CmCardVariant.compact,
            actions: [CmButton(label: 'Add deal', size: CmButtonSize.slim, onPressed: () {})],
            child: const CmEmptyState(inline: true, icon: CmIcons.handshake, heading: 'No deals yet', message: 'Convert the lead or add a deal to track the order value.'),
          ),
          CmCard(
            heading: 'Tasks',
            variant: CmCardVariant.compact,
            actions: [CmButton(label: 'Add task', size: CmButtonSize.slim, onPressed: () {})],
            child: const CmEmptyState(inline: true, icon: CmIcons.tasks, heading: 'No open tasks', message: 'Follow-ups you schedule appear here.'),
          ),
        ],
      ),
    );
  }
}
