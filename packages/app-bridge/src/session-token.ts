/**
 * Session tokens: short-lived JWTs (HS256) that tell an app's backend which store and staff member is using it.
 * The admin's backend signs them with the app's secret; the app's backend verifies them with the same secret.
 * Uses Web Crypto only, so it runs in browsers, Node 18+, Deno, Bun and edge runtimes.
 * Never put the app secret in browser code: `signSessionToken` is for the admin's server and for tests.
 */
import { matchesOrigin, isOriginPattern, parseOriginPattern } from './protocol.js';

/** The claims in every session token. */
export interface SessionTokenClaims {
  /** Issuer: the origin of the admin that signed it, e.g. `https://admin.commmerce.com`. */
  iss: string;
  /** Destination: the store's address (origin), e.g. `https://preprod.commmerce.com`. Use it to find the store's data. */
  dest: string;
  /** Audience: your app's API key. Reject tokens for any other app. */
  aud: string;
  /** Subject: the staff member's id in that store. */
  sub: string;
  /** Expiry, seconds since the epoch. Tokens live 60 seconds. */
  exp: number;
  /** Not before, seconds since the epoch. */
  nbf: number;
  /** Issued at, seconds since the epoch. */
  iat: number;
  /** Unique token id; reject a `jti` you have already seen if you need replay protection. */
  jti: string;
  /** The admin session id; stays the same while the staff member is signed in. */
  sid: string;
}

export interface VerifyOptions {
  /** Your app's API key. Required: the token's `aud` must match. */
  audience: string;
  /**
   * The admin's origin from your app settings; the token's `iss` must match. An exact origin
   * (`https://admin.example.com`, compared exactly) or a pattern (`https://*.commmerce.com`: any admin on a
   * subdomain, see `matchesOriginPattern`). Optional for compatibility, but always pass it.
   */
  issuer?: string;
  /** Allowed clock difference, in seconds. Default 5. */
  clockTolerance?: number;
  /** Current time in seconds (for tests). Default now. */
  now?: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new SessionTokenError('malformed', 'Token is not base64url');
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const key = (secret: string, usage: KeyUsage) =>
  crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);

export type SessionTokenErrorCode = 'malformed' | 'algorithm' | 'signature' | 'expired' | 'not-yet-valid' | 'audience' | 'issuer';

/** Why a token was refused. Answer the request with 401. */
export class SessionTokenError extends Error {
  code: SessionTokenErrorCode;
  constructor(code: SessionTokenErrorCode, message: string) {
    super(message);
    this.name = 'SessionTokenError';
    this.code = code;
  }
}

/** Signs a session token. Fills `iat`, `nbf`, `exp` (60 s) and `jti` if they are missing. Server-side only. */
export async function signSessionToken(
  claims: Omit<SessionTokenClaims, 'iat' | 'nbf' | 'exp' | 'jti'> & Partial<SessionTokenClaims>, secret: string,
): Promise<string> {
  if (!secret) throw new TypeError('signSessionToken: secret is required');
  const now = Math.floor(Date.now() / 1000);
  const full: SessionTokenClaims = { iat: now, nbf: now, exp: now + 60, jti: crypto.randomUUID(), ...claims };
  const head = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign('HMAC', await key(secret, 'sign'), enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(new Uint8Array(sig))}`;
}

/** Reads a token's claims WITHOUT checking it. Never trust the result; use `verifySessionToken` on your server. */
export function decodeClaims(token: string): Partial<SessionTokenClaims> {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new SessionTokenError('malformed', 'Token must have three parts');
  try { return JSON.parse(dec.decode(fromB64url(parts[1]))); } catch (e) {
    if (e instanceof SessionTokenError) throw e;
    throw new SessionTokenError('malformed', 'Token claims are not JSON');
  }
}

/**
 * Verifies a session token on your backend: HS256 only (other algorithms, including `none`, are refused),
 * the signature, `exp`, `nbf`, `aud` and optionally `iss`. Returns the claims, or throws `SessionTokenError`.
 */
export async function verifySessionToken(token: string, secret: string, options: VerifyOptions): Promise<SessionTokenClaims> {
  if (!secret) throw new TypeError('verifySessionToken: secret is required');
  if (!options?.audience) throw new TypeError('verifySessionToken: options.audience (your API key) is required');
  if (options.issuer && isOriginPattern(options.issuer)) parseOriginPattern(options.issuer, 'verifySessionToken: options.issuer'); // a bad setting throws TypeError, not a 401
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new SessionTokenError('malformed', 'Token must have three parts');
  let header: { alg?: string };
  try { header = JSON.parse(dec.decode(fromB64url(parts[0]))); } catch { throw new SessionTokenError('malformed', 'Token header is not JSON'); }
  if (header.alg !== 'HS256') throw new SessionTokenError('algorithm', `Algorithm ${header.alg} is not allowed`);
  const ok = await crypto.subtle.verify('HMAC', await key(secret, 'verify'), fromB64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new SessionTokenError('signature', 'Signature does not match');
  const c = decodeClaims(token) as SessionTokenClaims;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const tol = options.clockTolerance ?? 5;
  if (typeof c.exp !== 'number' || now - tol >= c.exp) throw new SessionTokenError('expired', 'Token has expired');
  if (typeof c.nbf === 'number' && now + tol < c.nbf) throw new SessionTokenError('not-yet-valid', 'Token is not valid yet');
  if (c.aud !== options.audience) throw new SessionTokenError('audience', 'Token is for another app');
  if (options.issuer && !matchesOrigin(options.issuer, c.iss)) throw new SessionTokenError('issuer', 'Token was issued by someone else');
  return c;
}
