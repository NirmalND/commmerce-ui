// Builds dist/ from src/tokens.source.json (the Commmerce Design System artifact's tokens.json).
// Outputs: tokens.css (custom properties, prefixed --cm-), tokens.json (flat), tokens.js + tokens.d.ts,
// fonts.css + fonts/ (self-hosted Poppins and, for typed signatures, Dancing Script; copied from ../fonts).
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'src/tokens.source.json'), 'utf8'));
const PREFIX = 'cm';
const v = (name) => `--${PREFIX}-${name}`;

const themes = src.color.themes.map((t) => t.id);
const primary = themes[0];

/** theme id -> { cssVar: value } */
const byTheme = Object.fromEntries(themes.map((t) => [t, {}]));
/** flat docs list */
const flat = [];

const resolveAlias = (val) =>
  typeof val === 'string' ? val.replace(/^\{([^}]+)\}$/, (_, n) => `var(${v(n)})`) : val;

for (const tok of src.color.tokens) {
  const values = typeof tok.value === 'string' ? { [primary]: tok.value } : tok.value;
  for (const t of themes) {
    const val = values[t] ?? values[primary];
    if (t === primary || values[t] !== undefined) byTheme[t][v(tok.name)] = resolveAlias(val);
  }
  flat.push({ name: tok.name, family: 'color', cssVar: v(tok.name), value: values, usage: tok.usage, ...(tok.deprecated && { deprecated: true }) });
}

const simpleFamilies = Object.keys(src).filter(
  (k) => !['name', 'version', 'meta', 'color', 'type'].includes(k) && Array.isArray(src[k]?.tokens),
);
for (const fam of simpleFamilies) {
  for (const tok of src[fam].tokens) {
    const value = typeof tok.value === 'object' ? tok.value[primary] : tok.value;
    byTheme[primary][v(tok.name)] = value;
    flat.push({ name: tok.name, family: fam, cssVar: v(tok.name), value, usage: tok.usage, ...(tok.deprecated && { deprecated: true }) });
  }
}

// Typography: families plus one size/line-height/weight triple per style.
for (const [fam, stack] of Object.entries(src.type.families)) {
  byTheme[primary][v(`font-${fam}`)] = stack;
  flat.push({ name: `font-${fam}`, family: 'type', cssVar: v(`font-${fam}`), value: stack });
}
for (const group of src.type.groups) {
  for (const s of group.styles) {
    const base = `type-${s.name}`;
    byTheme[primary][v(`${base}-size`)] = s.fontSize;
    byTheme[primary][v(`${base}-line-height`)] = String(s.lineHeight);
    byTheme[primary][v(`${base}-weight`)] = String(s.fontWeight);
    flat.push({
      name: base, family: 'type', group: group.name,
      value: { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight },
      usage: s.usage,
    });
  }
}

const block = (sel, vars) =>
  `${sel} {\n${Object.entries(vars).map(([k, val]) => `  ${k}: ${val};`).join('\n')}\n}\n`;

let css = `/* @commmerce/tokens v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version} — generated, do not edit */\n`;
// No font @import here: Firefox and Safari hold back every rule in a sheet until its @imports load, so the tokens
// would wait for the font. The font is loaded separately (fonts.css, self-hosted Poppins next to it).
css += '\n';
css += block(':root, [data-cm-theme]', { 'color-scheme': primary, ...byTheme[primary] });
for (const t of themes.slice(1)) {
  const vars = { 'color-scheme': t, ...byTheme[t] };
  css += `\n${block(`[data-cm-theme="${t}"]`, vars)}`;
  css += `@media (prefers-color-scheme: ${t}) {\n${block(`  [data-cm-theme="auto"]`, vars)}}\n`;
}

const out = join(root, 'dist');
mkdirSync(out, { recursive: true });
// Poppins, self-hosted (never Google Fonts: it would expose visitors' IP addresses to Google). The woff2 files in
// ../fonts come from @fontsource/poppins@5.3.0 (SIL OFL 1.1, OFL.txt ships with them), split by script so a browser
// only downloads the subsets a page uses. The url()s are relative, so fonts/ must sit next to fonts.css wherever it is served.
const FONT_SUBSETS = {
  devanagari: 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};
const FONT_WEIGHTS = [400, 500, 600];
let fontsCss = '/* @commmerce/tokens: the Poppins typeface (SIL OFL 1.1, see fonts/OFL.txt), self-hosted; loaded separately from tokens.css so the tokens never wait for it */\n';
for (const weight of FONT_WEIGHTS) {
  for (const [subset, range] of Object.entries(FONT_SUBSETS)) {
    const file = `poppins-${subset}-${weight}-normal.woff2`;
    if (!existsSync(join(root, 'fonts', file))) throw new Error(`tokens: missing fonts/${file}`);
    fontsCss += `\n@font-face {\n  font-family: 'Poppins';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n` +
      `  src: url('fonts/${file}') format('woff2');\n  unicode-range: ${range};\n}\n`;
  }
}
// Dancing Script (since 1.4), for typed signatures in cm-signature-field. Latin only (about 24 KB), from
// @fontsource/dancing-script@5.3.0, unmodified, SIL OFL 1.1 (fonts/OFL-DancingScript.txt). A face is only downloaded
// when text uses it, so pages without a typed signature never fetch it; other scripts fall back to a cursive system font.
const SIGNATURE_FONT = 'dancing-script-latin-400-normal.woff2';
if (!existsSync(join(root, 'fonts', SIGNATURE_FONT))) throw new Error(`tokens: missing fonts/${SIGNATURE_FONT}`);
fontsCss += `\n/* Dancing Script (SIL OFL 1.1, see fonts/OFL-DancingScript.txt): typed signatures in cm-signature-field */\n` +
  `@font-face {\n  font-family: 'Dancing Script';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n` +
  `  src: url('fonts/${SIGNATURE_FONT}') format('woff2');\n  unicode-range: ${FONT_SUBSETS.latin};\n}\n`;
cpSync(join(root, 'fonts'), join(out, 'fonts'), { recursive: true });
writeFileSync(join(out, 'fonts.css'), fontsCss);
writeFileSync(join(out, 'tokens.css'), css);
writeFileSync(join(out, 'tokens.json'), JSON.stringify({ themes, tokens: flat }, null, 2));

// JS: token name -> var() reference, so consumers never hard-code values.
const camel = (s) => s.replace(/[-.]([a-z0-9])/g, (_, c) => c.toUpperCase());
const names = flat.filter((t) => t.cssVar);
const js =
  `// generated\nexport const tokens = ${JSON.stringify(Object.fromEntries(names.map((t) => [camel(t.name), `var(${t.cssVar})`])), null, 2)};\n` +
  `export const themes = ${JSON.stringify(themes)};\nexport default tokens;\n`;
const dts =
  `// generated\nexport declare const tokens: {\n${names.map((t) => `  /** ${(t.usage ?? '').replace(/\*\//g, '')}${t.deprecated ? ' @deprecated' : ''} */\n  readonly ${camel(t.name)}: string;`).join('\n')}\n};\n` +
  `export declare const themes: ${JSON.stringify(themes)};\nexport default tokens;\n`;
writeFileSync(join(out, 'tokens.js'), js);
writeFileSync(join(out, 'tokens.d.ts'), dts);

console.log(`tokens: ${flat.length} tokens, themes [${themes.join(', ')}] -> dist/`);
