#!/usr/bin/env bash
# Crossline web dev server with auto-restart (a crash self-heals in 2s).
# Usage: setsid nohup scripts/dev-web.sh > /tmp/crossline-web.log 2>&1 &
set -u
cd "$(dirname "$0")/../web"
BIN=../node_modules/.bin
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://crossline.argo.gibsonops.com}"
export ENGINE_URL="${ENGINE_URL:-https://crossline-engine.argo.gibsonops.com}"
while true; do
  infisical-agent run --env=dev -- "$BIN/react-router" dev --port 5273
  code=$?
  echo "[dev-web] server exited ($code) — restarting in 2s" >&2
  sleep 2
done
