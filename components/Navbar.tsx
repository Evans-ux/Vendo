"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm dark:shadow-none"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <Image
            src="/vendo-logo.png"
            alt="Vendo"
            width={200}
            height={64}
            className="h-16 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-foreground/60">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#suppliers" className="hover:text-foreground transition-colors">For Suppliers</a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="text-sm text-foreground/70 hover:text-foreground transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold px-5 py-2.5 rounded-lg transition-all hover:scale-105"
          >
            Start Selling
          </Link>
        </div>

        {/* Mobile: theme toggle + menu button */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            className="text-foreground/70 hover:text-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-md border-t border-border px-6 pb-6 overflow-hidden"
          >
            <nav className="flex flex-col gap-4 pt-4 text-foreground/70">
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-foreground">How it Works</a>
              <a href="#features" onClick={() => setMenuOpen(false)} className="hover:text-foreground">Features</a>
              <a href="#suppliers" onClick={() => setMenuOpen(false)} className="hover:text-foreground">For Suppliers</a>
              <hr className="border-border" />
              <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="hover:text-foreground">Sign In</Link>
              <Link
                href="/auth/signup"
                onClick={() => setMenuOpen(false)}
                className="bg-brand-orange text-white font-semibold px-5 py-3 rounded-lg text-center"
              >
                Start Selling Free
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
