import 'package:flutter/material.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// An entry in [CmSideNav]. Items with [children] expand and collapse.
class CmNavItem {
  const CmNavItem({required this.id, required this.label, this.icon, this.children = const [], this.count, this.badge, this.primary = false});

  /// Stable id, also used for the selected state.
  final String id;
  final String label;

  /// Icon name from [CmIcons]. Sub-items usually have none.
  final String? icon;
  final List<CmNavItem> children;

  /// Optional count pill (e.g. new orders).
  final int? count;

  /// Short text after the label in [CmMobileMenu], e.g. "New" or "3 apps active".
  final String? badge;

  /// The one main action: a black square icon in [CmBottomNavigation] (Quick add), or a centred
  /// action row at the end of a [CmMobileMenu] section (Add channel).
  final bool primary;
}

/// The Commmerce admin side navigation: a black rounded panel with icon + label items and
/// expandable groups. For Commmerce products; apps inside the admin don't draw their own.
class CmSideNav extends StatefulWidget {
  const CmSideNav({super.key, required this.items, required this.selectedId, required this.onSelected, this.collapsed = false, this.width = 300});

  final List<CmNavItem> items;

  /// The id of the current page (a top-level item or a sub-item).
  final String selectedId;
  final ValueChanged<CmNavItem> onSelected;

  /// Icons only, with tooltips (tablet rail).
  final bool collapsed;
  final double width;

  @override
  State<CmSideNav> createState() => _CmSideNavState();
}

class _CmSideNavState extends State<CmSideNav> {
  late final Set<String> _open = {
    for (final i in widget.items)
      if (i.children.any((c) => c.id == widget.selectedId)) i.id,
  };

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Semantics(
      container: true,
      label: CmStrings.of(context).mainNavigation,
      explicitChildNodes: true,
      child: Container(
        width: widget.collapsed ? 76 : widget.width,
        padding: EdgeInsets.symmetric(vertical: CmSpace.s20, horizontal: widget.collapsed ? 10 : CmSpace.s15),
        decoration: BoxDecoration(color: c.bgDashboard, borderRadius: BorderRadius.circular(16)),
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final item in widget.items) ...[
              _row(context, item, top: true),
              if (!widget.collapsed && _open.contains(item.id))
                for (final sub in item.children) _row(context, sub, top: false),
            ],
          ],
        ),
      ),
    );
  }

  Widget _row(BuildContext context, CmNavItem item, {required bool top}) {
    final c = CmTheme.colorsOf(context);
    final hasKids = item.children.isNotEmpty;
    final open = _open.contains(item.id);
    final active = item.id == widget.selectedId || (widget.collapsed && item.children.any((k) => k.id == widget.selectedId));
    // Inactive items: white at 78% on black (about 13:1). Active: full white, semibold.
    final fg = active ? c.textOnDark : c.textOnDark.withValues(alpha: 0.78);
    void tap() {
      if (hasKids && !widget.collapsed) {
        setState(() => open ? _open.remove(item.id) : _open.add(item.id));
      } else {
        widget.onSelected(hasKids ? item.children.first : item);
      }
    }

    final label = Text(item.label,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: top ? 16 : 14, fontWeight: active ? FontWeight.w600 : FontWeight.w400, color: fg));
    Widget row = Container(
      height: top ? 46 : 38,
      padding: EdgeInsets.only(left: widget.collapsed ? 0 : (top ? 12 : 46), right: 8),
      decoration: BoxDecoration(color: active && !top ? c.navActive : null, borderRadius: BorderRadius.circular(CmRadius.sm)),
      child: Row(
        mainAxisAlignment: widget.collapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
        children: [
          if (item.icon != null) CmIcon(item.icon!, size: 20, color: fg),
          if (!widget.collapsed) ...[
            if (item.icon != null) const SizedBox(width: 14),
            Expanded(child: label),
            if (item.count != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: c.navBadge, borderRadius: BorderRadius.circular(CmRadius.full)),
                child: Text('${item.count}', style: CmType.bodySm.copyWith(color: c.textOnDark)),
              ),
            if (hasKids) CmIcon(open ? CmIcons.chevronUp : CmIcons.chevronDown, size: 18, color: fg),
          ],
        ],
      ),
    );
    if (widget.collapsed) row = Tooltip(message: item.label, child: row);
    return Semantics(
      button: true,
      selected: active,
      label: item.count == null ? item.label : CmStrings.of(context).navCount(item.label, item.count!),
      hint: hasKids && !widget.collapsed ? (open ? CmStrings.of(context).expanded : CmStrings.of(context).collapsed) : null,
      excludeSemantics: true, onTap: tap,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: tap,
            borderRadius: BorderRadius.circular(CmRadius.sm),
            hoverColor: c.navActive,
            focusColor: c.navActive,
            child: row,
          ),
        ),
      ),
    );
  }
}

