import 'package:flutter/widgets.dart';

/// Every piece of text the widgets write themselves: button labels, screen reader names and
/// announcements, dates. Text you pass in (headings, labels, constructor parameters that already
/// have an English default such as `closeLabel`) is not here.
///
/// The defaults are English. To translate, wrap the app once in [CmLocalizations]:
///
/// ```dart
/// CmLocalizations(
///   strings: const CmStrings(saveBarSave: 'Enregistrer', saveBarDiscard: 'Annuler'),
///   child: MaterialApp(...),
/// )
/// ```
///
/// Fields that take values are functions, so word order and plural rules stay in your code:
///
/// ```dart
/// static String _reviews(int n) => n == 1 ? '1 avis' : '$n avis';
/// const CmStrings(reviews: _reviews)
/// ```
class CmStrings {
  const CmStrings({
    this.dismiss = 'Dismiss',
    this.requiredSuffix = ', required',
    this.loading = 'Loading',
    this.inProgress = 'In progress',
    this.expanded = 'Expanded',
    this.collapsed = 'Collapsed',
    this.actions = 'Actions',
    this.selectAll = 'Select all',
    this.deselectAll = 'Deselect all',
    this.sortable = 'sortable',
    this.sortedAscending = 'sorted ascending',
    this.sortedDescending = 'sorted descending',
    this.monthsShort = const ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    this.am = 'am',
    this.pm = 'pm',
    this.tagRemove = _tagRemove,
    this.backTo = _backTo,
    this.breadcrumb = 'Breadcrumb',
    this.saveBarDiscard = 'Discard',
    this.saveBarSave = 'Save',
    this.paginationSummary = _paginationSummary,
    this.paginationPage = _paginationPage,
    this.previousPage = 'Previous page',
    this.nextPage = 'Next page',
    this.selectItem = _selectItem,
    this.itemsSelected = _itemsSelected,
    this.commentBy = _commentBy,
    this.opensInNewTab = '(opens in a new tab)',
    this.sortedBy = _sortedBy,
    this.noData = 'No data',
    this.statusTabs = 'Status',
    this.captionLoading = _captionLoading,
    this.filters = 'Filters',
    this.withApplied = _withApplied,
    this.applied = _applied,
    this.fileTypeNotAllowed = _fileTypeNotAllowed,
    this.fileTooLarge = _fileTooLarge,
    this.maxFiles = _maxFiles,
    this.addMore = 'Add more',
    this.removeFile = _removeFile,
    this.chosenFiles = 'Chosen files',
    this.kilobytes = _kilobytes,
    this.megabytes = _megabytes,
    this.movedTo = _movedTo,
    this.showSection = _showSection,
    this.hideSection = _hideSection,
    this.reorder = _reorder,
    this.reorderHint = 'Press up or down arrow to move.',
    this.moveUp = 'Move up',
    this.moveDown = 'Move down',
    this.pinned = _pinned,
    // 1.3: nested list moves between lists, board, colour field, photo upload, option groups.
    this.reorderHintGroup = 'Press up or down arrow to move. At either end of the list, the arrow moves it into the list before or after.',
    this.movedToList = _movedToList,
    this.boardLabel = 'Board',
    this.boardPickedUp = _boardPickedUp,
    this.boardOver = _boardOver,
    this.boardMoved = _boardMoved,
    this.boardSameSpot = _boardSameSpot,
    this.boardCancelled = _boardCancelled,
    this.boardRefused = _boardRefused,
    this.boardReverted = _boardReverted,
    this.boardColumnCount = _boardColumnCount,
    this.boardColumnLoadMore = 'Load more',
    this.boardColumnLoading = _boardColumnLoading,
    this.boardColumnEmpty = 'No cards',
    this.boardCardRoleDescription = 'movable card',
    this.boardCardInstructions = 'Press Space to pick up. Then use the arrow keys to choose a column and a position, Space or Enter to drop, and Escape to cancel.',
    this.boardCardOpenHint = 'Press Enter to open.',
    this.boardCardSaving = 'Saving',
    // Calendar (`calendar` on the web).
    this.calendarLabel = 'Calendar',
    this.calendarPreviousMonth = 'Previous month',
    this.calendarNextMonth = 'Next month',
    this.calendarPreviousWeek = 'Previous week',
    this.calendarNextWeek = 'Next week',
    this.calendarPreviousDays = _calendarPreviousDays,
    this.calendarNextDays = _calendarNextDays,
    this.calendarPreviousDay = 'Previous day',
    this.calendarNextDay = 'Next day',
    this.calendarToday = 'Today',
    this.calendarViews = 'View',
    this.calendarMonth = 'Month',
    this.calendarWeek = 'Week',
    this.calendarDay = 'Day',
    this.calendarAllDay = 'All day',
    this.calendarTime = 'Time',
    this.calendarAdd = 'Add',
    this.calendarAddOn = _calendarAddOn,
    this.calendarAddAllDay = _calendarAddAllDay,
    this.calendarAddAt = _calendarAddAt,
    this.calendarMore = _calendarMore,
    this.calendarMoreLabel = _calendarMoreLabel,
    this.calendarDayEvents = _calendarDayEvents,
    this.calendarNoEvents = 'No events',
    this.calendarLoading = 'Loading events',
    this.calendarTimeRange = _calendarTimeRange,
    this.calendarTimed = _calendarTimed,
    this.calendarAllDayOn = _calendarAllDayOn,
    this.calendarAllDayRange = _calendarAllDayRange,
    this.calendarEventName = _calendarEventName,
    this.calendarEventNameKind = _calendarEventNameKind,
    this.calendarRoleDescription = 'movable event',
    this.calendarOpenHint = 'Press Enter to open.',
    this.calendarInstructions = 'Press Space to pick up, then the arrow keys to choose a day or time, Space or Enter to drop and Escape to cancel.',
    this.calendarGridHelp = 'Use the arrow keys to move between days, times and events, and Page Up and Page Down for the previous or next period.',
    this.calendarSaving = 'Saving',
    this.calendarPickedUp = _calendarPickedUp,
    this.calendarOver = _calendarOver,
    this.calendarMoved = _calendarMoved,
    this.calendarSameSpot = _calendarSameSpot,
    this.calendarCancelled = _calendarCancelled,
    this.calendarRefused = _calendarRefused,
    this.calendarReverted = _calendarReverted,
    this.calendarMonths = const ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    this.calendarWeekdays = const ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    this.calendarWeekdaysShort = const ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    this.calendarDate = _calendarDate,
    this.calendarDateWithYear = _calendarDateWithYear,
    this.calendarMonthYear = _calendarMonthYear,
    this.calendarDayRange = _calendarDayRange,
    this.colorFieldSwatch = _colorFieldSwatch,
    this.colorFieldHex = 'Hex code',
    this.colorFieldHexNamed = _colorFieldHexNamed,
    this.colorFieldPlaceholder = '#RRGGBB',
    this.colorFieldRequired = 'Please choose a colour.',
    this.colorFieldInvalid = 'Enter a colour as #RRGGBB, for example #2e6faf.',
    this.colorFieldNames = const {
      'black': 'Black',
      'grey': 'Grey',
      'lightGrey': 'Light grey',
      'red': 'Red',
      'darkOrange': 'Dark orange',
      'orange': 'Orange',
      'yellow': 'Yellow',
      'lightGreen': 'Light green',
      'green': 'Green',
      'lightBlue': 'Light blue',
      'blue': 'Blue',
      'indigo': 'Indigo',
    },
    // Signature field (web `signatureField.*`).
    this.signatureFieldModes = 'How to sign',
    this.signatureFieldDraw = 'Draw',
    this.signatureFieldType = 'Type',
    this.signatureFieldPad = 'Signature drawing area',
    this.signatureFieldPadSigned = 'Signature drawing area, signed',
    this.signatureFieldInstructions = 'Draw your signature with a mouse, finger or pen. To sign with the keyboard, choose Type.',
    this.signatureFieldSignHere = 'Sign here',
    this.signatureFieldTypeLabel = 'Type your full name',
    this.signatureFieldTypePlaceholder = 'Type your full name',
    this.signatureFieldUndo = 'Undo',
    this.signatureFieldUndoLabel = 'Undo last stroke',
    this.signatureFieldClear = 'Clear',
    this.signatureFieldClearLabel = 'Clear signature',
    this.signatureFieldCleared = 'Signature cleared',
    this.signatureFieldUndone = 'Last stroke removed',
    this.signatureFieldRequired = 'Please sign here.',
    this.takePhoto = 'Take a photo',
    this.retakePhoto = 'Retake',
    this.removePhoto = 'Remove',
    this.retakePhotoOf = _retakePhotoOf,
    this.removePhotoOf = _removePhotoOf,
    this.photo = 'photo',
    this.selectGrouped = _grouped,
    this.comboboxGrouped = _grouped,
    this.reviews = _reviews,
    this.byDeveloper = _byDeveloper,
    this.rated = _rated,
    this.offer = _offer,
    this.viewDetails = 'View Details',
    this.viewDetailsOf = _viewDetailsOf,
    this.mainNavigation = 'Main navigation',
    this.openNavigation = 'Open navigation',
    this.navCount = _navCount,
    this.storeSwitch = _storeSwitch,
    this.walletBalance = _walletBalance,
    this.accountOf = _accountOf,
    this.opens = _opens,
    this.back = 'Back',
    this.profile = 'Profile',
    this.loggedInToStore = _loggedInToStore,
    this.loggedInToStoreCaps = 'Logged in to store',
    this.switchStore = 'Switch store',
    this.account = 'Account',
    this.dismissOffer = 'Dismiss offer',
    this.notifications = 'Notifications',
    this.unread = _unread,
    this.noImage = _noImage,
    this.notSet = 'Not set',
    this.chooseDate = 'Choose a date',
    this.chooseDates = 'Choose dates',
    this.dateRange = _dateRange,
    this.presetRanges = 'Preset ranges',
    this.presetToday = 'Today',
    this.presetYesterday = 'Yesterday',
    this.presetLast7Days = 'Last 7 days',
    this.presetLast30Days = 'Last 30 days',
    this.presetThisMonth = 'This month',
    this.presetLastMonth = 'Last month',
    this.noResults = 'No results',
    this.addValue = _addValue,
    // 1.1 and 1.2 additions (app frame, global search, button, notification panel, timeline, metric, date picker time).
    this.close = 'Close',
    this.buttonLabelWithCount = _buttonLabelWithCount,
    this.buttonCount = _buttonCount,
    this.buttonCountOverflow = _buttonCountOverflow,
    this.sideNavCollapse = 'Collapse menu',
    this.sideNavExpand = 'Expand menu',
    this.headerBarSearch = 'Search',
    this.globalSearchLabel = 'Search',
    this.globalSearchPlaceholder = 'Search',
    this.globalSearchResults = _globalSearchResults,
    this.seeAll = 'See all',
    this.clearSearch = 'Clear search',
    this.markAllRead = 'Mark all read',
    this.justNow = 'Just now',
    this.minutesAgo = _minutesAgo,
    this.hoursAgo = _hoursAgo,
    this.daysAgo = _daysAgo,
    this.inMinutes = _inMinutes,
    this.inHours = _inHours,
    this.inDays = _inDays,
    this.showAll = 'Show all',
    this.showLess = 'Show less',
    this.timelineLabel = 'Activity',
    this.showMore = 'Show more',
    this.loadingActivity = 'Loading activity',
    this.metricUp = _metricUp,
    this.metricDown = _metricDown,
    this.metricFlat = _metricFlat,
    this.metricGood = _metricGood,
    this.metricBad = _metricBad,
    this.metricLoading = _metricLoading,
    // Sparkline (web `sparkline.*`, 1.10).
    this.sparklineSummary = _sparklineSummary,
    this.sparklineSummaryAt = _sparklineSummaryAt,
    this.sparklineEmpty = _sparklineEmpty,
    this.time = 'Time',
    this.timeFor = _timeFor,
    this.patternHour = 'hh',
    this.patternMinute = 'mm',
    // 1.6 and 1.7: undo toasts, command palette, data table tools, status tabs dropdown, combobox tags, file upload.
    this.toastUndo = 'Undo',
    this.toastShortcut = 'Press F6 to reach it.',
    this.commandPaletteLabel = 'Command palette',
    this.commandPalettePlaceholder = 'Search or run a command',
    this.recent = 'Recent',
    this.tableScrollHint = 'Scroll for more',
    this.tableColumns = 'Columns',
    this.tableShowColumns = 'Show columns',
    this.tableResize = _tableResize,
    this.tableResized = _tableResized,
    this.tableViewAll = 'View all fields',
    this.tableViewLess = 'Hide fields',
    this.tableRowAction = _tableRowAction,
    this.statusTabsOption = _statusTabsOption,
    this.comboboxMore = _comboboxMore,
    this.fileUploadPrompt = _fileUploadPrompt,
    this.fileUploadBrowse = 'Browse',
    this.fileUploadDrop = 'Drop files to upload',
    this.fileUploading = _fileUploading,
    this.fileUploadCancel = _fileUploadCancel,
    this.buttonGroupMore = 'More',
    // 1.16: time picker and the report date range picker.
    this.presetThisWeek = 'This week',
    this.presetLastWeek = 'Last week',
    this.presetLast28Days = 'Last 28 days',
    this.presetLast90Days = 'Last 90 days',
    this.presetLast12Months = 'Last 12 months',
    this.presetThisYear = 'This year',
    this.presetLastYear = 'Last year',
    this.presetCustom = 'Custom',
    this.dateRangeApply = 'Apply',
    this.dateRangeCancel = 'Cancel',
    this.dateRangeNoDates = 'No dates chosen',
    this.dateRangeChooseStart = 'Choose the start date.',
    this.dateRangeChooseEnd = _dateRangeChooseEnd,
    this.dateRangeStartNote = 'start date',
    this.dateRangeEndNote = 'end date',
    this.timePickerShowTimes = 'Show times',
    this.timePickerTimes = 'Times',
    this.timePickerTimesFor = _timePickerTimesFor,
    this.timePickerBadInput = _timePickerBadInput,
    this.timePickerRequired = 'Enter or choose a time.',
    this.timePickerRangeUnderflow = _timePickerRangeUnderflow,
    this.timePickerRangeOverflow = _timePickerRangeOverflow,
    this.timePickerStepMismatch = _timePickerStepMismatch,
  });

