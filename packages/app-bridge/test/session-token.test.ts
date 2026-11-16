import { describe, it, expect } from 'vitest';
import { signSessionToken, verifySessionToken, decodeClaims } from '../src/index';

const claims = { iss: 'https://admin.example', dest: 'https://shop.example', aud: 'app-key', sub: '42', sid: 'sess-1' };
const SECRET = 'app-secret';
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const errorCode = (p: Promise<unknown>) => p.then(() => null, (e) => e.code);

describe('session tokens', () => {
  it('signs with every documented claim and verifies', async () => {
    const t = await signSessionToken(claims, SECRET);
    const c = await verifySessionToken(t, SECRET, { audience: 'app-key', issuer: 'https://admin.example' });
    expect(c).toMatchObject(claims);
    expect(c.exp - c.iat).toBe(60);
    expect(c.nbf).toBe(c.iat);
    expect(c.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(atob(t.split('.')[0]))).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decodeClaims(t).sub).toBe('42');
  });

  it('refuses a wrong secret, tampered claims and alg none', async () => {
    const t = await signSessionToken(claims, SECRET);
    expect(await errorCode(verifySessionToken(t, 'other-secret', { audience: 'app-key' }))).toBe('signature');
    const [h, , s] = t.split('.');
    const forged = `${h}.${b64({ ...decodeClaims(t), sub: '1' })}.${s}`;
    expect(await errorCode(verifySessionToken(forged, SECRET, { audience: 'app-key' }))).toBe('signature');
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${t.split('.')[1]}.`;
    expect(await errorCode(verifySessionToken(none, SECRET, { audience: 'app-key' }))).toBe('algorithm');
    expect(await errorCode(verifySessionToken('not-a-token', SECRET, { audience: 'app-key' }))).toBe('malformed');
  });

  it('checks expiry, not-before, audience and issuer', async () => {
    const t = await signSessionToken({ ...claims, iat: 1000, nbf: 1000, exp: 1060 }, SECRET);
    const v = (o: object) => errorCode(verifySessionToken(t, SECRET, { audience: 'app-key', now: 1030, ...o }));
    expect(await v({})).toBeNull();
    expect(await v({ now: 1066 })).toBe('expired');
    expect(await v({ now: 1064 })).toBeNull(); // within the 5 s tolerance
    expect(await v({ now: 990 })).toBe('not-yet-valid');
    expect(await v({ audience: 'another-app' })).toBe('audience');
    expect(await v({ issuer: 'https://evil.example' })).toBe('issuer');
  });

  it('accepts an issuer pattern such as https://*.commmerce.com', async () => {
    const v = async (iss: string, issuer = 'https://*.commmerce.com') =>
      errorCode(verifySessionToken(await signSessionToken({ ...claims, iss }, SECRET), SECRET, { audience: 'app-key', issuer }));
    expect(await v('https://admin.commmerce.com')).toBeNull();
    expect(await v('https://a.b.commmerce.com')).toBeNull();
    expect(await v('https://commmerce.com')).toBe('issuer');
    expect(await v('https://evilcommmerce.com')).toBe('issuer');
    expect(await v('https://commmerce.com.evil.com')).toBe('issuer');
    expect(await v('http://admin.commmerce.com')).toBe('issuer');
    expect(await v('https://admin.commmerce.com:8443')).toBe('issuer');
    expect(await v('https://admin.commmerce.com/')).toBe('issuer');
    expect(await v('https://evil.com@admin.commmerce.com')).toBe('issuer');
    expect(await v('https://127.0.0.1')).toBe('issuer');
    expect(await v('')).toBe('issuer');
    // An exact issuer is still compared exactly.
    expect(await v('https://admin.commmerce.com', 'https://admin.commmerce.com')).toBeNull();
    expect(await v('https://x.admin.commmerce.com', 'https://admin.commmerce.com')).toBe('issuer');
    // A non-string iss never matches a pattern.
    const t = await signSessionToken({ ...claims, iss: ['https://admin.commmerce.com'] as unknown as string }, SECRET);
    expect(await errorCode(verifySessionToken(t, SECRET, { audience: 'app-key', issuer: 'https://*.commmerce.com' }))).toBe('issuer');
  });

  it('refuses an invalid issuer pattern as a setting error, not a 401', async () => {
    const t = await signSessionToken(claims, SECRET);
    for (const issuer of ['*', 'https://*', 'https://*.com', 'https://a.*.example.com', 'https://*.example.com/admin']) {
      await expect(verifySessionToken(t, SECRET, { audience: 'app-key', issuer })).rejects.toThrow(TypeError);
    }
  });

  it('requires a secret and an audience', async () => {
    const t = await signSessionToken(claims, SECRET);
    await expect(verifySessionToken(t, '', { audience: 'x' })).rejects.toThrow(/secret/);
    await expect(verifySessionToken(t, SECRET, {} as { audience: string })).rejects.toThrow(/audience/);
  });
});
