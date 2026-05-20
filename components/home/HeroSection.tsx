"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const ROTATING_WORDS = ["Sneakers", "Ankara Tops", "Bags", "Joggers", "Accessories", "Dresses"];

interface HeroSectionProps {
  isLoggedIn?: boolean;
}

export default function HeroSection({ isLoggedIn = false }: HeroSectionProps) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % ROTATING_WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden bg-background px-6 pt-36 pb-24">
      {/* Background blobs — stronger in light mode via opacity */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-brand-orange/20 dark:bg-brand-orange/10 blur-[180px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/40 dark:bg-foreground/5 blur-[140px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Light mode only: subtle grid pattern */}
        <div className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: "radial-gradient(circle, #e2ddd8 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.4,
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Bot mascot */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full bg-brand-orange/25 dark:bg-brand-orange/20 blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -inset-4 rounded-full border border-brand-orange/30"
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/bot-logo.png"
                alt="Vee AI Bot"
                width={180}
                height={180}
                className="relative z-10 drop-shadow-[0_0_40px_rgba(249,115,22,0.45)]"
                priority
              />
            </motion.div>
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card border border-border px-3 py-1 rounded-full text-xs font-semibold text-brand-orange whitespace-nowrap card-shadow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Vee AI · Online
            </motion.div>
          </div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-5"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-brand-orange/10 text-brand-orange border border-brand-orange/25">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
            Nigeria&apos;s Smartest AI Commerce Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          Shop for{" "}
          <span className="inline-block min-w-[220px] text-left">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                className="text-brand-orange inline-block"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          <br />
          on <span className="text-[#2aabee]">Telegram</span> &amp; <span className="text-[#25d366]">WhatsApp</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Vee AI is your personal shopping assistant. Discover products, get size recommendations,
          and place orders — all without leaving your favourite chat app.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
        >
          <a
            href="https://t.me/VeeVendo_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base transition-all shadow-lg shadow-brand-orange/30 hover:shadow-brand-orange/50 hover:scale-105"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.892z" />
            </svg>
            Chat on Telegram
          </a>

          {isLoggedIn ? (
            <Link
              href="/supplier/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-card hover:bg-surface border border-border text-foreground font-semibold text-base transition-all card-shadow hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-card hover:bg-surface border border-border text-foreground font-semibold text-base transition-all card-shadow hover:scale-105"
            >
              Become a Supplier
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-6 text-muted text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {["🔒 Secure Payments", "⚡ AI Responses in <3s", "🇳🇬 Built for Nigeria", "📦 Local & Dropship"].map((badge) => (
            <span key={badge} className="flex items-center gap-1">{badge}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
