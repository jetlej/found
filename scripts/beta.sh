#!/usr/bin/env bash
set -euo pipefail

APP_ID="6758254628"
GROUP="Beta Testers"
IPA="./build/app.ipa"

echo "Starting EAS build..."
eas build --platform ios --profile production --non-interactive

IPA_URL="$(eas build:list --platform ios --limit 1 --non-interactive --json 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['artifacts']['buildUrl'])")"

mkdir -p ./build
echo "Downloading IPA..."
curl -fSL -o "$IPA" "$IPA_URL"

echo "Publishing to TestFlight..."
PUBLISH_OUT="$(asc publish testflight \
  --app "$APP_ID" \
  --ipa "$IPA" \
  --group "$GROUP" \
  --wait)"
echo "$PUBLISH_OUT"

BUILD_ID="$(printf '%s' "$PUBLISH_OUT" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['buildId'])")"
echo "Submitting build $BUILD_ID for beta review..."
asc testflight review submit --build-id "$BUILD_ID" --confirm

rm -f "$IPA"
echo "Done! Build submitted for TestFlight review."
