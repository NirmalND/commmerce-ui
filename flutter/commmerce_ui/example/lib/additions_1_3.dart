import 'dart:typed_data';

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// The 1.3 additions with realistic Commmerce CRM content, one card each, as on the components page.
class Additions13 extends StatefulWidget {
  const Additions13({super.key, this.onAction});

  /// Reports an action to the page (it shows a banner and a snack bar).
  final ValueChanged<String>? onAction;

  @override
  State<Additions13> createState() => _Additions13State();
}

class _Lead {
  const _Lead(this.name, this.owner, this.city, this.grade);
  final String name, owner, city, grade;
}

class _Additions13State extends State<Additions13> {
  final _board = GlobalKey<CmBoardState>();
  final Map<String, List<_Lead>> _pipeline = {
    'new': const [_Lead('Ravi Stores', 'Asha Rao', 'Bengaluru', 'A'), _Lead('Meera Textiles', 'Kiran Shah', 'Surat', 'B')],
    'contacted': const [_Lead('Annapurna Foods', 'Asha Rao', 'Pune', 'A'), _Lead('Blue Lotus Spa', 'Imran Ali', 'Kochi', 'C')],
    'demo': const [_Lead('Kumar Electricals', 'Kiran Shah', 'Chennai', 'B')],
    'won': const [],
    'lost': const [],
  };
  final _more = <String, int>{'contacted': 3};
  final _loading = <String>{};
  bool _failNext = false;

  String _color = '#3c7c00';
  List<CmPickedFile> _shopFront = [];
  String _outcome = 'won';
  String? _field = 'deal-company';
  String? _comboField;
  final Map<String, List<String>> _form = {
    'Contact': ['Name', 'Phone', 'Email'],
    'Business': ['GSTIN', 'City'],
    'Notes': [],
  };

  void _say(String msg) => widget.onAction?.call(msg);

  Widget _section(String title, String web, Widget child, {String? description}) => Padding(
        padding: const EdgeInsets.only(bottom: CmSpace.s20),
        child: CmCard(heading: title, description: description ?? 'Mirrors <$web>.', child: child),
      );

  static const _headings = {'new': 'New', 'contacted': 'Contacted', 'demo': 'Demo booked', 'won': 'Won', 'lost': 'Lost'};

  Future<bool> _save(CmBoardMove m) async {
    // A pretend save: the card shows as saving, then the data moves (or, after "Fail the next save", goes back).
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return false;
    if (_failNext) {
      setState(() => _failNext = false);
      _say('Couldn\'t save the move of ${m.card.heading}');
      return false;
    }
    setState(() {
      final lead = _pipeline[m.from]!.firstWhere((l) => l.name == m.cardId);
      final from = [..._pipeline[m.from]!]..remove(lead);
      _pipeline[m.from] = from;
      final to = m.from == m.to ? from : [..._pipeline[m.to]!];
      _pipeline[m.to] = to..insert(m.toIndex, lead);
    });
    return true;
  }

