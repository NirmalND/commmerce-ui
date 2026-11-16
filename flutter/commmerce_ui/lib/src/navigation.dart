import 'package:flutter/material.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'global_search.dart';
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
  const CmSideNav({
    super.key,
    required this.items,
    required this.selectedId,
    required this.onSelected,
    this.collapsed = false,
    this.width = 300,
    this.collapsible = false,
    this.onCollapsedChanged,
  });

  final List<CmNavItem> items;

  /// The id of the current page (a top-level item or a sub-item).
  final String selectedId;
  final ValueChanged<CmNavItem> onSelected;

  /// Icons only, with tooltips (tablet rail, or a wide page that needs the room). Labels stay the items'
  /// accessible names; a count becomes a small count on the icon, a [CmNavItem.badge] a dot.
  final bool collapsed;
  final double width;

  /// Adds a button at the bottom ("Collapse menu" / "Expand menu") that asks [onCollapsedChanged] to switch
  /// between the full menu and the icon rail. Mirrors `collapsible` on `<cm-side-navigation>`. Since 1.1.
  final bool collapsible;

  /// Called with the state the merchant asked for: from the [collapsible] button, or by choosing a section in the
  /// rail (that asks to expand, and opens the section). Set [collapsed] in response and remember the choice.
  /// Without it, a section chosen in the rail goes to its first sub-item, as before 1.1.
  final ValueChanged<bool>? onCollapsedChanged;

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
            if (widget.collapsible) _toggle(context),
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
      } else if (hasKids && widget.onCollapsedChanged != null) {
        // A section chosen in the rail: ask to expand the menu, with the section open.
        setState(() => _open.add(item.id));
        widget.onCollapsedChanged!(false);
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
          if (widget.collapsed) _railIcon(context, item, fg) else if (item.icon != null) CmIcon(item.icon!, size: 20, color: fg),
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
    if (widget.collapsed) row = Tooltip(message: item.label, excludeFromSemantics: true, child: row);
    final strings = CmStrings.of(context);
    return Semantics(
      button: true,
      selected: active,
      label: item.count != null
          ? strings.navCount(item.label, item.count!)
          : widget.collapsed && item.badge != null
              ? '${item.label} (${item.badge})'
              : item.label,
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
  /// The icon in the rail, with a dot for a badge or a small count for a number. Items without an icon show
  /// their first letter.
  Widget _railIcon(BuildContext context, CmNavItem item, Color fg) {
    final c = CmTheme.colorsOf(context);
    final icon = item.icon != null
        ? CmIcon(item.icon!, size: 20, color: fg)
        : SizedBox.square(
            dimension: 20,
            child: Center(child: Text(item.label.trim().isEmpty ? '' : item.label.trim().characters.first.toUpperCase(), style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: 14, fontWeight: FontWeight.w600, color: fg))),
          );
    final badge = item.count != null ? (item.count! > 99 ? '99+' : '${item.count}') : item.badge?.trim();
    if (badge == null || badge.isEmpty) return icon;
    final number = RegExp(r'^\d{1,2}\+?$').hasMatch(badge);
    final ring = [BoxShadow(color: c.bgDashboard, spreadRadius: 2)];
    final dot = number
        ? Container(
            height: 16,
            constraints: const BoxConstraints(minWidth: 16),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(color: c.navBadge, borderRadius: BorderRadius.circular(CmRadius.full), boxShadow: ring),
            child: Center(widthFactor: 1, child: Text(badge, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: 10, height: 1, fontWeight: FontWeight.w600, color: c.textOnDark))),
          )
        : Container(width: 8, height: 8, decoration: BoxDecoration(color: c.navBadge, shape: BoxShape.circle, boxShadow: ring));
    return Stack(clipBehavior: Clip.none, children: [icon, PositionedDirectional(top: number ? -9 : -6, start: 14, child: dot)]);
  }

  /// The collapsible toggle: "Collapse menu" with a chevron pointing to the start side, or the icon alone in the rail.
  Widget _toggle(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final strings = CmStrings.of(context);
    final label = widget.collapsed ? strings.sideNavExpand : strings.sideNavCollapse;
    final fg = c.textOnDarkSecondary;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    // Chevrons point along the reading direction: mirrored right to left, like cm-icon on the web.
    final chevron = Transform.flip(flipX: rtl, child: CmIcon(widget.collapsed ? CmIcons.chevronRight : CmIcons.chevronLeft, size: 20, color: fg));
    void tap() => widget.onCollapsedChanged?.call(!widget.collapsed);
    Widget row = Container(
      height: 44,
      padding: EdgeInsetsDirectional.only(start: widget.collapsed ? 0 : 12, end: 8),
      child: Row(mainAxisAlignment: widget.collapsed ? MainAxisAlignment.center : MainAxisAlignment.start, children: [
        chevron,
        if (!widget.collapsed) ...[
          const SizedBox(width: 14),
          Expanded(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: 14, color: fg))),
        ],
      ]),
    );
    if (widget.collapsed) row = Tooltip(message: label, excludeFromSemantics: true, child: row);
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      onTap: tap,
      child: Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Material(
          color: Colors.transparent,
          child: InkWell(onTap: tap, borderRadius: BorderRadius.circular(CmRadius.sm), hoverColor: c.navActive, focusColor: c.navActive, child: row),
        ),
      ),
    );
  }
}

