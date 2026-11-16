import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

import 'components_page.dart';
import 'crm_page.dart';

void main() => runApp(const ExampleApp());

/// The Commmerce admin, rebuilt with commmerce_ui: dashboard, orders, a product editor and a components gallery.
class ExampleApp extends StatefulWidget {
  const ExampleApp({super.key});
  @override
  State<ExampleApp> createState() => _ExampleAppState();
}

class _ExampleAppState extends State<ExampleApp> {
  ThemeMode _mode = ThemeMode.light;
  String _page = Uri.base.fragment.isEmpty ? 'dashboard' : Uri.base.fragment;

  // Same items, order and icons as the live admin (docs/reference/admin-dashboard.png).
  static const _nav = [
    CmNavItem(id: 'dashboard', label: 'Dashboard', icon: CmIcons.home),
    CmNavItem(id: 'catalog', label: 'Catalog', icon: CmIcons.box, children: [
      CmNavItem(id: 'products', label: 'Products'),
      CmNavItem(id: 'add-product', label: 'Add product'),
      CmNavItem(id: 'categories', label: 'Categories'),
    ]),
    CmNavItem(id: 'orders-group', label: 'Orders', icon: CmIcons.bag, children: [
      CmNavItem(id: 'orders', label: 'All orders', count: 3),
      CmNavItem(id: 'abandoned', label: 'Abandoned carts'),
    ]),
    CmNavItem(id: 'webpos', label: 'WebPOS', icon: CmIcons.pos),
    CmNavItem(id: 'customers', label: 'Customers', icon: CmIcons.users, children: [CmNavItem(id: 'customer-list', label: 'All customers')]),
    CmNavItem(id: 'subscriptions', label: 'Subscriptions', icon: CmIcons.repeat),
    CmNavItem(id: 'website', label: 'Website', icon: CmIcons.website, children: [CmNavItem(id: 'themes', label: 'Themes')]),
    CmNavItem(id: 'apps', label: 'Apps', icon: CmIcons.apps),
    CmNavItem(id: 'reports', label: 'Reports', icon: CmIcons.chart),
    CmNavItem(id: 'marketing', label: 'Marketing', icon: CmIcons.megaphone, children: [CmNavItem(id: 'discounts', label: 'Discounts')]),
    CmNavItem(id: 'staff', label: 'Staff Management', icon: CmIcons.staff, children: [CmNavItem(id: 'staff-list', label: 'Staff')]),
    CmNavItem(id: 'settings', label: 'Settings', icon: CmIcons.settings, children: [CmNavItem(id: 'store-settings', label: 'Store details')]),
    // Not in the live admin: a gallery of the newer widgets.
    CmNavItem(id: 'components', label: 'Components', icon: CmIcons.apps),
    // The 1.1 and 1.2 additions made for the Commmerce CRM.
    CmNavItem(id: 'crm', label: 'CRM widgets', icon: CmIcons.handshake),
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Commmerce admin (commmerce_ui example)',
      debugShowCheckedModeBanner: false,
      theme: CmTheme.light(),
      darkTheme: CmTheme.dark(),
      themeMode: _mode,
      home: Builder(builder: (context) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        return CmAdminScaffold(
          navItems: _nav,
          selectedId: _page,
          onNavSelected: (i) => setState(() => _page = i.id),
          header: (context, openMenu) => CmHeaderBar(
            logo: Image.asset(dark ? 'assets/wordmark-tm-white.png' : 'assets/wordmark-tm-black.png', semanticLabel: 'Commmerce'),
            storeName: 'preprod.commmerce.com',
            onStoreTap: () {},
            actions: [
              const CmButton(label: 'Hire an Expert', size: CmButtonSize.large, onPressed: _noop),
              const CmButton(label: 'My Subscription', size: CmButtonSize.large, variant: CmButtonVariant.primary, onPressed: _noop),
              Semantics(
                button: true,
                label: dark ? 'Switch to light theme' : 'Switch to dark theme',
                excludeSemantics: true, onTap: () => setState(() => _mode = dark ? ThemeMode.light : ThemeMode.dark),
                child: InkWell(
                  onTap: () => setState(() => _mode = dark ? ThemeMode.light : ThemeMode.dark),
                  borderRadius: BorderRadius.circular(CmRadius.lg),
                  child: Container(
                    width: 46, height: 46,
                    decoration: BoxDecoration(color: CmTheme.colorsOf(context).bgIcon, borderRadius: BorderRadius.circular(CmRadius.lg), border: Border.all(color: CmTheme.colorsOf(context).borderSubtle)),
                    child: Center(child: CmIcon(dark ? CmIcons.sun : CmIcons.moon, size: 18)),
                  ),
                ),
              ),
            ],
            walletBalance: '₹ 2,312',
            userName: 'Demo user',
            onMenuTap: openMenu,
          ),
          body: switch (_page) {
            'orders' => const OrdersPage(),
            'components' => const ComponentsPage(),
            'crm' => const CrmPage(),
            'add-product' || 'products' => const ProductEditorPage(),
            _ => const DashboardPage(),
          },
        );
      }),
    );
  }
}

