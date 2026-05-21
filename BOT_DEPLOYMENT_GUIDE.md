# Vendo AI Bot - Complete Setup & Deployment Guide

## ✅ What's Been Built

### 1. **AI-Powered Supplier Selection System**
- AI analyzes all verified suppliers and their products
- Intelligent selection based on:
  - ✅ KYC verification (APPROVED status only)
  - ✅ Product availability and stock
  - ✅ Description match with user request
  - ✅ Price range matching
  - ✅ Location proximity (when available)
  - ✅ Delivery success rate
  - ✅ Fallback to next-best supplier if needed

### 2. **API Endpoints Created**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/users/create` | POST | Create new user when they first message bot |
| `/api/suppliers/verified` | GET | Get all verified suppliers with their products |
| `/api/users/location` | POST | Save user location for delivery optimization |
| `/api/telegram/conversation` | POST/GET | Store and retrieve conversation history |
| `/api/telegram` | POST | Main webhook endpoint for Telegram |

### 3. **Telegram Bot Features**

**Commands:**
- `/start` - Welcome + create user
- `/help` - Show available features
- Send text - Ask for products (e.g., "Find me black shoes within 56k")
- Send photo - AI analyzes outfit, suggests matching items
- Share location - Optimizes delivery recommendations
- Share contact - Saves phone number for orders

**AI Capabilities:**
- Groq (Mixtral-8x7b) - Main conversation & supplier selection
- Gemini 1.5 Flash - Image analysis for outfit photos
- HuggingFace - Generate outfit visualization images

### 4. **Session & Context Management**
- In-memory user sessions (production: use Redis)
- Stores: location, shoe size, shirt size
- Conversation context passed to AI for intelligent decisions

## 🚀 Deployment Steps

### Step 1: Verify Environment Variables
Check `.env.local` has all required keys (DO NOT commit real keys):
```
TELEGRAM_BOT_TOKEN=REDACTED_TELEGRAM_BOT_TOKEN
GROQ_API_KEY=REDACTED_GROQ_API_KEY
GEMINI_API_KEY=REDACTED_GEMINI_API_KEY
HF_API_KEY=REDACTED_HF_API_KEY
NEXT_PUBLIC_SITE_URL=REDACTED_NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL=REDACTED_NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=REDACTED_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Step 2: Push to Git
```bash
cd /path/to/vendo
git add .
git commit -m "Add AI-powered Telegram bot with supplier selection logic"
git push origin main
```

### Step 3: Deploy to Vercel
Once pushed, Vercel auto-deploys (or visit vercel.com/import)

### Step 4: Setup Telegram Webhook

**Option A: Using bash script**
```bash
chmod +x setup-webhook.sh
./setup-webhook.sh vendo-nu.vercel.app
```

**Option B: Using curl manually**
```bash
curl -X POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook \
   -H "Content-Type: application/json" \
   -d '{"url": "https://vendo-nu.vercel.app/api/telegram"}'
```

**Option C: Verify webhook was set**
```bash
curl -X GET https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

### Step 5: Verify in Telegram
1. Open Telegram
2. Search for your bot: @YourBotName
3. Send `/start`
4. Bot should respond with welcome message

## 📊 User Flow

```
User sends message
        ↓
Bot creates user if new (calls /api/users/create)
        ↓
Bot fetches verified suppliers (calls /api/suppliers/verified)
        ↓
Bot passes suppliers data to Groq AI
        ↓
Groq AI analyzes request + applies selection logic:
  - Finds suppliers with KYC=APPROVED
  - Filters by product match + price range
  - Ranks by: location proximity → success rate → verification score
        ↓
Bot returns formatted product list to user
        ↓
User selects product or asks follow-up questions
        ↓
AI guides through ordering process
```

## 🧠 AI Selection Algorithm (in Groq)

The system prompts AI to:

1. **Check KYC Status** (CRITICAL)
   - Only suggest suppliers with `kycStatus = APPROVED`
   - Skip any unverified suppliers

2. **Verify Active Status**
   - Only active suppliers (`isActive = true`)