/// The Commmerce admin header: logo, store switcher, actions, wallet balance and user.
/// For Commmerce products; apps inside the admin don't draw their own.
///
/// Global search goes in [search] (usually a [CmGlobalSearch]): inline after the store switcher while the bar is
/// wider than 900px; at 900px or narrower the bar shows a search button instead, which opens the search in a
/// full-screen layer (Esc or the close button closes it, and focus returns to the button). Since 1.1.
class CmHeaderBar extends StatefulWidget implements PreferredSizeWidget {
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
    this.search,
    this.searchLabel,
    this.end = const [],
    this.onSearchToggle,
  });

  /// The product logo (e.g. the COMMMERCE wordmark image). A wide logo shrinks to make room on phones.
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

  /// One search box for the whole product, usually a [CmGlobalSearch]. Give it a `controller` so the query stays
  /// when the bar moves it between the bar and the full-screen layer.
  final Widget? search;

  /// Name of the search button on narrow bars and of the search layer. Default: [CmStrings.headerBarSearch].
  final String? searchLabel;

  /// Anything after the user pill, shown at every width, e.g. an icon-only notifications button
  /// (`CmButton.iconOnly(icon: CmIcons.bell, label: 'Notifications', count: 3)`).
  final List<Widget> end;

  /// Called when the full-screen search layer opens (true) or closes (false).
  final ValueChanged<bool>? onSearchToggle;

  @override
  Size get preferredSize => const Size.fromHeight(80);

  @override
  State<CmHeaderBar> createState() => _CmHeaderBarState();
}

class _CmHeaderBarState extends State<CmHeaderBar> {
  PageRoute<void>? _layer;

