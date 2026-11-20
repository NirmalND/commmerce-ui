import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isColor, parseBrandColors, pushRecent } from '../color-api.mjs';

test('accepts hex, rgb/rgba/hsl/hsla and linear/radial gradients of them', () => {
  for (const ok of [
    '#fff', '#FFFA', '#2e6faf', '#2e6faf80', '  #2e6faf ',
    'rgb(46, 111, 175)', 'rgba(222, 0, 0, 0.5)', 'rgb(46 111 175)', 'rgb(46 111 175 / 50%)', 'RGB(10%,20%,30%)',
    'hsl(210, 58%, 43%)', 'hsla(210deg, 58%, 43%, .5)', 'hsl(210 58% 43% / 0.5)',
    'linear-gradient(90deg, #2e6faf, #de0000)', 'linear-gradient(to right, #fff 0%, rgba(0, 0, 0, 0.5) 100%)',
    'linear-gradient(to bottom left, hsl(0 0% 100%), #000)', 'radial-gradient(circle at center, #fff, #000 80%)',
    'radial-gradient(ellipse at top right, #fff 10%, #000)',
  ]) assert.equal(isColor(ok), true, ok);
});

test('refuses everything else', () => {
  for (const bad of [
    '', ' ', 'red', 'transparent', '#ff', '#fffff', '#ggg', '#2e6faf801', 'rgb(1, 2)', 'rgb(1, 2, 3, 4, 5)',
    'rgb(1 2 3 4)', 'rgb(1, 2 3)', 'rgb(1deg, 2, 3)', 'hsl(10%, 5%, 5%)', 'rgb(var(--x), 0, 0)', 'rgb(1,2,3);',
    'url(https://evil.example/x.png)', 'linear-gradient(90deg, #fff)', 'linear-gradient(90deg, red, blue)',
    'linear-gradient(90deg, #fff, url(x))', 'linear-gradient(90px, #fff, #000)', 'conic-gradient(#fff, #000)',
    'repeating-linear-gradient(#fff, #000)', 'linear-gradient(#fff, #000); background: red',
    'linear-gradient(#fff, #000) /* x */', 'linear-gradient(calc(1deg), #fff, #000)', 'expression(alert(1))',
    `linear-gradient(90deg, #fff, ${'0'.repeat(200)}%, #000)`, `linear-gradient(${'#fff, '.repeat(40)}#000)`,
    42, null, undefined, {},
  ]) assert.equal(isColor(bad), false, String(bad));
});

test('brand colours: strings become { value }, names are trimmed text of at most 60 characters, at most 50', () => {
  assert.deepEqual(parseBrandColors(['#fff', { value: ' #000 ', name: ' Ink ' }, { value: '#111', name: '' }]),
    { colors: [{ value: '#fff' }, { value: '#000', name: 'Ink' }, { value: '#111' }] });
  assert.match(parseBrandColors('#fff').error, /array/);
  assert.match(parseBrandColors([{ value: 'red' }]).error, /colors\[0\]\.value/);
  assert.match(parseBrandColors([{ value: '#fff', name: 'x'.repeat(61) }]).error, /name/);
  assert.match(parseBrandColors([{ value: '#fff', name: 'a\nb' }]).error, /name/);
  assert.match(parseBrandColors([{ value: '#fff', name: 5 }]).error, /name/);
  assert.match(parseBrandColors([null]).error, /colors\[0\]/);
  assert.equal(parseBrandColors(Array(50).fill('#fff')).colors.length, 50);
  assert.match(parseBrandColors(Array(51).fill('#fff')).error, /50/);
});

test('recents: newest first, no repeats ignoring case, at most 16', () => {
  assert.deepEqual(pushRecent(['#FFF', '#000'], ' #fff '), ['#fff', '#000']);
  const many = Array.from({ length: 16 }, (_, i) => `#0000${String(i).padStart(2, '0')}`);
  const next = pushRecent(many, '#abcdef');
  assert.equal(next.length, 16);
  assert.equal(next[0], '#abcdef');
  assert.equal(next.at(-1), '#000014');
});
