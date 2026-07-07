#!/usr/bin/env bash
# Crossline engine dev server with auto-restart.
# Usage: setsid nohup scripts/dev-engine.sh > /tmp/crossline-engine.log 2>&1 &
set -u
cd "$(dirname "$0")/../engine"
BIN=../node_modules/.bin
while true; do
  infisical-agent run --env=dev -- "$BIN/tsx" watch src/index.ts
  code=$?
  echo "[dev-engine] server exited ($code) — restarting in 2s" >&2
  sleep 2
done
