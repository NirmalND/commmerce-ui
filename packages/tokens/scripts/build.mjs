// Builds dist/ from src/tokens.source.json (the Commmerce Design System artifact's tokens.json).
// Outputs: tokens.css (custom properties, prefixed --cm-), tokens.json (flat), tokens.js + tokens.d.ts.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  flat.push({ name: tok.name, family: 'color', cssVar: v(tok.name), value: values, usage: tok.usage });
}

const simpleFamilies = Object.keys(src).filter(
  (k) => !['name', 'version', 'meta', 'color', 'type'].includes(k) && Array.isArray(src[k]?.tokens),
);
for (const fam of simpleFamilies) {
  for (const tok of src[fam].tokens) {
    const value = typeof tok.value === 'object' ? tok.value[primary] : tok.value;
    byTheme[primary][v(tok.name)] = value;
    flat.push({ name: tok.name, family: fam, cssVar: v(tok.name), value, usage: tok.usage });
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
// would wait for Google Fonts. The font is loaded separately (fonts.css, or a <link> to Google Fonts).
css += '\n';
css += block(':root, [data-cm-theme]', { 'color-scheme': primary, ...byTheme[primary] });
for (const t of themes.slice(1)) {
  const vars = { 'color-scheme': t, ...byTheme[t] };
  css += `\n${block(`[data-cm-theme="${t}"]`, vars)}`;
  css += `@media (prefers-color-scheme: ${t}) {\n${block(`  [data-cm-theme="auto"]`, vars)}}\n`;
}

const out = join(root, 'dist');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'fonts.css'), `/* @commmerce/tokens: the Poppins typeface, loaded separately from tokens.css so the tokens never wait for it */\n@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');\n`);
writeFileSync(join(out, 'tokens.css'), css);
writeFileSync(join(out, 'tokens.json'), JSON.stringify({ themes, tokens: flat }, null, 2));

// JS: token name -> var() reference, so consumers never hard-code values.
const camel = (s) => s.replace(/[-.]([a-z0-9])/g, (_, c) => c.toUpperCase());
const names = flat.filter((t) => t.cssVar);
const js =
  `// generated\nexport const tokens = ${JSON.stringify(Object.fromEntries(names.map((t) => [camel(t.name), `var(${t.cssVar})`])), null, 2)};\n` +
  `export const themes = ${JSON.stringify(themes)};\nexport default tokens;\n`;
const dts =
  `// generated\nexport declare const tokens: {\n${names.map((t) => `  /** ${(t.usage ?? '').replace(/\*\//g, '')} */\n  readonly ${camel(t.name)}: string;`).join('\n')}\n};\n` +
  `export declare const themes: ${JSON.stringify(themes)};\nexport default tokens;\n`;
writeFileSync(join(out, 'tokens.js'), js);
writeFileSync(join(out, 'tokens.d.ts'), dts);

console.log(`tokens: ${flat.length} tokens, themes [${themes.join(', ')}] -> dist/`);
