#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato. Installa Node.js 18+ da https://nodejs.org" >&2
  exit 1
fi

echo "Avvio Tactical Hub Pro su http://127.0.0.1:8787 ..."
node server/server.js
