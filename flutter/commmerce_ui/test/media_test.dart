import 'dart:async';
import 'dart:ui' as ui;

import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child) => MaterialApp(theme: CmTheme.light(), home: Scaffold(body: Center(child: child)));

/// An image that never decodes: "loading fails" for these widgets.
class _BrokenImage extends ImageProvider<_BrokenImage> {
  const _BrokenImage();
  @override
  Future<_BrokenImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);
  @override
  ImageStreamCompleter loadImage(_BrokenImage key, ImageDecoderCallback decode) =>
      OneFrameImageStreamCompleter(Future<ImageInfo>.error(StateError('broken image')));
}

/// A 1×1 image that loads at once.
class _GoodImage extends ImageProvider<_GoodImage> {
  const _GoodImage();
  @override
  Future<_GoodImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);
  @override
  ImageStreamCompleter loadImage(_GoodImage key, ImageDecoderCallback decode) => OneFrameImageStreamCompleter(() async {
        final c = Completer<ui.Image>();
        ui.decodeImageFromPixels(Uint8List.fromList([0, 0, 0, 255]), 1, 1, ui.PixelFormat.rgba8888, c.complete);
        return ImageInfo(image: await c.future);
      }());
}

void main() {
  test('initials: two letters for people, one for domains', () {
    expect(cmInitials('Asha Rao'), 'AR');
    expect(cmInitials('asha  maria rao'), 'AR');
    expect(cmInitials('preprod.commmerce.com'), 'P');
    expect(cmInitials('nirmal@commmerce.com'), 'N');
    expect(cmInitials('  '), '');
  });

  testWidgets('avatar: initials, sizes, shapes, name for screen readers unless decorative', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Row(mainAxisSize: MainAxisSize.min, children: [
      CmAvatar(name: 'Asha Rao', size: CmAvatarSize.small),
      CmAvatar(name: 'Robinson Jain'),
      CmAvatar(name: 'Dupatta House', size: CmAvatarSize.large, shape: CmAvatarShape.square),
      CmAvatar(name: 'Hidden Name', decorative: true, dimension: 60),
      CmAvatar(),
      CmAvatar(shape: CmAvatarShape.square),
    ])));
    expect(find.text('AR'), findsOneWidget);
    expect(find.text('RJ'), findsOneWidget);
    expect(find.text('DH'), findsOneWidget);
    final sizes = [for (var i = 0; i < 6; i++) t.getSize(find.byType(CmAvatar).at(i)).width];
    expect(sizes, [24, 36, 48, 60, 36, 36]);
    final asha = t.getSemantics(find.bySemanticsLabel('Asha Rao')).getSemanticsData();
    expect(asha.hasFlag(SemanticsFlag.isImage), isTrue);
    expect(find.bySemanticsLabel('Hidden Name'), findsNothing);
    expect(find.bySemanticsLabel('HN'), findsNothing, reason: 'initials are never read out');
    final icons = t.widgetList<CmIcon>(find.byType(CmIcon)).map((i) => i.name).toList();
    expect(icons, [CmIcons.user, CmIcons.store]);
    final clips = t.widgetList<ClipRRect>(find.byType(ClipRRect)).map((c) => c.borderRadius).toList();
    expect(clips[0], BorderRadius.circular(12), reason: 'round');
    expect(clips[2], BorderRadius.circular(CmRadius.sm), reason: 'square');
    handle.dispose();
  });

  testWidgets('avatar falls back to initials when the photo fails', (t) async {
    await t.pumpWidget(app(const CmAvatar(name: 'Asha Rao', image: _BrokenImage())));
    await t.pump();
    expect(find.text('AR'), findsOneWidget);
  });

  testWidgets('thumbnail: sizes, alt for screen readers, placeholder with "(no image)", decorative without alt', (t) async {
    final handle = t.ensureSemantics();
    await t.pumpWidget(app(const Row(mainAxisSize: MainAxisSize.min, children: [
      CmThumbnail(size: CmThumbnailSize.small),
      CmThumbnail(alt: 'Blue cotton kurta, front'),
      CmThumbnail(size: CmThumbnailSize.large, alt: 'Silk saree', image: _BrokenImage()),
      CmThumbnail(alt: 'Bedsheet', image: _GoodImage()),
    ])));
    await t.pump();
    await t.pump();
    final sizes = [for (var i = 0; i < 4; i++) t.getSize(find.byType(CmThumbnail).at(i)).width];
    expect(sizes, [40, 60, 80, 60]);
    expect(find.bySemanticsLabel('Blue cotton kurta, front (no image)'), findsOneWidget);
    expect(find.bySemanticsLabel('Silk saree (no image)'), findsOneWidget, reason: 'failed image shows the placeholder');
    final icons = t.widgetList<CmIcon>(find.byType(CmIcon)).map((i) => i.size).toList();
    expect(icons, [18, 24, 32]);
    expect(find.bySemanticsLabel('Bedsheet'), findsOneWidget);
    expect(t.getSemantics(find.bySemanticsLabel('Bedsheet')).getSemanticsData().hasFlag(SemanticsFlag.isImage), isTrue);
    final img = t.widget<Image>(find.byType(Image).last);
    expect(img.fit, BoxFit.contain, reason: 'never cropped');
    handle.dispose();
  });
}
