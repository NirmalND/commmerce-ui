import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'generated/tokens.g.dart';
import 'theme.dart';

/// Keyboard shortcuts written as on the web (`@commmerce/ui` shortcut.ts): `mod+k`, `ctrl+shift+p`, `alt+n` or `/`,
/// modifiers joined to the key with `+`. `mod` is Cmd on macOS and iOS and Ctrl everywhere else. Several keys pressed
/// one after the other (a hint like `g t`) are separated by spaces; they are only shown, never listened for. Since 1.7.
abstract final class CmShortcut {
  /// True on Apple platforms, where `mod` means Cmd.
  static bool isApple([TargetPlatform? platform]) {
    final p = platform ?? defaultTargetPlatform;
    return p == TargetPlatform.macOS || p == TargetPlatform.iOS;
  }

  static const _aliases = {'esc': 'escape', 'return': 'enter', 'space': ' ', 'up': 'arrowup', 'down': 'arrowdown', 'left': 'arrowleft', 'right': 'arrowright', 'plus': '+'};

  static _Parsed? _parse(String spec, bool apple) {
    final parts = spec.trim().toLowerCase().split('+').map((p) => p.trim()).toList();
    if (parts.length > 1 && parts.last.isEmpty && parts[parts.length - 2].isEmpty) parts.replaceRange(parts.length - 2, parts.length, ['+']);
    if (parts.isEmpty) return null;
    final raw = parts.removeLast();
    if (raw.isEmpty) return null;
    final p = _Parsed(_aliases[raw] ?? raw);
    for (final m in parts) {
      switch (m) {
        case 'mod':
          apple ? p.meta = true : p.ctrl = true;
        case 'ctrl' || 'control':
          p.ctrl = true;
        case 'meta' || 'cmd' || 'command':
          p.meta = true;
        case 'alt' || 'option' || 'opt':
          p.alt = true;
        case 'shift':
          p.shift = true;
        default:
          return null;
      }
    }
    return p;
  }

  static const _appleNames = {'meta': '⌘', 'ctrl': '⌃', 'alt': '⌥', 'shift': '⇧'};
  static const _otherNames = {'meta': 'Win', 'ctrl': 'Ctrl', 'alt': 'Alt', 'shift': 'Shift'};
  static const _keyNames = {
    'escape': 'Esc', 'enter': '↵', ' ': 'Space', 'arrowup': '↑', 'arrowdown': '↓', 'arrowleft': '←', 'arrowright': '→',
    'backspace': '⌫', 'delete': 'Del', 'tab': 'Tab', 'pageup': 'PgUp', 'pagedown': 'PgDn', 'home': 'Home', 'end': 'End',
  };
  static String _keyName(String k) => _keyNames[k] ?? (k.length == 1 ? k.toUpperCase() : k[0].toUpperCase() + k.substring(1));

