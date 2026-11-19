<?php
// Verifies Commmerce App Bridge session tokens: HS256 JWTs signed with your app secret, valid for 60 seconds.
// The same checks as verifySessionToken() in @commmerce/app-bridge. No dependencies (PHP 7.4+, hash and json).

declare(strict_types=1);

namespace Commmerce;

final class SessionTokenError extends \RuntimeException
{
    /** One of: malformed, algorithm, signature, expired, not-yet-valid, audience, issuer. Answer 401. */
    public string $reason;

    public function __construct(string $reason, string $message)
    {
        parent::__construct($message);
        $this->reason = $reason;
    }
}

final class SessionToken
{
    /**
     * Returns the token's claims (iss, dest, aud, sub, sid, iat, nbf, exp, jti), or throws SessionTokenError.
     * Only HS256 is accepted; `none` and every other algorithm are refused.
     *
     * @param string $audience Your app's API key: the token's `aud` must match.
     * @param string $issuer   The admin's origin from your app settings: the token's `iss` must match. An exact
     *                         origin (compared exactly) or a pattern such as `https://*.commmerce.com` (any admin on
     *                         a subdomain; see matchesOrigin()). An invalid pattern throws InvalidArgumentException.
     */
    public static function verify(string $token, string $secret, string $audience, string $issuer, int $clockTolerance = 5, ?int $now = null): array
    {
        if ($secret === '' || $audience === '' || $issuer === '') {
            throw new \InvalidArgumentException('secret, audience and issuer are required');
        }
        if (strpos($issuer, '*') !== false) {
            self::parseOriginPattern($issuer); // a bad setting is an error, not a 401
        }
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new SessionTokenError('malformed', 'Token must have three parts');
        }
        $header = json_decode(self::decode($parts[0]), true);
        $claims = json_decode(self::decode($parts[1]), true);
        if (!is_array($header) || !is_array($claims)) {
            throw new SessionTokenError('malformed', 'Token header or claims are not JSON');
        }
        if (($header['alg'] ?? null) !== 'HS256') {
            throw new SessionTokenError('algorithm', 'Algorithm ' . json_encode($header['alg'] ?? null) . ' is not allowed');
        }
        $expected = hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true);
        if (!hash_equals($expected, self::decode($parts[2]))) {
            throw new SessionTokenError('signature', 'Signature does not match');
        }
        $now = $now ?? time();
        if (!is_int($claims['exp'] ?? null) || $now - $clockTolerance >= $claims['exp']) {
            throw new SessionTokenError('expired', 'Token has expired');
        }
        if (is_int($claims['nbf'] ?? null) && $now + $clockTolerance < $claims['nbf']) {
            throw new SessionTokenError('not-yet-valid', 'Token is not valid yet');
        }
        if (($claims['aud'] ?? null) !== $audience) {
            throw new SessionTokenError('audience', 'Token is for another app');
        }
        if (!self::matchesOrigin($issuer, $claims['iss'] ?? null)) {
            throw new SessionTokenError('issuer', 'Token was issued by someone else');
        }
        return $claims;
    }

    /**
     * True if $origin is allowed by $allowed: an exact origin (compared exactly) or a pattern such as
     * `https://*.commmerce.com`. A pattern matches origins with the same scheme and port whose host name ends with
     * "." + the domain, with at least one label before it (any depth: a.b.commmerce.com). It never matches the bare
     * domain, look-alikes (evilcommmerce.com, commmerce.com.evil.com), other schemes or ports, or IP addresses.
     * $origin must be an origin and nothing more (no path, no trailing slash, no user name, no default port written
     * out); letter case is ignored. The same rules as matchesOrigin() in @commmerce/app-bridge.
     *
     * @param mixed $origin
     */
    public static function matchesOrigin(string $allowed, $origin): bool
    {
        if (!is_string($origin) || $origin === '') {
            return false;
        }
        if (strpos($allowed, '*') === false) {
            return $origin === $allowed;
        }
        [$scheme, $domain, $port] = self::parseOriginPattern($allowed);
        if (!preg_match('#^(https?)://([a-z0-9.-]+)(?::(\d{1,5}))?$#D', strtolower($origin), $m)) {
            return false;
        }
        $originPort = $m[3] ?? '';
        if ($originPort !== '' && ($originPort[0] === '0' || (int) $originPort > 65535 || $originPort === self::DEFAULT_PORT[$m[1]])) {
            return false; // not how a browser writes an origin
        }
        if ($m[1] !== $scheme || $originPort !== $port) {
            return false;
        }
        $suffix = '.' . $domain;
        $host = $m[2];
        if (strlen($host) <= strlen($suffix) || substr($host, -strlen($suffix)) !== $suffix) {
            return false;
        }
        foreach (explode('.', substr($host, 0, -strlen($suffix))) as $label) {
            if (!preg_match(self::LABEL, $label)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Parses `https://*.domain` or `http://*.domain`, with an optional `:port`, into [scheme, domain, port].
     * One leading `*.` only, the domain needs a dot (`*.localhost` is allowed for development), no path.
     *
     * @return array{0: string, 1: string, 2: string}
     */
    public static function parseOriginPattern(string $pattern): array
    {
        $fail = fn (string $why) => new \InvalidArgumentException("\"$pattern\" is not a valid origin pattern: $why. "
            . 'Use an exact origin such as https://admin.example.com, or a pattern such as https://*.commmerce.com');
        if (!preg_match('#^(https?)://\*\.([^:/?\#]*)(?::(\d{1,5}))?$#Di', $pattern, $m)) {
            throw $fail('it must be https://*.domain or http://*.domain, with an optional :port and nothing else');
        }
        $scheme = strtolower($m[1]);
        $domain = strtolower($m[2]);
        $labels = explode('.', $domain);
        if (strlen($domain) > 253) {
            throw $fail('the domain is too long');
        }
        foreach ($labels as $label) {
            if (!preg_match(self::LABEL, $label)) {
                throw $fail('the part after "*." must be a domain name (letters, digits, hyphens and dots)');
            }
        }
        if (count($labels) < 2 && $domain !== 'localhost') {
            throw $fail('the domain after "*." needs at least one dot, e.g. *.commmerce.com');
        }
        if (preg_match('/^(\d+|0x[0-9a-f]*)$/D', end($labels))) {
            throw $fail('IP addresses cannot have a wildcard');
        }
        $port = '';
        if (isset($m[3]) && $m[3] !== '') {
            $n = (int) $m[3];
            if ($n < 1 || $n > 65535) {
                throw $fail('the port must be 1 to 65535');
            }
            $port = (string) $n === self::DEFAULT_PORT[$scheme] ? '' : (string) $n;
        }
        return [$scheme, $domain, $port];
    }

    private const LABEL = '/^(?!-)[a-z0-9-]{1,63}(?<!-)$/D';
    private const DEFAULT_PORT = ['https' => '443', 'http' => '80'];

    /** Signs a token. For the dev admin and tests only: in production the Commmerce admin signs tokens. */
    public static function sign(array $claims, string $secret): string
    {
        $now = time();
        $claims += ['iat' => $now, 'nbf' => $now, 'exp' => $now + 60, 'jti' => bin2hex(random_bytes(16))];
        $head = self::encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::encode(json_encode($claims));
        return $head . '.' . $body . '.' . self::encode(hash_hmac('sha256', $head . '.' . $body, $secret, true));
    }

    private static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private static function decode(string $part): string
    {
        if (!preg_match('/^[A-Za-z0-9_-]*$/', $part)) {
            throw new SessionTokenError('malformed', 'Token is not base64url');
        }
        $bytes = base64_decode(strtr($part, '-_', '+/') . str_repeat('=', (4 - strlen($part) % 4) % 4), true);
        if ($bytes === false) {
            throw new SessionTokenError('malformed', 'Token is not base64url');
        }
        return $bytes;
    }
}
