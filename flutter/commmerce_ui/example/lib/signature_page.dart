import 'package:commmerce_ui/commmerce_ui.dart';
import 'package:flutter/material.dart';

/// The signature field (CRM issue #26): an e-sign screen for a quote, the exported PNG, a typed signature prefilled
/// from the record, and the error and disabled states.
class SignaturePage extends StatefulWidget {
  const SignaturePage({super.key});

  @override
  State<SignaturePage> createState() => _SignaturePageState();
}

class _SignaturePageState extends State<SignaturePage> {
  final _form = GlobalKey<FormState>();
  final _quote = CmSignatureController();
  final _typed = CmSignatureController(mode: CmSignatureMode.type, typedName: 'Asha Rao');
  final _export = CmSignatureController();
  CmSignatureValue _exported = const CmSignatureValue.empty();
  String _note = '';

  @override
  void initState() {
    super.initState();
    _quote.addListener(_rebuild);
  }

  @override
  void dispose() {
    _quote.removeListener(_rebuild);
    for (final c in [_quote, _typed, _export]) {
      c.dispose();
    }
    super.dispose();
  }

  void _rebuild() => setState(() {});

  void _sign() {
    if (!_form.currentState!.validate()) return;
    _form.currentState!.save();
  }

  CmLayoutSection _section(String title, String description, Widget child) => CmLayoutSection(children: [
        CmCard(heading: title, description: description, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 560), child: child)),
      ]);

  @override
  Widget build(BuildContext context) {
    final c = CmTheme.colorsOf(context);
    return CmPage(
      header: const CmPageHeader(
        title: 'Signature field',
        description: 'Draw with a mouse, finger or pen, or type a name in a handwriting font. Mirrors <cm-signature-field>.',
        breadcrumbs: [CmBreadcrumb('Components')],
      ),
      child: CmLayout(children: [
        if (_note.isNotEmpty) CmLayoutSection(children: [CmBanner(message: _note, tone: CmTone.success, onDismiss: () => setState(() => _note = ''))]),
        _section(
          'Sign a quote',
          'Quote Q-1042 for Ravi Stores: ₹ 48,500 for 12 months of Commmerce Plus. Sign and accept stays off until something is signed.',
          Form(
            key: _form,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              CmSignatureField(
                controller: _quote,
                label: 'Your signature',
                required: true,
                helpText: 'By signing, you accept the quote.',
                onSaved: (v) => setState(() => _note = 'Quote signed (${v?.mode == CmSignatureMode.type ? 'typed' : 'drawn'}), PNG of ${((v?.png?.length ?? 0) / 1024).ceil()} KB.'),
              ),
              const SizedBox(height: CmSpace.s16),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: CmButton(label: 'Sign and accept', variant: CmButtonVariant.primary, onPressed: _quote.isEmpty ? null : _sign),
              ),
            ]),
          ),
        ),
        _section(
          'Exported image',
          'onChanged gives the signature as a PNG (black on transparent, 2x, cropped to the ink) and as a data URL.',
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CmSignatureField(controller: _export, label: 'Signature', onChanged: (v) => setState(() => _exported = v)),
            const SizedBox(height: CmSpace.s16),
            if (_exported.png != null)
              Container(
                height: 80,
                padding: const EdgeInsets.all(CmSpace.s8),
                decoration: BoxDecoration(color: const Color(0xFFFFFFFF), border: Border.all(color: c.borderInput), borderRadius: BorderRadius.circular(CmRadius.sm)),
                child: Image.memory(_exported.png!, semanticLabel: 'Exported signature', gaplessPlayback: true),
              )
            else
              Text('Sign above to see the exported PNG.', style: CmType.bodyXs.copyWith(color: c.textTertiary)),
          ]),
        ),
        _section(
          'Typed signature',
          'Opens on Type with the signer\'s name from the record. Typing is the way to sign with a keyboard or a screen reader.',
          CmSignatureField(controller: _typed, label: 'Signature'),
        ),
        _section('Error', 'Your own validation message.', const CmSignatureField(label: 'Signature', required: true, error: 'Sign with the name on the quote')),
        _section('Disabled', 'For example after the document has been signed and sent.', const CmSignatureField(label: 'Signature', enabled: false)),
      ]),
    );
  }
}
