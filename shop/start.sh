#!/usr/bin/env bash
# Starts the local copy of the shop, loads the demo data, and waits until it's ready.
set -euo pipefail
cd "$(dirname "$0")"

docker compose up -d

echo "Loading demo data..."
for attempt in $(seq 1 30); do
  if docker compose exec -T laravel-api php artisan migrate:fresh --seed --force; then
    break
  fi
  echo "API not ready yet (attempt $attempt), retrying..."
  sleep 5
done

wait_for () {
  local name=$1 url=$2
  echo "Waiting for $name at $url..."
  for attempt in $(seq 1 90); do
    if curl -fsS -o /dev/null "$url"; then
      echo "$name is up."
      return 0
    fi
    sleep 5
  done
  echo "$name did not start in time." >&2
  docker compose logs --tail=50 >&2
  return 1
}

wait_for "API" "http://localhost:8091/products"
wait_for "website" "http://localhost:4200"
