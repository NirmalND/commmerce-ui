<?php
// Checks the session-token rules: php tests/run.php
declare(strict_types=1);

require __DIR__ . '/../lib/SessionToken.php';

use Commmerce\SessionToken;
use Commmerce\SessionTokenError;

$failures = 0;
function check(string $name, callable $fn): void
{
    global $failures;
    try { $fn(); echo "ok   $name\n"; } catch (\Throwable $e) { $failures++; echo "FAIL $name: {$e->getMessage()}\n"; }
}
function refuses(string $reason, callable $fn): void
{
    try { $fn(); } catch (SessionTokenError $e) {
        if ($e->reason !== $reason) throw new \Exception("refused as {$e->reason}, expected $reason");
        return;
    }
    throw new \Exception("accepted, expected $reason");
}

$claims = ['iss' => 'https://admin.example', 'dest' => 'https://shop.example', 'aud' => 'key-1', 'sub' => 'staff-7', 'sid' => 's1'];
$verify = fn (string $t) => SessionToken::verify($t, 'secret-1', 'key-1', 'https://admin.example');
$b64 = fn (string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');

check('accepts a valid token and returns its claims', function () use ($claims, $verify) {
    $c = $verify(SessionToken::sign($claims, 'secret-1'));
    if ($c['dest'] !== 'https://shop.example' || $c['sub'] !== 'staff-7') throw new \Exception('wrong claims');
});
check('refuses a wrong secret', fn () => refuses('signature', fn () => $verify(SessionToken::sign($claims, 'other'))));
check('refuses another app', fn () => refuses('audience', fn () => $verify(SessionToken::sign(['aud' => 'key-2'] + $claims, 'secret-1'))));
check('refuses another issuer', fn () => refuses('issuer', fn () => $verify(SessionToken::sign(['iss' => 'https://evil.example'] + $claims, 'secret-1'))));
check('refuses an expired token', function () use ($claims, $verify) {
    $old = time() - 3600;
    refuses('expired', fn () => $verify(SessionToken::sign(['iat' => $old, 'nbf' => $old, 'exp' => $old + 60] + $claims, 'secret-1')));
});
check('refuses a token not valid yet', function () use ($claims, $verify) {
    $later = time() + 3600;
    refuses('not-yet-valid', fn () => $verify(SessionToken::sign(['nbf' => $later, 'exp' => $later + 60] + $claims, 'secret-1')));
});
check('refuses alg none and other algorithms', function () use ($claims, $verify, $b64) {
    $body = $b64(json_encode($claims + ['exp' => time() + 60]));
    refuses('algorithm', fn () => $verify($b64('{"alg":"none","typ":"JWT"}') . ".$body."));
    refuses('algorithm', fn () => $verify($b64('{"alg":"HS512","typ":"JWT"}') . ".$body.abc"));
});
check('refuses malformed tokens', function () use ($verify) {
    refuses('malformed', fn () => $verify('abc'));
    refuses('malformed', fn () => $verify('a.b'));
    refuses('malformed', fn () => $verify('!!.@@.##'));
    refuses('malformed', fn () => $verify(''));
});
check('accepts an issuer pattern such as https://*.commmerce.com', function () use ($claims) {
    $v = fn (string $iss) => SessionToken::verify(SessionToken::sign(['iss' => $iss] + $claims, 'secret-1'), 'secret-1', 'key-1', 'https://*.commmerce.com');
    foreach (['https://admin.commmerce.com', 'https://a.b.commmerce.com', 'HTTPS://Admin.Commmerce.com'] as $iss) {
        if ($v($iss)['iss'] !== $iss) throw new \Exception("wrong claims for $iss");
    }
    foreach (['https://commmerce.com', 'https://evilcommmerce.com', 'https://commmerce.com.evil.com', 'https://admin.commmerce.com.evil.com',
        'http://admin.commmerce.com', 'https://admin.commmerce.com:8443', 'https://admin.commmerce.com:443', 'https://admin.commmerce.com/',
        'https://evil.com@admin.commmerce.com', 'https://.commmerce.com', 'https://a..commmerce.com', 'https://a_b.commmerce.com',
        'https://admin.commmerce.com.', 'https://127.0.0.1', 'https://[::1]', 'null', '', "https://admin.commmerce.com\n"] as $iss) {
        refuses('issuer', fn () => $v($iss));
    }
    refuses('issuer', fn () => SessionToken::verify(SessionToken::sign(['iss' => ['https://admin.commmerce.com']] + $claims, 'secret-1'), 'secret-1', 'key-1', 'https://*.commmerce.com'));
});
check('an exact issuer is still compared exactly', function () use ($claims) {
    refuses('issuer', fn () => SessionToken::verify(SessionToken::sign(['iss' => 'https://x.admin.example'] + $claims, 'secret-1'), 'secret-1', 'key-1', 'https://admin.example'));
});
check('matchesOrigin follows the pattern\'s port and scheme', function () {
    $cases = [
        ['http://*.localhost:4800', 'http://admin.localhost:4800', true], ['http://*.localhost:4800', 'http://localhost:4800', false],
        ['http://*.localhost:4800', 'http://admin.localhost:4801', false], ['http://*.localhost:4800', 'http://admin.localhost', false],
        ['http://*.localhost:4800', 'https://admin.localhost:4800', false], ['https://*.commmerce.com:443', 'https://admin.commmerce.com', true],
        ['https://*.admin.commmerce.com', 'https://admin.commmerce.com', false], ['https://*.commmerce.com:8443', 'https://admin.commmerce.com:08443', false],
    ];
    foreach ($cases as [$pattern, $origin, $want]) {
        if (SessionToken::matchesOrigin($pattern, $origin) !== $want) throw new \Exception("$pattern vs $origin");
    }
});
check('refuses invalid issuer patterns as a setting error', function () use ($claims) {
    $t = SessionToken::sign($claims, 'secret-1');
    foreach (['*', 'https://*', 'https://*.com', 'https://*.*.commmerce.com', 'https://a.*.commmerce.com', 'https://*admin.commmerce.com',
        'https://*.commmerce.com/', 'https://*.commmerce.com/admin', 'https://*.commmerce.com:0', 'https://*.commmerce.com:65536',
        'ftp://*.commmerce.com', 'https://*.10.0.0.1', 'https://*.commmerce..com', 'https://*.commmerce.com.', "https://*.commmerce.com\n",
        'https://*.commmerce.com@evil.com', 'https://user@*.commmerce.com', 'https://*.comm_merce.com'] as $pattern) {
        try { SessionToken::verify($t, 'secret-1', 'key-1', $pattern); } catch (\InvalidArgumentException $e) { continue; }
        throw new \Exception("accepted the pattern $pattern");
    }
});
check('accepts a token signed by @commmerce/app-bridge (if given)', function () use ($verify) {
    $t = getenv('JS_SIGNED_TOKEN');
    if (!$t) { echo "     (skipped: set JS_SIGNED_TOKEN to cross-check)\n"; return; }
    $c = $verify($t);
    if ($c['sub'] !== 'staff-7') throw new \Exception('wrong claims');
});

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit($failures ? 1 : 0);
