<?php
// Downloads one pinned version of the Commmerce UI hosted build into vendor/.
// Pinned files never change; raise the version after reading the release notes.
//   php fetch-vendor.php            (or COMMMERCE_UI_VERSION=1.0.0-rc.3 php fetch-vendor.php)

$version = getenv('COMMMERCE_UI_VERSION') ?: '1.0.0-rc.3';
$base = "https://commmerce.com/blog/commmerceui/v/$version";
@mkdir(__DIR__ . '/vendor');
foreach (['tokens.css', 'cdn.js', 'app-bridge.js'] as $file) {
    $bytes = @file_get_contents("$base/$file");
    if ($bytes === false) {
        fwrite(STDERR, "Could not download $base/$file\n");
        exit(1);
    }
    file_put_contents(__DIR__ . "/vendor/$file", $bytes);
    echo "vendor/$file (v$version)\n";
}
