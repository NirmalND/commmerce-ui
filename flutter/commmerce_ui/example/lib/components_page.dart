import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

import 'additions_1_3.dart';

/// Every newer widget with realistic Commmerce content, one card each.
class ComponentsPage extends StatefulWidget {
  const ComponentsPage({super.key});
  @override
  State<ComponentsPage> createState() => _ComponentsPageState();
}

class _Product {
  const _Product(this.name, this.sku, this.price, this.stock);
  final String name, sku;
  final int price, stock;
}

const _products = [
  _Product('Cotton kurta, indigo', 'KUR-IND-M', 1299, 42),
  _Product('Banarasi silk saree', 'SAR-BAN-01', 8499, 6),
  _Product('Handloom dupatta', 'DUP-HL-RED', 749, 0),
  _Product('Block-print bedsheet', 'BED-BP-DBL', 1899, 18),
];

String _rs(int n) {
  // Indian digit grouping: 1,23,456.
  final s = n.toString();
  if (s.length <= 3) return 'Rs. $s';
  final last3 = s.substring(s.length - 3);
  var rest = s.substring(0, s.length - 3);
  final parts = <String>[];
  while (rest.length > 2) {
    parts.insert(0, rest.substring(rest.length - 2));
    rest = rest.substring(0, rest.length - 2);
  }
  if (rest.isNotEmpty) parts.insert(0, rest);
  return 'Rs. ${parts.join(',')},$last3';
}

class _ComponentsPageState extends State<ComponentsPage> {
  String _offerType = 'orders', _linkTab = 'details', _bottom = 'home', _sortKey = 'name', _note = '';
  CmSortDirection _sortDir = CmSortDirection.ascending;
  Set<String> _picked = {};
  DateTime? _shipBy = DateTime.now().add(const Duration(days: 2));
  DateTimeRange? _orderRange;
  List<String> _productTags = ['cotton', 'festive'];
  var _tagOptions = const [
    CmSelectOption('cotton', 'Cotton'),
    CmSelectOption('festive', 'Festive'),
    CmSelectOption('handmade', 'Handmade'),
    CmSelectOption('summer', 'Summer'),
    CmSelectOption('sale', 'Sale'),
  ];
  List<CmPickedFile> _images = [];
  List<CmPickedFile> _gst = [];
  var _menu = ['Home', 'Shop', 'Festive offers', 'Contact us'];
  var _shop = ['Kurtas', 'Sarees', 'Dupattas'];
  final _comments = <CmComment>[
    CmComment(text: 'Customer asked for gift wrap and a handwritten note.', author: 'Robinson Jain', dateTime: DateTime(2026, 11, 13, 16, 24)),
    const CmComment(text: 'Payment of Rs. 2,340 captured by Razorpay.', author: 'System', time: '13 Nov 2026, 4:20 pm'),
  ];