  /// More date range presets ([CmDateRangePreset]; web: `dateRangePicker.thisWeek` … `lastYear`, `custom`). Since 1.16.
  final String presetThisWeek, presetLastWeek, presetLast28Days, presetLast90Days, presetLast12Months, presetThisYear, presetLastYear;

  /// The date range preset that leaves the dates to the calendar (web: `dateRangePicker.custom`). Since 1.16.
  final String presetCustom;

  /// Footer buttons of a [CmDateRangePicker] with `confirm` (web: `dateRangePicker.apply`, `cancel`). Since 1.16.
  final String dateRangeApply, dateRangeCancel;

  /// Footer line of a [CmDateRangePicker] with `confirm` while no date is picked (web: `dateRangePicker.noRange`).
  final String dateRangeNoDates;

  /// Line under the range calendar while picking (web: `dateRangePicker.chooseStart`, `chooseEnd`): "Start date
  /// 4 Nov 2026. Choose the end date."
  final String dateRangeChooseStart;
  final String Function(String date) dateRangeChooseEnd;

  /// Added to the start and end days' accessible names (web: `dateRangePicker.startNote`, `endNote`).
  final String dateRangeStartNote, dateRangeEndNote;

  /// [CmTimePicker] clock button and list names (web: `timePicker.showTimes`, `times`, `timesFor`). Since 1.16.
  final String timePickerShowTimes, timePickerTimes;
  final String Function(String label) timePickerTimesFor;

