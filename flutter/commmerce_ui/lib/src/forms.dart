import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'display.dart' show CmTone;
import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Label row shared by form fields: label, red asterisk when required, bracketed lowercase hint.
class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.label, this.hint, this.required = false, this.small = false});
  final String label;
  final String? hint;
  final bool required, small;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final t = CmText.of(context);
    return Text.rich(TextSpan(children: [
      TextSpan(text: label, style: (small ? t.bodySm : t.label).copyWith(color: c.textDefault)),
      if (required) TextSpan(text: ' *', style: TextStyle(color: c.textCritical), semanticsLabel: CmStrings.of(context).requiredSuffix),
      if (hint != null && hint!.isNotEmpty)
        TextSpan(text: '  [${hint!.toLowerCase()}]', style: CmType.bodySm.copyWith(color: c.textTertiary)),
    ]));
  }
}

/// Labelled single- or multi-line input. Mirrors `<cm-text-field>`.
class CmTextField extends StatelessWidget {
  const CmTextField({
    super.key,
    required this.label,
    this.controller,
    this.initialValue,
    this.onChanged,
    this.hint,
    this.helpText,
    this.error,
    this.placeholder,
    this.required = false,
    this.readOnly = false,
    this.enabled = true,
    this.multiline = false,
    this.rows = 4,
    this.small = false,
    this.keyboardType,
    this.autofillHints,
    this.validator,
  });

  final String label;
  final TextEditingController? controller;
  final String? initialValue;
  final ValueChanged<String>? onChanged;

  /// Lowercase bracketed note after the label, e.g. "points earned per rupee spent".
  final String? hint;

  /// One sentence under the field.
  final String? helpText;

  /// Error message: the border turns critical and screen readers announce it.
  final String? error;
  final String? placeholder;
  final bool required, readOnly, enabled, multiline, small;
  final int rows;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;

  /// Use inside a [Form] for validation on save.
  final FormFieldValidator<String>? validator;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final hasError = error != null && error!.isNotEmpty;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      _FieldLabel(label: label, hint: hint, required: required, small: small),
      SizedBox(height: small ? 6 : CmSpace.s10),
      TextFormField(
        controller: controller,
        initialValue: controller == null ? initialValue : null,
        onChanged: onChanged,
        validator: validator,
        readOnly: readOnly,
        enabled: enabled,
        minLines: multiline ? rows : 1,
        maxLines: multiline ? rows : 1,
        keyboardType: multiline ? TextInputType.multiline : keyboardType,
        autofillHints: autofillHints,
        style: (small ? CmType.bodyMd : CmType.bodyLg).copyWith(color: enabled ? c.textDefault : c.textSecondary),
        decoration: InputDecoration(
          hintText: placeholder,
          isDense: true,
          constraints: multiline ? null : const BoxConstraints(minHeight: 42),
          fillColor: readOnly || !enabled ? c.bgInputFilled : c.bgSurface,
          errorText: hasError ? error : null,
          errorStyle: CmType.bodySm.copyWith(color: c.textCritical),
          helperText: hasError ? null : helpText,
          helperStyle: CmType.bodySm.copyWith(color: c.textTertiary),
          helperMaxLines: 3,
          errorMaxLines: 3,
        ),
      ),
    ]);
  }
}

/// A 20px checkbox with label and optional description. Mirrors `<cm-checkbox>`.
class CmCheckbox extends StatelessWidget {
  const CmCheckbox({super.key, required this.label, required this.value, required this.onChanged, this.description, this.tristate = false});

  final String label;

  /// `null` shows the mixed state (with [tristate]).
  final bool? value;

