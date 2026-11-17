import { useEffect, useState } from 'react';
import { SaveBar, SidePanel, Stack, TextField } from '@commmerce/ui-react';

const EMPTY = { title: '', price: '', sku: '' };

// Returns an error message per field; an empty object means the product can be saved.
function validate({ title, price }) {
  const errors = {};
  if (!title.trim()) errors.title = 'Enter a title';
  if (!price.trim()) errors.price = 'Enter a price';
  else if (!(Number(price) > 0)) errors.price = 'Enter a price above 0';
  return errors;
}

/** A small product form in a side panel. The save bar appears once something changes. */
export function ProductPanel({ product, onSave, onClose }) {
  const [draft, setDraft] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [checked, setChecked] = useState(false); // show errors only after the first Save

  useEffect(() => { setDraft(product ?? EMPTY); setErrors({}); setChecked(false); }, [product]);

  const dirty = !!product && ['title', 'price', 'sku'].some((k) => draft[k] !== product[k]);

  function change(field) {
    return (e) => {
      const next = { ...draft, [field]: e.target.value };
      setDraft(next);
      if (checked) setErrors(validate(next)); // once shown, errors update as the merchant fixes them
    };
  }

  function save() {
    const found = validate(draft);
    setErrors(found);
    setChecked(true);
    if (Object.keys(found).length === 0) onSave({ ...product, ...draft });
  }

  return (
    <SidePanel heading="Edit product" open={!!product} onClosed={onClose}>
      <Stack gap="20">
        <TextField label="Title" required value={draft.title} error={errors.title ?? ''} onInput={change('title')} />
        <TextField label="Price" hint="rs." type="number" required value={draft.price} error={errors.price ?? ''} onInput={change('price')} />
        <TextField label="SKU" helpText="Optional. Your own code for this product." value={draft.sku} onInput={change('sku')} />
      </Stack>
      <SaveBar slot="footer" open={dirty} message="Unsaved changes" onSave={save}
        onDiscard={() => { setDraft(product); setErrors({}); setChecked(false); }} />
    </SidePanel>
  );
}
