import 'dart:async';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// Records the command palette finds, as an app's search API would return them.
const _leads = [
  ('Ravi Stores', 'Lead · Mumbai'),
  ('Rao Textiles Pvt Ltd', 'Account · Surat'),
  ('Asha Traders', 'Lead · Pune'),
  ('Café Mocha Franchise', 'Lead · Bengaluru'),
  ('Annapurna Foods', 'Account · Pune'),
];

/// Searches [_leads] after a short wait, like a server.
Future<List<CmCommandGroup>> searchExampleRecords(String q) async {
  await Future<void>.delayed(const Duration(milliseconds: 250));
  final hits = [
    for (final l in _leads)
      if (cmCommandMatches(CmCommandItem(title: l.$1, keywords: [l.$2]), q)) CmCommandItem(title: l.$1, description: l.$2, icon: CmIcons.users, value: l.$1),
  ];
  return [if (hits.isNotEmpty) CmCommandGroup(label: 'Leads and accounts', items: hits.take(4).toList(), total: hits.length, seeAll: true)];
}

/// The example's command palette: places to go and actions, records from [searchExampleRecords], recent items.
/// [onNavigate] moves the example to a page.
Future<CmCommandSelection?> openExamplePalette(BuildContext context, {required ValueChanged<String> onNavigate, VoidCallback? onNewLead}) {
  return showCmCommandPalette(
    context,
    placeholder: 'Search leads, accounts or run a command',
    recent: const [CmCommandItem(title: 'Ravi Stores', description: 'Lead · Mumbai', icon: CmIcons.users)],
    search: searchExampleRecords,
    actions: [
      CmCommandGroup(label: 'Actions', items: [
        CmCommandItem(title: 'New lead', icon: CmIcons.plus, shortcut: 'mod+shift+l', keywords: const ['create', 'add'], onRun: onNewLead),
        const CmCommandItem(title: 'Export accounts', keywords: ['download', 'csv']),
      ]),
      CmCommandGroup(label: 'Navigate', items: [
        CmCommandItem(title: 'Go to Dashboard', icon: CmIcons.home, shortcut: 'g d', onRun: () => onNavigate('dashboard')),
        CmCommandItem(title: 'Go to Orders', icon: CmIcons.bag, shortcut: 'g o', onRun: () => onNavigate('orders')),
        CmCommandItem(title: 'Go to Components', icon: CmIcons.apps, onRun: () => onNavigate('components')),
        CmCommandItem(title: 'Go to 1.7 additions', icon: CmIcons.check, onRun: () => onNavigate('release17')),
      ]),
    ],
  );
}

/// The 1.7 Flutter additions (web 1.6 and 1.7): command palette, undo toasts, data table tools, status tabs dropdown,
/// menu headings and shortcuts, combobox tags, file upload progress.
class Release17Page extends StatefulWidget {
  const Release17Page({super.key, this.onNavigate});

  /// Moves the example app to a page (from the palette's Navigate items).
  final ValueChanged<String>? onNavigate;

  @override
  State<Release17Page> createState() => _Release17PageState();
}

class _Lead {
  const _Lead(this.name, this.city, this.owner, this.value, this.stage);
  final String name, city, owner, value, stage;
}

const _allLeads = [
  _Lead('Ravi Stores', 'Mumbai', 'Kiran Shah', 'Rs. 85,000', 'Qualified'),
  _Lead('Asha Traders', 'Pune', 'Imran Ali', 'Rs. 42,000', 'New'),
  _Lead('Rao Textiles Pvt Ltd', 'Surat', 'Asha Rao', 'Rs. 2,40,000', 'Proposal'),
  _Lead('Café Mocha Franchise', 'Bengaluru', 'Neha Iyer', 'Rs. 1,10,000', 'New'),
];

class _Release17PageState extends State<Release17Page> {
  final _leads = [..._allLeads];
  String _note = '', _status = 'all';
  List<String> _tags = const ['vip', 'wholesale', 'repeat', 'festive'];
  List<CmPickedFile> _files = const [];
  final _upload = GlobalKey<CmFileUploadState>();
  List<CmDataTableColumn>? _columns;

  void _say(String msg) => setState(() => _note = msg);

