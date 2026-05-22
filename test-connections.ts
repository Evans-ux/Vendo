import 'dotenv/config';
import { Telegraf } from 'telegraf';
// @ts-ignore
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import { createClient } from '@supabase/supabase-js';

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
  const groqKey = process.env.GROQ_API;
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

  // 3. Gemini AI
  const geminiKey = process.env.GEMINI_API;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      // Try gemini-1.5-flash; if 404 occurs, it might require 'gemini-1.5-flash-latest' or a stable version
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Respond with "Gemini is active"');
      console.log(`✅ Gemini AI: SUCCESS - "${result.response.text()}"`);
    } catch (e: any) {
      console.error(`❌ Gemini AI: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Gemini AI: GEMINI_API key is missing.');
  }

  // 4. Hugging Face
  const hfKey = process.env.HUGGING_FACE_API;
  if (hfKey) {
    if (!hfKey.startsWith('hf_')) {
      console.error('❌ Hugging Face: Failed. Token must start with "hf_"');
    } else {
    try {
      const hf = new HfInference(hfKey);
      // Using chatCompletion (conversational) as required by newer inference providers
      const response = await hf.chatCompletion({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        messages: [{ role: 'user', content: 'Is the API active?' }],
        max_tokens: 10,
      });
      console.log('✅ Hugging Face: SUCCESS (Auth verified)');
    } catch (e: any) {
      console.error(`❌ Hugging Face: Failed. Error: ${e.message}`);
    }
    }
  } else {
    console.warn('⚠️  Hugging Face: HUGGING_FACE_API key is missing.');
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