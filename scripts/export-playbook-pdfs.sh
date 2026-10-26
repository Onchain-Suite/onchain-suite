#!/usr/bin/env bash
# Export each growth and retention strategy page as a PDF, into public/playbooks/.
#
# Usage:  scripts/export-playbook-pdfs.sh [base-url]
#         base-url defaults to http://localhost:3100 (a running `bun run dev`).
#
# Prints the page with headless Chrome, so the PDF is the page's own print
# stylesheet (styles/print.css): no rail, no chrome, the illustrations drawn.
# Re-run after any change to data/playbooks/*.ts and commit the PDFs; the
# "Download as PDF" link on each page points at these files.
set -euo pipefail

BASE="${1:-http://localhost:3100}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/playbooks"
mkdir -p "$OUT"

CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
done
[ -n "$CHROME" ] || { echo "No Chrome or Chromium found" >&2; exit 1; }

for slug in perp-dexes prediction-markets defi yauga; do
  url="$BASE/retention-playbook/$slug"
  pdf="$OUT/$slug.pdf"
  # --virtual-time-budget lets fonts and the hand-drawn SVGs finish before print.
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
    --virtual-time-budget=8000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$pdf" "$url" >/dev/null 2>&1
  printf '%-20s %6s KB  %s\n' "$slug" "$(( $(stat -f%z "$pdf") / 1024 ))" "$pdf"
done