  void _say(String msg) {
    setState(() => _note = msg);
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(msg), duration: const Duration(seconds: 2)));
  }

  Widget _section(String title, String web, Widget child, {String? description}) => Padding(
        padding: const EdgeInsets.only(bottom: CmSpace.s20),
        child: CmCard(heading: title, description: description ?? 'Mirrors <$web>.', child: child),
      );

  /// A phone-width frame, for widgets that only exist on phones.
  Widget _phone(Widget child) => Align(
        alignment: Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 414),
          child: ClipRRect(borderRadius: BorderRadius.circular(CmRadius.lg), child: child),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final sorted = [..._products]..sort((a, b) {
        final r = switch (_sortKey) { 'price' => a.price.compareTo(b.price), 'stock' => a.stock.compareTo(b.stock), _ => a.name.compareTo(b.name) };
        return _sortDir == CmSortDirection.ascending ? r : -r;
      });
    final cols = phone
        ? const [
            CmTableColumn(key: 'name', label: 'Product', sortable: true, flex: 3),
            CmTableColumn(key: 'price', label: 'Price', sortable: true, align: TextAlign.end, flex: 2),
          ]
        : const [
            CmTableColumn(key: 'name', label: 'Product', sortable: true, flex: 3),
            CmTableColumn(key: 'sku', label: 'SKU', flex: 2),
            CmTableColumn(key: 'price', label: 'Selling price', sortable: true, align: TextAlign.end, flex: 2),
            CmTableColumn(key: 'stock', label: 'Stock', sortable: true, align: TextAlign.end),
          ];
    return Column(children: [
      const CmFlashOfferBar(
        message: 'Festive sale: 20% off annual plans until 30 November. ',
        linkText: 'See plans',
        onLinkTap: _noop,
        onDismiss: _noop,
      ),
      const CmPageHeader(title: 'Components', breadcrumbs: [CmBreadcrumb('Dashboard')]),
      Expanded(
        child: ListView(padding: EdgeInsets.all(phone ? CmSpace.s16 : CmSpace.s20), children: [
          if (_note.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: CmSpace.s20), child: CmBanner(tone: CmTone.information, message: 'Last action: $_note')),
          Additions13(onAction: _say),
          _section('Link tabs', 'cm-link-tabs', CmLinkTabs(
            semanticLabel: 'Product sections',
            selectedId: _linkTab,
            onSelected: (t) => setState(() => _linkTab = t.id),
            tabs: const [
              CmNavItem(id: 'details', label: 'Details'),
              CmNavItem(id: 'variants', label: 'Variants', count: 6),
              CmNavItem(id: 'inventory', label: 'Inventory'),
              CmNavItem(id: 'shipping', label: 'Shipping'),
              CmNavItem(id: 'seo', label: 'Search listing'),
            ],
          )),
          _section('Date picker', 'cm-date-picker', ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: CmDatePicker(
              label: 'Ship by',
              value: _shipBy,
              firstDate: DateUtils.dateOnly(DateTime.now()),
              lastDate: DateTime.now().add(const Duration(days: 90)),
              selectableDayPredicate: (d) => d.weekday != DateTime.sunday,
              helpText: 'Couriers don\'t collect on Sundays',
              onChanged: (d) => setState(() => _shipBy = d),
            ),
          )),
          _section('Date range picker', 'cm-date-range-picker', ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: CmDateRangePicker(
              label: 'Order date',
              value: _orderRange,
              firstDate: DateTime(DateTime.now().year - 2),
              lastDate: DateUtils.dateOnly(DateTime.now()),
              presets: CmDateRangePreset.standard,
              helpText: 'Shows orders placed between these dates',
              onChanged: (r) => setState(() => _orderRange = r),
            ),
          ), description: 'Mirrors <cm-date-range-picker>: an orders date filter with preset ranges.'),
          _section('Combobox', 'cm-combobox', ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: CmCombobox<String>(
              label: 'Tags',
              placeholder: 'Find or create tags',
              multiple: true,
              allowCustom: true,
              options: _tagOptions,
              values: _productTags,
              helpText: 'Customers can filter your store by tag',
              onValuesChanged: (v) => setState(() => _productTags = v),
              onCreate: (text) => setState(() {
                final id = text.toLowerCase();
                _tagOptions = [..._tagOptions, CmSelectOption(id, text)];
                _productTags = [..._productTags, id];
              }),
            ),
          ), description: 'Mirrors <cm-combobox multiple allow-custom>: product tags.'),
          _section('Option group', 'cm-option-group', CmOptionGroup<String>(
            label: 'Select offer type',
            required: true,
            value: _offerType,
            onChanged: (v) => setState(() => _offerType = v),
            options: const [
              CmRadioOption(value: 'orders', label: 'Orders over'),
              CmRadioOption(value: 'categories', label: 'Categories'),
              CmRadioOption(value: 'product', label: 'Specific product'),
              CmRadioOption(value: 'customer', label: 'Customer group'),
            ],
          )),
          _section(
            'File upload',
            'cm-file-upload',
            description: 'Mirrors <cm-file-upload>. The app opens its own picker; this demo hands over sample files.',
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              CmFileUpload(
                label: 'Add product images',
                hint: 'max. file size 300 KB',
                accept: const ['image/*'],
                multiple: true,
                maxFiles: 4,
                maxSize: 300 * 1024,
                files: _images,
                onChanged: (f) => setState(() => _images = f),
                onPick: () async => [
                  CmPickedFile(name: 'kurta-front-${_images.length + 1}.png', size: 180 * 1024, mimeType: 'image/png', image: const AssetImage('assets/wordmark-tm-black.png')),
                  if (_images.length == 1) const CmPickedFile(name: 'banner-diwali.jpg', size: 1200 * 1024, mimeType: 'image/jpeg'),
                ],
              ),
              const SizedBox(height: CmSpace.s32),
              CmFileUpload(
                label: 'GST certificate',
                hint: 'pdf, max. 2 MB',
                accept: const ['.pdf'],
                maxSize: 2 * 1024 * 1024,
                files: _gst,
                onChanged: (f) => setState(() => _gst = f),
                onPick: () async => const [CmPickedFile(name: 'GST-27AAPFU0939F1ZV.pdf', size: 412 * 1024, mimeType: 'application/pdf')],
              ),
            ]),
          ),
          _section('Accordion', 'cm-accordion', const Column(children: [
            CmAccordion(heading: 'Found in 2 orders', child: Text('#1042 · 13 Nov 2026 · Rs. 2,340\n#1031 · 2 Nov 2026 · Rs. 899')),
            SizedBox(height: CmSpace.s8),
            CmAccordion(heading: 'Abandoned cart from 18 Oct', child: Text('3 items · Rs. 1,240 · Cotton kurta, Handloom dupatta')),
          ])),
          _section('Table header', 'cm-table-header', Container(
            decoration: BoxDecoration(border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.md)),
            child: Column(children: [
              CmTableHeader(
                columns: cols,
                sortKey: _sortKey,
                direction: _sortDir,
                onSort: (k, d) => setState(() { _sortKey = k; _sortDir = d; }),
                selectAll: _picked.isEmpty ? false : (_picked.length == _products.length ? true : null),
                onSelectAll: (v) => setState(() => _picked = v ? _products.map((p) => p.sku).toSet() : {}),
              ),
              for (final p in sorted)
                Container(
                  constraints: const BoxConstraints(minHeight: 48),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.borderSubtle))),
                  child: CmTableHeader.row(
                    columns: cols,
                    leading: SizedBox.square(
                      dimension: 20,
                      child: Checkbox(
                        value: _picked.contains(p.sku),
                        semanticLabel: 'Select ${p.name}',
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        side: BorderSide(color: c.borderStrong),
                        fillColor: WidgetStateProperty.all(c.bgSurface),
                        checkColor: c.textDefault,
                        onChanged: (v) => setState(() => v == true ? _picked.add(p.sku) : _picked.remove(p.sku)),
                      ),
                    ),
                    cells: [
                      Text(p.name, style: CmType.bodyMd.copyWith(color: c.textDefault)),
                      if (!phone) Text(p.sku, style: CmType.bodyMd.copyWith(color: c.textTertiary)),
                      Text(_rs(p.price), style: CmType.bodyMd.copyWith(color: c.textDefault)),
                      if (!phone) Text(p.stock == 0 ? 'Out of stock' : '${p.stock}', style: CmType.bodyMd.copyWith(color: p.stock == 0 ? c.textCritical : c.textDefault)),
                    ],
                  ),
                ),
            ]),
          )),
          _section('Nested list', 'cm-nested-list', CmNestedList(
            heading: 'Header menu',
            sortable: true,
            collapsible: true,
            actions: [CmButton(label: 'Add link', icon: CmIcons.plus, onPressed: () => _say('Add link'))],
            onReorder: (parent, from, to) => setState(() {
              final list = parent == null ? [..._menu] : [..._shop];
              list.insert(to, list.removeAt(from));
              parent == null ? _menu = list : _shop = list;
            }),
            items: [
              for (final l in _menu)
                CmNestedItem(
                  id: l,
                  label: l,
                  actions: [
                    if (l == 'Festive offers') const CmBadge('New', tone: CmTone.attention),
                    _IconAction(icon: CmIcons.edit, label: 'Edit $l', onTap: () => _say('Edit $l')),
                  ],
                  children: l == 'Shop' ? [for (final s in _shop) CmNestedItem(id: s, label: s)] : const [],
                ),
            ],
          )),
          _section('Report tiles', 'cm-report-tiles', CmReportTiles(heading: 'Sales', tiles: [
            CmReportTile(label: 'Hourly sales', icon: CmIcons.clock, pinned: true, onTap: () => _say('Hourly sales')),
            CmReportTile(label: 'Sales by date', icon: CmIcons.calendar, onTap: () => _say('Sales by date')),
            CmReportTile(label: 'Sales by payment', icon: CmIcons.wallet, onTap: () => _say('Sales by payment')),
            CmReportTile(label: 'Top products', icon: CmIcons.chart, onTap: () => _say('Top products')),
            CmReportTile(label: 'Sales by city', icon: CmIcons.pin, onTap: () => _say('Sales by city')),
          ])),
          _section('Smart tips', 'cm-smart-tips', ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: CmSmartTips(
              tourHeading: 'Take a tour of Commmerce',
              onTour: () => _say('Tour started'),
              tips: [
                CmSmartTip(heading: 'Shipping and delivery', description: 'Set rates for your city and the rest of India.', onTap: () => _say('Shipping and delivery')),
                CmSmartTip(heading: 'Importing and exporting products', description: 'Move your catalog in and out with a CSV file.', opensNewTab: true, onTap: () => _say('Importing products')),
                CmSmartTip(heading: 'GST invoices', description: 'Add your GSTIN so invoices show tax correctly.', onTap: () => _say('GST invoices')),
              ],
            ),
          )),
          _section('Comment', 'cm-comment-box', CmCommentBox(
            placeholder: 'Write a note for your team about order #1042',
            comments: _comments,
            onSubmit: (text) => setState(() => _comments.insert(0, CmComment(text: text, author: 'Demo user', dateTime: DateTime.now()))),
          )),
          _section('App card', 'cm-app-card', LayoutBuilder(builder: (context, box) {
            final w = box.maxWidth >= 700 ? (box.maxWidth - CmSpace.s20) / 2 : box.maxWidth;
            return Wrap(spacing: CmSpace.s20, runSpacing: CmSpace.s20, children: [
              SizedBox(width: w, child: CmAppCard(
                name: 'PayWise',
                logo: const _Logo('PayWise'),
                developer: 'PayWise Technologies',
                rating: 4.6,
                reviews: 1284,
                onReviewsTap: () => _say('PayWise reviews'),
                pricing: 'Free plan available. 7-day free trial.',
                offer: 'Bundle products and kits with Bundle Manager: 20% off',
                actions: [
                  CmButton(label: 'Sign Up', variant: CmButtonVariant.primary, onPressed: () => _say('Sign up to PayWise')),
                  CmButton(label: 'Contact', onPressed: () => _say('Contact PayWise')),
                ],
                onViewDetails: () => _say('PayWise details'),
              )),
              SizedBox(width: w, child: _InstalledApp(onSay: _say)),
            ]);
          })),
          _section('Action bar', 'cm-action-bar', Column(children: [
            CmActionBar(
              eyebrow: '#1042',
              adornment: const CmBadge('Paid', tone: CmTone.success),
              heading: 'Priya Sharma',
              actions: [
                CmButton(label: 'Print invoice', size: CmButtonSize.large, onPressed: () => _say('Print invoice')),
                CmButton(label: 'Fulfil order', size: CmButtonSize.large, variant: CmButtonVariant.primary, onPressed: () => _say('Fulfil order #1042')),
              ],
              child: Text('Amount payable: Rs. 2,340.00', style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: CmSpace.s20),
            CmActionBar(
              tone: CmTone.critical,
              heading: 'Add a pickup address before you can ship order #1042',
              actions: [CmButton(label: 'Add address', size: CmButtonSize.large, variant: CmButtonVariant.primary, onPressed: () => _say('Add address'))],
            ),
          ])),
          _section(
            'Bottom navigation and mobile menu',
            'cm-bottom-navigation',
            description: 'Mirrors <cm-bottom-navigation> and <cm-mobile-menu>. Admin chrome for phones: Commmerce products only, not for apps.',
            _phone(Container(
              color: c.bgPage,
              child: Column(children: [
                CmMobileMenu(
                  store: 'Obiroye Garments',
                  userName: 'Robinson Jain',
                  userEmail: 'robinson@example.com',
                  onStoreTap: () => _say('Switch store'),
                  onAccountTap: () => _say('Account'),
                  onSelected: (i) => _say(i.label),
                  sections: const [
                    CmMenuSection(label: 'Channels', items: [
                      CmNavItem(id: 'online-store', label: 'Online Store', icon: CmIcons.store),
                      CmNavItem(id: 'pos', label: 'Point of sale', icon: CmIcons.pos),
                      CmNavItem(id: 'ondc', label: 'ONDC', icon: CmIcons.globe),
                      CmNavItem(id: 'add-channel', label: 'Add channel', primary: true),
                    ]),
                    CmMenuSection(label: 'Panels', items: [
                      CmNavItem(id: 'customers', label: 'Customers', icon: CmIcons.users),
                      CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart),
                      CmNavItem(id: 'apps', label: 'Application', icon: CmIcons.apps, badge: '3 apps active'),
                    ]),
                    CmMenuSection(items: [
                      CmNavItem(id: 'settings', label: 'Settings', icon: CmIcons.settings, children: [
                        CmNavItem(id: 'shipping', label: 'Shipping'),
                        CmNavItem(id: 'tax', label: 'Tax'),
                        CmNavItem(id: 'domain', label: 'Domain Setup'),
                        CmNavItem(id: 'staff', label: 'Staff Management'),
                      ]),
                    ]),
                  ],
                ),
                CmBottomNavigation(
                  selectedId: _bottom,
                  onSelected: (i) => setState(() => _bottom = i.id),
                  items: const [
                    CmNavItem(id: 'home', label: 'Home', icon: CmIcons.home),
                    CmNavItem(id: 'products', label: 'Products', icon: CmIcons.box),
                    CmNavItem(id: 'add', label: 'Quick add', icon: CmIcons.plus, primary: true),
                    CmNavItem(id: 'orders', label: 'Orders', icon: CmIcons.bag),
                    CmNavItem(id: 'more', label: 'More', icon: CmIcons.more),
                  ],
                ),
              ]),
            )),
          ),
          _section(
            'Overlays',
            'cm-modal',
            description: 'Mirrors <cm-modal>, <cm-side-panel>, <cm-filter-panel>, <cm-action-menu>, <cm-bottom-sheet> and <cm-notification-panel>. '
                'Focus moves in and stays there, Esc closes, and focus returns here.',
            _Overlays(onSay: _say),
          ),
          _section(
            'Data table',
            'cm-data-table',
            description: 'Mirrors <cm-data-table>. Sort by price: amounts in Rs. sort by value. Narrow screens scroll sideways with the product column kept in view.',
            CmDataTable(
              caption: 'Stock by product',
              captionHidden: true,
              stickyFirstColumn: true,
              columns: const [
                CmDataTableColumn(key: 'name', label: 'Product', sortable: true),
                CmDataTableColumn(key: 'sku', label: 'SKU'),
                CmDataTableColumn(key: 'price', label: 'Selling price', type: CmDataColumnType.money, sortable: true),
                CmDataTableColumn(key: 'stock', label: 'Stock', type: CmDataColumnType.numeric, sortable: true),
              ],
              rows: [for (final p in _products) {'name': p.name, 'sku': p.sku, 'price': _rs(p.price), 'stock': p.stock}],
              totals: {'name': 'Total', 'stock': _products.fold<int>(0, (a, p) => a + p.stock)},
            ),
          ),
          _section(
            'Avatar and thumbnail',
            'cm-avatar',
            description: 'Mirrors <cm-avatar> and <cm-thumbnail>. Initials when there is no photo; a placeholder when there is no image.',
            Wrap(spacing: CmSpace.s20, runSpacing: CmSpace.s20, crossAxisAlignment: WrapCrossAlignment.center, children: const [
              CmAvatar(name: 'Robinson Jain', size: CmAvatarSize.small),
              CmAvatar(name: 'Asha Rao'),
              CmAvatar(name: 'Obiroye Garments', size: CmAvatarSize.large, shape: CmAvatarShape.square),
              CmAvatar(size: CmAvatarSize.large),
              CmThumbnail(size: CmThumbnailSize.small, image: AssetImage('assets/wordmark-tm-black.png'), alt: 'Commmerce wordmark'),
              CmThumbnail(alt: 'Cotton kurta, indigo'),
              CmThumbnail(size: CmThumbnailSize.large),
            ]),
          ),
          _section(
            'Tooltip',
            'cm-tooltip',
            description: 'Mirrors <cm-tooltip>. Hover, long-press or tab to a control to see it; Esc closes it.',
            Wrap(spacing: CmSpace.s20, runSpacing: CmSpace.s8, crossAxisAlignment: WrapCrossAlignment.center, children: [
              CmTooltip(message: 'Makes a copy with the same variants and images', child: CmButton(label: 'Duplicate', onPressed: () => _say('Duplicate'))),
              CmTooltip(message: 'Shown to customers at checkout', placement: CmTooltipPlacement.bottom, child: _IconAction(icon: CmIcons.help, label: 'About delivery dates', onTap: () => _say('About delivery dates'))),
            ]),
          ),
          _section(
            'Toast',
            'cm-toast',
            description: 'Mirrors <cm-toast> and showToast(). Each toast is announced to screen readers on its own.',
            Wrap(spacing: CmSpace.s8, runSpacing: CmSpace.s8, children: [
              CmButton(label: 'Save product', variant: CmButtonVariant.primary, onPressed: () => showCmToast(context, 'Product saved')),
              CmButton(label: 'Archive order', onPressed: () => showCmToast(context, 'Order #1042 archived', actionLabel: 'Undo', onAction: () => _say('Undo archive'))),
              CmButton(label: 'Sync stock', onPressed: () => showCmToast(context, 'Stock sync failed. Try again.', tone: CmToastTone.critical)),
            ]),
          ),
          _section(
            'Spinner and progress bar',
            'cm-spinner',
            description: 'Mirrors <cm-spinner> and <cm-progress-bar>. Screen readers hear the label and the value.',
            const CmStack(children: [
              CmStack(direction: Axis.horizontal, children: [CmSpinner(label: 'Loading orders'), CmSpinner(size: CmSpinnerSize.small, label: 'Saving')]),
              CmProgressBar(label: 'Importing products', value: 40, showValue: true),
              CmProgressBar(label: 'Updating prices', size: CmProgressBarSize.small),
            ]),
          ),
          _section(
            'Page, layout, grid and stack',
            'cm-page',
            description: 'Mirrors <cm-page>, <cm-layout>, <cm-grid> and <cm-stack>. The layout stacks below 768px of its own width, the grid below 641px.',
            ClipRRect(
              borderRadius: BorderRadius.circular(CmRadius.md),
              child: CmPage(
                scrollable: false,
                header: CmPageHeader(title: 'Order #1042', breadcrumbs: [CmBreadcrumb('Orders', onTap: () => _say('Orders'))], adornment: const CmBadge('Paid', tone: CmTone.success)),
                child: CmLayout(children: [
                  CmLayoutSection(variant: CmLayoutVariant.twoThirds, children: [
                    CmCard(
                      heading: 'Items',
                      child: CmStack(gap: CmSpace.s8, children: [
                        for (final p in _products.take(2))
                          CmStack(direction: Axis.horizontal, gap: CmSpace.s16, children: [
                            const CmThumbnail(size: CmThumbnailSize.small),
                            Expanded(child: Text(p.name, style: CmType.bodyMd.copyWith(color: c.textDefault))),
                            Text(_rs(p.price), style: CmType.bodyMd.copyWith(color: c.textDefault)),
                          ]),
                      ]),
                    ),
                    CmGrid(columns: 3, gap: CmSpace.s8, children: [
                      for (final (label, value) in const [('Subtotal', 'Rs. 9,798'), ('Shipping', 'Rs. 0'), ('Total', 'Rs. 9,798')])
                        CmCard(child: Text('$label\n$value', style: CmType.bodyMd.copyWith(color: c.textDefault))),
                    ]),
                  ]),
                  CmLayoutSection(variant: CmLayoutVariant.oneThird, children: [
                    CmCard(
                      heading: 'Customer',
                      child: CmStack(direction: Axis.horizontal, gap: CmSpace.s8, children: [
                        const CmAvatar(name: 'Asha Rao', decorative: true),
                        Expanded(child: Text('Asha Rao', style: CmType.bodyMd.copyWith(color: c.textDefault))),
                      ]),
                    ),
                  ]),
                ]),
              ),
            ),
          ),
          _section('Skeleton display', 'cm-skeleton-display', const SizedBox(height: 420, child: SingleChildScrollView(physics: NeverScrollableScrollPhysics(), child: CmSkeletonDisplay(label: 'Loading order')))),
        ]),
      ),
    ]);
  }
}