  /// [CmTimePicker] validation (web: `timePicker.badInput` … `stepMismatch`). `pattern` is e.g. "hh:mm am";
  /// `time` a time in the field's clock; `count` the step in minutes.
  final String Function(String pattern) timePickerBadInput;
  final String timePickerRequired;
  final String Function(String time) timePickerRangeUnderflow, timePickerRangeOverflow;
  final String Function(int count) timePickerStepMismatch;

  /// Text of a [CmButtonGroup]'s trigger for the buttons that don't fit, and its menu's name (web: `buttonGroup.more`).
  /// Since 1.7.1.
  final String buttonGroupMore;

  // General

  /// Close button of a banner and a toast.
  final String dismiss;

  /// Read after the label of a required field (the visible text is " *").
  final String requiredSuffix;

  /// Spinner name when its `label` is empty.
  final String loading;

  /// Progress bar value when it has no value yet.
  final String inProgress;

  /// Hint on an open accordion or navigation group.
  final String expanded;

  /// Hint on a closed accordion or navigation group.
  final String collapsed;

  /// Name of a page actions bar with no heading.
  final String actions;

  /// Resource list button and table header checkbox that select every row.
  final String selectAll;

  /// Resource list button once every row is selected.
  final String deselectAll;

  /// Read after a sortable column heading that is not the sort column.
  final String sortable;

  /// Read after the heading of the column sorted ascending.
  final String sortedAscending;

  /// Read after the heading of the column sorted descending.
  final String sortedDescending;

  /// Short month names, January first: comment dates and data table dates.
  final List<String> monthsShort;

  /// Morning suffix in comment times ("5:07 am").
  final String am;

  /// Afternoon suffix in comment times ("5:07 pm").
  final String pm;

  // Display

  /// Remove button of a tag: "Remove Wholesale".
  final String Function(String label) tagRemove;

  /// Page header back button ("Back to Orders"): on phones, or at every width with `onBack` and `backLabel`.
  final String Function(String label) backTo;

  /// Name of the page header breadcrumb trail.
  final String breadcrumb;

  /// Save bar discard button.
  final String saveBarDiscard;

  /// Save bar save button.
  final String saveBarSave;

  /// Pagination summary: "Showing 21–40 of 290 items".
  final String Function(int from, int to, int total, String resourceName) paginationSummary;

  /// Pagination page counter: "Page 2 of 15".
  final String Function(int page, int pages) paginationPage;

  /// Pagination previous button.
  final String previousPage;

