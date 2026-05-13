#!/usr/bin/env bash
# One-time / repeat checks for macOS dev (Xcode, CLI tools, Node deps).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Xcode =="
if [ -d /Applications/Xcode.app ]; then
  echo "Xcode.app found."
  CURRENT="$(xcode-select -p 2>/dev/null || true)"
  echo "Current xcode-select: ${CURRENT:-unknown}"
  if [ "$CURRENT" != "/Applications/Xcode.app/Contents/Developer" ]; then
    echo "Run this once (needs your Mac password):"
    echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    echo "Then open Xcode once to finish extra components."
  fi
else
  echo "Xcode.app not installed. Install Xcode from the Mac App Store for iOS Simulator."
fi

echo ""
echo "== Backend Python venv =="
if [ -x "$REPO_ROOT/backend/.venv/bin/python" ]; then
  echo "backend/.venv exists."
else
  echo "Create venv and install backend, for example:"
  echo "  cd \"$REPO_ROOT/backend\" && python3 -m venv .venv && . .venv/bin/activate && pip install -e ."
fi

echo ""
echo "== Mobile app npm =="
cd "$REPO_ROOT/mobile-app"
npm install

echo ""
echo "Done. Start full stack with:"
echo "  bash \"$REPO_ROOT/scripts/dev-stack.sh\""
