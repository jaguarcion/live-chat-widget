#!/bin/sh
set -eu

max=30
i=0

while true; do
  i=$((i + 1))

  output="$(./node_modules/.bin/prisma migrate deploy 2>&1)" && {
    echo "$output"
    break
  }

  echo "$output"

  if echo "$output" | grep -q "Error: P3005"; then
    echo "Detected Prisma P3005 (non-empty schema without migration history)."
    echo "Falling back to prisma db push for compatibility with existing production databases."
    ./node_modules/.bin/prisma db push
    break
  fi

  if [ "$i" -ge "$max" ]; then
    echo "Migration failed after ${max} attempts"
    exit 1
  fi

  echo "Waiting for database..."
  sleep 3
done

node dist/index.js
