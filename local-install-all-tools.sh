#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PACKAGES=(
  cc-confidence
  cc-session-history
  cc-settings-tool
  cc-skills-gui
  docs-tool
  fl-sdlc
  goobernetes
  md-reader
  npm-status
  port-assignment
  prism-framework
  tickets-tool
)

for pkg in "${PACKAGES[@]}"; do
  echo "==> Installing $pkg"
  (cd "$SCRIPT_DIR/$pkg" && pnpm local:install)
done

echo "==> All done"