/// The Commmerce admin header: logo, store switcher, actions, wallet balance and user.
/// For Commmerce products; apps inside the admin don't draw their own.
class CmHeaderBar extends StatelessWidget implements PreferredSizeWidget {
  const CmHeaderBar({
    super.key,
    required this.logo,
    this.storeName,
    this.onStoreTap,
    this.actions = const [],
    this.walletBalance,
    this.onWalletTap,
    this.userName,
    this.avatar,
    this.onUserTap,
    this.onMenuTap,
  });

  /// The product logo (e.g. the COMMMERCE wordmark image).
  final Widget logo;

  /// Current store, shown as a switcher ("preprod.commmerce.com ▾").
  final String? storeName;
  final VoidCallback? onStoreTap;

  /// Buttons on the right, e.g. "Hire an Expert", "My Subscription".
  final List<Widget> actions;

  /// Already formatted, e.g. "₹ 2,312".
  final String? walletBalance;
  final VoidCallback? onWalletTap;
  final String? userName;

  /// Round avatar; defaults to the user icon.
  final Widget? avatar;
  final VoidCallback? onUserTap;

  /// Shows a menu button (phones), usually opening the navigation drawer.
  final VoidCallback? onMenuTap;

  @override
  Size get preferredSize => const Size.fromHeight(80);

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final screen = CmBreakpoints.of(context);
    final phone = screen == CmScreen.phone;
    Widget pill({required Widget child, required String label, VoidCallback? onTap, bool round = false}) => Semantics(
          button: onTap != null,
          label: label,
          excludeSemantics: true, onTap: onTap,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(round ? CmRadius.full : CmRadius.sm),
            child: Container(
              height: phone ? 40 : 46,
              padding: EdgeInsets.symmetric(horizontal: round ? 6 : 16),
              decoration: BoxDecoration(border: Border.all(color: c.borderStrong), borderRadius: BorderRadius.circular(round ? CmRadius.full : CmRadius.sm)),
              alignment: Alignment.center,
              child: child,
            ),
          ),
        );
    final avatarW = avatar ?? Container(width: 32, height: 32, decoration: BoxDecoration(color: c.bgIcon, shape: BoxShape.circle), child: Center(child: CmIcon(CmIcons.user, size: 18, color: c.textDefault)));
    return Container(
      height: phone ? 64 : 80,
      padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s10 : CmSpace.s30),
      color: c.bgSurface,
      child: Row(children: [
        if (onMenuTap != null)
          Semantics(
            button: true,
            label: CmStrings.of(context).openNavigation,
            excludeSemantics: true, onTap: onMenuTap,
            child: InkWell(onTap: onMenuTap, child: Padding(padding: const EdgeInsets.all(10), child: CmIcon(CmIcons.menu, size: 22, color: c.textDefault))),
          ),
        Semantics(label: 'Commmerce', image: true, excludeSemantics: true, child: SizedBox(height: phone ? 16 : 20, child: logo)),
        if (storeName != null && !phone) ...[
          SizedBox(width: screen == CmScreen.desktop ? 48 : 24),
          // flex 10 against the Spacer's 1: the store name takes the room it needs before the gap does.
          Flexible(flex: 10, child: Semantics(
            button: true,
            label: CmStrings.of(context).storeSwitch(storeName!),
            excludeSemantics: true, onTap: onStoreTap,
            child: InkWell(
              onTap: onStoreTap,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Flexible(child: Text(storeName!, overflow: TextOverflow.ellipsis, maxLines: 1, style: CmType.bodyLg.copyWith(fontSize: 18, color: c.textDefault))),
                const SizedBox(width: 8),
                CmIcon(CmIcons.chevronDown, size: 18, color: c.textDefault),
              ]),
            ),
          )),
        ],
        const Spacer(),
        if (screen == CmScreen.desktop) ...[for (final a in actions) Padding(padding: const EdgeInsets.only(left: CmSpace.s20), child: a)],
        if (walletBalance != null && !phone)
          Padding(
            padding: const EdgeInsets.only(left: CmSpace.s20),
            child: pill(label: CmStrings.of(context).walletBalance(walletBalance!), onTap: onWalletTap, child: Text(walletBalance!, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, color: c.textDefault))),
          ),
        if (userName != null)
          Padding(
            padding: const EdgeInsets.only(left: CmSpace.s20),
            child: pill(
              round: true,
              label: CmStrings.of(context).accountOf(userName!),
              onTap: onUserTap,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (!phone)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 160),
                    child: Padding(padding: const EdgeInsets.only(left: 14, right: 18), child: Text(userName!, overflow: TextOverflow.ellipsis, maxLines: 1, style: CmType.bodyLg.copyWith(fontSize: 18, color: c.textDefault))),
                  ),
                avatarW,
              ]),
            ),
          ),
      ]),
    );
  }
}

