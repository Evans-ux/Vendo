# 🔐 URGENT: Security Update for Vendo Team

## What Happened
The repository's git history contained **exposed API keys and secrets**. These have been:
- ✅ Removed from GitHub history (cleaned with BFG)
- ✅ Deleted from all files
- ✅ Protected by updated `.gitignore`

**However**: Anyone who cloned the repo before today still has the old secrets locally.

---

## 👨‍💻 What Each Team Member Should Do

### Step 1: Clean Local Git History (Everyone)
```bash
cd vendo
# Option A: Fresh clone (recommended)
cd ..
rm -rf vendo
git clone https://github.com/Evans-ux/Vendo.git vendo
cd vendo

# Option B: If you have uncommitted work, save it first
git stash  # Save any uncommitted changes
cd ..
rm -rf vendo
git clone https://github.com/Evans-ux/Vendo.git vendo
cd vendo
# Then reapply your work
```

### Step 2: Update Environment Variables (Everyone)
1. Copy template:
   ```bash
   cp env.example .env.local
   ```

2. Fill in **NEW** API keys (see below for how to get them)
   - **DO NOT** use the old exposed keys
   - Get fresh keys from each service

### Step 3: Get New API Keys

#### Telegram Bot Token
1. Open Telegram → Search `@BotFather`
2. Send `/mybots` → Select your bot → `Disable bot` → `Delete this bot`
3. Send `/newbot` to create a new bot
4. Copy new token to `.env.local`

#### Groq API Key
1. Go to https://console.groq.com
2. Login/Signup
3. Create new API key
4. Copy to `.env.local` as `GROQ_API_KEY`

#### HuggingFace Token
1. Go to https://huggingface.co/settings/tokens
2. Click `New token` (create new)
3. Delete the old one if visible
4. Copy to `.env.local` as `HF_API_KEY`

#### Gemini API Key
1. Go to https://ai.google.dev
2. Click `Get API Key`
3. Create new project
4. Copy to `.env.local` as `GEMINI_API_KEY`

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Click `Create new secret key`
3. Copy to `.env.local` as `OPENAI_API_KEY`

#### Flutterwave Keys
1. Go to https://dashboard.flutterwave.com
2. Settings → API Keys
3. Generate new test keys
4. Copy to `.env.local`:
   - `FLW_SECRET_KEY_TEST`
   - `NEXT_PUBLIC_FLW_PUBLIC_KEY_TEST`
   - `FLW_ENCRYPTION_KEY_TEST`

#### Supabase Database
1. Go to https://supabase.com
2. Select your project
3. Database → Users → Reset password for `postgres`
4. Update `.env.local`:
   - `DATABASE_URL`
   - `DIRECT_URL`

#### CJ Dropshipping Key
1. Go to CJ Dropshipping dashboard
2. API settings
3. Regenerate API key
4. Copy to `.env.local` as `CJ_API_KEY`

#### Sendbox Tokens
1. Go to Sendbox dashboard
2. Regenerate all tokens and secrets
3. Copy to `.env.local`:
   - `SENDBOX_API_KEY`
   - `SENDBOX_WEBHOOK_SECRET`
   - `SENDBOX_ACCESS_TOKEN`
   - `SENDBOX_REFRESH_TOKEN`
   - `SENDBOX_CLIENT_SECRETE`

---

## ✅ After Getting All New Keys

1. Fill `.env.local` with all new values
2. Test locally: `npm run dev`
3. Send me the keys (securely) to update Vercel

---

## 🚨 NEVER Do This Again

```bash
# ❌ DON'T - This exposes secrets
git add .env
git add env.local
git add .continue/

# ✅ DO - Use env.example as template
# The .gitignore already prevents accidents
```

---

## Questions?
Contact: [Your contact info]

Last Updated: May 22, 2026