  /// Null disables the checkbox.
  final ValueChanged<bool?>? onChanged;
  final String? description;
  final bool tristate;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final enabled = onChanged != null;
    void toggle() => onChanged?.call(tristate && value == true ? null : !(value ?? false));
    return MergeSemantics(
      child: InkWell(
        onTap: enabled ? toggle : null,
        borderRadius: BorderRadius.circular(CmRadius.xs),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          SizedBox.square(
            dimension: 20,
            child: Checkbox(
              value: value,
              tristate: tristate,
              onChanged: onChanged,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
              side: BorderSide(color: enabled ? c.borderStrong : c.borderDefault),
              fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.disabled) ? c.bgInputFilled : c.bgSurface),
              checkColor: c.textDefault,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.xs)),
            ),
          ),
          const SizedBox(width: CmSpace.s10),
          Flexible(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(label, style: CmText.of(context).bodyLg.copyWith(color: enabled ? c.textDefault : c.textSecondary)),
              if (description != null)
                Padding(padding: const EdgeInsets.only(top: 4), child: Text(description!, style: CmType.bodySm.copyWith(color: c.textTertiary))),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// One option in a [CmRadioGroup].
class CmRadioOption<T> {
  const CmRadioOption({required this.value, required this.label, this.description, this.enabled = true, this.tone});
  final T value;
  final String label;
  final String? description;
  final bool enabled;

  /// In a [CmOptionGroup], colours the option by the outcome it records: [CmTone.success] ("Signed up") or
  /// [CmTone.critical] ("Not interested"); other tones are ignored. The label still carries the meaning. Since 1.3.
  final CmTone? tone;
}

/// A group of radio buttons with an optional heading. Mirrors `<cm-radio-group>`.
class CmRadioGroup<T> extends StatelessWidget {
  const CmRadioGroup({super.key, required this.options, required this.value, required this.onChanged, this.label, this.direction = Axis.vertical});

  final List<CmRadioOption<T>> options;
  final T? value;
  final ValueChanged<T>? onChanged;
  final String? label;
  final Axis direction;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final items = options.map((o) {
      final enabled = onChanged != null && o.enabled;
      final selected = o.value == value;
      return MergeSemantics(
        child: Semantics(
          inMutuallyExclusiveGroup: true,
          checked: selected,
          child: InkWell(
            onTap: enabled ? () => onChanged!(o.value) : null,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 20, height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: c.bgSurface,
                    border: Border.all(color: enabled ? c.borderStrong : c.borderDefault, width: selected ? 6 : 1),
                  ),
                ),
                const SizedBox(width: CmSpace.s10),
                Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(o.label, style: CmText.of(context).bodyLg.copyWith(color: enabled ? c.textDefault : c.textSecondary)),
                  if (o.description != null) Text(o.description!, style: CmType.bodySm.copyWith(color: c.textTertiary)),
                ])),
              ]),
            ),
          ),
        ),
      );
    }).toList();
    return Semantics(
      container: true,
      label: label,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        if (label != null) Padding(padding: const EdgeInsets.only(bottom: CmSpace.s10), child: _FieldLabel(label: label!)),
        direction == Axis.vertical
            ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: _gap(items, CmSpace.s15, true))
            : Wrap(spacing: CmSpace.s30, runSpacing: CmSpace.s10, children: items),
      ]),
    );
  }
}

List<Widget> _gap(List<Widget> items, double gap, bool vertical) => [
      for (var i = 0; i < items.length; i++) ...[if (i > 0) SizedBox(height: vertical ? gap : 0, width: vertical ? 0 : gap), items[i]],
    ];

/// A 38×20 switch for settings that apply at once. Mirrors `<cm-toggle>`.
class CmToggle extends StatelessWidget {
  const CmToggle({super.key, required this.value, required this.onChanged, this.label, this.semanticLabel});
  final bool value;
  final ValueChanged<bool>? onChanged;
  final String? label;

  /// Accessible name when there is no visible [label].
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final enabled = onChanged != null;
    final track = AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 38, height: 20,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: value ? c.toggleOn : c.toggleOff,
        border: Border.all(color: c.borderInput),
        borderRadius: BorderRadius.circular(CmRadius.full),
      ),
      alignment: value ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(width: 14, height: 14, decoration: BoxDecoration(color: c.bgSurface, shape: BoxShape.circle, border: Border.all(color: c.borderInput))),
    );
    return Semantics(
      toggled: value,
      enabled: enabled,
      label: semanticLabel ?? label,
      excludeSemantics: true, onTap: enabled ? () => onChanged!(!value) : null,
      child: FocusableActionDetector(
        enabled: enabled,
        mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
        actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) { onChanged?.call(!value); return null; })},
        child: GestureDetector(
          onTap: enabled ? () => onChanged!(!value) : null,
          child: Opacity(
            opacity: enabled ? 1 : 0.5,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              track,
              if (label != null) ...[const SizedBox(width: CmSpace.s10), Text(label!, style: CmType.bodyMd.copyWith(color: c.textDefault))],
            ]),
          ),
        ),
      ),
    );
  }
}

