import 'dotenv/config';
import { Telegraf } from 'telegraf';
// @ts-ignore
import Groq from 'groq-sdk';
import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

async function runTests() {
  console.log('🛡️  Vendo Service Connectivity Check\n');
  console.log('Architecture: Ollama (chat) → OpenRouter (fallback) | Groq (vision) | HF (image gen)\n');

  // 1. Telegram Bot
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  if (tgToken && tgToken !== "BOT_TOKEN_PLACEHOLDER_FOR_BUILD") {
    try {
      const bot = new Telegraf(tgToken);
      const me = await bot.telegram.getMe();
      console.log(`✅ Telegram: Connected as @${me.username}`);
    } catch (e: any) {
      console.error(`❌ Telegram: Failed. Check your token. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Telegram: Token is missing or using a placeholder.');
  }

  // 2. Ollama (PRIMARY CHAT ENGINE)
  const ollamaUrl = (process.env.OLLAMA_URL || "https://ollama.com").replace(/\/v1.*$/, "");
  const ollamaKey = (process.env.OLLAMA_API_KEY || "").trim();

  try {
    const ollama = new Ollama({
      host: ollamaUrl,
      headers: ollamaKey ? { Authorization: `Bearer ${ollamaKey}` } : {},
    });

    const listResult = await ollama.list();
    const models = (listResult.models || [])
      .map((m: any) => (m.name || "").trim())
      .filter((name: string) => name.length > 0);

    const isLocal = ollamaUrl.includes('127.0.0.1') || ollamaUrl.includes('localhost');
    console.log(`✅ Ollama [PRIMARY CHAT]: SUCCESS (${isLocal ? 'Local' : 'Cloud'} API active)`);
    console.log(`   Models available (${models.length}): ${models.join(', ') || 'none found'}`);

    if (models.length > 0) {
      // Quick chat test with the first model
      try {
        const testResponse = await ollama.chat({
          model: models[0],
          messages: [{ role: 'user', content: 'Respond with "Ollama is active"' }],
        });
        const reply = (testResponse.message?.content || "").trim();
        console.log(`   Chat test (${models[0]}): "${reply || '(empty response)'}"`);
      } catch (chatErr: any) {
        console.warn(`   ⚠️ Chat test failed: ${chatErr.message}`);
      }
    }
  } catch (e: any) {
    console.error(`❌ Ollama [PRIMARY CHAT]: Failed to connect to ${ollamaUrl}. Error: ${e.message}`);
  }

  // 3. Groq AI (VISION ENGINE)
  const groqKey = process.env.GROQ_API || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      // @ts-ignore
      const groq = new Groq({ apiKey: groqKey });
      if (!groqKey.startsWith('gsk_')) throw new Error("Groq key should start with 'gsk_'");
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'Respond with "Groq is active"' }],
        model: 'llama-3.3-70b-versatile',
      });
      console.log(`✅ Groq AI [VISION]: SUCCESS - "${completion.choices?.[0]?.message?.content || 'Connected'}"`);
    } catch (e: any) {
      console.error(`❌ Groq AI [VISION]: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Groq AI [VISION]: GROQ_API key is missing.');
  }

  // 4. OpenRouter (CHAT FALLBACK)
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const or = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: orKey,
        defaultHeaders: {
          "HTTP-Referer": "https://vendo.ng",
          "X-Title": "Vendo Connection Test",
        }
      });
      const completion = await or.chat.completions.create({
        messages: [{ role: 'user', content: 'Respond with "OpenRouter is active"' }],
        model: 'openrouter/free',
      });
      const usedModel = completion.model;
      console.log(`✅ OpenRouter [CHAT FALLBACK]: SUCCESS (Routed to: ${usedModel}) - "${completion.choices?.[0]?.message?.content || 'Connected'}"`);
    } catch (e: any) {
      console.error(`❌ OpenRouter [CHAT FALLBACK]: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  OpenRouter [CHAT FALLBACK]: OPENROUTER_API_KEY is missing.');
  }

  // 5. Hugging Face (IMAGE GENERATION)
  const hfKey = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || '').trim();
  if (hfKey) {
    if (!hfKey.startsWith('hf_')) {
      console.error('❌ Hugging Face [IMAGE GEN]: Failed. Token must start with "hf_"');
    } else {
    try {
      const hf = new HfInference(hfKey);
      await hf.textToImage({
        model: 'tencent/HunyuanImage-3.0',
        inputs: 'A simple test prompt',
      });
      console.log('✅ Hugging Face [IMAGE GEN]: SUCCESS (Auth verified)');
    } catch (e: any) {
      console.error(`❌ Hugging Face [IMAGE GEN]: Failed. Error: ${e.message}`);
    }
    }
  } else {
    console.warn('⚠️  Hugging Face [IMAGE GEN]: HUGGING_FACE_API key is missing.');
  }

  // 6. Prisma DB
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma DB: SUCCESS (Database connectivity active)');
    await prisma.$disconnect();
  } catch (e: any) {
    console.error(`❌ Prisma DB: Failed. Error: ${e.message}`);
  }

  console.log('\n🏁 Tests completed.');
}

runTests();