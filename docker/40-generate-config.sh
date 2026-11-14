#!/bin/sh
set -eu

OUTPUT_PATH="${CONFIG_OUTPUT_PATH:-/usr/share/nginx/html/config.json}"
API_URL="${API_BASE_URL:-http://localhost:8000}"
MOCKS_RAW="${USE_MOCKS:-false}"

case "$MOCKS_RAW" in
  true|TRUE|1|yes|YES)
    MOCKS_BOOL="true"
    ;;
  *)
    MOCKS_BOOL="false"
    ;;
esac

ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > "$OUTPUT_PATH" <<EOF
{"apiBaseUrl":"${ESCAPED_API_URL}","useMocks":${MOCKS_BOOL}}
EOF
