#!/bin/sh
set -eu

secret_dir="$(node /app/dist/runtime-secrets.js)"
. "$secret_dir/environment"
exec "$@"
