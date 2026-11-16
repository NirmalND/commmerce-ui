import * as React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { CmButton, CmTextField, CmCheckbox, CmRadio, CmRadioGroup, CmToggle, CmSelect, CmSearch, CmCombobox, CmGlobalSearch, CmDatePicker, CmDateRangePicker, CmFileUpload, CmColorField, CmSignatureField, CmOptionGroup, CmTag, CmBadge, CmCard, CmBanner, CmIcon, CmPageHeader, CmActionBar, CmSaveBar, CmInfoPanel, CmInfoItem, CmAccordion, CmEmptyState, CmSkeleton, CmSkeletonDisplay, CmComment, CmCommentBox, CmTimeline, CmTimelineItem, CmSmartTip, CmSmartTips, CmPagination, CmStatusTabs, CmTableHeader, CmDataTable, CmResourceList, CmResourceItem, CmNestedList, CmNestedItem, CmReportTile, CmReportTiles, CmNavItem, CmSideNavigation, CmHeaderBar, CmBottomNavigation, CmMobileMenu, CmFlashOfferBar, CmLinkTabs, CmAppCard, CmModal, CmSidePanel, CmFilterPanel, CmMenuItem, CmActionMenu, CmBottomSheet, CmNotificationPanel, CmNotificationItem, CmAvatar, CmThumbnail, CmTooltip, CmToast, CmToastRegion, CmSpinner, CmProgressBar, CmStack, CmGrid, CmLayout, CmLayoutSection, CmPage, CmAppFrame, CmMetric, CmBoard, CmBoardColumn, CmBoardCard, CmCalendar, CmCalendarEvent } from '@commmerce/ui';
import type { CloseReason, FilterValues, MenuItem, NotificationItem, ToastDismissReason, GlobalSearchGroup, GlobalSearchItem, BoardMoveDetail, CalendarMoveDetail, CalendarRange, CalendarAddDetail } from '@commmerce/ui';
export type { GlobalSearchGroup, GlobalSearchItem, NotificationItem } from '@commmerce/ui';
export { showToast, configure, setStrings, resetStrings, getDefaultStrings, formatNumber, formatDate } from '@commmerce/ui';
export type { CmStrings, CmStringsInput, Message, MessageVars, PluralMessage } from '@commmerce/ui';
export type { ShowToastOptions, DateRangePreset, DateRangePresetKey, MetricTrend, MetricSentiment, ColorSwatch, BoardMoveDetail, BoardMoveSource, CalendarView, CalendarEventTone, CalendarMoveSource, CalendarMoveDetail, CalendarTimes, CalendarRange, CalendarAddDetail } from '@commmerce/ui';
import type { NavItem } from '@commmerce/ui';

export const Button = createComponent({ tagName: 'cm-button', elementClass: CmButton, react: React });

export const TextField = createComponent({
  tagName: 'cm-text-field',
  elementClass: CmTextField,
  react: React,
  events: {
    onInput: 'input' as EventName<InputEvent>,
    onChange: 'change' as EventName<Event>,
  },
});

export const Checkbox = createComponent({
  tagName: 'cm-checkbox',
  elementClass: CmCheckbox,
  react: React,
  events: { onChange: 'change' as EventName<Event> },
});

