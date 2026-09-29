#!/usr/bin/env bash
# ============================================================================
# Connect Remedae's email to the Copilot, so drafts, tests and newsletters
# from @remedae.app go out through Resend on Remedae's verified domain.
#
# Run it yourself in Terminal:  bash scripts/connect-remedae-email.sh
# It asks for a Resend API key (hidden as you type) and stores it as the
# Supabase secret RESEND_API_KEY_REMEDAE. The key never appears on screen,
# in a file, or in shell history.
#
# Best practice: in Resend (the account where remedae.app is verified), create
# a new key named "Copilot", permission "Sending access", domain remedae.app.
# That way Copilot's access can be revoked without touching the Remedae app.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=dxniwcwoacyrjlyhymoh

printf 'Paste the Resend key for remedae.app (hidden), then press Return: '
read -rs KEY; echo
case "$KEY" in re_*) ;; *) echo "That does not look like a Resend key (they start with re_). Nothing was changed."; exit 1 ;; esac

# Hand the key over in a private temporary file, not on the command line.
TMP="$(mktemp)"; chmod 600 "$TMP"; trap 'rm -f "$TMP"' EXIT
printf 'RESEND_API_KEY_REMEDAE=%s\n' "$KEY" > "$TMP"; unset KEY
SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s 'Supabase CLI' -w)" \
  npx --yes supabase secrets set --project-ref "$PROJECT" --env-file "$TMP" >/dev/null
echo "Done. Remedae email is connected. In the Copilot, open any Remedae draft and tap Send me a test to check it."
