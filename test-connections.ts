import 'dotenv/config';
import { Telegraf } from 'telegraf';
// @ts-ignore
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

async function runTests() {
  console.log('🛡️  Vendo Service Connectivity Check\n');

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

  // 2. Groq AI
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
      console.log(`✅ Groq AI: SUCCESS - "${completion.choices?.[0]?.message?.content || 'Connected'}"`);
    } catch (e: any) {
      console.error(`❌ Groq AI: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Groq AI: GROQ_API key is missing.');
  }

  // 2.5 OpenRouter (Gemini Fallback)
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      const or = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: orKey,
      });
      const completion = await or.chat.completions.create({
        messages: [{ role: 'user', content: 'Respond with "OpenRouter is active"' }],
        model: 'google/gemini-flash-1.5',
      });
      console.log(`✅ OpenRouter AI: SUCCESS - "${completion.choices?.[0]?.message?.content || 'Connected'}"`);
    } catch (e: any) {
      console.error(`❌ OpenRouter AI: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  OpenRouter AI: OPENROUTER_API_KEY is missing.');
  }

  // 4. Hugging Face
  const hfKey = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || '').trim();
  if (hfKey) {
    if (!hfKey.startsWith('hf_')) {
      console.error('❌ Hugging Face: Failed. Token must start with "hf_"');
    } else {
    try {
      const hf = new HfInference(hfKey);
      // Test specifically with the FLUX.1-schnell model
      await hf.textToImage({
        model: 'black-forest-labs/FLUX.1-schnell',
        inputs: 'A simple test prompt',
      });
      console.log('✅ Hugging Face: SUCCESS (Auth verified)');
    } catch (e: any) {
      console.error(`❌ Hugging Face: Failed. Error: ${e.message}`);
    }
    }
  } else {
    console.warn('⚠️  Hugging Face: HUGGING_FACE_API key is missing.');
  }

  // 5. Ollama Cloud Fallback
  const ollamaUrl = "https://ollama.com";
  const ollamaUrl = (process.env.OLLAMA_URL || "https://ollama.com").replace(/\/v1.*$/, "");
  const ollamaKey = (process.env.OLLAMA_API_KEY || "").trim();

  try {
    const ollama = new Ollama({
      host: ollamaUrl,
      headers: {
        Authorization: `Bearer ${ollamaKey}`,
      },
    });

    const models = await ollama.list();
    const isLocal = ollamaUrl.includes('127.0.0.1') || ollamaUrl.includes('localhost');
    console.log(`✅ Ollama: SUCCESS (${isLocal ? 'Local' : 'Cloud'} API active, ${models.models?.length || 0} models found)`);
  } catch (e: any) {
    console.error(`❌ Ollama: Failed to connect or authenticate to ${ollamaUrl}. Error: ${e.message}`);
  }

  // 5. Supabase
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (sbUrl && sbKey && !sbUrl.includes('placeholder')) {
    try {
      const supabase = createClient(sbUrl, sbKey);
      // Prisma often names the table "User" (singular) in the database
      const { data, error } = await supabase.from('User').select('id').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 just means no rows found, which is fine
        if (error.message.includes("not found")) console.warn(`⚠️  Supabase: Connected, but table not found. Details: ${error.message}`);
        else throw error;
      }
      console.log('✅ Supabase: SUCCESS (Database query worked)');
    } catch (e: any) {
      console.error(`❌ Supabase: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Supabase: URL or Key is missing or using placeholders.');
  }

  console.log('\n🏁 Tests completed.');
}

runTests();