void _noop() {}

/// The live admin's dashboard: welcome, store card and quick actions.
class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    final t = CmText.of(context);
    const tiles = ['Add\nCategory', 'Add\nProduct', 'Add\nDomain', 'Add Payment\nGateway', 'Add Store Address\n& GST (Optional)'];
    return SingleChildScrollView(
      padding: EdgeInsets.all(phone ? CmSpace.s15 : 60),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1260),
          child: Column(children: [
            Semantics(header: true, child: Text('Welcome to your Dashboard', textAlign: TextAlign.center, style: t.headingLg.copyWith(fontSize: phone ? 24 : 36, fontWeight: FontWeight.w500, color: c.textDefault))),
            SizedBox(height: phone ? CmSpace.s20 : 40),
            // The store card is black in both themes, as in the admin.
            Container(
              width: double.infinity,
              padding: EdgeInsets.all(phone ? CmSpace.s20 : 40),
              decoration: BoxDecoration(color: c.bgDashboard, borderRadius: BorderRadius.circular(CmRadius.md)),
              child: Column(children: [
                Text('Create and Share Your Online Store', textAlign: TextAlign.center, style: t.headingSm.copyWith(fontSize: phone ? 20 : 26, color: c.textOnDark)),
                const SizedBox(height: CmSpace.s30),
                Container(
                  constraints: const BoxConstraints(maxWidth: 1000),
                  padding: const EdgeInsets.all(CmSpace.s15),
                  decoration: BoxDecoration(color: c.bgPanelHeader, borderRadius: BorderRadius.circular(CmRadius.md)),
                  child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, runSpacing: CmSpace.s10, spacing: CmSpace.s10, children: [
                    SelectableText('https://preprod.commmerce.com', style: CmType.bodyLg.copyWith(fontSize: 18, color: c.textOnDark)),
                    Theme(
                      data: CmTheme.dark(),
                      child: const Wrap(spacing: CmSpace.s15, runSpacing: CmSpace.s10, children: [
                        CmButton(label: 'Edit Website', icon: CmIcons.edit, size: CmButtonSize.large, onPressed: _noop),
                        CmButton(label: 'Go To Website', size: CmButtonSize.large, variant: CmButtonVariant.primary, onPressed: _noop),
                      ]),
                    ),
                  ]),
                ),
                const SizedBox(height: CmSpace.s30),
                Text.rich(
                  const TextSpan(text: 'Want to Hire an Expert to design your website? ', children: [
                    TextSpan(text: 'Click Here', style: TextStyle(decoration: TextDecoration.underline, fontWeight: FontWeight.w500)),
                  ]),
                  textAlign: TextAlign.center,
                  style: CmType.bodyLg.copyWith(fontSize: phone ? 16 : 18, color: c.textOnDark),
                ),
                const SizedBox(height: CmSpace.s30),
                Text('SHARE', style: cmCaps(16, c.textOnDark)),
                const SizedBox(height: CmSpace.s20),
                Wrap(spacing: CmSpace.s20, runSpacing: CmSpace.s10, children: [
                  for (final s in ['Share on Facebook', 'Share on X', 'Share on LinkedIn', 'Copy store link'])
                    Semantics(
                      button: true, label: s, excludeSemantics: true, onTap: () {},
                      child: InkWell(
                        onTap: () {},
                        customBorder: const CircleBorder(),
                        child: Container(width: 56, height: 56, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.textOnDark)),
                            child: Center(child: CmIcon(s.startsWith('Copy') ? CmIcons.copy : CmIcons.external, size: 20, color: c.textOnDark))),
                      ),
                    ),
                ]),
              ]),
            ),
            const SizedBox(height: CmSpace.s30),
            LayoutBuilder(builder: (context, box) {
              final cols = box.maxWidth > 1000 ? 5 : box.maxWidth > 600 ? 3 : 2;
              final gap = phone ? CmSpace.s15 : CmSpace.s30;
              final w = (box.maxWidth - (cols - 1) * gap) / cols;
              return Wrap(spacing: gap, runSpacing: gap, children: [
                for (final label in tiles)
                  Semantics(
                    button: true, label: label.replaceAll('\n', ' '), excludeSemantics: true, onTap: () {},
                    child: InkWell(
                      onTap: () {},
                      child: Container(
                        width: w, height: phone ? 160 : 200,
                        decoration: BoxDecoration(color: c.bgSurface, border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.sm)),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Container(width: 52, height: 52, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: c.iconDefault)),
                              child: Center(child: CmIcon(CmIcons.plus, size: 20, color: c.iconDefault))),
                          const SizedBox(height: CmSpace.s20),
                          Text(label, textAlign: TextAlign.center, style: CmType.bodyLg.copyWith(fontSize: phone ? 14 : 18, fontWeight: FontWeight.w500, color: c.textDefault)),
                        ]),
                      ),
                    ),
                  ),
              ]);
            }),
          ]),
        ),
      ),
    );
  }
}

