#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="$SCRIPT_DIR/snapshot.log"

exec >> "$LOG" 2>&1

echo ""
echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] Starting snapshot for ${1:-TATAMI}"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$SCRIPT_DIR/node"
node saveImage.js "${1:-TATAMI}"