/// The Commmerce admin page frame. Desktop: header, fixed side navigation and a white content panel.
/// Tablet: an icon rail. Phone: a drawer opened from the header's menu button.
class CmAdminScaffold extends StatefulWidget {
  const CmAdminScaffold({super.key, required this.header, required this.navItems, required this.selectedId, required this.onNavSelected, required this.body});

  /// Build the header; receives the menu callback to pass to [CmHeaderBar.onMenuTap] on phones.
  final CmHeaderBar Function(BuildContext context, VoidCallback? openMenu) header;
  final List<CmNavItem> navItems;
  final String selectedId;
  final ValueChanged<CmNavItem> onNavSelected;
  final Widget body;

  @override
  State<CmAdminScaffold> createState() => _CmAdminScaffoldState();
}

class _CmAdminScaffoldState extends State<CmAdminScaffold> {
  final _key = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final screen = CmBreakpoints.of(context);
    final phone = screen == CmScreen.phone;
    final nav = CmSideNav(
      items: widget.navItems,
      selectedId: widget.selectedId,
      collapsed: screen == CmScreen.tablet,
      onSelected: (i) {
        if (phone) Navigator.of(context).maybePop();
        widget.onNavSelected(i);
      },
    );
    final panel = Container(
      margin: EdgeInsets.fromLTRB(phone ? 0 : CmSpace.s20, phone ? 0 : 10, phone ? 0 : CmSpace.s20, phone ? 0 : CmSpace.s20),
      decoration: BoxDecoration(color: c.bgSurface, borderRadius: BorderRadius.circular(phone ? 0 : 16)),
      clipBehavior: Clip.antiAlias,
      child: widget.body,
    );
    return Scaffold(
      key: _key,
      backgroundColor: c.bgPage,
      drawer: phone ? Drawer(backgroundColor: c.bgDashboard, child: SafeArea(child: Padding(padding: const EdgeInsets.all(CmSpace.s10), child: nav))) : null,
      body: SafeArea(
        child: Column(children: [
          widget.header(context, phone ? () => _key.currentState?.openDrawer() : null),
          Expanded(
            child: phone
                ? panel
                : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Padding(padding: const EdgeInsets.only(left: CmSpace.s20, top: 10, bottom: CmSpace.s20), child: nav),
                    Expanded(child: panel),
                  ]),
          ),
        ]),
      ),
    );
  }
}
