import { describe, it, expect } from 'vitest';
import { parseOriginPattern, matchesOriginPattern, matchesOrigin, isOriginPattern, normalizeOrigin } from '../src/index';
import { detectHostOrigin } from '../src/client';

const P = 'https://*.commmerce.com';

describe('origin patterns: parsing', () => {
  it('reads scheme, domain and port', () => {
    expect(parseOriginPattern(P)).toEqual({ scheme: 'https:', domain: 'commmerce.com', port: '', source: P });
    expect(parseOriginPattern('HTTP://*.Example.CO.uk:8080')).toMatchObject({ scheme: 'http:', domain: 'example.co.uk', port: '8080' });
    expect(parseOriginPattern('https://*.commmerce.com:443').port).toBe(''); // the default port is no port
    expect(parseOriginPattern('http://*.commmerce.com:80').port).toBe('');
    expect(parseOriginPattern('http://*.localhost:5173')).toMatchObject({ domain: 'localhost', port: '5173' });
  });

  it.each([
    ['*'], ['https://*'], ['https://*.'], ['*.commmerce.com'], ['//*.commmerce.com'],
    ['https://*.com'], ['https://*.co'], // fewer than two labels after the star
    ['https://*.*.commmerce.com'], ['https://a.*.commmerce.com'], ['https://*admin.commmerce.com'], ['https://admin*.commmerce.com'],
    ['https://*.commmerce.*'], ['https://**.commmerce.com'], ['https://*.commmerce.com*'],
    ['https://*.commmerce.com/'], ['https://*.commmerce.com/admin'], ['https://*.commmerce.com?x'], ['https://*.commmerce.com#x'],
    ['https://user@*.commmerce.com'], ['https://*.commmerce.com@evil.com'], ['https://*.evil.com\\.commmerce.com'],
    ['https://*.commmerce.com:'], ['https://*.commmerce.com:0'], ['https://*.commmerce.com:65536'], ['https://*.commmerce.com:123456'],
    ['ftp://*.commmerce.com'], ['ws://*.commmerce.com'], ['javascript://*.commmerce.com'],
    ['https://*.1.2.3'], ['https://*.10.0.0.1'], ['https://*.example.0x7f'], ['https://*.[::1]'],
    ['https://*.-commmerce.com'], ['https://*.commmerce-.com'], ['https://*.commmerce..com'], ['https://*.commmerce.com.'],
    ['https://*.comm_merce.com'], ['https://*.commmérce.com'], ['https://*.commmerce.com '], [' https://*.commmerce.com'],
    [`https://*.${'a'.repeat(64)}.com`], [''],
  ])('refuses %j', (pattern) => {
    expect(() => parseOriginPattern(pattern)).toThrow(/not a valid origin pattern/);
  });

  it('isOriginPattern is true for anything with a star', () => {
    expect(isOriginPattern(P)).toBe(true);
    expect(isOriginPattern('*')).toBe(true);
    expect(isOriginPattern('https://admin.commmerce.com')).toBe(false);
  });

  it('normalizeOrigin (exact origins, e.g. the app origin on the admin side) refuses wildcards', () => {
    expect(() => normalizeOrigin(P, 'appOrigin')).toThrow(/exact origin/);
    expect(normalizeOrigin('https://app.example.com/path', 'appOrigin')).toBe('https://app.example.com');
  });
});