/// One choice in a [CmSelect] or [CmCombobox].
class CmSelectOption<T> {
  const CmSelectOption(this.value, this.label, {this.group});
  final T value;
  final String label;

  /// Heading of the group the option belongs to ("Lead"), like an HTML `<optgroup label>`. Options of the same
  /// group are shown together under the heading, in the order the groups first appear. Since 1.3.
  final String? group;
}

/// Puts options of the same group together, in the order the groups first appear. Options without a group stay
/// where they are. Returns [options] itself when no option has a group.
List<CmSelectOption<T>> cmSortByGroup<T>(List<CmSelectOption<T>> options) {
  if (!options.any((o) => (o.group ?? '').isNotEmpty)) return options;
  final buckets = <(String, List<CmSelectOption<T>>)>[];
  final byGroup = <String, List<CmSelectOption<T>>>{};
  for (final o in options) {
    final g = o.group ?? '';
    if (g.isNotEmpty) {
      final b = byGroup[g];
      if (b != null) {
        b.add(o);
      } else {
        buckets.add((g, byGroup[g] = [o]));
      }
    } else if (buckets.isNotEmpty && buckets.last.$1.isEmpty) {
      buckets.last.$2.add(o);
    } else {
      buckets.add(('', [o]));
    }
  }
  return [for (final b in buckets) ...b.$2];
}

/// A group heading in an option list: never an option, skipped by the keyboard, read as a heading.
class CmOptionGroupHeading extends StatelessWidget {
  const CmOptionGroupHeading(this.text, {super.key, this.divider = false});
  final String text;

  /// Draws the line that separates a group from what comes before it.
  final bool divider;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Container(
      margin: EdgeInsets.only(top: divider ? 6 : 0),
      padding: EdgeInsets.fromLTRB(CmSpace.s20, divider ? 12 : 6, CmSpace.s20, 2),
      decoration: divider ? BoxDecoration(border: Border(top: BorderSide(color: c.borderDefault))) : null,
      alignment: AlignmentDirectional.centerStart,
      child: Semantics(header: true, child: Text(text, style: CmType.bodySm.copyWith(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600, color: c.textDefault))),
    );
  }
}

/// A 42px field that opens a list of options. Mirrors `<cm-select>`.
///
/// Options with a [CmSelectOption.group] are shown together under the group's heading (since 1.3); headings are
/// read as headings and skipped by the keyboard. With [showGroup] the field shows "Lead: Company".
class CmSelect<T> extends StatelessWidget {
  const CmSelect({super.key, required this.label, required this.options, required this.value, required this.onChanged, this.placeholder, this.helpText, this.error, this.showGroup = false});

  final String label;
  final List<CmSelectOption<T>> options;
  final T? value;
  final ValueChanged<T?>? onChanged;
  final String? placeholder, helpText, error;

