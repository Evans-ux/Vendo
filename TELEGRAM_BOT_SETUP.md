# Vendo Telegram Bot Setup Guide

## ✅ What's Been Set Up

### 1. **API Endpoint Created**
- **Location**: `/app/api/telegram/route.ts`
- **Functionality**:
  - Main chat with Groq (Mixtral-8x7b) for fashion advice
  - Image interpretation with Gemini for outfit analysis
  - Image generation with HuggingFace for outfit visualization
  - Product search integration
  - Order management

### 2. **Environment Variables Added to `.env.local`**
```
TELEGRAM_BOT_TOKEN=REDACTED_TELEGRAM_BOT_TOKEN
GROQ_API_KEY=REDACTED_GROQ_API_KEY
GEMINI_API_KEY=REDACTED_GEMINI_API_KEY
HF_API_KEY=REDACTED_HF_API_KEY
```

### 3. **Utility Functions Created**
- **Location**: `/lib/telegram-utils.ts`
- **Functions**:
  - `searchProducts()` - Find products in Supabase
  - `getUserProfile()` - Get customer profile
  - `updateUserProfile()` - Save customer preferences
  - `createOrder()` - Create orders from chat
  - `formatProductCard()` - Format product messages
  - `generatePaymentLink()` - Integration with Flutterwave

### 4. **Bot Commands Available**
```
/start    - Welcome message
/help     - Show all commands
/search   - Search for products (e.g., /search black sneakers)
/outfit   - Generate outfit suggestions (e.g., /outfit casual weekend)
/analyze  - Analyze outfit photos
```

## 🚀 Next Steps to Deploy

### 1. Set Telegram Webhook
Run this in your terminal:
```bash
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-vendo-domain/api/telegram"}'
```

Replace:
- `your-vendo-domain` with your actual Vercel domain (e.g., vendo-nu.vercel.app)

### 2. Database Schema Updates Needed
Add these fields to your Supabase `users` table if not present:
```sql
ALTER TABLE users ADD COLUMN telegram_id VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN shoe_size VARCHAR;
ALTER TABLE users ADD COLUMN shirt_size VARCHAR;
ALTER TABLE users ADD COLUMN lat DECIMAL(10,7);
ALTER TABLE users ADD COLUMN lng DECIMAL(10,7);
```

### 3. Update Products Table
Ensure your `products` table has:
```sql
ALTER TABLE products ADD COLUMN sizes JSONB;
ALTER TABLE products ADD COLUMN base_price NUMERIC;
```

### 4. Add Orders Table (if not exists)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR,
  base_price NUMERIC,
  selling_price NUMERIC,
  status VARCHAR DEFAULT 'pending_payment',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Bot Features

### Chat Mode (Groq)
- Answer fashion questions
- Provide style advice
- Search products
- Manage orders

**System Prompt**: The bot acts as "Vendo AI", a friendly Nigerian fashion assistant focused on:
- Warm, helpful service
- Nigerian English style
- Price recommendations in NGN
- Size-based recommendations

### Image Analysis (Gemini)
- Analyze outfit photos users send
- Describe clothing type, colors, occasion
- Suggest matching items
- Provide styling tips

### Image Generation (HuggingFace)
- Generate outfit visualizations
- Create "try-on" previews
- Use Stable Diffusion 3.5 Large

## 📊 Data Flow

```
User (Telegram)
     ↓
/api/telegram (POST webhook)
     ↓
├─ Text Message → Groq (Chat)
├─ Photo → Gemini (Analysis)
├─ /search command → Supabase (Products)
├─ /outfit command → HuggingFace (Image Gen)
└─ /order command → Supabase (Orders)
     ↓
Response back to Telegram
```

## 🔑 Important Notes

### Security
- Keep API keys in `.env.local` (never commit to git)
- Webhook validation handled by Telegraf
- Implement rate limiting for production

### Rate Limits
- **Groq**: 30 requests/minute (free tier)
- **Gemini**: Generous free tier
- **HuggingFace**: 30k requests/month free

### Cost Considerations
- Groq: Free for development
- Gemini: Free tier available
- HuggingFace: Free 30k requests/month
- Telegram: Always free

## 🛠️ Troubleshooting

### Bot not responding?
1. Check webhook is set correctly
2. Verify environment variables in `.env.local`
3. Check Vercel logs: `vercel logs`

### Images not generating?
1. HuggingFace API might be rate-limited
2. Try simpler descriptions
3. Check HF_API_KEY is valid

### Product search returning nothing?
1. Ensure products exist in Supabase
2. Verify table permissions
3. Check Supabase credentials

## 📈 Future Enhancements

- [ ] Size recommendation based on user profile
- [ ] Payment link generation (Flutterwave)
- [ ] Order tracking integration
- [ ] Delivery location capture
- [ ] Supplier rating system
- [ ] Personalized recommendations
- [ ] WhatsApp Bot (same codebase)

## 📚 Dependencies Installed
- ✅ telegraf (4.15.3)
- ✅ groq (5.25.1)
- ✅ @google/generative-ai (0.24.1)
- ✅ @huggingface/inference (4.13.15)

All are already in your `package.json`!
