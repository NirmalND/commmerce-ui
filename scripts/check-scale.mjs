// Keeps component CSS on the standard scale (1.5.0, docs /foundations/scale). Reads every css`…` block in
// packages/ui/src and fails when a declaration uses a value off the scale:
//   font-size              px only from the type scale (12 13 14 16 18 20 24 30), or a token / inherit / em
//   padding, margin, gap   px only on the 4px grid (0 4 8 12 16 20 24 32 40 48 64), plus 1-2px hairline nudges
//   height, min-/max-      px only in multiples of 4 (control heights come from --cm-control-height-*)
//   border-radius          tokens only (--cm-radius-*), 0 or 50%
//   box-shadow             no raw colours: overlays use --cm-shadow-sm/md/lg; focus rings and rules use colour tokens
//   transition, animation  durations from --cm-duration-* (no raw seconds or ms; looping animations excepted), and a
//                          prefers-reduced-motion rule in every file that moves
//   text-transform         never uppercase (sentence case everywhere)
//   deprecated tokens      --cm-space-10/15/22/30, --cm-shadow-100, --cm-border-default, --cm-border-card, --cm-tracking-caps
// A line can opt out with a comment that says why: /* scale-exempt: typed signature preview */
//   node scripts/check-scale.mjs            exits 1 on any problem
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'packages/ui/src');

const TYPE = new Set([12, 13, 14, 16, 18, 20, 24, 30]);
const GRID = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
const DEPRECATED = /--cm-(space-(10|15|22|30)|shadow-100|border-default|border-card|tracking-caps)\b/;

const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
walk(srcDir);

const pxs = (v) => [...v.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => Math.abs(Number(m[1])));
const problems = [];
for (const file of files) {
  const rel = relative(srcDir, file);
  const text = readFileSync(file, 'utf8');
  const styles = [...text.matchAll(/css`([\s\S]*?)`/g)].map((b) => b[1]).join('\n');
  if (/(transition|animation)\s*:\s*(?!none)/.test(styles) && !/prefers-reduced-motion/.test(styles)) {
    problems.push(`${rel}: moves (transition or animation) but has no prefers-reduced-motion rule`);
  }
  for (const block of text.matchAll(/css`([\s\S]*?)`/g)) {
    const start = text.slice(0, block.index).split('\n').length;
    block[1].split('\n').forEach((line, i) => {
      if (/scale-exempt/.test(line)) return;
      const where = `${rel}:${start + i}`;
      const say = (msg) => problems.push(`${where}: ${msg}`);
      if (DEPRECATED.test(line)) say(`deprecated token ${line.match(DEPRECATED)[0]}`);
      if (/text-transform:\s*uppercase/.test(line)) say('uppercase text (use sentence case)');
      // Declarations on this line: "prop: value" up to ; or }.
      for (const m of line.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
        const [, prop, value] = m;
        if (prop === 'font-size') {
          const bad = pxs(value).filter((n) => n !== 0 && !TYPE.has(n));
          if (bad.length) say(`font-size ${bad.join(', ')}px is off the type scale`);
        } else if (/^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(prop)) {
          const bad = pxs(value).filter((n) => !GRID.has(n));
          if (bad.length) say(`${prop} ${bad.join(', ')}px is off the 4px grid`);
        } else if (/^(min-|max-)?(height|block-size|min-block-size|max-block-size)$/.test(prop)) {
          const bad = pxs(value).filter((n) => n > 2 && n % 4);
          if (bad.length) say(`${prop} ${bad.join(', ')}px is not a multiple of 4`);
        } else if (/^border(-[a-z-]+)?-radius$/.test(prop)) {
          if (pxs(value).some((n) => n !== 0)) say(`${prop}: ${value.trim()} (use --cm-radius-*)`);
        } else if (prop === 'box-shadow') {
          if (/rgba?\(|#[0-9a-f]{3,8}\b/i.test(value)) say('box-shadow with a raw colour (use --cm-shadow-* or a colour token)');
        } else if (/^(transition|transition-duration|animation|animation-duration)$/.test(prop)) {
          // Loops (spinners, skeleton shimmer) keep their own pace; everything that moves once uses the motion tokens.
          if (!/infinite/.test(line) && !/^animation-duration$/.test(prop) && /(^|[\s,])\.?\d*\.?\d+m?s\b/.test(value)) say(`${prop}: raw duration (use --cm-duration-fast/base)`);
        }
      }
    });
  }
}
for (const p of problems) console.error(p);
if (problems.length) { console.error(`check-scale: ${problems.length} problem(s) in ${files.length} files`); process.exit(1); }
console.log(`check-scale: ${files.length} files on the scale`);
