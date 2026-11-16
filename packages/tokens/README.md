# @commmerce/tokens

Commmerce design tokens: colours, typography, spacing, radii and shadows, each with a light and a dark value.

Docs: https://commmerce.com/commmerceui/#foundations--tokens

```js
import '@commmerce/tokens/fonts.css';            // the Poppins typeface, self-hosted: dist/fonts/*.woff2 (SIL OFL 1.1)
import '@commmerce/tokens/tokens.css';           // CSS variables: --cm-bg-surface, --cm-text-default, …
import { tokens } from '@commmerce/tokens';       // tokens.bgSurface === 'var(--cm-bg-surface)'
import data from '@commmerce/tokens/tokens.json'; // every token with its light and dark value and usage
```

Themes: set `data-cm-theme="light" | "dark" | "auto"` on any element. Every text and icon colour pair used by
Commmerce UI components meets WCAG AA contrast in both themes.

Support: support@commmerce.com
