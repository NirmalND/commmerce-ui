import 'package:flutter/material.dart';

import 'generated/tokens.g.dart';
import 'theme.dart';

/// The bare 16px selection box (18 on touch screens) used by list and table rows. Not exported: rows use it next
/// to their own content; forms use [CmCheckbox], which has a label.
class CmRowCheck extends StatelessWidget {
  const CmRowCheck({super.key, required this.value, required this.onChanged, required this.semanticLabel, this.tristate = false});

  /// Null shows the mixed state (with [tristate]).
  final bool? value;
  final ValueChanged<bool?>? onChanged;
  final String semanticLabel;
  final bool tristate;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final box = cmIsTouch(context) ? 18.0 : 16.0;
    return SizedBox.square(
      dimension: box,
      // Material draws an 18px box.
      child: Transform.scale(
        scale: box / 18,
        child: Checkbox(
          value: value,
          tristate: tristate,
          onChanged: onChanged,
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          visualDensity: VisualDensity.compact,
          side: BorderSide(color: onChanged != null ? c.borderStrong : c.borderSubtle),
          fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.disabled) ? c.bgInputFilled : c.bgSurface),
          checkColor: c.textDefault,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(CmRadius.xs)),
          semanticLabel: semanticLabel,
        ),
      ),
    );
  }
}