  /// Pagination next button.
  final String nextPage;

  /// Resource list row checkbox: "Select Order #1042".
  final String Function(String label) selectItem;

  /// Resource list selection count: "3 orders selected" (`resourceName` is singular).
  final String Function(int count, String resourceName) itemsSelected;

  // Feedback

  /// Read for a comment's author line: "by Priya".
  final String Function(String author) commentBy;

  /// Read after a smart tip that opens a new tab.
  final String opensInNewTab;

  // Data table

  /// Announced after a data table sort: "Sorted by Total, descending".
  final String Function(String column, bool descending) sortedBy;

  /// Data table text when there are no rows.
  final String noData;

  /// Accessible name of a [CmStatusTabs] row. Since 1.6.
  final String statusTabs;

  /// Data table name while loading: "Orders, loading".
  final String Function(String caption) captionLoading;

  // Forms

  /// Search field filter button.
  final String filters;

  /// Name of the filter button and filter panel when filters are applied: "Filters, 2 applied".
  final String Function(String title, int count) withApplied;

  /// Filter panel header count: "2 applied".
  final String Function(int count) applied;

  /// File upload rejection: "photo.exe is not an allowed file type".
  final String Function(String fileName) fileTypeNotAllowed;

  /// File upload rejection: "photo.png is larger than 5 MB".
  final String Function(String fileName, String maxSize) fileTooLarge;

  /// File upload rejection: "You can add up to 3 files".
  final String Function(int max) maxFiles;

  /// File upload tile shown after the chosen files.
  final String addMore;

  /// File upload remove button: "Remove photo.png".
  final String Function(String fileName) removeFile;

  /// Name of the file upload's list of chosen files.
  final String chosenFiles;

  /// File size in kilobytes: "300 KB".
  final String Function(String amount) kilobytes;

  /// File size in megabytes: "1.5 MB".
  final String Function(String amount) megabytes;

  // Lists

  /// Announced after a nested list reorder: "Shoes moved to position 2 of 5.".
  final String Function(String label, int position, int total) movedTo;

  /// Collapsible list section button while hidden: "Show Pinned reports".
  final String Function(String heading) showSection;

  /// Collapsible list section button while shown: "Hide Pinned reports".
  final String Function(String heading) hideSection;

  /// Drag handle name: "Reorder Shoes".
  final String Function(String label) reorder;

  /// Drag handle hint.
  final String reorderHint;

  /// Drag handle screen reader action.
  final String moveUp;

  /// Drag handle screen reader action.
  final String moveDown;

  /// Report tile name when pinned: "Sales, pinned".
  final String Function(String label) pinned;

  // Moving between lists (1.3)

  /// Drag handle hint in a nested list with a `group`: the arrows also cross into the list before or after.
  final String reorderHintGroup;

  /// Announced after a nested list row moves into another list: "Shoes moved to Footer, position 2 of 5.".
  final String Function(String label, String list, int position, int total) movedToList;

  // Board (1.3, `board`, `boardColumn` and `boardCard` on the web)

  /// Accessible name of a [CmBoard] without a `label`.
  final String boardLabel;

  /// Announced on pick up: "Picked up Ravi Stores. Column Contacted, position 2 of 5.".
  final String Function(String card, String column, int position, int count) boardPickedUp;

  /// Announced as the arrow keys (or a drag) move the card: "Column Won, position 1 of 3.".
  final String Function(String column, int position, int count) boardOver;

  /// Announced after a drop that moved the card: "Moved Ravi Stores to Won, position 1 of 3.".
  final String Function(String card, String column, int position, int count) boardMoved;

  /// Announced after a drop where the card started: "Ravi Stores dropped where it started.".
  final String Function(String card) boardSameSpot;

  /// Announced after Escape (or focus leaving the card) while it is picked up.
  final String Function(String card, String column) boardCancelled;

  /// Announced when `onMove` refuses a move (returns false).
  final String Function(String card, String column) boardRefused;

  /// Announced when saving a move fails and the card goes back. `column` is where it went back to.
  final String Function(String card, String column) boardReverted;

  /// Read after a column heading: "12 cards".
  final String Function(int count) boardColumnCount;

  /// Button at the end of a column with more cards to load.
  final String boardColumnLoadMore;

  /// Announced while a column loads: "Loading Contacted".
  final String Function(String column) boardColumnLoading;

  /// Shown in a column with no cards.
  final String boardColumnEmpty;

  /// What screen readers call a card, read with its hint.
  final String boardCardRoleDescription;

  /// Read with a card: how to move it with the keyboard.
  final String boardCardInstructions;

  /// Read before [boardCardInstructions] when the card opens a record.
  final String boardCardOpenHint;

  /// Read while a move is being saved.
  final String boardCardSaving;

  // Calendar (`calendar` on the web). Month and weekday names and date formats are here too: the web takes
  // them from the browser's Intl for the page language, Flutter has no such formatter without the intl package.

  /// Name of a [CmCalendar] without a `label` (web: `calendar.label`).
  final String calendarLabel;

  /// Header Previous and Next buttons in the month, week and day views (web: `previousMonth` … `nextDay`).
  final String calendarPreviousMonth, calendarNextMonth, calendarPreviousWeek, calendarNextWeek, calendarPreviousDay, calendarNextDay;

  /// Previous and Next in the narrow week view, which shows three days: "Previous 3 days".
  final String Function(int count) calendarPreviousDays, calendarNextDays;

  /// The Today button.
  final String calendarToday;

  /// Name of the group of view buttons, and the buttons.
  final String calendarViews, calendarMonth, calendarWeek, calendarDay;

  /// Row heading of all-day events in the week and day views.
  final String calendarAllDay;

  /// Heading of the hour column in the week and day views (screen readers only).
  final String calendarTime;

  /// Visible text of the Add button above the day's list in the narrow month view.
  final String calendarAdd;

  /// "+" of a month day and the Add button of the day's list: "Add on Wednesday 18 November".
  final String Function(String date) calendarAddOn;

  /// "+" in the all-day row: "Add an all-day event on Wednesday 18 November".
  final String Function(String date) calendarAddAllDay;

  /// An empty hour in the week and day views: "Add at 3:00 pm, Wednesday 18 November".
  final String Function(String time, String date) calendarAddAt;

