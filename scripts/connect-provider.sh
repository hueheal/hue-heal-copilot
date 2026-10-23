#!/usr/bin/env bash
# ============================================================================
# Give the copilot's portfolio connector a read key for one provider.
#
#   bash scripts/connect-provider.sh netlify   deploys for the site, Moss Island
#   bash scripts/connect-provider.sh vercel    deploys for Remedae
#   bash scripts/connect-provider.sh github    latest changes and pull requests
#
# The key is typed hidden, handed to Supabase in a private temporary file and
# stored as a secret (NETLIFY_TOKEN, VERCEL_TOKEN or GITHUB_TOKEN). It never
# appears on screen, in a file that stays, or in shell history.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=dxniwcwoacyrjlyhymoh

case "${1:-}" in
  netlify)
    NAME=NETLIFY_TOKEN; PREFIX=nfp_
    echo "Netlify: app.netlify.com, your avatar, User settings, Applications, Personal access tokens, New access token."
    echo "Name it \"Copilot portfolio\" and give it an expiry. The copilot only reads deploys and starts rebuilds." ;;
  vercel)
    NAME=VERCEL_TOKEN; PREFIX=
    echo "Vercel: vercel.com/account/tokens, Create. Name it \"Copilot portfolio\", scope it to the team that owns Remedae, and set an expiry."
    echo "The copilot only reads deployments." ;;
  github)
    NAME=GITHUB_TOKEN; PREFIX=github_pat_
    echo "GitHub: github.com/settings/personal-access-tokens/new (fine-grained). Resource owner: hueheal."
    echo "Repositories: HueandHeal-Website, hue-heal-copilot, remedae, MossIsland."
    echo "Permissions, all read-only: Contents, Metadata, Pull requests." ;;
  *) echo "Usage: bash scripts/connect-provider.sh netlify | vercel | github"; exit 1 ;;
esac

printf 'Paste the key (hidden), then press Return: '
read -rs KEY; echo
if [ -z "$KEY" ] || { [ -n "$PREFIX" ] && [ "${KEY#"$PREFIX"}" = "$KEY" ]; }; then
  echo "That does not look like a ${1} key${PREFIX:+ (they start with $PREFIX)}. Nothing was changed."; exit 1
fi
TMP="$(mktemp)"; chmod 600 "$TMP"; trap 'rm -f "$TMP"' EXIT
printf '%s=%s\n' "$NAME" "$KEY" > "$TMP"; unset KEY
SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s 'Supabase CLI' -w)" \
  npx --yes supabase secrets set --project-ref "$PROJECT" --env-file "$TMP" >/dev/null
echo "Done. In the copilot, open Portfolio and tap Check now."