describe('origin patterns: matching', () => {
  it.each([
    'https://admin.commmerce.com', 'https://preprod.commmerce.com', 'https://a.b.commmerce.com', 'https://x.y.z.commmerce.com',
    'https://xn--bcher-kva.commmerce.com', 'https://a-1.commmerce.com', 'https://1.commmerce.com',
    'HTTPS://Admin.Commmerce.COM', // letter case is ignored
  ])('matches %s', (origin) => {
    expect(matchesOriginPattern(P, origin)).toBe(true);
  });

  it.each([
    ['the bare domain', 'https://commmerce.com'],
    ['a look-alike without the dot', 'https://evilcommmerce.com'],
    ['a look-alike ending in the domain', 'https://admin.evilcommmerce.com'],
    ['the domain as a subdomain of another site', 'https://commmerce.com.evil.com'],
    ['the domain as a subdomain, deeper', 'https://admin.commmerce.com.evil.com'],
    ['a similar domain', 'https://admin.commmerce.co'],
    ['a typo', 'https://admin.commerce.com'],
    ['http instead of https', 'http://admin.commmerce.com'],
    ['another port', 'https://admin.commmerce.com:8443'],
    ['the default port written out', 'https://admin.commmerce.com:443'],
    ['a trailing slash', 'https://admin.commmerce.com/'],
    ['a path', 'https://admin.commmerce.com/admin'],
    ['a user name', 'https://evil.com@admin.commmerce.com'],
    ['a user name hiding another host', 'https://admin.commmerce.com@evil.com'],
    ['a trailing dot', 'https://admin.commmerce.com.'],
    ['an empty label', 'https://.commmerce.com'],
    ['an empty label inside', 'https://a..commmerce.com'],
    ['an underscore', 'https://a_b.commmerce.com'],
    ['a percent-encoded dot', 'https://evil%2Ecommmerce.com'],
    ['a backslash', 'https://evil.com\\.commmerce.com'],
    ['a Unicode host (not in its punycode form)', 'https://bücher.commmerce.com'],
    ['an IPv4 address', 'https://127.0.0.1'],
    ['an IPv6 address', 'https://[::1]'],
    ['an opaque origin', 'null'],
    ['a star', '*'],
    ['nothing', ''],
    ['not a URL', 'admin.commmerce.com'],
    ['a data: URL', 'data:text/html,hi'],
    ['javascript:', 'javascript://admin.commmerce.com'],
  ])('does not match %s', (_, origin) => {
    expect(matchesOriginPattern(P, origin)).toBe(false);
  });

  it('respects the port and scheme in the pattern', () => {
    const p = 'http://*.localhost:5173';
    expect(matchesOriginPattern(p, 'http://admin.localhost:5173')).toBe(true);
    expect(matchesOriginPattern(p, 'http://localhost:5173')).toBe(false);
    expect(matchesOriginPattern(p, 'http://admin.localhost:5174')).toBe(false);
    expect(matchesOriginPattern(p, 'http://admin.localhost')).toBe(false);
    expect(matchesOriginPattern(p, 'https://admin.localhost:5173')).toBe(false);
    expect(matchesOriginPattern(p, 'http://127.0.0.1:5173')).toBe(false);
    expect(matchesOriginPattern('https://*.commmerce.com:8443', 'https://admin.commmerce.com:8443')).toBe(true);
    expect(matchesOriginPattern('https://*.commmerce.com:8443', 'https://admin.commmerce.com')).toBe(false);
  });

  it('a pattern for a longer domain does not match its parent domain', () => {
    expect(matchesOriginPattern('https://*.admin.commmerce.com', 'https://x.admin.commmerce.com')).toBe(true);
    expect(matchesOriginPattern('https://*.admin.commmerce.com', 'https://admin.commmerce.com')).toBe(false);
    expect(matchesOriginPattern('https://*.admin.commmerce.com', 'https://other.commmerce.com')).toBe(false);
  });

  it('matchesOrigin compares exact origins exactly, and patterns as patterns', () => {
    expect(matchesOrigin('https://admin.example', 'https://admin.example')).toBe(true);
    expect(matchesOrigin('https://admin.example', 'https://Admin.example')).toBe(false);
    expect(matchesOrigin('https://admin.example', 'https://x.admin.example')).toBe(false);
    expect(matchesOrigin(P, 'https://admin.commmerce.com')).toBe(true);
    expect(matchesOrigin(P, 'https://commmerce.com')).toBe(false);
    expect(() => matchesOrigin('https://*', 'https://admin.commmerce.com')).toThrow(/not a valid origin pattern/);
  });
});

describe('finding the admin origin for a pattern', () => {
  it('uses location.ancestorOrigins[0] when the browser has it, and nothing else', () => {
    expect(detectHostOrigin({ ancestorOrigins: ['https://admin.commmerce.com', 'https://top.example'], referrer: 'https://evil.example/' })).toBe('https://admin.commmerce.com');
    expect(detectHostOrigin({ ancestorOrigins: ['null'], referrer: 'https://admin.commmerce.com/' })).toBeUndefined(); // hidden by the admin
    expect(detectHostOrigin({ ancestorOrigins: [], referrer: 'https://admin.commmerce.com/' })).toBeUndefined(); // not in a frame
  });

  it('falls back to the referrer origin without ancestorOrigins (Firefox)', () => {
    expect(detectHostOrigin({ referrer: 'https://admin.commmerce.com/apps/reviews?x=1', self: 'https://app.example' })).toBe('https://admin.commmerce.com');
    expect(detectHostOrigin({ referrer: '', self: 'https://app.example' })).toBeUndefined();
    expect(detectHostOrigin({ referrer: 'not a url', self: 'https://app.example' })).toBeUndefined();
  });

  it('after a link inside the app (referrer is the app itself), uses the origin remembered for this tab', () => {
    expect(detectHostOrigin({ referrer: 'https://app.example/page-1', self: 'https://app.example', remembered: 'https://admin.commmerce.com' })).toBe('https://admin.commmerce.com');
    expect(detectHostOrigin({ referrer: 'https://app.example/page-1', self: 'https://app.example', remembered: null })).toBeUndefined();
  });

  it('a parent on the app\'s own origin is that origin, whatever is remembered (Firefox found this)', () => {
    expect(detectHostOrigin({ referrer: 'https://app.example/', self: 'https://app.example', remembered: 'https://admin.commmerce.com', sameOriginParent: true }))
      .toBe('https://app.example');
    // ancestorOrigins still wins where the browser has it
    expect(detectHostOrigin({ ancestorOrigins: ['https://admin.commmerce.com'], self: 'https://app.example', sameOriginParent: true })).toBe('https://admin.commmerce.com');
  });
});