  /// Visible text of a month day's overflow button: "+2 more".
  final String Function(int count) calendarMore;

  /// The overflow button's name: "2 more on Wednesday 18 November".
  final String Function(int count, String date) calendarMoreLabel;

  /// A day button in the narrow month view: "Wednesday 18 November, 3 events".
  final String Function(String date, int count) calendarDayEvents;

  /// The narrow month view's day list with nothing in it.
  final String calendarNoEvents;

  /// Announced while the calendar is `loading`.
  final String calendarLoading;

  /// A time range: "3:00 to 3:30 pm" (a shared am/pm is written once).
  final String Function(String start, String end) calendarTimeRange;

  /// When a timed event happens: "Wednesday 18 November, 3:00 to 3:30 pm".
  final String Function(String date, String time) calendarTimed;

  /// An all-day event on one day: "Wednesday 18 November, all day".
  final String Function(String date) calendarAllDayOn;

  /// An all-day event over several days.
  final String Function(String start, String end) calendarAllDayRange;

  /// An event's name: "Call Ravi Stores, Wednesday 18 November, 3:00 to 3:30 pm".
  final String Function(String title, String when) calendarEventName;

  /// An event's name with its kind: "…, Follow-up".
  final String Function(String title, String when, String kind) calendarEventNameKind;

  /// What screen readers call a movable event (read in its hint).
  final String calendarRoleDescription;

  /// Read with every event.
  final String calendarOpenHint;

  /// Read with a movable event: how to move it with the keyboard.
  final String calendarInstructions;

  /// Read with the grid.
  final String calendarGridHelp;

  /// Added to an event's name while its move is saved.
  final String calendarSaving;

  /// Move announcements. `place` is a day ("Thursday 19 November") or a day and a time.
  final String Function(String event, String place) calendarPickedUp, calendarMoved, calendarCancelled, calendarRefused, calendarReverted;

  /// Announced as a moving event goes over a new day or time.
  final String Function(String place) calendarOver;

  /// Announced when an event is dropped where it started.
  final String Function(String event) calendarSameSpot;

  /// Month names, January first.
  final List<String> calendarMonths;

  /// Weekday names, Sunday first: read by screen readers.
  final List<String> calendarWeekdays;

  /// Short weekday names, Sunday first: column headings (the narrow month view shows their first two letters).
  final List<String> calendarWeekdaysShort;

  /// A day in words, from [calendarWeekdays] and [calendarMonths]: "Wednesday 18 November".
  final String Function(String weekday, int day, String month) calendarDate;

  /// The day view's heading: "Wednesday 18 November 2026".
  final String Function(String weekday, int day, String month, int year) calendarDateWithYear;

  /// The month view's heading: "November 2026".
  final String Function(String month, int year) calendarMonthYear;

  /// The week view's heading, first and last day shown: "16–22 Nov 2026", "30 Nov – 6 Dec 2026". The default
  /// writes English month names: replace it when you translate.
  final String Function(DateTime start, DateTime end) calendarDayRange;

  // Colour field (1.3)

  /// Accessible name of a named swatch: "Blue, #2e6faf".
  final String Function(String name, String hex) colorFieldSwatch;

  /// Accessible name of the hex box without a label.
  final String colorFieldHex;

  /// Accessible name of the hex box with a label: "Colour, hex code".
  final String Function(String label) colorFieldHexNamed;

  /// Placeholder of the hex box.
  final String colorFieldPlaceholder;

  /// Message for your own validation when a required colour field is empty.
  final String colorFieldRequired;

  /// Shown when the hex box holds text that isn't a colour.
  final String colorFieldInvalid;

  /// Names of the default swatches, by key: black, grey, lightGrey, red, darkOrange, orange, yellow,
  /// lightGreen, green, lightBlue, blue, indigo.
  final Map<String, String> colorFieldNames;

  // Signature field (web `signatureField.*`)

  /// Name of the Draw / Type tab list when the field has no label (web: `modes`).
  final String signatureFieldModes;

  /// The two tabs (web: `draw`, `type`).
  final String signatureFieldDraw, signatureFieldType;

  /// Accessible name of the drawing area, and the same once something is drawn (web: `pad`, `padSigned`).
  final String signatureFieldPad, signatureFieldPadSigned;

  /// Read with the drawing area: how to draw, and the keyboard alternative (web: `instructions`).
  final String signatureFieldInstructions;

  /// Hint above the line while nothing is drawn (web: `signHere`).
  final String signatureFieldSignHere;

  /// Accessible name and placeholder of the box in Type mode (web: `typeLabel`, `typePlaceholder`).
  final String signatureFieldTypeLabel, signatureFieldTypePlaceholder;

  /// Undo and Clear buttons: visible text and accessible names (web: `undo`, `undoLabel`, `clear`, `clearLabel`).
  final String signatureFieldUndo, signatureFieldUndoLabel, signatureFieldClear, signatureFieldClearLabel;

  /// Announced after Clear and Undo (web: `cleared`, `undone`).
  final String signatureFieldCleared, signatureFieldUndone;

  /// Validation message when `required` and nothing is signed (web: `required`).
  final String signatureFieldRequired;

  // File upload, photo variant (1.3)

  /// Text of the empty photo tile when there is no label.
  final String takePhoto;

  /// Visible text of the button that replaces the photo.
  final String retakePhoto;

  /// Visible text of the button that removes the photo.
  final String removePhoto;

  /// Accessible name of the retake button: "Retake Shop front".
  final String Function(String name) retakePhotoOf;

  /// Accessible name of the remove button: "Remove Shop front".
  final String Function(String name) removePhotoOf;

  /// What the photo is called in button names when there is no label.
  final String photo;

  // Option groups (1.3)

  /// A chosen select option with `showGroup`: "Lead: Company".
  final String Function(String group, String label) selectGrouped;

  /// A chosen combobox option or tag with `showGroup`: "Lead: Company".
  final String Function(String group, String label) comboboxGrouped;

  // Marketplace

  /// App card review count: "1,204 Reviews".
  final String Function(int count) reviews;

  /// App card developer line: "By Commmerce".
  final String Function(String developer) byDeveloper;

