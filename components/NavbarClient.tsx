"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarClientProps {
  isLoggedIn: boolean;
}

export default function NavbarClient({ isLoggedIn }: NavbarClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-brand-charcoal/90 backdrop-blur-md border-b border-white/5 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center">
            <span className="text-white font-black text-sm">V</span>
          </div>
          <span className="text-brand-cream font-bold text-lg">Vendo</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-brand-cream/60">
          <a href="#how-it-works" className="hover:text-brand-cream transition-colors">How it Works</a>
          <a href="#features" className="hover:text-brand-cream transition-colors">Features</a>
          <a href="#suppliers" className="hover:text-brand-cream transition-colors">For Suppliers</a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/supplier/dashboard"
              className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold px-5 py-2 rounded-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-brand-cream/70 hover:text-brand-cream transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold px-5 py-2 rounded-lg transition-all hover:scale-105"
              >
                Start Selling
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-brand-cream/70 hover:text-brand-cream"
          onClick={() => setMenuOpen(!menuOpen)}
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

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-charcoal/95 backdrop-blur-md border-t border-white/5 px-6 pb-6"
          >
            <nav className="flex flex-col gap-4 pt-4 text-brand-cream/70">
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-brand-cream">How it Works</a>
              <a href="#features" onClick={() => setMenuOpen(false)} className="hover:text-brand-cream">Features</a>
              <a href="#suppliers" onClick={() => setMenuOpen(false)} className="hover:text-brand-cream">For Suppliers</a>
              <hr className="border-white/10" />
              {isLoggedIn ? (
                <Link
                  href="/supplier/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="bg-brand-orange text-white font-semibold px-5 py-3 rounded-lg text-center flex items-center justify-center gap-2"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="hover:text-brand-cream">Sign In</Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMenuOpen(false)}
                    className="bg-brand-orange text-white font-semibold px-5 py-3 rounded-lg text-center"
                  >
                    Start Selling Free
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
