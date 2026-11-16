import 'package:flutter/material.dart';

import 'generated/tokens.g.dart';
import 'pickers.dart';

/// Commmerce tokens attached to a [ThemeData]. Read them with [CmTheme.of].
@immutable
class CmTheme extends ThemeExtension<CmTheme> {
  const CmTheme({required this.colors, required this.brightness});

  /// Every colour token for the current theme.
  final CmColors colors;

  /// Light or dark.
  final Brightness brightness;

  /// The tokens for the nearest theme. Falls back to light if the app has no Commmerce theme.
  static CmTheme of(BuildContext context) =>
      Theme.of(context).extension<CmTheme>() ?? const CmTheme(colors: CmColors.light, brightness: Brightness.light);

  /// Shortcut for `CmTheme.of(context).colors`.
  static CmColors colorsOf(BuildContext context) => of(context).colors;

  /// A complete Material theme in Commmerce colours, type and shapes.
  static ThemeData light() => _build(CmColors.light, Brightness.light);

  /// The dark theme, built from the Figma file's dark neutrals.
  static ThemeData dark() => _build(CmColors.dark, Brightness.dark);

  static ThemeData _build(CmColors c, Brightness b) {
    final scheme = ColorScheme(
      brightness: b,
      primary: c.actionPrimary,
      onPrimary: c.actionPrimaryText,
      secondary: c.textAttention,
      onSecondary: c.textOnDark,
      error: c.textCritical,
      onError: c.textOnDark,
      surface: c.bgSurface,
      onSurface: c.textDefault,
      onSurfaceVariant: c.textTertiary,
      outline: c.borderInput,
      outlineVariant: c.borderDefault,
      surfaceContainerHighest: c.bgHover,
    );
    final text = Typography.material2021(platform: TargetPlatform.android).black.apply(
          fontFamily: 'packages/$cmFontPackage/$cmFontFamily',
          bodyColor: c.textDefault,
          displayColor: c.textDefault,
        );
    OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(CmRadius.sm),
          borderSide: BorderSide(color: color, width: width),
        );
    return ThemeData(
      useMaterial3: true,
      brightness: b,
      colorScheme: scheme,
      fontFamily: 'packages/$cmFontPackage/$cmFontFamily',
      textTheme: text,
      scaffoldBackgroundColor: c.bgPage,
      canvasColor: c.bgSurface,
      dividerColor: c.borderDefault,
      focusColor: c.borderStrong.withValues(alpha: 0.12),
      hoverColor: c.bgHover,
      splashFactory: NoSplash.splashFactory,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.bgSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: CmSpace.s12, vertical: CmSpace.s8),
        hintStyle: TextStyle(color: c.textTertiary),
        enabledBorder: border(c.borderInput),
        focusedBorder: border(c.borderStrong, 2),
        errorBorder: border(c.borderCritical),
        focusedErrorBorder: border(c.borderCritical, 2),
        disabledBorder: border(c.borderDefault),
      ),
      dialogTheme: DialogThemeData(backgroundColor: c.bgSurface),
      datePickerTheme: cmDatePickerTheme(c),
      extensions: [CmTheme(colors: c, brightness: b)],
    );
  }

  @override
  CmTheme copyWith({CmColors? colors, Brightness? brightness}) =>
      CmTheme(colors: colors ?? this.colors, brightness: brightness ?? this.brightness);

  @override
  CmTheme lerp(ThemeExtension<CmTheme>? other, double t) {
    if (other is! CmTheme) return this;
    return CmTheme(colors: colors.lerp(other.colors, t), brightness: t < 0.5 ? brightness : other.brightness);
  }
}

/// Screen size classes used by every responsive widget.
enum CmScreen { phone, tablet, desktop }

/// Breakpoints: phones below 600, tablets below 1100, desktop above.
abstract final class CmBreakpoints {
  static const double tablet = 600;
  static const double desktop = 1100;

  /// The size class for the current window width.
  static CmScreen of(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    if (w < tablet) return CmScreen.phone;
    if (w < desktop) return CmScreen.tablet;
    return CmScreen.desktop;
  }
}

/// The type ramp for the current screen: Responsive on phones, Desktop otherwise.
class CmText {
  CmText._(this._phone);
  final bool _phone;

  /// Picks the ramp for this context's screen size.
  factory CmText.of(BuildContext context) => CmText._(CmBreakpoints.of(context) == CmScreen.phone);

  TextStyle get headingLg => _phone ? CmTypeResponsive.headingLg : CmType.headingLg;
  TextStyle get headingSm => _phone ? CmTypeResponsive.headingSm : CmType.headingSm;
  TextStyle get bodyLg => _phone ? CmTypeResponsive.bodyLg : CmType.bodyLg;
  TextStyle get bodyMd => _phone ? CmTypeResponsive.bodyMd : CmType.bodyMd;
  TextStyle get bodySm => _phone ? CmTypeResponsive.bodySm : CmType.bodySm;
  TextStyle get bodyXs => _phone ? CmTypeResponsive.bodyXs : CmType.bodyXs;
  TextStyle get label => _phone ? CmTypeResponsive.label : CmType.label;
}

/// Small label style (text actions, badges, captions): medium weight, no tracking. Since 1.5 labels are in
/// sentence case (no capitals, no letter spacing); the name is kept for existing code. Sizes below 12 are raised to 12.
TextStyle cmCaps(double size, Color color) => TextStyle(
      fontFamily: cmFontFamily,
      package: cmFontPackage,
      fontSize: size < 12 ? 12 : size,
      fontWeight: FontWeight.w500,
      color: color,
    );