  /// App card rating for screen readers: "Rated 4.5 out of 5".
  final String Function(double rating) rated;

  /// App card offer for screen readers: "Offer: 20% off".
  final String Function(String offer) offer;

  /// App card details link.
  final String viewDetails;

  /// App card details link for screen readers: "View details of Shipping".
  final String Function(String name) viewDetailsOf;

  // Navigation

  /// Name of the side navigation.
  final String mainNavigation;

  /// Header bar menu button.
  final String openNavigation;

  /// Navigation item with a count: "Orders, 4 new".
  final String Function(String label, int count) navCount;

  /// Header bar store button: "Store: My shop. Switch store".
  final String Function(String store) storeSwitch;

  /// Header bar wallet button: "Wallet balance ₹1,200".
  final String Function(String balance) walletBalance;

  /// Header bar account button: "Account: Priya".
  final String Function(String userName) accountOf;

  /// Mobile menu hint on an item with a sub-page: "Opens Settings".
  final String Function(String label) opens;

  /// Mobile menu back button, and the page header's back arrow when it has no `backLabel`.
  final String back;

  /// Mobile menu profile heading.
  final String profile;

  /// Mobile menu store row for screen readers: "Logged in to store My shop".
  final String Function(String store) loggedInToStore;

  /// Mobile menu store row caption (sentence case since 1.5; the name is kept for existing code).
  final String loggedInToStoreCaps;

  /// Mobile menu store row hint.
  final String switchStore;

  /// Mobile menu account row hint.
  final String account;

  /// Flash offer bar close button.
  final String dismissOffer;

  // Status and overlays

  /// Name of the toast region.
  final String notifications;

  /// Unread notification in the notifications panel: "Unread: Order placed".
  final String Function(String label) unread;

  /// Thumbnail with no image: "Blue shirt (no image)".
  final String Function(String alt) noImage;

  // Date pickers and combobox

  /// Date picker value for screen readers when no date is chosen.
  final String notSet;

  /// Date picker placeholder.
  final String chooseDate;

  /// Date range picker placeholder.
  final String chooseDates;

  /// Date range picker value for screen readers: "Monday, November 9, 2026 to Sunday, November 15, 2026".
  final String Function(String start, String end) dateRange;

  /// Name of the date range picker's preset buttons.
  final String presetRanges;

  /// Labels of the built-in date range presets ([CmDateRangePreset]).
  final String presetToday, presetYesterday, presetLast7Days, presetLast30Days, presetThisMonth, presetLastMonth;

  /// Combobox list when nothing matches.
  final String noResults;

  /// Combobox row that adds what was typed: "Add “summer”".
  final String Function(String value) addValue;

  // 1.1 and 1.2 additions. Web namespaces: common, button, sideNavigation, headerBar, globalSearch,
  // notificationPanel, timelineItem, timeline, metric, datePicker.

  /// Close button of the header bar's full-screen search layer (web: `common.close`).
  final String close;

  /// Icon-only button with a count: "Notifications, 3 unread" (web: `button.labelWithCount`).
  final String Function(String label, int count) buttonLabelWithCount;

  /// Read after the text of a button with a count: "3 unread" (web: `button.count`).
  final String Function(int count) buttonCount;

  /// Shown instead of the number when a button's count is over [max]: "99+" (web: `button.countOverflow`).
  final String Function(int max) buttonCountOverflow;

  /// Side navigation toggle while the full menu shows (web: `sideNavigation.collapse`).
  final String sideNavCollapse;

  /// Side navigation toggle while only icons show (web: `sideNavigation.expand`).
  final String sideNavExpand;

  /// Header bar search button on narrow bars, and the search layer it opens (web: `headerBar.search`).
  final String headerBarSearch;

  /// Global search box name (web: `globalSearch.label`).
  final String globalSearchLabel;

  /// Global search placeholder (web: `globalSearch.placeholder`).
  final String globalSearchPlaceholder;

  /// Global search result count: "1 result", "12 results" (web: `globalSearch.results`).
  final String Function(int count) globalSearchResults;

  /// Row under a global search group that shows every match (web: `globalSearch.seeAll`).
  final String seeAll;

  /// Global search clear button (web: `globalSearch.clear`).
  final String clearSearch;

  /// Notification panel header button (web: `notificationPanel.markAllRead`).
  final String markAllRead;

  /// Timeline item time under a minute away (web: `timelineItem.justNow`).
  final String justNow;

  /// Timeline item times in the past: "5 minutes ago", "2 hours ago", "3 days ago".
  final String Function(int count) minutesAgo, hoursAgo, daysAgo;

  /// Timeline item times in the future: "In 5 minutes", "In 2 hours", "In 3 days".
  final String Function(int count) inMinutes, inHours, inDays;

  /// Button under a clamped timeline item body (web: `timelineItem.showAll`).
  final String showAll;

  /// The same button once the body is open (web: `timelineItem.showLess`).
  final String showLess;

  /// Name of a timeline (web: `timeline.label`).
  final String timelineLabel;

  /// Timeline button that loads older events (web: `timeline.showMore`).
  final String showMore;

  /// Announced while a timeline loads (web: `timeline.loading`).
  final String loadingActivity;

  /// Metric change read out: "Up +12%", "Down -3", "No change 0%" (web: `metric.up`, `down`, `flat`).
  final String Function(String change) metricUp, metricDown, metricFlat;

  /// Metric change that is good or bad news: "Up +12%, good" (web: `metric.good`, `metric.bad`).
  final String Function(String trend) metricGood, metricBad;

  /// Announced while a metric loads: "Loading SMB leads" (web: `metric.loadingValue`).
  final String Function(String label) metricLoading;

  /// What screen readers hear for a sparkline: "Visits: 1,240 in all, peak 96, latest 40". The numbers come
  /// formatted for the locale (web: `sparkline.summary`).
  final String Function(String label, String total, String peak, String latest) sparklineSummary;

  /// The same when the points have labels: "… peak 96 on 12 Nov, latest 40" (web: `sparkline.summaryAt`).
  final String Function(String label, String total, String peak, String when, String latest) sparklineSummaryAt;

