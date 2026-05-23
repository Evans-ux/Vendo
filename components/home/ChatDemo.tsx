"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

const TELEGRAM_MESSAGES = [
  { from: "user", text: "Hi, show me size 42 black sneakers under ₦20,000", delay: 0 },
  { from: "ai", text: "Hey! 👟 Let me search for that right now...", delay: 1200, typing: 1000 },
  { from: "ai", text: "Found 3 matches for you:\n\n1. **Nike Air Force 1 Low** — ₦18,500 (Size 42 ✓)\n2. **Puma Smash v2** — ₦14,200 (Size 42 ✓)\n3. **Adidas Lite Racer** — ₦16,800 (Size 42 ✓)\n\nWhich one interests you?", delay: 3500, typing: 2000 },
  { from: "user", text: "The Nike one. How long is delivery?", delay: 7000 },
  { from: "ai", text: "Great choice! 🔥 The supplier is local — delivery is **2–3 business days** to your area.\n\nShall I create your order? I'll send a payment link.", delay: 8500, typing: 1500 },
  { from: "user", text: "Yes please!", delay: 11500 },
  { from: "ai", text: "✅ Order created! Here's your secure payment link:\n\n💳 Pay ₦18,500 → [Flutterwave Link]\n\nYour order will be confirmed once payment is received.", delay: 13000, typing: 1800 },
];

const WHATSAPP_MESSAGES = [
  { from: "user", text: "I want a red ankara top, size M", delay: 0 },
  { from: "ai", text: "Searching our verified suppliers... 🔍", delay: 1000, typing: 800 },
  { from: "ai", text: "Found it! 🎉\n\n*Ankara Peplum Top (Red)* — ₦8,500\nSize M available ✓\nSupplier: Lagos Fashion Hub\n\nWant to see more options or order this one?", delay: 3200, typing: 2200 },
  { from: "user", text: "Order this one. My address is 12 Awka Road, Onitsha", delay: 6500 },
  { from: "ai", text: "Perfect! 📍 Saved your delivery address.\n\nOrder summary:\n• Ankara Peplum Top (Red, M)\n• ₦8,500\n• Delivery: 2–3 days\n\nTap to pay 👇\n💳 [Pay Now - ₦8,500]", delay: 8000, typing: 2000 },
];

interface Message {
  from: string;
  text: string;
  delay: number;
  typing?: number;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-current opacity-60"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// Vendo bag as the AI avatar in chats
function BotAvatar({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-full overflow-hidden bg-brand-charcoal border border-brand-orange/40 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Image
        src="/vendo-baglogo.png"
        alt="Vendo AI"
        width={size}
        height={size}
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  );
}

function formatText(text: string) {
  return text.split("\n").map((line, i, arr) => {
    const formatted = line
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>");
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function TelegramChat() {
  const [visibleMessages, setVisibleMessages] = useState<{ msg: Message }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    setVisibleMessages([]);
    setIsTyping(false);

    TELEGRAM_MESSAGES.forEach((msg) => {
      if (msg.from === "ai" && msg.typing) {
        timeouts.push(setTimeout(() => setIsTyping(true), msg.delay));
        timeouts.push(setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, { msg }]);
        }, msg.delay + msg.typing));
      } else {
        timeouts.push(setTimeout(() => {
          setVisibleMessages((prev) => [...prev, { msg }]);
        }, msg.delay));
      }
    });

