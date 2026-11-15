// Downloads one pinned version of the Commmerce UI hosted build into vendor/.
// Pinned files never change; raise VERSION after reading the release notes.
import { mkdir, writeFile } from 'node:fs/promises';

const VERSION = process.env.COMMMERCE_UI_VERSION || '1.0.0-rc.5';
const BASE = `https://commmerce.com/blog/commmerceui/v/${VERSION}`;
await mkdir(new URL('./vendor/', import.meta.url), { recursive: true });
for (const file of ['tokens.css', 'cdn.js', 'app-bridge.js']) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${BASE}/${file}: ${res.status}`);
  await writeFile(new URL(`./vendor/${file}`, import.meta.url), Buffer.from(await res.arrayBuffer()));
  console.log(`vendor/${file} (v${VERSION})`);
}