  /// What screen readers hear for a sparkline with no values: "Visits: no data" (web: `sparkline.empty`).
  final String Function(String label) sparklineEmpty;

  /// Date picker time box name without a label (web: `datePicker.time`).
  final String time;

  /// Date picker time box name: "Time for Follow up" (web: `datePicker.timeFor`).
  final String Function(String label) timeFor;

  /// Letters for hours and minutes in the time placeholder, e.g. hh:mm (web: `datePicker.patternHour`, `patternMinute`).
  final String patternHour, patternMinute;

  /// Label of the action [cmUndoable] adds (web: `toast.undo`).
  final String toastUndo;

  /// Read after a toast that has an action: how to reach it from the keyboard (web: `toast.shortcut`). Empty: not read.
  final String toastShortcut;

  /// Accessible name of the command palette and its text box (web: `commandPalette.label`).
  final String commandPaletteLabel;

  /// Text in the command palette's empty box (web: `commandPalette.placeholder`).
  final String commandPalettePlaceholder;

  /// Heading of the command palette's recent items (web: `commandPalette.recent`).
  final String recent;

  /// Under a data table wider than its box, while there is more to scroll to (web: `dataTable.scrollHint`).
  final String tableScrollHint;

  /// The data table column picker's button, and the name of its list (web: `dataTable.columns`, `showColumns`).
  final String tableColumns, tableShowColumns;

  /// Accessible name of a column's resize handle: "Resize Customer column" (web: `dataTable.resize`).
  final String Function(String column) tableResize;

  /// Announced after a column is resized: "Customer column, 240 pixels wide" (web: `dataTable.resized`).
  final String Function(String column, int width) tableResized;

  /// The priority layout's button that shows and hides a row's low-priority fields (web: `dataTable.viewAll`, `viewLess`).
  final String tableViewAll, tableViewLess;

  /// Accessible name of a row action: "Edit, Ravi Stores" (web: `dataTable.rowAction`).
  final String Function(String action, String name) tableRowAction;

  /// A choice in the status tabs dropdown that has a count: "Open (12)" (web: `statusTabs.option`).
  final String Function(String label, int count) statusTabsOption;

  /// Combobox tag that stands for the tags not shown: "+3 more" (web: `combobox.more`).
  final String Function(int count) comboboxMore;

  /// File upload empty row: "Drag files here or Browse", where [browse] is the link-like word (web: `fileUpload.prompt`).
  final String Function(String browse) fileUploadPrompt;

  /// The link-like word in the file upload prompt, and the prompt while files are dragged over (web: `fileUpload.browse`, `drop`).
  final String fileUploadBrowse, fileUploadDrop;

  /// Accessible name of a file's progress bar: "Uploading invoice.pdf" (web: `fileUpload.uploading`).
  final String Function(String name) fileUploading;

  /// Accessible name of the button that cancels a file's upload (web: `fileUpload.cancel`).
  final String Function(String name) fileUploadCancel;

  static String _buttonLabelWithCount(String label, int count) => '$label, $count unread';
  static String _buttonCount(int count) => '$count unread';
  static String _buttonCountOverflow(int max) => '$max+';
  static String _globalSearchResults(int count) => count == 1 ? '1 result' : '${groupDigits(count)} results';
  static String _minutesAgo(int n) => n == 1 ? '1 minute ago' : '$n minutes ago';
  static String _hoursAgo(int n) => n == 1 ? '1 hour ago' : '$n hours ago';
  static String _daysAgo(int n) => n == 1 ? '1 day ago' : '$n days ago';
  static String _inMinutes(int n) => n == 1 ? 'In 1 minute' : 'In $n minutes';
  static String _inHours(int n) => n == 1 ? 'In 1 hour' : 'In $n hours';
  static String _inDays(int n) => n == 1 ? 'In 1 day' : 'In $n days';
  static String _metricUp(String change) => 'Up $change';
  static String _metricDown(String change) => 'Down $change';
  static String _metricFlat(String change) => 'No change $change';
  static String _metricGood(String trend) => '$trend, good';
  static String _metricBad(String trend) => '$trend, bad';
  static String _metricLoading(String label) => 'Loading $label';
  static String _sparklineSummary(String label, String total, String peak, String latest) =>
      '$label: $total in all, peak $peak, latest $latest';
  static String _sparklineSummaryAt(String label, String total, String peak, String when, String latest) =>
      '$label: $total in all, peak $peak on $when, latest $latest';
  static String _sparklineEmpty(String label) => '$label: no data';
  static String _timeFor(String label) => 'Time for $label';
  static String _dateRangeChooseEnd(String date) => 'Start date $date. Choose the end date.';
  static String _timePickerTimesFor(String label) => 'Times for $label';
  static String _timePickerBadInput(String pattern) => 'Enter a time like $pattern.';
  static String _timePickerRangeUnderflow(String time) => 'Choose $time or later.';
  static String _timePickerRangeOverflow(String time) => 'Choose $time or earlier.';
  static String _timePickerStepMismatch(int count) => count == 1 ? 'Choose a time on the minute.' : 'Choose a time in steps of $count minutes.';

  static String _tableResize(String column) => 'Resize $column column';
  static String _tableResized(String column, int width) => '$column column, $width pixels wide';
  static String _tableRowAction(String action, String name) => '$action, $name';
  static String _statusTabsOption(String label, int count) => '$label (${groupDigits(count)})';
  static String _comboboxMore(int count) => '+$count more';
  static String _fileUploadPrompt(String browse) => 'Drag files here or $browse';
  static String _fileUploading(String name) => 'Uploading $name';
  static String _fileUploadCancel(String name) => 'Cancel uploading $name';