  /// The keys of a shortcut as printed on keycaps: `mod+shift+n` is ⌘ ⇧ N on a Mac and Ctrl Shift N elsewhere;
  /// `g t` is G T. Text that isn't a shortcut is returned as one entry.
  static List<String> keys(String spec, {bool? apple}) {
    final a = apple ?? isApple();
    final out = <String>[];
    for (final step in spec.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty)) {
      final p = _parse(step, a);
      if (p == null) return [spec.trim()];
      final names = a ? _appleNames : _otherNames;
      final order = a ? const ['ctrl', 'alt', 'shift', 'meta'] : const ['ctrl', 'meta', 'alt', 'shift'];
      for (final m in order) {
        if (p.has(m)) out.add(names[m]!);
      }
      out.add(_keyName(p.key));
    }
    return out;
  }

  /// How screen readers hear the shortcut: "Ctrl Shift N", "Command K". Empty for a key sequence or text.
  static String spoken(String spec, {bool? apple}) {
    final a = apple ?? isApple();
    if (spec.trim().contains(RegExp(r'\s'))) return '';
    final p = _parse(spec, a);
    if (p == null) return '';
    return [
      if (p.ctrl) a ? 'Control' : 'Ctrl',
      if (p.meta) a ? 'Command' : 'Windows',
      if (p.alt) a ? 'Option' : 'Alt',
      if (p.shift) 'Shift',
      _keyName(p.key),
    ].join(' ');
  }

  /// The [SingleActivator] for a one-step shortcut, or null for a sequence, text or a key Flutter can't name.
  static SingleActivator? activator(String spec, {bool? apple}) {
    final a = apple ?? isApple();
    if (spec.trim().contains(RegExp(r'\s'))) return null;
    final p = _parse(spec, a);
    if (p == null) return null;
    final key = _logicalKey(p.key);
    if (key == null) return null;
    return SingleActivator(key, control: p.ctrl, meta: p.meta, alt: p.alt, shift: p.shift);
  }

  static LogicalKeyboardKey? _logicalKey(String k) {
    const named = {
      'escape': LogicalKeyboardKey.escape, 'enter': LogicalKeyboardKey.enter, ' ': LogicalKeyboardKey.space,
      'arrowup': LogicalKeyboardKey.arrowUp, 'arrowdown': LogicalKeyboardKey.arrowDown, 'arrowleft': LogicalKeyboardKey.arrowLeft,
      'arrowright': LogicalKeyboardKey.arrowRight, 'backspace': LogicalKeyboardKey.backspace, 'delete': LogicalKeyboardKey.delete,
      'tab': LogicalKeyboardKey.tab, 'home': LogicalKeyboardKey.home, 'end': LogicalKeyboardKey.end, '/': LogicalKeyboardKey.slash,
      '.': LogicalKeyboardKey.period, ',': LogicalKeyboardKey.comma,
    };
    if (named.containsKey(k)) return named[k];
    final f = RegExp(r'^f(\d{1,2})$').firstMatch(k);
    if (f != null) {
      const fs = [LogicalKeyboardKey.f1, LogicalKeyboardKey.f2, LogicalKeyboardKey.f3, LogicalKeyboardKey.f4, LogicalKeyboardKey.f5, LogicalKeyboardKey.f6,
        LogicalKeyboardKey.f7, LogicalKeyboardKey.f8, LogicalKeyboardKey.f9, LogicalKeyboardKey.f10, LogicalKeyboardKey.f11, LogicalKeyboardKey.f12];
      final n = int.parse(f.group(1)!);
      return n >= 1 && n <= 12 ? fs[n - 1] : null;
    }
    if (RegExp(r'^[a-z]$').hasMatch(k)) return LogicalKeyboardKey(LogicalKeyboardKey.keyA.keyId + k.codeUnitAt(0) - 'a'.codeUnitAt(0));
    if (RegExp(r'^[0-9]$').hasMatch(k)) return LogicalKeyboardKey(LogicalKeyboardKey.digit0.keyId + k.codeUnitAt(0) - '0'.codeUnitAt(0));
    return null;
  }
}

class _Parsed {
  _Parsed(this.key);
  final String key;
  bool ctrl = false, meta = false, alt = false, shift = false;
  bool has(String m) => switch (m) { 'ctrl' => ctrl, 'meta' => meta, 'alt' => alt, _ => shift };
}

/// A shortcut hint drawn as keycaps (12px text in a thin grey border, owner standard 1.6), e.g. in a menu item or a
/// command palette row. Visual only: screen readers get the shortcut from the row's own label. Since 1.7.
class CmKeys extends StatelessWidget {
  const CmKeys(this.shortcut, {super.key});

  /// The shortcut, written as for [CmShortcut]: `mod+shift+l`, `g t`.
  final String shortcut;

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    final keys = CmShortcut.keys(shortcut, apple: CmShortcut.isApple(Theme.of(context).platform));
    return ExcludeSemantics(
      child: Row(mainAxisSize: MainAxisSize.min, spacing: CmSpace.s4, children: [
        for (final k in keys)
          Container(
            constraints: const BoxConstraints(minWidth: 20),
            padding: const EdgeInsets.symmetric(horizontal: CmSpace.s4),
            decoration: BoxDecoration(border: Border.all(color: c.borderSubtle), borderRadius: BorderRadius.circular(CmRadius.xs)),
            child: Text(k, textAlign: TextAlign.center, style: CmType.bodyXs.copyWith(color: c.textTertiary)),
          ),
      ]),
    );
  }
}
