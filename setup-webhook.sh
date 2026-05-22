#!/bin/bash

# Telegram Webhook Setup Script for Vendo Bot
# Usage: ./setup-webhook.sh [domain]
# Token should be in TELEGRAM_BOT_TOKEN environment variable

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
DOMAIN="${1:-vendo-nu.vercel.app}"  # Default to production domain
WEBHOOK_URL="https://${DOMAIN}/api/telegram"

# Check if token is provided
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN environment variable not set"
  echo "Please set it: export TELEGRAM_BOT_TOKEN='your-token-here'"
  exit 1
fi

echo "🔧 Setting up Telegram Webhook for Vendo Bot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Telegram Bot Token: ${TELEGRAM_BOT_TOKEN:0:20}..."
echo "Webhook URL: ${WEBHOOK_URL}"
echo ""

# Remove existing webhook first
echo "🧹 Removing existing webhook..."
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook" \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null

sleep 1

# Set new webhook
echo "📡 Setting new webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "Response: $RESPONSE"

# Verify webhook status
echo ""
echo "✅ Checking webhook status..."
curl -s -X GET "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Webhook setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy to Vercel: git push origin main"
echo "2. Test the bot: Start a conversation on Telegram"
echo ""