  static String _dateRange(String start, String end) => '$start to $end';
  static String _addValue(String value) => 'Add “$value”';
  static String _tagRemove(String label) => 'Remove $label';
  static String _backTo(String label) => 'Back to $label';
  static String _paginationSummary(int from, int to, int total, String resourceName) => 'Showing $from–$to of $total $resourceName';
  static String _paginationPage(int page, int pages) => 'Page $page of $pages';
  static String _selectItem(String label) => 'Select $label';
  static String _itemsSelected(int count, String resourceName) => '$count $resourceName${count == 1 ? '' : 's'} selected';
  static String _commentBy(String author) => 'by $author';
  static String _sortedBy(String column, bool descending) => 'Sorted by $column, ${descending ? 'descending' : 'ascending'}';
  static String _captionLoading(String caption) => '$caption, loading';
  static String _withApplied(String title, int count) => '$title, $count applied';
  static String _applied(int count) => '$count applied';
  static String _fileTypeNotAllowed(String fileName) => '$fileName is not an allowed file type';
  static String _fileTooLarge(String fileName, String maxSize) => '$fileName is larger than $maxSize';
  static String _maxFiles(int max) => 'You can add up to $max files';
  static String _removeFile(String fileName) => 'Remove $fileName';
  static String _kilobytes(String amount) => '$amount KB';
  static String _megabytes(String amount) => '$amount MB';
  static String _movedTo(String label, int position, int total) => '$label moved to position $position of $total.';
  static String _showSection(String heading) => 'Show $heading';
  static String _hideSection(String heading) => 'Hide $heading';
  static String _reorder(String label) => 'Reorder $label';
  static String _pinned(String label) => '$label, pinned';
  static String _movedToList(String label, String list, int position, int total) => '$label moved to $list, position $position of $total.';
  static String _boardPickedUp(String card, String column, int position, int count) => 'Picked up $card. Column $column, position $position of $count.';
  static String _boardOver(String column, int position, int count) => 'Column $column, position $position of $count.';
  static String _boardMoved(String card, String column, int position, int count) => 'Moved $card to $column, position $position of $count.';
  static String _boardSameSpot(String card) => '$card dropped where it started.';
  static String _boardCancelled(String card, String column) => 'Move cancelled. $card is back in $column.';
  static String _boardRefused(String card, String column) => '$card can\'t be moved to $column.';
  static String _boardReverted(String card, String column) => 'Couldn\'t move $card. It is back in $column.';
  static String _boardColumnCount(int count) => count == 1 ? '1 card' : '${groupDigits(count)} cards';
  static String _boardColumnLoading(String column) => 'Loading $column';
  static String _calendarPreviousDays(int count) => 'Previous $count days';
  static String _calendarNextDays(int count) => 'Next $count days';
  static String _calendarAddOn(String date) => 'Add on $date';
  static String _calendarAddAllDay(String date) => 'Add an all-day event on $date';
  static String _calendarAddAt(String time, String date) => 'Add at $time, $date';
  static String _calendarMore(int count) => '+$count more';
  static String _calendarMoreLabel(int count, String date) => '$count more on $date';
  static String _calendarDayEvents(String date, int count) => count == 1 ? '$date, 1 event' : '$date, ${groupDigits(count)} events';
  static String _calendarTimeRange(String start, String end) => '$start to $end';
  static String _calendarTimed(String date, String time) => '$date, $time';
  static String _calendarAllDayOn(String date) => '$date, all day';
  static String _calendarAllDayRange(String start, String end) => '$start to $end, all day';
  static String _calendarEventName(String title, String when) => '$title, $when';
  static String _calendarEventNameKind(String title, String when, String kind) => '$title, $when, $kind';
  static String _calendarPickedUp(String event, String place) => 'Picked up $event. $place.';
  static String _calendarOver(String place) => '$place.';
  static String _calendarMoved(String event, String place) => 'Moved $event to $place.';
  static String _calendarSameSpot(String event) => '$event dropped where it started.';
  static String _calendarCancelled(String event, String place) => 'Move cancelled. $event is back on $place.';
  static String _calendarRefused(String event, String place) => '$event can\'t be moved to $place.';
  static String _calendarReverted(String event, String place) => 'Couldn\'t move $event. It is back on $place.';
  static String _calendarDate(String weekday, int day, String month) => '$weekday $day $month';
  static String _calendarDateWithYear(String weekday, int day, String month, int year) => '$weekday $day $month $year';
  static String _calendarMonthYear(String month, int year) => '$month $year';
  static String _calendarDayRange(DateTime start, DateTime end) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final e = '${end.day} ${m[end.month - 1]} ${end.year}';
    if (start.year != end.year) return '${start.day} ${m[start.month - 1]} ${start.year} – $e';
    if (start.month != end.month) return '${start.day} ${m[start.month - 1]} – $e';
    return '${start.day}–$e';
  }
  static String _colorFieldSwatch(String name, String hex) => '$name, $hex';
  static String _colorFieldHexNamed(String label) => '$label, hex code';
  static String _retakePhotoOf(String name) => 'Retake $name';
  static String _removePhotoOf(String name) => 'Remove $name';
  static String _grouped(String group, String label) => '$group: $label';
  static String _reviews(int count) => '${groupDigits(count)} ${count == 1 ? 'Review' : 'Reviews'}';
  static String _byDeveloper(String developer) => 'By $developer';
  static String _rated(double rating) => 'Rated ${rating.toStringAsFixed(1)} out of 5';
  static String _offer(String offer) => 'Offer: $offer';
  static String _viewDetailsOf(String name) => 'View details of $name';
  static String _navCount(String label, int count) => '$label, $count new';
  static String _storeSwitch(String store) => 'Store: $store. Switch store';
  static String _walletBalance(String balance) => 'Wallet balance $balance';
  static String _accountOf(String userName) => 'Account: $userName';
  static String _opens(String label) => 'Opens $label';
  static String _loggedInToStore(String store) => 'Logged in to store $store';
  static String _unread(String label) => 'Unread: $label';
  static String _noImage(String alt) => '$alt (no image)';

  /// Writes [n] with a comma every three digits ("1,204"), as the English defaults do.
  static String groupDigits(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');

  /// The strings from the nearest [CmLocalizations], or the English defaults when there is none.
  static CmStrings of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CmLocalizations>()?.strings ?? const CmStrings();
}

/// Gives every Commmerce widget below it translated [strings]. Wrap the app once, around
/// `MaterialApp` or inside `MaterialApp.builder`.
class CmLocalizations extends InheritedWidget {
  const CmLocalizations({super.key, required this.strings, required super.child});

  final CmStrings strings;

  @override
  bool updateShouldNotify(CmLocalizations oldWidget) => strings != oldWidget.strings;
}