  Future<void> _archive(_Lead lead) async {
    final at = _leads.indexOf(lead);
    final reason = await cmUndoable(
      context,
      () => setState(() => _leads.remove(lead)),
      () => setState(() => _leads.insert(at.clamp(0, _leads.length), lead)),
      message: '${lead.name} archived',
    );
    if (mounted) _say('Archive toast closed: ${reason.name}');
  }

  /// Simulates an upload: progress every 200ms; files named "fail…" stop at 60% with an error.
  void _uploadAll(List<CmPickedFile> files) {
    for (final f in files) {
      var pct = 0.0;
      Timer.periodic(const Duration(milliseconds: 200), (timer) {
        final s = _upload.currentState;
        if (s == null || !_files.contains(f)) return timer.cancel();
        pct += 20;
        if (f.name.startsWith('fail') && pct >= 60) {
          timer.cancel();
          s.setProgress(f, null);
          s.setFileError(f, 'Upload failed. Try again.');
        } else if (pct >= 100) {
          timer.cancel();
          s.setProgress(f, null);
        } else {
          s.setProgress(f, pct);
        }
      });
    }
  }

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
    final cols = _columns ??
        const [
          CmDataTableColumn(key: 'name', label: 'Lead', sortable: true, primary: true),
          CmDataTableColumn(key: 'city', label: 'City', priority: CmColumnPriority.low),
          CmDataTableColumn(key: 'owner', label: 'Owner', priority: CmColumnPriority.low),
          CmDataTableColumn(key: 'stage', label: 'Stage', visible: false),
          CmDataTableColumn(key: 'value', label: 'Value', type: CmDataColumnType.money, sortable: true),
          CmDataTableColumn(key: 'actions', label: 'Actions', type: CmDataColumnType.actions, actions: [
            CmDataTableAction(label: 'Edit', value: 'edit'),
            CmDataTableAction(label: 'Archive', value: 'archive', icon: CmIcons.trash, iconOnly: true, critical: true),
          ]),
        ];
    final rows = [
      for (final l in _leads) {'name': l.name, 'city': l.city, 'owner': l.owner, 'stage': l.stage, 'value': l.value},
    ];
    return CmPage(
      width: CmPageWidth.wide,
      header: CmPageHeader(
        title: '1.7 additions',
        description: 'Command palette, undo toasts and the 1.6 table, menu, tag and upload standard in Flutter.',
        actions: [
          CmButton(
            label: 'Command palette',
            icon: CmIcons.search,
            onPressed: () => openExamplePalette(context, onNavigate: (p) => widget.onNavigate?.call(p), onNewLead: () => _say('New lead')),
          ),
        ],
      ),
      child: CmLayout(children: [
        if (_note.isNotEmpty) CmLayoutSection(children: [CmBanner(message: _note, tone: CmTone.success, onDismiss: () => setState(() => _note = ''))]),
        _section(
          'Command palette',
          'Ctrl+K (⌘K on a Mac) anywhere in the example, or the button above. Type "new", "café" or "ravi": actions filter as you type, records arrive from an async search.',
          Wrap(spacing: CmSpace.s8, runSpacing: CmSpace.s8, crossAxisAlignment: WrapCrossAlignment.center, children: [
            CmButton(label: 'Open the palette', variant: CmButtonVariant.primary, onPressed: () async {
              final sel = await openExamplePalette(context, onNavigate: (p) => widget.onNavigate?.call(p), onNewLead: () => _say('New lead'));
              if (sel != null && mounted) _say('Chose ${sel.item?.title ?? 'See all ${sel.group.label}'}');
            }),
            const CmKeys('mod+k'),
          ]),
        ),
        _section(
          'Undo instead of confirm',
          'Archive runs at once; the toast offers Undo for 10 seconds (hover or focus pauses it). F6 moves focus to Undo and back.',
          Column(crossAxisAlignment: CrossAxisAlignment.stretch, spacing: CmSpace.s8, children: [
            for (final l in _leads)
              CmCard(
                variant: CmCardVariant.compact,
                child: Row(children: [
                  Expanded(child: Text('${l.name} · ${l.city}', style: CmType.bodyMd.copyWith(color: CmTheme.colorsOf(context).textDefault))),
                  CmButton(label: 'Archive', size: CmButtonSize.slim, semanticLabel: 'Archive ${l.name}', onPressed: () => _archive(l)),
                ]),
              ),
            if (_leads.isEmpty) const CmEmptyState(heading: 'No leads', small: true),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: CmButton(
                label: 'Show a toast with View',
                onPressed: () => showCmToast(context, 'Export ready', action: CmToastAction(label: 'View', onAction: () => _say('View export'))),
              ),
            ),
          ]),
        ),
        _section(
          'Data table tools',
          'Row actions on hover and focus (always on touch), drag or arrow keys on a heading edge to resize, Columns to show Stage. Narrow the window: City and Owner hide behind "View all fields".',
          CmDataTable(
            caption: 'Leads',
            captionHidden: true,
            columns: cols,
            rows: rows,
            resizable: true,
            columnPicker: true,
            mobile: CmDataTableMobile.priority,
            onColumnsChange: (c, _, _) => setState(() => _columns = c),
            onColumnResize: (k, w) => _say('$k is ${w.round()}px wide'),
            onRowAction: (a, r, i) => a == 'archive' ? _archive(_leads[i]) : _say('Edit ${r['name']}'),
          ),
        ),
        _section(
          'Status tabs, menu and tooltip',
          'Small status tabs for a card; a dropdown on phones. Menu sections with headings and shortcut hints; 36px rows.',
          Wrap(spacing: CmSpace.s24, runSpacing: CmSpace.s16, crossAxisAlignment: WrapCrossAlignment.center, children: [
            SizedBox(
              width: 360,
              child: CmStatusTabs(
                size: CmStatusTabsSize.small,
                mobile: CmStatusTabsMobile.select,
                value: _status,
                onChanged: (v) => setState(() => _status = v),
                tabs: const [CmStatusTab('all', 'All', count: 24), CmStatusTab('new', 'New', count: 9), CmStatusTab('won', 'Won', count: 3)],
              ),
            ),
            CmActionMenu(
              label: 'Lead actions',
              onSelected: (i) => _say(i.label),
              items: const [
                CmMenuItem.heading('Lead'),
                CmMenuItem(label: 'Edit', icon: CmIcons.edit, shortcut: 'mod+e'),
                CmMenuItem(label: 'Duplicate', shortcut: 'mod+d'),
                CmMenuItem.divider(),
                CmMenuItem.heading('Danger zone'),
                CmMenuItem(label: 'Delete', critical: true, shortcut: 'Del'),
              ],
            ),
            CmTooltip(message: 'Tooltips are 12px, at most 240 wide, after 400ms', child: CmButton.iconOnly(icon: CmIcons.help, label: 'About tooltips', onPressed: () {})),
          ]),
        ),
        _section(
          'Combobox tags and file upload',
          'Tags are 24px; three show while the box is not focused, then "+N more". ← from the start of the box moves to the tags. Name a file "fail" to see a per-file error.',
          CmGrid(minColumnWidth: 300, children: [
            CmCombobox<String>(
              label: 'Tags',
              multiple: true,
              values: _tags,
              onValuesChanged: (v) => setState(() => _tags = v),
              options: const [
                CmSelectOption('vip', 'VIP'),
                CmSelectOption('wholesale', 'Wholesale'),
                CmSelectOption('repeat', 'Repeat buyer'),
                CmSelectOption('festive', 'Festive'),
                CmSelectOption('b2b', 'B2B'),
              ],
            ),
            CmFileUpload(
              key: _upload,
              label: 'Invoices',
              hint: 'PDF or images, up to 2 MB',
              multiple: true,
              files: _files,
              onChanged: (f) {
                final added = f.where((x) => !_files.contains(x)).toList();
                setState(() => _files = f);
                _uploadAll(added);
              },
              onCancel: (f) => _say('Cancelled ${f.name}'),
              onPick: () async => [
                CmPickedFile(name: 'invoice-${_files.length + 1}.pdf', size: 240 * 1024, mimeType: 'application/pdf'),
                if (_files.isEmpty) const CmPickedFile(name: 'fail-scan.pdf', size: 90 * 1024, mimeType: 'application/pdf'),
              ],
            ),
          ]),
        ),
      ]),
    );
  }
}
