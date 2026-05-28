/**
 * Vendo Service Connectivity Check
 * Run: bun test-connections.ts
 *
 * Architecture: Ollama Cloud (chat) → OpenRouter (fallback) | Groq (vision) | HF (image gen)
 */

import 'dotenv/config';
import { Telegraf } from 'telegraf';
// @ts-ignore
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OK  = (label: string, msg: string) => console.log(`✅ ${label}: ${msg}`);
const WARN = (label: string, msg: string) => console.warn(`⚠️  ${label}: ${msg}`);
const FAIL = (label: string, msg: string) => console.error(`❌ ${label}: ${msg}`);

function maskKey(key: string): string {
  if (!key || key.length < 8) return '(empty)';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🛡️  Vendo Service Connectivity Check');
  console.log('   Architecture: Ollama Cloud (chat) → OpenRouter (fallback) | Groq (vision) | HF (image gen)');
  console.log('─'.repeat(70) + '\n');

  // ── 1. Telegram ──────────────────────────────────────────────────────────
  const tgToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!tgToken) {
    WARN('Telegram', 'TELEGRAM_BOT_TOKEN is missing');
  } else {
    try {
      const bot = new Telegraf(tgToken);
      const me = await bot.telegram.getMe();
      OK('Telegram', `Connected as @${me.username} (id: ${me.id})`);
    } catch (e: any) {
      FAIL('Telegram', `${e.message} — check your token`);
    }
  }

  // ── 2. Ollama Cloud (PRIMARY CHAT) ────────────────────────────────────────
  const ollamaUrl = (process.env.OLLAMA_URL || 'https://ollama.com').replace(/\/+$/, '');
  const ollamaKey = (process.env.OLLAMA_API_KEY || '').trim();

  console.log(`\n   Ollama URL : ${ollamaUrl}`);
  console.log(`   Ollama Key : ${maskKey(ollamaKey)}`);

  if (!ollamaKey) {
    WARN('Ollama Cloud [PRIMARY CHAT]', 'OLLAMA_API_KEY is missing — get one at ollama.com/settings/api-keys');
  } else {
    try {
      // Use OpenAI-compatible /v1/models endpoint
      const res = await fetch(`${ollamaUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${ollamaKey}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const data = await res.json();
      const models: string[] = (data.data || [])
        .map((m: any) => (m.id || '').trim())
        .filter((n: string) => n.length > 0);

      OK('Ollama Cloud [PRIMARY CHAT]', `${models.length} cloud models available`);
      console.log(`   Models: ${models.slice(0, 8).join(', ')}${models.length > 8 ? ` ... +${models.length - 8} more` : ''}`);

      // Pick a free model — gemma3:4b is free on Ollama Cloud
      const testModel = models.find(m => m === 'gemma3:4b') ||
        models.find(m => m === 'gemma3:12b') ||
        models.find(m => m.includes('gemma3')) ||
        models.find(m => m.includes('ministral-3:3b')) ||
        models[0];
        try {
          const openai = new OpenAI({ baseURL: `${ollamaUrl}/v1`, apiKey: ollamaKey });
          const completion = await openai.chat.completions.create({
            model: testModel,
            messages: [{ role: 'user', content: 'Reply with exactly: "Ollama Cloud is active"' }],
          });
          const reply = (completion.choices[0]?.message?.content || '').trim();
          console.log(`   Chat test (${testModel}): "${reply || '(empty)'}"`);
        } catch (chatErr: any) {
          WARN('Ollama Cloud chat test', chatErr.message);
        }
      
    }
  catch (e: any) {
      FAIL('Ollama Cloud [PRIMARY CHAT]', e.message);
    }
  }

  // ── 3. OpenRouter (CHAT FALLBACK) ─────────────────────────────────────────
  const orKey = (process.env.OPENROUTER_API_KEY || '').trim();
  console.log(`\n   OpenRouter Key: ${maskKey(orKey)}`);

  if (!orKey) {
    WARN('OpenRouter [CHAT FALLBACK]', 'OPENROUTER_API_KEY is missing — get a free key at openrouter.ai/keys');
  } else {
    try {
      const or = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: orKey,
        defaultHeaders: { 'HTTP-Referer': 'https://vendo.ng', 'X-Title': 'Vendo Test' },
      });
      const completion = await or.chat.completions.create({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: 'Reply with exactly: "OpenRouter is active"' }],
      });
      const reply = (completion.choices[0]?.message?.content || '').trim();
      OK('OpenRouter [CHAT FALLBACK]', `Model: ${completion.model} — "${reply || '(empty)'}"`);
    } catch (e: any) {
      FAIL('OpenRouter [CHAT FALLBACK]', e.message);
    }
  }

  // ── 4. Groq (VISION ENGINE) ───────────────────────────────────────────────
  const groqKey = (process.env.GROQ_API || process.env.GROQ_API_KEY || '').trim();
  console.log(`\n   Groq Key: ${maskKey(groqKey)}`);

  if (!groqKey) {
    WARN('Groq [VISION]', 'GROQ_API key is missing');
  } else {
    try {
      // @ts-ignore
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Reply with exactly: "Groq is active"' }],
      });
      const reply = (completion.choices[0]?.message?.content || '').trim();
      OK('Groq [VISION]', `"${reply || '(empty)'}"`);
    } catch (e: any) {
      FAIL('Groq [VISION]', e.message);
    }
  }

  // ── 5. HuggingFace (IMAGE GENERATION) ────────────────────────────────────
  const hfKey = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || '').trim();
  console.log(`\n   HuggingFace Key: ${maskKey(hfKey)}`);

  if (!hfKey) {
    WARN('HuggingFace [IMAGE GEN]', 'HF_API_KEY is missing');
  } else if (!hfKey.startsWith('hf_')) {
    FAIL('HuggingFace [IMAGE GEN]', 'Token must start with "hf_"');
  } else {
    try {
      // Just verify auth — don't actually generate (costs credits)
      const res = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${hfKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      OK('HuggingFace [IMAGE GEN]', `Authenticated as ${data.name || data.login || 'user'} (auth verified, skipping actual generation to save credits)`);
    } catch (e: any) {
      FAIL('HuggingFace [IMAGE GEN]', e.message);
    }
  }

  // ── 6. Prisma DB ──────────────────────────────────────────────────────────
  const dbUrl = process.env.DATABASE_URL;
  console.log(`\n   DB URL: ${dbUrl ? dbUrl.replace(/:([^:@]+)@/, ':***@') : '(missing)'}`);

  if (!dbUrl) {
    WARN('Prisma DB', 'DATABASE_URL is missing');
  } else {
    try {
      // Dynamically import to ensure env is loaded first
      const { PrismaClient: PC } = await import('@prisma/client');
      const prisma = new PC();
      await prisma.$queryRaw`SELECT 1`;

      const [products, suppliers, users] = await Promise.all([
        prisma.product.count(),
        prisma.supplier.count(),
        prisma.user.count(),
      ]);

      OK('Prisma DB', `Connected — ${products} products | ${suppliers} suppliers | ${users} users`);

      const unapproved = await prisma.product.count({ where: { isApproved: false } });
      const approved = await prisma.product.count({ where: { isApproved: true, isActive: true, stock: { gt: 0 } } });
      console.log(`   Approved & searchable: ${approved} | Pending admin approval: ${unapproved}`);
      if (unapproved > 0) {
        WARN('Products', `${unapproved} product(s) pending admin approval — bot cannot find them until approved`);
        console.log('   → Go to /admin/products and approve them');
      }

      await prisma.$disconnect();
    } catch (e: any) {
      FAIL('Prisma DB', e.message);
    }
  }

  // ── 7. Flutterwave ────────────────────────────────────────────────────────
  const flwKey = (process.env.FLW_SECRET_KEY_TEST || process.env.FLW_SECRET_KEY_LIVE || '').trim();
  console.log(`\n   Flutterwave Key: ${maskKey(flwKey)}`);

  if (!flwKey) {
    WARN('Flutterwave', 'FLW_SECRET_KEY_TEST is missing');
  } else {
    try {
      const res = await fetch('https://api.flutterwave.com/v3/banks/NG?per_page=1', {
        headers: { Authorization: `Bearer ${flwKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      OK('Flutterwave', `Auth verified (${process.env.FLW_MODE || 'test'} mode) — ${data.data?.length || 0} banks returned`);
    } catch (e: any) {
      FAIL('Flutterwave', e.message);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log('🏁 Tests completed.\n');
}

runTests().catch(console.error);