    timeouts.push(setTimeout(() => setCycle((c) => c + 1), 18000));
    return () => timeouts.forEach(clearTimeout);
  }, [cycle]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, isTyping]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#2b5278] rounded-t-2xl flex-shrink-0">
        <BotAvatar size={38} />
        <div>
          <p className="text-white font-semibold text-sm">Vendo AI</p>
          <p className="text-white/60 text-xs">bot · always online</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/40 text-xs">online</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-[#1c2733]" style={{ scrollbarWidth: "none" }}>
        <AnimatePresence>
          {visibleMessages.map(({ msg }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "ai" && <BotAvatar size={28} />}
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.from === "user" ? "bg-[#2b5278] text-white rounded-tr-sm" : "bg-[#182533] text-white/90 rounded-tl-sm border border-white/5"
              }`}>
                {formatText(msg.text)}
                <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-white/40 text-right" : "text-white/30"}`}>
                  {new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  {msg.from === "user" && " ✓✓"}
                </p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2 justify-start">
              <BotAvatar size={28} />
              <div className="bg-[#182533] text-white/60 rounded-2xl rounded-tl-sm border border-white/5"><TypingIndicator /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-[#1c2733] rounded-b-2xl border-t border-white/5 flex-shrink-0">
        <div className="flex-1 bg-[#2b3a4a] rounded-full px-4 py-2 text-white/30 text-sm">Message...</div>
        <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </div>
      </div>
    </div>
  );
}

function WhatsAppChat() {
  const [visibleMessages, setVisibleMessages] = useState<{ msg: Message }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    setVisibleMessages([]);
    setIsTyping(false);

    WHATSAPP_MESSAGES.forEach((msg) => {
      if (msg.from === "ai" && msg.typing) {
        timeouts.push(setTimeout(() => setIsTyping(true), msg.delay));
        timeouts.push(setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, { msg }]);
        }, msg.delay + msg.typing));
      } else {
        timeouts.push(setTimeout(() => {
          setVisibleMessages((prev) => [...prev, { msg }]);
        }, msg.delay));
      }
    });

    timeouts.push(setTimeout(() => setCycle((c) => c + 1), 14000));
    return () => timeouts.forEach(clearTimeout);
  }, [cycle]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, isTyping]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] rounded-t-2xl flex-shrink-0">
        <BotAvatar size={38} />
        <div>
          <p className="text-white font-semibold text-sm">Vendo AI</p>
          <p className="text-white/60 text-xs">online</p>
        </div>
        <div className="ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{
          scrollbarWidth: "none",
          background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\"), #0b141a",
        }}>
        <AnimatePresence>
          {visibleMessages.map(({ msg }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
              {msg.from === "ai" && <BotAvatar size={28} />}
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.from === "user" ? "bg-[#005c4b] text-white rounded-tr-sm" : "bg-[#202c33] text-white/90 rounded-tl-sm"
              }`}>
                {formatText(msg.text)}
                <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-white/40 text-right" : "text-white/30"}`}>
                  {new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  {msg.from === "user" && " ✓✓"}
                </p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div key="typing-wa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2 justify-start">
              <BotAvatar size={28} />
              <div className="bg-[#202c33] text-white/60 rounded-2xl rounded-tl-sm shadow-sm"><TypingIndicator /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34] rounded-b-2xl border-t border-white/5 flex-shrink-0">
        <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2 text-white/30 text-sm">Type a message</div>
        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </div>
      </div>
    </div>
  );
}

export default function ChatDemo() {
  return (
    <section className="py-24 bg-surface px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <motion.div className="flex justify-center mb-6" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: "spring", bounce: 0.4 }}>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-orange/20 blur-xl rounded-full" />
              <Image src="/vendo-baglogo.png" alt="Vendo AI" width={80} height={80} className="relative z-10 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]" />
            </div>
          </motion.div>
          <span className="text-brand-orange text-sm font-semibold tracking-widest uppercase">Live Demo</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-4">Watch Vee AI in action</h2>
          <p className="text-foreground/50 text-lg max-w-xl mx-auto">Real conversations happening right now on Telegram and WhatsApp.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#2aabee]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.892z" />
              </svg>
              <span className="text-foreground font-semibold">Telegram</span>
              <span className="ml-auto text-xs text-foreground/30 bg-foreground/5 px-2 py-0.5 rounded-full">Live simulation</span>
            </div>
            <div className="h-[500px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-border">
              <TelegramChat />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#25d366]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-foreground font-semibold">WhatsApp</span>
              <span className="ml-auto text-xs text-foreground/30 bg-foreground/5 px-2 py-0.5 rounded-full">Live simulation</span>
            </div>
            <div className="h-[500px] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-border">
              <WhatsAppChat />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