  @override
  void didUpdateWidget(CmHeaderBar old) {
    super.didUpdateWidget(old);
    // The layer shows the newest search widget (results that arrived while it is open).
    final layer = _layer;
    if (layer != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (layer.isActive) layer.changedExternalState();
      });
    }
  }

  Future<void> _openSearch() async {
    if (_layer != null || widget.search == null) return;
    final route = PageRouteBuilder<void>(
      opaque: true,
      pageBuilder: (context, _, _) => widget.search == null ? const SizedBox.shrink() : CmSearchLayer(label: widget.searchLabel, child: widget.search!),
      transitionsBuilder: (context, a, _, child) => FadeTransition(opacity: a, child: child),
      transitionDuration: const Duration(milliseconds: 150),
      reverseTransitionDuration: const Duration(milliseconds: 100),
    );
    _layer = route;
    widget.onSearchToggle?.call(true);
    await Navigator.of(context).push(route);
    _layer = null;
    if (mounted) widget.onSearchToggle?.call(false);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final narrow = box.maxWidth <= 900;
      final layer = _layer;
      if (!narrow && layer != null) {
        // The bar became wide: the search is back inline.
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (layer.isActive) Navigator.of(context).removeRoute(layer);
        });
      }
      return _bar(context, narrow);
    });
  }

  Widget _bar(BuildContext context, bool narrow) {
    final w = widget;
    final c = CmTheme.colorsOf(context);
    final strings = CmStrings.of(context);
    final screen = CmBreakpoints.of(context);
    final phone = screen == CmScreen.phone;
    // Under 640px the controls on the right sit without gaps (each keeps its touch area).
    final gap = phone ? 0.0 : CmSpace.s20;
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
    final avatarW = w.avatar ?? Container(width: 32, height: 32, decoration: BoxDecoration(color: c.bgIcon, shape: BoxShape.circle), child: Center(child: CmIcon(CmIcons.user, size: 18, color: c.textDefault)));
    final hasSearch = w.search != null;
    return Container(
      height: phone ? 64 : 80,
      padding: EdgeInsets.symmetric(horizontal: phone ? CmSpace.s10 : CmSpace.s30),
      color: c.bgSurface,
      child: Row(children: [
        if (w.onMenuTap != null)
          Semantics(
            button: true,
            label: strings.openNavigation,
            excludeSemantics: true, onTap: w.onMenuTap,
            child: InkWell(onTap: w.onMenuTap, child: Padding(padding: const EdgeInsets.all(10), child: CmIcon(CmIcons.menu, size: 22, color: c.textDefault))),
          ),
        // Flexible: a wide logo shrinks before the controls on the right are pushed off the edge.
        Flexible(child: Semantics(label: 'Commmerce', image: true, excludeSemantics: true, child: SizedBox(height: phone ? 16 : 20, child: w.logo))),
        if (w.storeName != null && !phone) ...[
          SizedBox(width: screen == CmScreen.desktop ? 48 : 24),
          // flex 10 against the Spacer's 1: the store name takes the room it needs before the gap does.
          Flexible(flex: 10, child: Semantics(
            button: true,
            label: strings.storeSwitch(w.storeName!),
            excludeSemantics: true, onTap: w.onStoreTap,
            child: InkWell(
              onTap: w.onStoreTap,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Flexible(child: Text(w.storeName!, overflow: TextOverflow.ellipsis, maxLines: 1, style: CmType.bodyLg.copyWith(fontSize: 18, color: c.textDefault))),
                const SizedBox(width: 8),
                CmIcon(CmIcons.chevronDown, size: 18, color: c.textDefault),
              ]),
            ),
          )),
        ],
        if (hasSearch && !narrow)
          Flexible(
            flex: 20,
            child: Padding(
              padding: const EdgeInsetsDirectional.only(start: CmSpace.s20),
              child: ConstrainedBox(constraints: const BoxConstraints(minWidth: 200, maxWidth: 560), child: w.search!),
            ),
          ),
        const Spacer(),
        if (hasSearch && narrow)
          Padding(
            padding: EdgeInsetsDirectional.only(start: gap),
            child: Semantics(
              button: true,
              label: w.searchLabel ?? strings.headerBarSearch,
              excludeSemantics: true,
              onTap: _openSearch,
              child: InkWell(
                onTap: _openSearch,
                borderRadius: BorderRadius.circular(CmRadius.sm),
                child: SizedBox.square(dimension: 44, child: Center(child: CmIcon(CmIcons.search, size: 20, color: c.iconSelected))),
              ),
            ),
          ),
        if (screen == CmScreen.desktop && !narrow) ...[for (final a in w.actions) Padding(padding: EdgeInsetsDirectional.only(start: gap), child: a)],
        if (w.walletBalance != null && !phone)
          Padding(
            padding: EdgeInsetsDirectional.only(start: gap),
            child: pill(label: strings.walletBalance(w.walletBalance!), onTap: w.onWalletTap, child: Text(w.walletBalance!, style: CmType.bodyLg.copyWith(fontWeight: FontWeight.w500, color: c.textDefault))),
          ),
        if (w.userName != null)
          Padding(
            padding: EdgeInsetsDirectional.only(start: gap),
            child: pill(
              round: true,
              label: strings.accountOf(w.userName!),
              onTap: w.onUserTap,
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                if (!phone)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 160),
                    child: Padding(padding: const EdgeInsetsDirectional.only(start: 14, end: 18), child: Text(w.userName!, overflow: TextOverflow.ellipsis, maxLines: 1, style: CmType.bodyLg.copyWith(fontSize: 18, color: c.textDefault))),
                  ),
                avatarW,
              ]),
            ),
          ),
        for (final e in w.end) Padding(padding: EdgeInsetsDirectional.only(start: phone ? 0 : CmSpace.s10), child: e),
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
