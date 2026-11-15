<?php
// Commmerce app starter (PHP): the front controller for an app that runs inside the Commmerce admin.
//   COMMMERCE_DEV=1 php -S 127.0.0.1:4800 index.php     then open http://localhost:4800/dev-admin
// It serves the app page, verifies App Bridge session tokens on /api/*, and, in development only, plays the
// admin at /dev-admin. On Apache or nginx, send every request to this file (see README.md).

declare(strict_types=1);

require __DIR__ . '/lib/SessionToken.php';

use Commmerce\SessionToken;
use Commmerce\SessionTokenError;

// Development mode only when asked for: never on by accident on a real server.
$dev = getenv('COMMMERCE_DEV') === '1';
$port = (int) ($_SERVER['SERVER_PORT'] ?? 4800);
$apiKey = getenv('COMMMERCE_API_KEY') ?: ($dev ? 'dev-api-key' : '');
$secret = getenv('COMMMERCE_APP_SECRET') ?: ($dev ? 'dev-secret-change-me' : '');
// The admin's origin: https://*.commmerce.com (any Commmerce admin on a subdomain; recommended) or one exact origin.
// In development the dev admin is this server as "localhost" and the app is the same server as "127.0.0.1", so
// they are different origins, as in production.
$adminOrigin = getenv('COMMMERCE_ADMIN_ORIGIN') ?: ($dev ? "http://localhost:$port" : '');
if ($apiKey === '' || $secret === '' || $adminOrigin === '') {
    http_response_code(500);
    exit('Set COMMMERCE_API_KEY, COMMMERCE_APP_SECRET and COMMMERCE_ADMIN_ORIGIN (e.g. https://*.commmerce.com).');
}
if (strpos($adminOrigin, '*') !== false) {
    try {
        SessionToken::parseOriginPattern($adminOrigin);
    } catch (\InvalidArgumentException $e) {
        http_response_code(500);
        exit('COMMMERCE_ADMIN_ORIGIN ' . $e->getMessage());
    }
}

// Stores that installed this app. Replace with your database: never serve a store that is not here.
$installs = $dev ? ['http://store.localhost' => ['name' => 'Demo store']] : [];
foreach (array_filter(explode(',', (string) getenv('INSTALLED_STORES'))) as $store) {
    $installs[$store] = ['name' => $store];
}

// Only the Commmerce admin may frame the app (clickjacking protection). A pattern works here as it is: in CSP,
// https://*.commmerce.com also means any subdomain at any depth, and not commmerce.com itself.
header("Content-Security-Policy: frame-ancestors $adminOrigin");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

function json(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($body);
}

/** Verifies the session token and finds the store. Answers 401/403 itself and returns null when it can't. */
function authenticate(string $secret, string $apiKey, string $adminOrigin, array $installs): ?array
{
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = preg_replace('/^Bearer /', '', $auth);
    try {
        $claims = SessionToken::verify($token, $secret, $apiKey, $adminOrigin);
    } catch (SessionTokenError $e) {
        json(401, ['error' => $e->reason]);
        return null;
    }
    // The store comes from the verified token, never from the request.
    $store = $installs[$claims['dest']] ?? null;
    if ($store === null) {
        json(403, ['error' => 'This store has not installed the app']);
        return null;
    }
    return ['claims' => $claims, 'store' => $store];
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// --- Your API: every route checks the session token first.
if ($path === '/api/me' && $method === 'GET') {
    $auth = authenticate($secret, $apiKey, $adminOrigin, $installs);
    if ($auth) {
        json(200, ['store' => $auth['claims']['dest'], 'storeName' => $auth['store']['name'], 'staff' => $auth['claims']['sub']]);
    }
    return;
}

// --- Development only: a stand-in admin and the token endpoint the real admin's backend provides.
if ($dev && $path === '/dev-admin') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/public/dev-admin.html');
    return;
}
if ($dev && $path === '/dev/token' && $method === 'POST' && SessionToken::matchesOrigin($adminOrigin, $_SERVER['HTTP_ORIGIN'] ?? '')) {
    json(200, ['token' => SessionToken::sign(['iss' => $_SERVER['HTTP_ORIGIN'], 'dest' => 'http://store.localhost', 'aud' => $apiKey, 'sub' => 'staff-1', 'sid' => 'dev-session'], $secret)]);
    return;
}
if ($dev && $path === '/dev/config') {
    json(200, ['apiKey' => $apiKey, 'appOrigin' => "http://127.0.0.1:$port"]);
    return;
}

// --- The app page and the pinned Commmerce UI files.
if ($path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    $page = file_get_contents(__DIR__ . '/public/index.html');
    echo strtr($page, ['%ADMIN_ORIGIN%' => json_encode($adminOrigin, JSON_UNESCAPED_SLASHES), '%API_KEY%' => json_encode($apiKey, JSON_UNESCAPED_SLASHES)]);
    return;
}
if (preg_match('#^/vendor/(tokens\.css|cdn\.js|app-bridge\.js)$#', $path, $m) && is_file(__DIR__ . "/vendor/$m[1]")) {
    header('Content-Type: ' . (str_ends_with($m[1], '.css') ? 'text/css' : 'text/javascript'));
    readfile(__DIR__ . "/vendor/$m[1]");
    return;
}
json(404, ['error' => 'Not found']);
