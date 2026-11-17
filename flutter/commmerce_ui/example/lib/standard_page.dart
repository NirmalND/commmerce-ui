import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// The owner standard (1.6) with CRM content: card variants, the segmented control, density for lists and tables,
/// the cards layout of a table on phones, the compact empty state, status tabs with counts and the panel frame.
class StandardPage extends StatefulWidget {
  const StandardPage({super.key});
  @override
  State<StandardPage> createState() => _StandardPageState();
}

class _Account {
  const _Account(this.name, this.owner, this.city, this.renewal, this.value);
  final String name, owner, city, renewal, value;
}

const _accounts = [
  _Account('Rao Textiles Pvt Ltd', 'Asha Rao', 'Surat', '12 Dec 2026', 'Rs. 2,40,000'),
  _Account('Ravi Stores', 'Kiran Shah', 'Mumbai', '3 Jan 2027', 'Rs. 85,000'),
  _Account('Annapurna Foods and Catering Services (Western Region Franchise)', 'Imran Ali', 'Pune', '20 Jan 2027', 'Rs. 1,12,500'),
];

class _StandardPageState extends State<StandardPage> {
  String _view = 'list', _status = 'all', _selected = 'Rao Textiles Pvt Ltd', _note = '';
  CmDensity _density = CmDensity.comfortable;
  Set<String> _picked = {};

  void _say(String msg) => setState(() => _note = msg);