  Future<void> _loadMore(String column) async {
    setState(() => _loading.add(column));
    await Future<void>.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() {
      _loading.remove(column);
      _pipeline[column] = [..._pipeline[column]!, const _Lead('Sai Opticals', 'Imran Ali', 'Mysuru', 'B'), const _Lead('Green Leaf Cafe', 'Asha Rao', 'Goa', 'A'), const _Lead('Shree Hardware', 'Kiran Shah', 'Nagpur', 'C')];
      _more.remove(column);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _section(
        'Board',
        'cm-board',
        description: 'Mirrors <cm-board>. Drag a card (press and hold on touch), or focus it and press Space, the arrow keys, then Space. Each move is saved for a second; Lost refuses cards graded A.',
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: CmSpace.s10, runSpacing: CmSpace.s10, children: [
            CmButton(label: _failNext ? 'The next save will fail' : 'Fail the next save', onPressed: () => setState(() => _failNext = !_failNext)),
            CmButton(label: 'Move Ravi Stores to Won', onPressed: () => _board.currentState?.moveCard('Ravi Stores', 'won')),
          ]),
          const SizedBox(height: CmSpace.s15),
          SizedBox(
            height: 460,
            child: CmBoard(
              key: _board,
              label: 'Leads by status',
              hideEmpty: true,
              onLoadMore: _loadMore,
              onMove: (m) {
                final lead = _pipeline[m.from]!.firstWhere((l) => l.name == m.cardId);
                if (m.to == 'lost' && lead.grade == 'A') return false;
                return _save(m);
              },
              columns: [
                for (final e in _pipeline.entries)
                  CmBoardColumn(
                    id: e.key,
                    heading: _headings[e.key]!,
                    total: _more.containsKey(e.key) ? e.value.length + _more[e.key]! : null,
                    loading: _loading.contains(e.key),
                    cards: [
                      for (final l in e.value)
                        CmBoardCard(
                          id: l.name,
                          heading: l.name,
                          onOpen: () => _say('Open ${l.name}'),
                          lines: [Text(l.owner), Text(l.city)],
                          badges: [CmBadge('Grade ${l.grade}', tone: l.grade == 'A' ? CmTone.success : CmTone.neutral)],
                          avatar: CmAvatar(name: l.owner, size: CmAvatarSize.small, decorative: true),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ]),
      ),
      _section(
        'Colour field',
        'cm-color-field',
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: CmColorField(
            label: 'Status colour',
            hint: 'shown on the status tag',
            helpText: 'Pick a swatch or type a hex code.',
            value: _color,
            onChanged: (v) => setState(() => _color = v),
          ),
        ),
      ),
      _section(
        'File upload, photo',
        'cm-file-upload variant="photo"',
        description: 'Mirrors <cm-file-upload variant="photo">. Your app takes the photo in onPick (for example with image_picker); this demo makes a placeholder image.',
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: CmFileUpload(
            variant: CmFileUploadVariant.photo,
            label: 'Shop front',
            hint: 'The board and the entrance',
            files: _shopFront,
            onPick: () async => [CmPickedFile(name: 'shop-front.png', size: _photo.length, mimeType: 'image/png', image: MemoryImage(_photo))],
            onChanged: (f) => setState(() => _shopFront = f),
          ),
        ),
      ),
      _section(
        'Option group tones',
        'cm-option-group',
        CmOptionGroup<String>(
          label: 'Call outcome',
          value: _outcome,
          onChanged: (v) => setState(() => _outcome = v),
          options: const [
            CmRadioOption(value: 'won', label: 'Signed up', tone: CmTone.success),
            CmRadioOption(value: 'later', label: 'Call back later'),
            CmRadioOption(value: 'lost', label: 'Not interested', tone: CmTone.critical),
          ],
        ),
      ),
      _section(
        'Select and combobox with option groups',
        'cm-select',
        description: 'Mirrors option groups in <cm-select> and <cm-combobox>, with showGroup ("Deal: Company").',
        Wrap(spacing: CmSpace.s30, runSpacing: CmSpace.s20, children: [
          SizedBox(
            width: 300,
            child: CmSelect<String>(label: 'Merge field', showGroup: true, options: _fields, value: _field, onChanged: (v) => setState(() => _field = v)),
          ),
          SizedBox(
            width: 300,
            child: CmCombobox<String>(label: 'Search fields', placeholder: 'Type a field', showGroup: true, options: _fields, value: _comboField, onChanged: (v) => setState(() => _comboField = v)),
          ),
        ]),
      ),
      _section(
        'Nested lists that share a group',
        'cm-nested-list group',
        description: 'Mirrors <cm-nested-list group>. Drag a handle into another section, or press up on the first row or down on the last.',
        Column(children: [
          for (final e in _form.entries)
            Padding(
              padding: const EdgeInsets.only(bottom: CmSpace.s15),
              child: CmNestedList(
                heading: e.key,
                group: 'lead-form',
                sortable: true,
                items: [for (final f in e.value) CmNestedItem(id: f, label: f)],
                onReorder: (_, from, to) => setState(() => e.value.insert(to, e.value.removeAt(from))),
                onMove: (m) {
                  setState(() {
                    _form[m.fromList]!.removeAt(m.from);
                    _form[m.toList]!.insert(m.to, m.item.id);
                  });
                  return true;
                },
              ),
            ),
        ]),
      ),
      _section(
        'Card actions without a heading',
        'cm-card',
        CmCard(
          actions: [CmButton(label: 'Edit', size: CmButtonSize.slim, onPressed: () => _say('Edit note'))],
          child: Text('Visited on 14 Nov. The owner wants a demo of the billing app next week.', style: CmType.bodyMd.copyWith(color: CmTheme.colorsOf(context).textDefault)),
        ),
      ),
    ]);
  }

  static const _fields = [
    CmSelectOption('lead-name', 'Name', group: 'Lead'),
    CmSelectOption('lead-company', 'Company', group: 'Lead'),
    CmSelectOption('lead-phone', 'Phone', group: 'Lead'),
    CmSelectOption('deal-name', 'Deal name', group: 'Deal'),
    CmSelectOption('deal-company', 'Company', group: 'Deal'),
    CmSelectOption('deal-value', 'Value', group: 'Deal'),
  ];

  /// An 8x6 placeholder photo (PNG, a blue gradient), standing in for the camera.
  static final _photo = Uint8List.fromList(const [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x06,
    0x08, 0x06, 0x00, 0x00, 0x00, 0xFE, 0x05, 0xDF, 0xFB, 0x00, 0x00, 0x00, 0x5A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x15, 0xCA, 0x31, 0x0D, 0xC3,
    0x40, 0x0C, 0x00, 0xC0, 0x20, 0x0A, 0x86, 0x72, 0x78, 0x0E, 0x5E, 0x3B, 0x5B, 0x2A, 0x81, 0xC8, 0x00, 0xB2, 0x79, 0xCA, 0x5E, 0x19, 0x61, 0x7B,
    0x3F, 0xDC, 0x76, 0xC7, 0xF9, 0xFE, 0xFE, 0x5E, 0x2C, 0x82, 0xA4, 0x68, 0x86, 0xE3, 0xFC, 0x08, 0x2C, 0x82, 0xA4, 0x68, 0xE6, 0xB3, 0xC3, 0x25,
    0xB0, 0x08, 0x92, 0xA2, 0x99, 0x6B, 0x87, 0x5B, 0x60, 0x11, 0x24, 0x45, 0x33, 0xF7, 0x0E, 0x8F, 0xC0, 0x22, 0x48, 0x8A, 0x66, 0x9E, 0x1D, 0x46,
    0x60, 0x11, 0x24, 0x45, 0x33, 0xFC, 0x01, 0x4F, 0x2C, 0x80, 0x7D, 0xF3, 0x37, 0x4A, 0xDE, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82,
  ]);
}