class _Order {
  const _Order(this.id, this.name, this.date, this.total, this.pay, this.tone, this.status);
  final String id, name, date, total, pay, status;
  final CmTone tone;
}

const _orders = [
  _Order('1042', 'Priya Sharma', '13 Nov, 4:20 pm', 'Rs. 2,340', 'Paid', CmTone.success, 'unprocessed'),
  _Order('1041', 'Rahul Mehta', '13 Nov, 1:05 pm', 'Rs. 899', 'Pending', CmTone.information, 'unprocessed'),
  _Order('1040', 'Ananya Iyer', '12 Nov, 6:48 pm', 'Rs. 12,499', 'Paid', CmTone.success, 'processing'),
  _Order('1039', 'Farhan Ali', '12 Nov, 11:30 am', 'Rs. 1,150', 'Failed', CmTone.critical, 'unprocessed'),
  _Order('1038', 'Kavya Reddy', '11 Nov, 9:12 pm', 'Rs. 3,780', 'Paid', CmTone.success, 'fulfilled'),
];

/// The order list pattern: status tabs, search, selectable rows, bulk actions, pagination.
class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});
  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> {
  String _status = 'unprocessed', _query = '', _payment = '';
  bool _highValue = false;
  Set<String> _selected = {};

  int get _filterCount => (_payment.isEmpty ? 0 : 1) + (_highValue ? 1 : 0);

  static int _amount(String total) => int.parse(total.replaceAll(RegExp(r'[^0-9]'), ''));

  /// The Search field's filter button opens the filter panel; values apply only on Search.
  Future<void> _openFilters() async {
    var payment = _payment, highValue = _highValue;
    final applied = await showCmFilterPanel(
      context: context,
      appliedCount: _filterCount,
      fields: (context, setState) => [
        CmSelect<String>(
          label: 'Payment status',
          value: payment,
          onChanged: (v) => setState(() => payment = v ?? ''),
          options: const [CmSelectOption('', 'Any'), CmSelectOption('Paid', 'Paid'), CmSelectOption('Pending', 'Pending'), CmSelectOption('Failed', 'Failed')],
        ),
        CmCheckbox(label: 'Over Rs. 2,000', value: highValue, onChanged: (v) => setState(() => highValue = v ?? false)),
      ],
      onReset: () {
        payment = '';
        highValue = false;
      },
    );
    if (applied == null) return;
    setState(() {
      _payment = payment;
      _highValue = highValue;
      _selected = {};
    });
  }

  @override
  Widget build(BuildContext context) {
    final rows = _orders
        .where((o) =>
            (_status == 'all' || o.status == _status) &&
            '${o.id} ${o.name}'.toLowerCase().contains(_query.toLowerCase()) &&
            (_payment.isEmpty || o.pay == _payment) &&
            (!_highValue || _amount(o.total) > 2000))
        .toList();
    int count(String s) => _orders.where((o) => s == 'all' || o.status == s).length;
    final phone = CmBreakpoints.of(context) == CmScreen.phone;
    return Column(children: [
      const CmPageHeader(title: 'Orders', breadcrumbs: [CmBreadcrumb('Dashboard')], actions: [CmButton(label: 'Create order', variant: CmButtonVariant.primary, size: CmButtonSize.large, onPressed: _noop)]),
      Expanded(
        child: ListView(padding: const EdgeInsets.all(CmSpace.s20), children: [
          CmStatusTabs(
            value: _status,
            onChanged: (v) => setState(() { _status = v; _selected = {}; }),
            tabs: [for (final s in ['all', 'unprocessed', 'processing', 'fulfilled']) CmStatusTab(s, s[0].toUpperCase() + s.substring(1), count: count(s))],
          ),
          const SizedBox(height: CmSpace.s20),
          CmSearch(label: 'Search orders', placeholder: 'Search by order number or customer', onChanged: (v) => setState(() => _query = v), onFilter: _openFilters, filterCount: _filterCount),
          const SizedBox(height: CmSpace.s20),
          CmResourceList(
            resourceName: 'order',
            selected: _selected,
            onSelectionChanged: (s) => setState(() => _selected = s),
            bulkActions: const [CmButton(label: 'Mark as processing', onPressed: _noop), CmButton(label: 'Print invoices', onPressed: _noop)],
            empty: const CmEmptyState(heading: 'No orders match', message: 'Try another status or search.', icon: CmIcons.cart, small: true),
            items: [
              for (final o in rows)
                CmResourceItem(
                  id: o.id,
                  semanticLabel: 'Order #${o.id}',
                  child: phone
                      ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('#${o.id} · ${o.name}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Row(children: [Expanded(child: Text('${o.date} · ${o.total}')), CmBadge(o.pay, tone: o.tone)]),
                        ])
                      : Row(children: [
                          Expanded(child: Text('#${o.id}', style: const TextStyle(fontWeight: FontWeight.w600))),
                          Expanded(flex: 2, child: Text(o.name)),
                          Expanded(flex: 2, child: Text(o.date)),
                          Expanded(child: Text(o.total)),
                          Expanded(child: Align(alignment: Alignment.centerLeft, child: CmBadge(o.pay, tone: o.tone))),
                        ]),
                ),
            ],
          ),
          CmPagination(page: 1, pageSize: 20, total: rows.length, resourceName: 'orders', onPageChanged: (_) {}),
        ]),
      ),
    ]);
  }
}