3. **Match Product**
   - Must have product in stock
   - Exact name match preferred, then category match

4. **Check Price Range**
   - Product within user's budget
   - Show selling_price (base_price × 1.25)

5. **Location Proximity** (if user shared location)
   - Calculate distance to supplier
   - Prefer LOCAL suppliers in same state
   - Show delivery time: LOCAL=2-3 days, DROPSHIP=14-21 days

6. **Success Rate**
   - Prefer suppliers with 80%+ delivery success
   - Show: "4.8⭐ (48 successful deliveries)"

7. **Fallback Logic**
   - If exact match not found, suggest next-best option
   - Explain why the alternative is recommended

## 🔐 Security Features

1. **Verified Suppliers Only**
   - All products from KYC-approved suppliers
   - Admin review before listing

2. **Input Validation**
   - Query length limit (200 chars)
   - Coordinate validation
   - Type checking on all endpoints

3. **API Rate Limiting** (recommended for production)
   - Implement at Vercel or use a service

4. **No Direct DB Access from Bot**
   - All queries through secure API endpoints
   - Prevents SQL injection

## 📱 User Profile Tracking

After first message, user data stored:
- `telegramId` - Telegram user ID
- `name` - Username or custom name
- `shoeSize` - Collected during conversation
- `shirtSize` - Collected during conversation
- `lat/lng` - From location share
- `createdAt` - First message timestamp

This enables personalized recommendations on future visits.

## 🛠️ Testing Checklist

- [ ] Deploy to Vercel (auto after git push)
- [ ] Set webhook using one of the methods above
- [ ] Send `/start` command to bot
- [ ] Try: "Find me black shoes within 50k-60k"
- [ ] Share a photo
- [ ] Share your location
- [ ] Verify responses mention verified suppliers only
- [ ] Check prices are in NGN
- [ ] Verify delivery times show correctly

## 📋 Database Schema Requirements

Ensure these tables exist in Supabase:

```sql
-- Users table (already exists)
-- Suppliers table (already exists)
-- Products table (already exists)
-- Orders table (already exists)

-- Optional: Create telegram_conversations table for full history
CREATE TABLE telegram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚨 Troubleshooting

### Bot not responding?
1. Check webhook status: `/getWebhookInfo`
2. Check Vercel logs: `vercel logs`
3. Verify `.env.local` keys are in Vercel deployment

### Webhook returning 500?
1. Check Next.js build: `npm run build`
2. Verify all dependencies installed: `npm install`
3. Check API endpoints are properly created

### AI not selecting suppliers?
1. Verify suppliers in Supabase have `kycStatus = 'APPROVED'`
2. Check products have `isApproved = true` and `isActive = true`
3. Verify products have `stock > 0`

### Images not generating?
1. HuggingFace API might be rate-limited
2. Try simpler descriptions
3. Check HF_API_KEY is valid

## 📈 Next Steps (Phase 2)

- [ ] Add Redis for session persistence
- [ ] Implement conversation history in DB
- [ ] Add payment integration (Flutterwave)
- [ ] Create order confirmation with tracking
- [ ] Add user reviews/ratings for suppliers
- [ ] Implement delivery status updates
- [ ] Add WhatsApp bot (same codebase)
- [ ] Create admin dashboard for moderation

## 💡 Key Files

- `/app/api/telegram/route.ts` - Main bot logic
- `/app/api/users/create/route.ts` - User creation
- `/app/api/suppliers/verified/route.ts` - Supplier data
- `/app/api/users/location/route.ts` - Location tracking
- `/lib/product-search.ts` - Search utilities (optional, for future)
- `/setup-webhook.sh` - Webhook configuration script

## ✅ Production Readiness Checklist

- [ ] All API keys secured in Vercel env vars (not .env.local)
- [ ] Webhook URL accessible from internet
- [ ] Rate limiting implemented
- [ ] Error handling for all endpoints
- [ ] Logging setup (Vercel logs)
- [ ] Database backups configured
- [ ] Session storage upgraded from memory to Redis
- [ ] GDPR compliance for user data
- [ ] Terms & conditions for bot users
