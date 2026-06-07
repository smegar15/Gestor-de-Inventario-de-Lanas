#!/bin/sh
set -eu

escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

SUPABASE_URL_ESCAPED="$(escape "${VITE_SUPABASE_URL:-}")"
SUPABASE_KEY_ESCAPED="$(escape "${VITE_SUPABASE_ANON_KEY:-}")"
GEMINI_KEY_ESCAPED="$(escape "${VITE_GEMINI_API_KEY:-}")"

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_SUPABASE_URL: "${SUPABASE_URL_ESCAPED}",
  VITE_SUPABASE_ANON_KEY: "${SUPABASE_KEY_ESCAPED}",
  VITE_GEMINI_API_KEY: "${GEMINI_KEY_ESCAPED}"
};
EOF