void _noop() {}

/// One button per overlay, with realistic order content.
class _Overlays extends StatefulWidget {
  const _Overlays({required this.onSay});
  final ValueChanged<String> onSay;
  @override
  State<_Overlays> createState() => _OverlaysState();
}

class _OverlaysState extends State<_Overlays> {
  String _payment = '', _fulfilment = '';
  bool _cod = false;

  int get _applied => [_payment.isNotEmpty, _fulfilment.isNotEmpty, _cod].where((v) => v).length;

  Future<void> _cancelOrder() async {
    final ok = await showCmModal<bool>(
      context: context,
      title: 'Cancel order #1042?',
      size: CmOverlaySize.small,
      builder: (_) => const Text('Priya Sharma will get a full refund of Rs. 2,340 to her UPI account. This can\'t be undone.'),
      actions: (ctx) => [
        CmButton(label: 'Keep order', onPressed: () => Navigator.pop(ctx, false)),
        CmButton(label: 'Cancel order', variant: CmButtonVariant.primary, onPressed: () => Navigator.pop(ctx, true)),
      ],
    );
    widget.onSay(ok == true ? 'Order #1042 cancelled' : 'Order #1042 kept');
  }

  Future<void> _viewOrder() async {
    final r = await showCmSidePanel<String>(
      context: context,
      title: 'Order #1042',
      builder: (_) => const Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        CmInfoPanel(heading: 'Customer', items: [
          CmInfoItem('Name', Text('Priya Sharma')),
          CmInfoItem('Email', Text('priya.sharma@example.com')),
          CmInfoItem('Phone', Text('+91 98200 41042')),
          CmInfoItem('Ship to', Text('14 Carter Road, Bandra West, Mumbai 400050')),
        ]),
        SizedBox(height: CmSpace.s20),
        CmAccordion(heading: '2 items, Rs. 2,340', child: Text('Cotton kurta, indigo (M) × 1\nHandloom dupatta, red × 1')),
      ]),
      actions: (ctx) => [CmButton(label: 'Mark as shipped', variant: CmButtonVariant.primary, onPressed: () => Navigator.pop(ctx, 'shipped'))],
    );
    if (r != null) widget.onSay('Order #1042 marked as shipped');
  }

  Future<void> _filters() async {
    var payment = _payment, fulfilment = _fulfilment, cod = _cod;
    final q = await showCmFilterPanel(
      context: context,
      search: true,
      appliedCount: _applied,
      fields: (context, setState) => [
        CmSelect<String>(
          label: 'Payment status',
          value: payment,
          onChanged: (v) => setState(() => payment = v ?? ''),
          options: const [CmSelectOption('', 'Any'), CmSelectOption('paid', 'Paid'), CmSelectOption('pending', 'Pending'), CmSelectOption('failed', 'Failed')],
        ),
        CmSelect<String>(
          label: 'Fulfilment status',
          value: fulfilment,
          onChanged: (v) => setState(() => fulfilment = v ?? ''),
          options: const [CmSelectOption('', 'Any'), CmSelectOption('unfulfilled', 'Unfulfilled'), CmSelectOption('shipped', 'Shipped'), CmSelectOption('delivered', 'Delivered')],
        ),
        CmCheckbox(label: 'Cash on delivery only', value: cod, onChanged: (v) => setState(() => cod = v ?? false)),
      ],
      onReset: () {
        payment = '';
        fulfilment = '';
        cod = false;
      },
    );
    if (q == null) return;
    setState(() {
      _payment = payment;
      _fulfilment = fulfilment;
      _cod = cod;
    });
    widget.onSay('Filters applied: $_applied${q.isEmpty ? '' : ', search "$q"'}');
  }

  Future<void> _share() async {
    final r = await showCmBottomSheet(context: context, heading: 'Share order #1042', items: const [
      CmMenuItem(label: 'Copy order link', value: 'copy', icon: CmIcons.copy),
      CmMenuItem(label: 'Send on WhatsApp', value: 'whatsapp', icon: CmIcons.send),
      CmMenuItem(label: 'Share invoice', value: 'invoice', icon: CmIcons.share),
      CmMenuItem(label: 'Download invoice PDF', value: 'pdf', icon: CmIcons.download),
    ]);
    if (r != null) widget.onSay('Share: $r');
  }

  Future<void> _notifications() async {
    final n = await showCmNotificationPanel(
      context: context,
      onMore: () => widget.onSay('All notifications'),
      notifications: const [
        CmNotification(label: 'New order #1043 received', time: '1 min ago', unread: true),
        CmNotification(label: 'New order #1042 received', time: '18 mins ago', unread: true),
        CmNotification(label: 'Handloom dupatta is out of stock', time: '40 mins ago', tone: CmTone.attention),
        CmNotification(label: 'Payment of Rs. 12,499 received', time: '1 hr ago', tone: CmTone.success),
        CmNotification(label: 'Order #1037 cancelled by customer', time: '1 day ago', tone: CmTone.critical),
      ],
    );
    if (n != null) widget.onSay(n.label);
  }

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: CmSpace.s8, runSpacing: CmSpace.s8, children: [
        CmButton(label: 'Cancel order', onPressed: _cancelOrder),
        CmButton(label: 'View order', onPressed: _viewOrder),
        CmButton(label: _applied > 0 ? 'Filter orders ($_applied)' : 'Filter orders', icon: CmIcons.filter, onPressed: _filters),
        CmButton(label: 'Share order', icon: CmIcons.share, onPressed: _share),
        CmButton(label: 'Notifications', icon: CmIcons.bell, onPressed: _notifications),
        CmActionMenu(
          triggerLabel: 'Add',
          label: 'Add menu',
          onSelected: (i) => widget.onSay(i.label),
          items: const [
            CmMenuItem(label: 'Add product', icon: CmIcons.box),
            CmMenuItem(label: 'Add category', icon: CmIcons.menu),
            CmMenuItem(label: 'Add customer', icon: CmIcons.users),
            CmMenuItem(label: 'Add order', icon: CmIcons.cart),
          ],
        ),
      ]),
      const SizedBox(height: CmSpace.s16),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: CmSpace.s16, vertical: CmSpace.s8),
        decoration: BoxDecoration(border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.sm)),
        child: Row(children: [
          Expanded(child: Text('#1042 · Priya Sharma · Rs. 2,340', style: CmType.bodyMd.copyWith(color: c.textDefault))),
          const CmBadge('Paid', tone: CmTone.success),
          const SizedBox(width: CmSpace.s8),
          CmActionMenu(
            iconOnly: true,
            label: 'Order #1042 actions',
            align: CmMenuAlign.end,
            onSelected: (i) => i.id == 'cancel' ? _cancelOrder() : widget.onSay(i.label),
            items: const [
              CmMenuItem(label: 'Change tracking info', value: 'tracking'),
              CmMenuItem(label: 'Print shipping label', value: 'label'),
              CmMenuItem(label: 'Send invoice', value: 'invoice'),
              CmMenuItem.divider(),
              CmMenuItem(label: 'Cancel order', value: 'cancel', critical: true),
            ],
          ),
        ]),
      ),
    ]);
  }
}