  /// Shows the chosen option's group before its label in the field ([CmStrings.selectGrouped], "Lead: Company"),
  /// for grouped lists where labels repeat across groups. The list itself shows the bare label. Since 1.3.
  final bool showGroup;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final s = CmStrings.of(context);
    final sorted = cmSortByGroup(options);
    final grouped = !identical(sorted, options) || options.any((o) => (o.group ?? '').isNotEmpty);
    final items = <DropdownMenuItem<T>>[];
    final shown = <Widget>[];
    String? group;
    for (final o in sorted) {
      final g = o.group ?? '';
      if (grouped && g != group) {
        if (g.isNotEmpty) {
          items.add(DropdownMenuItem<T>(enabled: false, child: CmOptionGroupHeading(g, divider: items.isNotEmpty)));
          shown.add(const SizedBox.shrink());
        }
        group = g;
      }
      final text = showGroup && g.isNotEmpty ? s.selectGrouped(g, o.label) : o.label;
      items.add(DropdownMenuItem(value: o.value, child: Text(o.label, style: CmType.bodyLg.copyWith(color: c.textDefault))));
      shown.add(Align(alignment: AlignmentDirectional.centerStart, child: Text(text, overflow: TextOverflow.ellipsis, style: CmType.bodyLg.copyWith(color: c.textDefault))));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      _FieldLabel(label: label),
      const SizedBox(height: CmSpace.s10),
      DropdownButtonFormField<T>(
        value: value,
        items: items,
        selectedItemBuilder: grouped || showGroup ? (_) => shown : null,
        itemHeight: grouped ? null : kMinInteractiveDimension,
        onChanged: onChanged,
        hint: placeholder == null ? null : Text(placeholder!, style: CmType.bodyLg.copyWith(color: c.textTertiary)),
        icon: CmIcon(CmIcons.chevronDown, size: 18, color: c.textDefault),
        isExpanded: true,
        dropdownColor: c.bgSurface,
        borderRadius: BorderRadius.circular(CmRadius.sm),
        decoration: InputDecoration(
          isDense: true,
          constraints: const BoxConstraints(minHeight: 42),
          errorText: error,
          helperText: error == null ? helpText : null,
          helperStyle: CmType.bodySm.copyWith(color: c.textTertiary),
        ),
      ),
    ]);
  }
}

/// A grey search box with an optional filter button. Mirrors `<cm-search>`.
class CmSearch extends StatelessWidget {
  const CmSearch({super.key, required this.label, this.controller, this.placeholder, this.onChanged, this.onSubmitted, this.onFilter, this.filterCount = 0});

  /// Accessible name, e.g. "Search orders".
  final String label;
  final TextEditingController? controller;
  final String? placeholder;
  final ValueChanged<String>? onChanged, onSubmitted;

  /// Shows a filter button when set.
  final VoidCallback? onFilter;

  /// Number of filters applied, shown on the filter button.
  final int filterCount;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return Row(children: [
      Expanded(
        // container: true keeps the field and the filter button as separate nodes; without it Flutter
        // merged both into one text field named "Search orders Filters", hiding the button.
        child: Semantics(
          container: true,
          label: label,
          child: TextField(
            controller: controller,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            textInputAction: TextInputAction.search,
            style: CmType.bodyMd.copyWith(color: c.textDefault),
            decoration: InputDecoration(
              hintText: placeholder ?? label,
              isDense: true,
              fillColor: c.bgInputFilled,
              prefixIcon: Padding(padding: const EdgeInsets.all(12), child: CmIcon(CmIcons.search, size: 16, color: c.iconDefault)),
              prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            ),
          ),
        ),
      ),
      if (onFilter != null) ...[
        const SizedBox(width: CmSpace.s10),
        Semantics(
          container: true,
          button: true,
          label: filterCount > 0 ? CmStrings.of(context).withApplied(CmStrings.of(context).filters, filterCount) : CmStrings.of(context).filters,
          excludeSemantics: true, onTap: onFilter,
          child: InkWell(
            onTap: onFilter,
            borderRadius: BorderRadius.circular(CmRadius.sm),
            child: Container(
              height: 42, padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(border: Border.all(color: c.borderInput), borderRadius: BorderRadius.circular(CmRadius.sm), color: c.bgSurface),
              child: Row(children: [
                CmIcon(CmIcons.filter, size: 16, color: c.textDefault),
                if (filterCount > 0) ...[const SizedBox(width: 6), Text('$filterCount', style: CmType.bodySm.copyWith(color: c.textDefault))],
              ]),
            ),
          ),
        ),
      ],
    ]);
  }
}

/// Formats input to digits only (for phone and quantity fields).
final cmDigitsOnly = FilteringTextInputFormatter.digitsOnly;
