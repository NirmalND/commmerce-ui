// icons.json (name -> path data on a 24px grid) -> dist/index.js, index.d.ts, svg/<name>.svg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const icons = JSON.parse(readFileSync(join(root, 'src/icons.json'), 'utf8'));
const DOTTED = new Set(['more', 'drag']); // dot glyphs use a heavier stroke so the dots read
mkdirSync(join(root, 'dist/svg'), { recursive: true });
for (const [name, d] of Object.entries(icons)) {
  const sw = DOTTED.has(name) ? 3 : 1.6;
  writeFileSync(join(root, 'dist/svg', `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>\n`);
}
const names = Object.keys(icons);
writeFileSync(join(root, 'dist/index.js'),
  `// generated\nexport const icons = ${JSON.stringify(icons, null, 1)};\nexport const dotted = ${JSON.stringify([...DOTTED])};\nexport const iconNames = Object.keys(icons);\n`);
writeFileSync(join(root, 'dist/index.d.ts'),
  `// generated\nexport type IconName = ${names.map((n) => `'${n}'`).join(' | ')};\nexport declare const icons: Record<IconName, string>;\nexport declare const dotted: IconName[];\nexport declare const iconNames: IconName[];\n`);
console.log(`icons: ${names.length} -> dist/`);
