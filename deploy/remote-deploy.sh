#!/usr/bin/env bash
# Runs on the VPS, fed over SSH stdin by the deploy job.
# Expects OWNER_LC, GHCR_USER and GHCR_TOKEN to be exported before this script
# (the job prepends them to stdin, so the token never appears in a process list).
#
# Everything is inside main() so bash parses the whole script before running it:
# a command that reads stdin can't swallow the rest of the script.
set -euo pipefail

main() {
  local app_dir=~/skill-app
  local network=chess-app_default

  cd "$app_dir"
  printf 'GITHUB_USERNAME=%s\nDOMAIN=skill.phuman.me\nTRAEFIK_NETWORK=%s\n' "$OWNER_LC" "$network" > .env

  if ! docker network inspect "$network" >/dev/null 2>&1; then
    echo "Traefik network $network not found. Is ~/chess-app running?" >&2
    exit 1
  fi

  # Pull with this run's short-lived token in a throwaway config,
  # so the server's own registry logins (used by chess) stay untouched.
  # Global, not local: the EXIT trap runs after main() has returned.
  TMP_CONFIG="$(mktemp -d)"
  trap 'rm -rf "$TMP_CONFIG"' EXIT
  printf '%s' "$GHCR_TOKEN" | DOCKER_CONFIG="$TMP_CONFIG" docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
  DOCKER_CONFIG="$TMP_CONFIG" docker compose pull </dev/null
  DOCKER_CONFIG="$TMP_CONFIG" docker logout ghcr.io >/dev/null || true

  docker compose up -d --remove-orphans </dev/null
  docker image prune -f </dev/null
}

main
