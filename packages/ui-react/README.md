# @commmerce/ui-react

React components for Commmerce UI, generated from the `@commmerce/ui` web components, with typed props and
`on…` event props for each component's events.

**Preview.** APIs can change between releases. Docs: https://commmerce.com/blog/commmerceui/

```sh
npm install @commmerce/ui-react @commmerce/tokens
```

```jsx
import '@commmerce/tokens/fonts.css';  // the Poppins typeface (Google Fonts)
import '@commmerce/tokens/tokens.css';
import { Button, TextField } from '@commmerce/ui-react';

export function ProductTitle({ value, onChange, onSave }) {
  return (
    <>
      <TextField label="Title" value={value} onInput={(e) => onChange(e.currentTarget.value)} />
      <Button variant="primary" onClick={onSave}>Save</Button>
    </>
  );
}
```

Requires React 17 or later. Tested with React 18.3.1 and React 19.3.1 in Chromium, Firefox and WebKit; React 17 is allowed but not tested. Support: support@commmerce.com