class _InstalledApp extends StatefulWidget {
  const _InstalledApp({required this.onSay});
  final ValueChanged<String> onSay;
  @override
  State<_InstalledApp> createState() => _InstalledAppState();
}

class _InstalledAppState extends State<_InstalledApp> {
  bool _on = true;
  @override
  Widget build(BuildContext context) => CmAppCard(
        name: 'ShipQuick',
        logo: const _Logo('ShipQuick'),
        developer: 'ShipQuick Logistics',
        rating: 4.2,
        reviews: 318,
        pricing: 'From Rs. 499 a month.',
        status: CmToggle(semanticLabel: 'ShipQuick turned on', value: _on, onChanged: (v) => setState(() => _on = v)),
        actions: [CmButton(label: 'Open app', variant: CmButtonVariant.primary, onPressed: () => widget.onSay('Open ShipQuick'))],
        onViewDetails: () => widget.onSay('ShipQuick details'),
      );
}

/// A stand-in logo: the app name set in type, since the example has no app logos.
class _Logo extends StatelessWidget {
  const _Logo(this.name);
  final String name;
  @override
  Widget build(BuildContext context) => Text(name, semanticsLabel: name, style: CmType.headingSm.copyWith(fontWeight: FontWeight.w600, color: CmTheme.colorsOf(context).textDefault));
}

class _IconAction extends StatelessWidget {
  const _IconAction({required this.icon, required this.label, required this.onTap});
  final String icon, label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        excludeSemantics: true, onTap: onTap,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(CmRadius.sm),
          child: Padding(padding: const EdgeInsets.all(CmSpace.s8), child: CmIcon(icon, size: 20, color: CmTheme.colorsOf(context).iconSelected)),
        ),
      );
}