  /// A page section: an 18/26 section heading (owner standard) and a 13px description, 16 above the content.
  CmLayoutSection _section(String title, String description, Widget child) => CmLayoutSection(children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, spacing: CmSpace.s4, children: [
          Semantics(header: true, child: Text(title, style: CmText.of(context).headingSection.copyWith(color: CmTheme.colorsOf(context).textDefault))),
          Text(description, style: CmType.bodySm.copyWith(color: CmTheme.colorsOf(context).textTertiary)),
          const SizedBox(height: CmSpace.s12),
          child,
        ]),
      ]);

  @override
  Widget build(BuildContext context) {
    final compact = _density == CmDensity.compact;
    return CmPage(
      width: CmPageWidth.wide,
      header: CmPageHeader(
        title: 'Accounts',
        description: 'Renewals, owners and health for every account. Owner standard, 1.6.',
        adornment: const CmBadge('3 at risk', tone: CmTone.critical),
        breadcrumbs: const [CmBreadcrumb('CRM')],
        actions: [CmButton(label: 'Export', onPressed: () => _say('Export started')), CmButton(label: 'Add account', variant: CmButtonVariant.primary, onPressed: () => _say('Add account'))],
      ),
      child: CmLayout(children: [
        if (_note.isNotEmpty) CmLayoutSection(children: [CmBanner(message: _note, tone: CmTone.success, onDismiss: () => setState(() => _note = ''))]),
        _section(
          'Card variants',
          'Standard (24 padding), compact (16) and interactive (the whole card is one button, with hover, pressed, focus and selected).',
          CmGrid(minColumnWidth: 260, children: [
            CmCard(heading: 'Standard', description: 'Settings, forms, details.', child: const Text('24px padding, 16px under the header, flat with a subtle border.')),
            const CmCard(heading: 'Renewals due', variant: CmCardVariant.compact, child: CmMetric(label: 'This month', value: '14')),
            for (final a in _accounts.take(2))
              CmCard.interactive(
                heading: a.name,
                description: '${a.city} · ${a.owner}',
                selected: _selected == a.name,
                onPressed: () => setState(() => _selected = a.name),
                adornment: const CmBadge('Renewal'),
                child: Text('Renews ${a.renewal} · ${a.value}'),
              ),
          ]),
        ),
        _section(
          'Segmented control and density',
          'Switch the view; compact rows are 40 tall, comfortable rows 56 (lists) or 48 (tables).',
          CmCard(
            heading: 'Accounts',
            actions: [
              CmSegmentedControl<String>(
                semanticLabel: 'View',
                small: true,
                options: const [CmRadioOption(value: 'list', label: 'List'), CmRadioOption(value: 'table', label: 'Table'), CmRadioOption(value: 'cards', label: 'Cards')],
                value: _view,
                onChanged: (v) => setState(() => _view = v),
              ),
              CmSegmentedControl<CmDensity>(
                semanticLabel: 'Density',
                small: true,
                options: const [CmRadioOption(value: CmDensity.comfortable, label: 'Comfortable'), CmRadioOption(value: CmDensity.compact, label: 'Compact')],
                value: _density,
                onChanged: (v) => setState(() => _density = v),
              ),
            ],
            flush: _view == 'list',
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Padding(
                padding: EdgeInsets.symmetric(horizontal: _view == 'list' ? CmSpace.s16 : 0, vertical: CmSpace.s8),
                child: CmStatusTabs(
                  tabs: const [CmStatusTab('all', 'All', count: 3), CmStatusTab('risk', 'At risk', count: 1), CmStatusTab('renewing', 'Renewing', count: 2), CmStatusTab('churned', 'Churned', count: 0)],
                  value: _status,
                  onChanged: (v) => setState(() => _status = v),
                ),
              ),
              if (_view == 'list')
                CmResourceList(
                  density: _density,
                  resourceName: 'account',
                  selected: _picked,
                  onSelectionChanged: (s) => setState(() => _picked = s),
                  bulkActions: [CmButton(label: 'Assign owner', size: CmButtonSize.slim, onPressed: () => _say('Assign owner to ${_picked.length}'))],
                  items: [
                    for (final a in _accounts)
                      CmResourceItem(
                        id: a.name,
                        semanticLabel: a.name,
                        media: compact ? null : const CmAvatar(name: 'RT'),
                        child: Text('${a.name} · ${a.city}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        actions: [CmButton(label: 'Call', size: CmButtonSize.slim, onPressed: () => _say('Calling ${a.owner}')), CmButton(label: 'Open', size: CmButtonSize.slim, onPressed: () => _say('Open ${a.name}'))],
                      ),
                  ],
                )
              else
                CmDataTable(
                  caption: 'Accounts',
                  captionHidden: true,
                  density: _density,
                  // "Cards" forces the cards layout by narrowing the table; on phones it switches by itself.
                  mobile: CmDataTableMobile.cards,
                  columns: const [
                    CmDataTableColumn(key: 'name', label: 'Account', sortable: true),
                    CmDataTableColumn(key: 'owner', label: 'Owner'),
                    CmDataTableColumn(key: 'city', label: 'City'),
                    CmDataTableColumn(key: 'renewal', label: 'Renewal', type: CmDataColumnType.date),
                    CmDataTableColumn(key: 'value', label: 'Value', type: CmDataColumnType.money, sortable: true),
                  ],
                  rows: [for (final a in _accounts) {'name': a.name, 'owner': a.owner, 'city': a.city, 'renewal': a.renewal, 'value': a.value}],
                  totals: const {'name': 'Total', 'value': 'Rs. 4,37,500'},
                ),
            ]),
          ),
        ),
        if (_view == 'cards')
          _section(
            'Table as cards',
            'The same table, 360px wide: each row becomes a card (mobile: cards).',
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: SizedBox(
                width: 360,
                child: CmDataTable(
                  caption: 'Accounts',
                  mobile: CmDataTableMobile.cards,
                  columns: const [
                    CmDataTableColumn(key: 'name', label: 'Account'),
                    CmDataTableColumn(key: 'owner', label: 'Owner'),
                    CmDataTableColumn(key: 'value', label: 'Value', type: CmDataColumnType.money),
                  ],
                  rows: [for (final a in _accounts) {'name': a.name, 'owner': a.owner, 'value': a.value}],
                ),
              ),
            ),
          ),
        _section(
          'Empty states',
          'The compact default (a 48px tile) for cards and lists; large keeps the big circle for a whole empty page.',
          CmGrid(minColumnWidth: 300, children: [
            CmCard(child: CmEmptyState(heading: 'No tasks due', message: 'Tasks you add to an account show here.', icon: CmIcons.check, action: CmButton(label: 'Add task', onPressed: () => _say('Add task')))),
            CmCard(child: CmEmptyState(heading: 'No accounts yet', message: 'Accounts appear when a deal is won.', large: true, action: CmButton(label: 'Import accounts', variant: CmButtonVariant.primary, onPressed: () => _say('Import')))),
          ]),
        ),
        _section(
          'Panel frame',
          'CmAppFrame(panel: true): the page sits in a white rounded panel beside the side navigation (merchant dashboard look).',
          ClipRRect(
            borderRadius: BorderRadius.circular(CmRadius.md),
            child: SizedBox(
              height: 420,
              child: CmAppFrame(
                panel: true,
                header: Container(height: 56, alignment: AlignmentDirectional.centerStart, padding: const EdgeInsets.symmetric(horizontal: CmSpace.s20), child: const Text('Header bar')),
                navigation: CmSideNav(
                  items: const [
                    CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
                    CmNavItem(id: 'accounts', label: 'Accounts', icon: CmIcons.users, count: 3),
                    CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart),
                  ],
                  selectedId: 'accounts',
                  onSelected: (_) {},
                ),
                bottomNavigation: CmBottomNavigation(
                  items: const [CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home), CmNavItem(id: 'accounts', label: 'Accounts', icon: CmIcons.users)],
                  selectedId: 'accounts',
                  onSelected: (_) {},
                ),
                body: const CmPage(
                  width: CmPageWidth.detail,
                  header: CmPageHeader(title: 'Rao Textiles', description: 'Account since 2023'),
                  child: CmCard(heading: 'Details', variant: CmCardVariant.compact, child: Text('The page drops its grey background inside the panel.')),
                ),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}
