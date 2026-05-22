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

  // 3. Gemini AI
  const geminiKey = (process.env.GEMINI_API || process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      let result;
      let modelUsed = '';
      try {
        // Try without 'models/' prefix first
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); 
        result = await model.generateContent('Respond with "Gemini 1.5 is active"');
        modelUsed = 'gemini-1.5-flash';
      } catch (innerError: any) {
        if (innerError.message?.includes('404')) {
          try {
            // Some projects require the full path in v1beta
            const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
            result = await model.generateContent('Respond with "Gemini 1.5 (prefixed) is active"');
            modelUsed = 'models/gemini-1.5-flash';
          } catch (fallbackError: any) {
            throw new Error(`Model not found (404). Current key permissions: ${fallbackError.message}`);
          }
        } else {
          throw innerError;
        }
      }
      console.log(`✅ Gemini AI: SUCCESS - "${result?.response.text()}" (Model: ${modelUsed})`);
    } catch (e: any) {
      console.error(`❌ Gemini AI: Failed. Error: ${e.message}`);
    }
  } else {
    console.warn('⚠️  Gemini AI: GEMINI_API key is missing.');
  }

  // 4. Hugging Face
  const hfKey = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || '').trim();
  if (hfKey) {
    if (!hfKey.startsWith('hf_')) {
      console.error('❌ Hugging Face: Failed. Token must start with "hf_"');
    } else {
    try {
      const hf = new HfInference(hfKey);
      // Using a very small, stable model to verify connectivity
      const response = await hf.chatCompletion({
        model: 'HuggingFaceH4/zephyr-7b-beta',
        messages: [{ role: 'user', content: 'Is the API active?' }],
        max_tokens: 10,
        provider: 'hf-inference'
      });
      console.log('✅ Hugging Face: SUCCESS (Auth verified)');
    } catch (e: any) {
      console.error(`❌ Hugging Face: Failed. Error: ${e.message}`);
    }
    }
  } else {
    console.warn('⚠️  Hugging Face: HUGGING_FACE_API key is missing.');
  }

  // 5. Ollama (Local Fallback)
  const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  let ollamaKey = (process.env.OLLAMA_API_KEY || "").trim();
  
  // Sanitize key: if it contains newlines or spaces, it's likely a misconfiguration
  if (ollamaKey.includes('\n') || ollamaKey.includes(' ')) {
    ollamaKey = ollamaKey.split(/[\n\s,]/)[0].replace(/['"]/g, '');
  }

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      headers: ollamaKey ? { 'Authorization': `Bearer ${ollamaKey.trim()}` } : {}
    });
    
    if (response.ok) {
      const data = await response.json();
      // Determine if it's local or cloud based on URL, or if a key is provided (implies cloud)
      const type = ollamaKey ? 'Cloud' : (ollamaUrl.includes('127.0.0.1') || ollamaUrl.includes('localhost') ? 'Local' : 'Cloud (custom URL)');
      console.log(`✅ Ollama: SUCCESS (${type} API active, ${data.models?.length || 0} models found)`);
    } else {
      const errText = await response.text();
      console.warn(`⚠️  Ollama: Service returned status ${response.status}. ${errText}`);
    }
  } catch (e: any) {
    console.error(`❌ Ollama: Failed to connect to ${ollamaUrl}. ${e.message}`);
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