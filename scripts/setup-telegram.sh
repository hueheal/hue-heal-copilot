#!/usr/bin/env bash
# ============================================================================
# Link your Telegram bot to the copilot's org.
#
# Run it, paste the token BotFather gave you when asked, and it does the rest:
# stores the token on the edge functions, mints a webhook secret, and tells
# Telegram where to deliver your messages.
#
# The token is never printed, never written to the repo, and never leaves your
# machine except to Supabase and Telegram. It is typed into a hidden prompt
# rather than passed as an argument, so it does not appear in your shell
# history or in the process list.
#
#   bash scripts/setup-telegram.sh
# ============================================================================
set -euo pipefail

PROJECT_REF="dxniwcwoacyrjlyhymoh"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/telegram-bridge"

cd "$(dirname "$0")/.."

echo
echo "Telegram setup for the studio org"
echo "---------------------------------"
echo "Paste the token BotFather sent you. It looks like 8123456789:AAH...  "
echo "Nothing you type here is shown on screen."
echo
printf "Bot token: "
read -rs BOT_TOKEN
echo
echo

if [[ ! "$BOT_TOKEN" =~ ^[0-9]{6,}:[A-Za-z0-9_-]{30,}$ ]]; then
  echo "That does not look like a bot token."
  echo "It should be a number, then a colon, then a long string, all on one line."
  echo "In Telegram, open the BotFather chat and copy the line under 'Use this token'."
  exit 1
fi

# Confirm the token works, and learn the bot's username for the deep link.
echo "Checking the token with Telegram..."
ME_JSON="$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")"
if ! grep -q '"ok":true' <<<"$ME_JSON"; then
  echo "Telegram rejected that token. Copy it again from BotFather and re-run."
  exit 1
fi
BOT_USERNAME="$(sed -n 's/.*"username":"\([^"]*\)".*/\1/p' <<<"$ME_JSON")"
echo "Connected to @${BOT_USERNAME}."
echo

WEBHOOK_SECRET="$(openssl rand -hex 24)"

# Hand the secrets to the edge functions through a private temp file, so the
# token never appears as a command argument.
ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE"
trap 'rm -f "$ENV_FILE"' EXIT
cat > "$ENV_FILE" <<EOF
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}
EOF

echo "Storing the token on the edge functions..."
npx --yes supabase secrets set --env-file "$ENV_FILE" --project-ref "$PROJECT_REF" >/dev/null
rm -f "$ENV_FILE"
echo "Stored."
echo

echo "Telling Telegram where to deliver your messages..."
HOOK_JSON="$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${FUNCTION_URL}" \
  -d "secret_token=${WEBHOOK_SECRET}" \
  -d "allowed_updates=[\"message\"]")"
if ! grep -q '"ok":true' <<<"$HOOK_JSON"; then
  echo "Telegram would not accept the webhook:"
  echo "$HOOK_JSON"
  exit 1
fi
echo "Done."
echo

cat <<EOF

All set. @${BOT_USERNAME} is now wired to your org.

Next, in the copilot:
  1. Settings, then the Channel tab
  2. Generate pairing code
  3. In Telegram, message @${BOT_USERNAME}:  /start CODE

Do that once inside Hue & Heal and again inside Remedae, and each workspace
gets its own chat.

Optional, for the one-tap "Open Telegram" button: set VITE_TELEGRAM_BOT to
${BOT_USERNAME} in Netlify's environment variables and redeploy.
EOF
