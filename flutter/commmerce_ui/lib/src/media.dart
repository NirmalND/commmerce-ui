import 'package:flutter/material.dart';

import 'generated/icons.g.dart';
import 'generated/tokens.g.dart';
import 'icon.dart';
import 'strings.dart';
import 'theme.dart';

/// Up to two initials for a name: "Asha Rao" → "AR", "preprod.commmerce.com" → "P".
String cmInitials(String name) {
  final words = name.trim().split(RegExp(r'[\s._@-]+')).where((w) => w.isNotEmpty).toList();
  if (words.isEmpty) return '';
  String firstChar(String w) => String.fromCharCode(w.runes.first);
  final first = firstChar(words.first);
  final last = words.length > 1 && !RegExp(r'[.@]').hasMatch(name) ? firstChar(words.last) : '';
  return (first + last).toUpperCase();
}

/// Avatar sizes: small 24, medium 36, large 48.
enum CmAvatarSize { small, medium, large }

/// Round for people, square for stores and businesses.
enum CmAvatarShape { round, square }

/// A person or a store, as a photo or their initials. Mirrors `<cm-avatar>`.
///
/// Without an [image] (or when it fails to load) it shows the initials of [name], and without a name a
/// person or store icon.
class CmAvatar extends StatelessWidget {
  const CmAvatar({super.key, this.name = '', this.image, this.size = CmAvatarSize.medium, this.dimension, this.shape = CmAvatarShape.round, this.decorative = false});

  /// Who or what it shows. Used for the initials and as the accessible name.
  final String name;

  /// Photo or logo, cropped to fill the avatar.
  final ImageProvider? image;
  final CmAvatarSize size;

  /// Any other size in pixels, instead of [size].
  final double? dimension;
  final CmAvatarShape shape;

  /// Hides it from screen readers. Use when the name is written right next to the avatar.
  final bool decorative;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final d = dimension ?? switch (size) { CmAvatarSize.small => 24.0, CmAvatarSize.medium => 36.0, CmAvatarSize.large => 48.0 };
    final letters = cmInitials(name);
    final radius = shape == CmAvatarShape.round ? BorderRadius.circular(d / 2) : BorderRadius.circular(CmRadius.sm);
    final fallback = letters.isNotEmpty
        ? Container(
            color: c.avatarBg,
            alignment: Alignment.center,
            child: Text(letters, maxLines: 1, style: TextStyle(fontFamily: cmFontFamily, package: cmFontPackage, fontSize: d * 0.4, height: 1, fontWeight: FontWeight.w500, color: c.textDefault)),
          )
        : Container(
            color: c.bgInputFilled,
            alignment: Alignment.center,
            child: CmIcon(shape == CmAvatarShape.square ? CmIcons.store : CmIcons.user, size: 18, color: c.iconSelected),
          );
    final face = SizedBox.square(
      dimension: d,
      child: ClipRRect(
        borderRadius: radius,
        child: image == null ? fallback : Image(image: image!, fit: BoxFit.cover, width: d, height: d, errorBuilder: (_, _, _) => fallback),
      ),
    );
    if (decorative || name.isEmpty) return ExcludeSemantics(child: face);
    return Semantics(image: true, label: name, excludeSemantics: true, child: face);
  }
}

/// Thumbnail sizes: small 40, medium 60, large 80.
enum CmThumbnailSize { small, medium, large }

/// A small product or file image in a fixed square box, shown whole (never cropped) on a grey backdrop.
/// Without an image, or when it fails to load, it shows a placeholder icon. Mirrors `<cm-thumbnail>`.
class CmThumbnail extends StatelessWidget {
  const CmThumbnail({super.key, this.image, this.alt = '', this.size = CmThumbnailSize.medium, this.dimension});

  final ImageProvider? image;

  /// What the image shows, e.g. "Blue cotton kurta, front". Leave empty when the product name is written
  /// next to the thumbnail: the image is then decorative.
  final String alt;
  final CmThumbnailSize size;

  /// Any other size in pixels, instead of [size].
  final double? dimension;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final d = dimension ?? switch (size) { CmThumbnailSize.small => 40.0, CmThumbnailSize.medium => 60.0, CmThumbnailSize.large => 80.0 };
    final iconSize = switch (size) { CmThumbnailSize.small => 18.0, CmThumbnailSize.medium => 24.0, CmThumbnailSize.large => 32.0 };
    Widget box(Widget child, String? label) {
      final b = Container(
        width: d,
        height: d,
        alignment: Alignment.center,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: c.thumbBg, border: Border.all(color: c.borderDefault), borderRadius: BorderRadius.circular(CmRadius.sm)),
        child: child,
      );
      return label == null ? ExcludeSemantics(child: b) : Semantics(image: true, label: label, excludeSemantics: true, child: b);
    }

    final placeholder = CmIcon(CmIcons.box, size: iconSize, color: c.iconSelected);
    final placeholderLabel = alt.isEmpty ? null : CmStrings.of(context).noImage(alt);
    if (image == null) return box(placeholder, placeholderLabel);
    return Image(
      image: image!,
      fit: BoxFit.contain,
      frameBuilder: (_, child, _, _) => box(child, alt.isEmpty ? null : alt),
      errorBuilder: (_, _, _) => box(placeholder, placeholderLabel),
    );
  }
}