export const RadioGroup = createComponent({
  tagName: 'cm-radio-group',
  elementClass: CmRadioGroup,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

export const Radio = createComponent({ tagName: 'cm-radio', elementClass: CmRadio, react: React });

export const Toggle = createComponent({
  tagName: 'cm-toggle',
  elementClass: CmToggle,
  react: React,
  events: { onChange: 'change' as EventName<Event> },
});

export const Select = createComponent({
  tagName: 'cm-select',
  elementClass: CmSelect,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

export const Search = createComponent({
  tagName: 'cm-search',
  elementClass: CmSearch,
  react: React,
  events: {
    onInput: 'input' as EventName<Event>,
    onChange: 'change' as EventName<Event>,
    onSearch: 'cm-search' as EventName<CustomEvent<{ value: string }>>,
    onFilter: 'cm-filter' as EventName<CustomEvent>,
  },
});

export const Combobox = createComponent({
  tagName: 'cm-combobox',
  elementClass: CmCombobox,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
    onSearch: 'cm-search' as EventName<CustomEvent<{ query: string }>>,
    onCreate: 'cm-create' as EventName<CustomEvent<{ value: string }>>,
  },
});

export const GlobalSearch = createComponent({
  tagName: 'cm-global-search',
  elementClass: CmGlobalSearch,
  react: React,
  events: {
    onSearch: 'cm-search' as EventName<CustomEvent<{ query: string }>>,
    onSelect: 'cm-select' as EventName<CustomEvent<{ href: string; item?: GlobalSearchItem; group: GlobalSearchGroup }>>,
  },
});

export const DatePicker = createComponent({
  tagName: 'cm-date-picker',
  elementClass: CmDatePicker,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

export const DateRangePicker = createComponent({
  tagName: 'cm-date-range-picker',
  elementClass: CmDateRangePicker,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

export const FileUpload = createComponent({
  tagName: 'cm-file-upload',
  elementClass: CmFileUpload,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onReject: 'cm-reject' as EventName<CustomEvent<{ files: File[] }>>,
  },
});

export const ColorField = createComponent({
  tagName: 'cm-color-field',
  elementClass: CmColorField,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

/** Signature field (since 1.4). `onChange` is `cm-change`: its `detail` is `{ value, empty, mode }`. */
export const SignatureField = createComponent({
  tagName: 'cm-signature-field',
  elementClass: CmSignatureField,
  react: React,
  events: {
    onChange: 'cm-change' as EventName<CustomEvent<{ value: string; empty: boolean; mode: 'draw' | 'type' }>>,
  },
});

export const OptionGroup = createComponent({
  tagName: 'cm-option-group',
  elementClass: CmOptionGroup,
  react: React,
  events: {
    onChange: 'change' as EventName<Event>,
    onInput: 'input' as EventName<Event>,
  },
});

export const Tag = createComponent({
  tagName: 'cm-tag',
  elementClass: CmTag,
  react: React,
  events: { onRemove: 'cm-remove' as EventName<CustomEvent> },
});

export const Badge = createComponent({ tagName: 'cm-badge', elementClass: CmBadge, react: React });

export const Stack = createComponent({ tagName: 'cm-stack', elementClass: CmStack, react: React });
export const Grid = createComponent({ tagName: 'cm-grid', elementClass: CmGrid, react: React });
export const Layout = createComponent({ tagName: 'cm-layout', elementClass: CmLayout, react: React });
export const LayoutSection = createComponent({ tagName: 'cm-layout-section', elementClass: CmLayoutSection, react: React });
export const Page = createComponent({ tagName: 'cm-page', elementClass: CmPage, react: React });
export const AppFrame = createComponent({
  tagName: 'cm-app-frame',
  elementClass: CmAppFrame,
  react: React,
  events: { onMenuToggle: 'cm-menu-toggle' as EventName<CustomEvent<{ open: boolean }>> },
});
export const Card = createComponent({ tagName: 'cm-card', elementClass: CmCard, react: React });

export const Banner = createComponent({
  tagName: 'cm-banner',
  elementClass: CmBanner,
  react: React,
  events: { onDismiss: 'cm-dismiss' as EventName<CustomEvent> },
});

export const Icon = createComponent({ tagName: 'cm-icon', elementClass: CmIcon, react: React });

export const PageHeader = createComponent({
  tagName: 'cm-page-header',
  elementClass: CmPageHeader,
  react: React,
  events: {
    onPrevious: 'cm-previous' as EventName<CustomEvent>,
    onNext: 'cm-next' as EventName<CustomEvent>,
  },
});

export const ActionBar = createComponent({ tagName: 'cm-action-bar', elementClass: CmActionBar, react: React });

export const SaveBar = createComponent({
  tagName: 'cm-save-bar',
  elementClass: CmSaveBar,
  react: React,
  events: {
    onSave: 'cm-save' as EventName<CustomEvent>,
    onDiscard: 'cm-discard' as EventName<CustomEvent>,
  },
});

export const InfoPanel = createComponent({
  tagName: 'cm-info-panel',
  elementClass: CmInfoPanel,
  react: React,
  events: { onAction: 'cm-action' as EventName<CustomEvent> },
});

export const InfoItem = createComponent({ tagName: 'cm-info-item', elementClass: CmInfoItem, react: React });

export const Accordion = createComponent({
  tagName: 'cm-accordion',
  elementClass: CmAccordion,
  react: React,
  events: { onToggle: 'cm-toggle' as EventName<CustomEvent<{ open: boolean }>> },
});

export const EmptyState = createComponent({
  tagName: 'cm-empty-state',
  elementClass: CmEmptyState,
  react: React,
  events: { onAction: 'cm-action' as EventName<CustomEvent> },
});

export const Skeleton = createComponent({ tagName: 'cm-skeleton', elementClass: CmSkeleton, react: React });

export const SkeletonDisplay = createComponent({ tagName: 'cm-skeleton-display', elementClass: CmSkeletonDisplay, react: React });

export const Comment = createComponent({ tagName: 'cm-comment', elementClass: CmComment, react: React });

export const CommentBox = createComponent({
  tagName: 'cm-comment-box',
  elementClass: CmCommentBox,
  react: React,
  events: { onSubmit: 'cm-submit' as EventName<CustomEvent<{ value: string }>> },
});

export const Timeline = createComponent({
  tagName: 'cm-timeline',
  elementClass: CmTimeline,
  react: React,
  events: { onLoadMore: 'cm-load-more' as EventName<CustomEvent> },
});

export const TimelineItem = createComponent({ tagName: 'cm-timeline-item', elementClass: CmTimelineItem, react: React });

/** Board: render columns and cards from your data and set `controlled`; move the card in your state in `onMove`. */
export const Board = createComponent({
  tagName: 'cm-board',
  elementClass: CmBoard,
  react: React,
  events: {
    onMove: 'cm-move' as EventName<CustomEvent<BoardMoveDetail>>,
    onLoadMore: 'cm-load-more' as EventName<CustomEvent<{ column: CmBoardColumn; value: string }>>,
  },
});

export const BoardColumn = createComponent({
  tagName: 'cm-board-column',
  elementClass: CmBoardColumn,
  react: React,
  events: { onLoadMore: 'cm-load-more' as EventName<CustomEvent<{ column: CmBoardColumn; value: string }>> },
});

export const BoardCard = createComponent({ tagName: 'cm-board-card', elementClass: CmBoardCard, react: React });

/**
 * Calendar: render `CalendarEvent`s from your data, load them in `onRangeChange`, and set `controlled` to change an
 * event's start and end in your state in `onMove`.
 */
export const Calendar = createComponent({
  tagName: 'cm-calendar',
  elementClass: CmCalendar,
  react: React,
  events: {
    onRangeChange: 'cm-range-change' as EventName<CustomEvent<CalendarRange>>,
    onMove: 'cm-move' as EventName<CustomEvent<CalendarMoveDetail>>,
    onAdd: 'cm-add' as EventName<CustomEvent<CalendarAddDetail>>,
    onOpen: 'cm-open' as EventName<CustomEvent<{ value: string; event: CmCalendarEvent }>>,
  },
});

export const CalendarEvent = createComponent({ tagName: 'cm-calendar-event', elementClass: CmCalendarEvent, react: React });

export const SmartTip = createComponent({ tagName: 'cm-smart-tip', elementClass: CmSmartTip, react: React });

export const SmartTips = createComponent({
  tagName: 'cm-smart-tips',
  elementClass: CmSmartTips,
  react: React,
  events: { onTour: 'cm-tour' as EventName<CustomEvent> },
});

export const Pagination = createComponent({
  tagName: 'cm-pagination',
  elementClass: CmPagination,
  react: React,
  events: {
    onPageChange: 'cm-page-change' as EventName<CustomEvent<{ page: number }>>,
    onPageSizeChange: 'cm-page-size-change' as EventName<CustomEvent<{ pageSize: number }>>,
  },
});

export const StatusTabs = createComponent({
  tagName: 'cm-status-tabs',
  elementClass: CmStatusTabs,
  react: React,
  events: { onChange: 'change' as EventName<Event> },
});

export const TableHeader = createComponent({
  tagName: 'cm-table-header',
  elementClass: CmTableHeader,
  react: React,
  events: {
    onSort: 'cm-sort' as EventName<CustomEvent<{ key: string; direction: 'ascending' | 'descending' }>>,
    onSelectAll: 'cm-select-all' as EventName<CustomEvent<{ checked: boolean }>>,
  },
});

export const DataTable = createComponent({
  tagName: 'cm-data-table',
  elementClass: CmDataTable,
  react: React,
  events: {
    onSort: 'cm-sort' as EventName<CustomEvent<{ key: string; direction: 'ascending' | 'descending' }>>,
  },
});

export const ResourceList = createComponent({
  tagName: 'cm-resource-list',
  elementClass: CmResourceList,
  react: React,
  events: { onSelectionChange: 'cm-selection-change' as EventName<CustomEvent<{ selected: string[]; all: boolean }>> },
});

export const ResourceItem = createComponent({
  tagName: 'cm-resource-item',
  elementClass: CmResourceItem,
  react: React,
  events: { onResourceSelect: 'cm-resource-select' as EventName<CustomEvent<{ value: string; selected: boolean }>> },
});

type ReorderDetail = { item: HTMLElement; from: number; to: number };
/** `cm-move` (since 1.3): a row moved into another `cm-nested-list` with the same `group`. */
type MoveDetail = { item: HTMLElement; from: number; to: number; fromList: HTMLElement; toList: HTMLElement };

export const NestedList = createComponent({
  tagName: 'cm-nested-list',
  elementClass: CmNestedList,
  react: React,
  events: {
    onReorder: 'cm-reorder' as EventName<CustomEvent<ReorderDetail>>,
    onMove: 'cm-move' as EventName<CustomEvent<MoveDetail>>,
    onToggle: 'cm-toggle' as EventName<CustomEvent<{ open: boolean }>>,
  },
});

export const NestedItem = createComponent({
  tagName: 'cm-nested-item',
  elementClass: CmNestedItem,
  react: React,
  events: {
    onReorder: 'cm-reorder' as EventName<CustomEvent<ReorderDetail>>,
    onMove: 'cm-move' as EventName<CustomEvent<MoveDetail>>,
  },
});

export const ReportTile = createComponent({ tagName: 'cm-report-tile', elementClass: CmReportTile, react: React });

export const ReportTiles = createComponent({ tagName: 'cm-report-tiles', elementClass: CmReportTiles, react: React });

export const Metric = createComponent({ tagName: 'cm-metric', elementClass: CmMetric, react: React });

type NavigateDetail = { item: NavItem; value: string; href: string };

export const NavItemElement = createComponent({ tagName: 'cm-nav-item', elementClass: CmNavItem, react: React });

export const SideNavigation = createComponent({
  tagName: 'cm-side-navigation',
  elementClass: CmSideNavigation,
  react: React,
  events: {
    onNavigate: 'cm-navigate' as EventName<CustomEvent<NavigateDetail>>,
    onExpand: 'cm-expand' as EventName<CustomEvent<{ item: NavItem; expanded: boolean }>>,
    onCollapse: 'cm-collapse' as EventName<CustomEvent<{ collapsed: boolean }>>,
  },
});

export const HeaderBar = createComponent({
  tagName: 'cm-header-bar',
  elementClass: CmHeaderBar,
  react: React,
  events: {
    onStoreSwitch: 'cm-store-switch' as EventName<CustomEvent>,
    onWallet: 'cm-wallet' as EventName<CustomEvent>,
    onAccount: 'cm-account' as EventName<CustomEvent>,
    onSearchToggle: 'cm-search-toggle' as EventName<CustomEvent<{ open: boolean }>>,
  },
});

export const BottomNavigation = createComponent({
  tagName: 'cm-bottom-navigation',
  elementClass: CmBottomNavigation,
  react: React,
  events: { onNavigate: 'cm-navigate' as EventName<CustomEvent<NavigateDetail>> },
});

export const MobileMenu = createComponent({
  tagName: 'cm-mobile-menu',
  elementClass: CmMobileMenu,
  react: React,
  events: {
    onNavigate: 'cm-navigate' as EventName<CustomEvent<NavigateDetail>>,
    onStoreSwitch: 'cm-store-switch' as EventName<CustomEvent>,
    onAccount: 'cm-account' as EventName<CustomEvent>,
  },
});

export const FlashOfferBar = createComponent({
  tagName: 'cm-flash-offer-bar',
  elementClass: CmFlashOfferBar,
  react: React,
  events: { onDismiss: 'cm-dismiss' as EventName<CustomEvent> },
});

export const LinkTabs = createComponent({
  tagName: 'cm-link-tabs',
  elementClass: CmLinkTabs,
  react: React,
  events: { onNavigate: 'cm-navigate' as EventName<CustomEvent<NavigateDetail>> },
});

export const AppCard = createComponent({ tagName: 'cm-app-card', elementClass: CmAppCard, react: React });

/** Overlay events: `onClose` is cancelable (`event.preventDefault()` keeps it open). */
const overlayEvents = {
  onOpen: 'cm-open' as EventName<CustomEvent>,
  onClose: 'cm-close' as EventName<CustomEvent<{ reason: CloseReason }>>,
  onClosed: 'cm-closed' as EventName<CustomEvent>,
};

export const Modal = createComponent({ tagName: 'cm-modal', elementClass: CmModal, react: React, events: overlayEvents });

export const SidePanel = createComponent({ tagName: 'cm-side-panel', elementClass: CmSidePanel, react: React, events: overlayEvents });

export const FilterPanel = createComponent({
  tagName: 'cm-filter-panel',
  elementClass: CmFilterPanel,
  react: React,
  events: {
    ...overlayEvents,
    onFilterApply: 'cm-filter-apply' as EventName<CustomEvent<{ values: FilterValues; query: string }>>,
    onFilterReset: 'cm-filter-reset' as EventName<CustomEvent>,
  },
});

export const MenuItemElement = createComponent({ tagName: 'cm-menu-item', elementClass: CmMenuItem, react: React });

export const ActionMenu = createComponent({
  tagName: 'cm-action-menu',
  elementClass: CmActionMenu,
  react: React,
  events: {
    onSelect: 'cm-select' as EventName<CustomEvent<{ value: string; item: MenuItem }>>,
    onToggle: 'cm-toggle' as EventName<CustomEvent<{ open: boolean }>>,
  },
});

export const BottomSheet = createComponent({
  tagName: 'cm-bottom-sheet',
  elementClass: CmBottomSheet,
  react: React,
  events: { ...overlayEvents, onSelect: 'cm-select' as EventName<CustomEvent<{ value: string; item: MenuItem }>> },
});

export const NotificationItemElement = createComponent({ tagName: 'cm-notification-item', elementClass: CmNotificationItem, react: React });

export const NotificationPanel = createComponent({
  tagName: 'cm-notification-panel',
  elementClass: CmNotificationPanel,
  react: React,
  events: {
    ...overlayEvents,
    onSelect: 'cm-select' as EventName<CustomEvent<{ value: string; item: NotificationItem }>>,
    onMarkAllRead: 'cm-mark-all-read' as EventName<CustomEvent>,
  },
});

export const Tooltip = createComponent({
  tagName: 'cm-tooltip',
  elementClass: CmTooltip,
  react: React,
  events: { onShow: 'cm-show' as EventName<CustomEvent>, onHide: 'cm-hide' as EventName<CustomEvent> },
});

export const Avatar = createComponent({ tagName: 'cm-avatar', elementClass: CmAvatar, react: React });

export const Thumbnail = createComponent({ tagName: 'cm-thumbnail', elementClass: CmThumbnail, react: React });

export const Toast = createComponent({
  tagName: 'cm-toast',
  elementClass: CmToast,
  react: React,
  events: {
    onAction: 'cm-action' as EventName<CustomEvent<void>>,
    onDismiss: 'cm-dismiss' as EventName<CustomEvent<{ reason: ToastDismissReason }>>,
  },
});

export const ToastRegion = createComponent({ tagName: 'cm-toast-region', elementClass: CmToastRegion, react: React });

export const Spinner = createComponent({ tagName: 'cm-spinner', elementClass: CmSpinner, react: React });

export const ProgressBar = createComponent({ tagName: 'cm-progress-bar', elementClass: CmProgressBar, react: React });