/// The product editor pattern: cards in two columns, validation on save, and a save bar.
class ProductEditorPage extends StatefulWidget {
  const ProductEditorPage({super.key});
  @override
  State<ProductEditorPage> createState() => _ProductEditorPageState();
}

class _ProductEditorPageState extends State<ProductEditorPage> {
  final _title = TextEditingController();
  final _price = TextEditingController();
  String? _titleError, _priceError, _status = 'draft';
  bool _dirty = false, _online = true, _track = true, _saved = false;

  void _changed() => setState(() { _dirty = true; _saved = false; });

  void _save() {
    setState(() {
      _titleError = _title.text.trim().isEmpty ? 'Enter a title' : null;
      _priceError = _price.text.trim().isEmpty ? 'Enter a price' : null;
      if (_titleError == null && _priceError == null) { _dirty = false; _saved = true; }
    });
  }

  @override
  void dispose() { _title.dispose(); _price.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final wide = CmBreakpoints.of(context) == CmScreen.desktop;
    final main = Column(children: [
      CmCard(heading: 'Details', child: Column(children: [
        CmTextField(label: 'Title', required: true, placeholder: 'Short sleeve t-shirt', controller: _title, error: _titleError, onChanged: (_) => _changed()),
        const SizedBox(height: CmSpace.s30),
        CmTextField(label: 'Description', multiline: true, helpText: 'Plain text, up to 500 characters', onChanged: (_) => _changed()),
      ])),
      const SizedBox(height: CmSpace.s20),
      CmCard(heading: 'Pricing', child: CmTextField(label: 'Price', hint: 'rs.', required: true, controller: _price, error: _priceError, keyboardType: TextInputType.number, onChanged: (_) => _changed())),
    ]);
    final side = Column(children: [
      CmCard(heading: 'Status', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CmSelect<String>(label: 'Product status', value: _status, options: const [CmSelectOption('active', 'Active'), CmSelectOption('draft', 'Draft')], onChanged: (v) { _status = v; _changed(); }),
        const SizedBox(height: CmSpace.s20),
        CmToggle(label: 'Show on online store', value: _online, onChanged: (v) { _online = v; _changed(); }),
      ])),
      const SizedBox(height: CmSpace.s20),
      CmCard(heading: 'Inventory', child: CmCheckbox(label: 'Track quantity', value: _track, onChanged: (v) { _track = v ?? false; _changed(); })),
    ]);
    return Column(children: [
      const CmPageHeader(title: 'Add product', breadcrumbs: [CmBreadcrumb('Products')]),
      Expanded(
        child: ListView(padding: const EdgeInsets.all(CmSpace.s20), children: [
          if (_saved) const Padding(padding: EdgeInsets.only(bottom: CmSpace.s20), child: CmBanner(tone: CmTone.success, message: 'Product saved.')),
          if (_titleError != null || _priceError != null)
            const Padding(padding: EdgeInsets.only(bottom: CmSpace.s20), child: CmBanner(tone: CmTone.critical, heading: 'Product not saved', message: 'Fix the highlighted fields and save again.')),
          wide
              ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 2, child: main), const SizedBox(width: CmSpace.s20), Expanded(child: side)])
              : Column(children: [main, const SizedBox(height: CmSpace.s20), side]),
        ]),
      ),
      CmSaveBar(visible: _dirty, message: 'Unsaved product', onSave: _save, onDiscard: () => setState(() { _title.clear(); _price.clear(); _dirty = false; _titleError = _priceError = null; })),
    ]);
  }
}
