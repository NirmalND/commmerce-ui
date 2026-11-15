#!/usr/bin/env bash
# Deploys the docs site to the blog server (commmerce.com/blog/commmerceui/).
# Runs from /etc/cron.d/commmerce-ui every 5 minutes. Does nothing unless origin/main has a new commit.
# Build happens in a fresh release folder; the live symlink only moves after a successful build,
# so a broken commit leaves the previous version online.
#
# Two phases, because `git reset` rewrites this very file:
#   1. update: runs from a /tmp copy, fetches and resets the checkout to origin/main
#   2. build:  the freshly checked-out script builds and publishes that commit
set -euo pipefail

REPO=/root/src/commmerce-ui
WWW=/var/www/commmerce-ui
KEEP=5
MODE=${1:-update}

if [ "$MODE" = "update" ] || [ "$MODE" = "--force" ]; then
  if [ "${DEPLOY_FROM_COPY:-}" != 1 ]; then
    cp "$0" /tmp/deploy-commmerce-ui.sh
    DEPLOY_FROM_COPY=1 exec bash /tmp/deploy-commmerce-ui.sh "$MODE"
  fi
  exec 9>/tmp/deploy-commmerce-ui.lock
  flock -n 9 || exit 0
  cd "$REPO"
  git fetch -q origin main
  NEW=$(git rev-parse origin/main)
  CUR=$(cat "$WWW/current/.commit" 2>/dev/null || echo none)
  [ "$NEW" = "$CUR" ] && [ "$MODE" != "--force" ] && exit 0
  echo "[$(date -u +%FT%TZ)] deploying ${NEW:0:7} (was ${CUR:0:7})"
  git reset -q --hard "$NEW"
  exec 9>&-
  exec bash "$REPO/scripts/deploy-server.sh" build "$NEW"
fi

[ "$MODE" = "build" ] || { echo "usage: $0 [update|--force|build <commit>]"; exit 2; }
NEW=$2
exec 9>/tmp/deploy-commmerce-ui.build.lock
flock -n 9 || exit 0
cd "$REPO"

npm ci --no-audit --no-fund --loglevel=error
npm run -s docs:build

REL="$WWW/releases/$(date -u +%Y%m%d%H%M%S)-${NEW:0:7}"
mkdir -p "$REL"
cp -R docs/*.js docs/docs.css docs/vendor "$REL/"
[ -d docs/flutter ] && cp -R docs/flutter "$REL/flutter"   # Flutter web demo (built locally, committed)
cp docs/dev.html "$REL/index.html"     # full HTML document (docs/index.html is page content only)
# Point the page at this release's own folder (/_v/<release>/), which nginx serves as immutable,
# so browsers never mix a new page with cached scripts from an older release.
V="_v/$(basename "$REL")"
sed -i -e "s#src=\"app.js\"#src=\"$V/app.js\"#" -e "s#href=\"docs.css\"#href=\"$V/docs.css\"#" \
  -e "s#src=\"vendor/cdn.js\"#src=\"$V/vendor/cdn.js\"#" -e "s#href=\"vendor/tokens.css\"#href=\"$V/vendor/tokens.css\"#" "$REL/index.html"
grep -q "$V/app.js" "$REL/index.html" || { echo "versioning failed, not publishing"; rm -rf "$REL"; exit 1; }
echo "$NEW" > "$REL/.commit"

# Versioned hosted build: /blog/commmerceui/v/<version>/ is immutable once published. Never overwrite it:
# if the version was not raised, keep the published files and say so.
VER=$(node -p "require('./packages/ui/package.json').version")
VDIR="$WWW/v/$VER"
if [ -d "$VDIR" ]; then
  echo "[$(date -u +%FT%TZ)] v$VER already published; left unchanged (raise the version to publish changes)"
else
  mkdir -p "$VDIR.tmp"
  cp packages/tokens/dist/tokens.css packages/tokens/dist/fonts.css packages/tokens/dist/tokens.json packages/ui/dist/cdn.js packages/ui/dist/custom-elements.json \
    packages/app-bridge/dist/app-bridge.js "$VDIR.tmp/"
  echo "$NEW" > "$VDIR.tmp/.commit"
  mv "$VDIR.tmp" "$VDIR"
  echo "[$(date -u +%FT%TZ)] published v$VER -> $VDIR"
fi

ln -sfn "$REL" "$WWW/current.tmp" && mv -Tf "$WWW/current.tmp" "$WWW/current"
ls -1dt "$WWW"/releases/* | tail -n +$((KEEP + 1)) | xargs -r rm -rf
echo "[$(date -u +%FT%TZ)] live: ${NEW:0:7} -> $REL"
