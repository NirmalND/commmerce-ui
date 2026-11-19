import type { createApp as CreateApp } from '../src/index';

export type AppWindow = Window & { createApp: typeof CreateApp; received: any[]; rawSend(msg: unknown): void; postTo(target: Window, msg: unknown): void; appReady: boolean };

/** The same server under another name, so the frame has a different origin. */
export const OTHER = `${location.protocol}//${location.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'}:${location.port}`;

/** Path of the test app page on the test server. */
export const FIXTURE = new URL('./fixtures/app.html', import.meta.url).pathname;

export async function frame(origin = location.origin, query = ''): Promise<HTMLIFrameElement> {
  const f = document.createElement('iframe');
  f.src = `${origin}${FIXTURE}${query}`;
  document.body.append(f);
  await new Promise((r) => f.addEventListener('load', r, { once: true }));
  if (origin === location.origin) await until(() => (f.contentWindow as AppWindow).appReady);
  return f;
}
export const win = (f: HTMLIFrameElement) => f.contentWindow as AppWindow;

export async function until<T>(fn: () => T, ms = 3000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 10));
  }
}
export const nextReport = () => new Promise<any>((resolve) => {
  const on = (e: MessageEvent) => { if (e.data?.testReport) { removeEventListener('message', on); resolve(e.data.testReport); } };
  addEventListener('message', on);
});
export const errorOf = (p: Promise<unknown>) => p.then(() => null, (e) => e as { code: string; message: string });
