#!/bin/sh
# Live output (#52), macOS only: starts Google Chrome for coding-misk with the flags that keep drawing windows and
# tabs the browser would otherwise treat as hidden (a broadcast window covered by other windows stops otherwise).
#   tools/live-chrome.sh           a separate Chrome profile kept in ~/.coding-misk-chrome (its own data, other tabs' sound stays out)
#   tools/live-chrome.sh --main    your usual profile: quit Chrome first (Cmd+Q), the flags apply only to a fresh start
#   URL=http://localhost:5173 by default
set -eu
URL="${URL:-http://localhost:5173}"
FLAGS="--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling"
if [ "${1:-}" = "--main" ]; then
  if pgrep -x "Google Chrome" >/dev/null 2>&1; then echo "Chrome is running: quit it (Cmd+Q) and run this again." >&2; exit 1; fi
  # shellcheck disable=SC2086
  open -a "Google Chrome" --args $FLAGS "$URL"
else
  # shellcheck disable=SC2086
  open -na "Google Chrome" --args --user-data-dir="$HOME/.coding-misk-chrome" $FLAGS "$URL"
fi
