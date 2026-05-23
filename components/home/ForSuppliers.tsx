"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const BENEFITS = [
  { icon: "🚀", title: "Go live in 3 minutes", desc: "Register, upload products, pass KYC. Vee AI handles the rest." },
  { icon: "🤖", title: "AI sells for you 24/7", desc: "Vee AI responds to customers, recommends your products, and closes orders while you sleep." },
  { icon: "💰", title: "Keep 75% of every sale", desc: "We take a 25% commission. No monthly fees, no hidden charges." },
  { icon: "📊", title: "Real-time analytics", desc: "Track your products, orders, and revenue from your supplier dashboard." },
];

export default function ForSuppliers() {
  return (
    <section id="suppliers" className="py-24 bg-surface-2 dark:bg-surface px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-brand-orange text-sm font-semibold tracking-widest uppercase">For Suppliers</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-6">
              Your AI-powered storefront. Zero website needed.
            </h2>
            <p className="text-muted text-lg leading-relaxed mb-8">
              List your products on Vendo and let Vee AI sell them to thousands of customers on Telegram and WhatsApp. No tech skills required.
            </p>

            <div className="space-y-5 mb-10">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b.title}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border card-shadow"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="text-2xl mt-0.5 flex-shrink-0">{b.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{b.title}</p>
                    <p className="text-muted text-sm mt-0.5">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold transition-all shadow-lg shadow-brand-orange/30 hover:scale-105"
            >
              Start Selling Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>

          {/* Right — image + mock dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Product image */}
            <div className="relative mb-6 flex justify-center">
              <div className="absolute inset-0 bg-brand-orange/20 blur-[80px] rounded-full" />
              <Image
                src="/Vedo-logobag.png"
                alt="Vendo products"
                width={260}
                height={260}
                className="relative z-10 drop-shadow-2xl"
              />
            </div>

            {/* Mock dashboard card */}
            <div className="rounded-2xl border border-border bg-card card-shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-foreground font-bold text-sm">Rocybits Fashion</p>
                  <p className="text-muted text-xs">Local Supplier · Lagos</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
                  Verified ✓
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Products", value: "24" },
                  { label: "Orders", value: "138" },
                  { label: "Revenue", value: "₦2.1M" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-surface dark:bg-surface p-2.5 text-center border border-border">
                    <p className="text-lg font-bold text-brand-orange">{s.value}</p>
                    <p className="text-muted text-[10px] mt-0.5 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { name: "Nike Air Force 1", price: "₦18,500", status: "Live", dot: "bg-green-500" },
                  { name: "Ankara Peplum Top", price: "₦8,500", status: "Live", dot: "bg-green-500" },
                  { name: "Puma Smash v2", price: "₦14,200", status: "Pending", dot: "bg-yellow-500" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-foreground text-xs font-semibold">{p.name}</p>
                      <p className="text-brand-orange text-[10px] font-medium">{p.price}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification */}
            <motion.div
              className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-lg shadow-brand-orange/40"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              🛒 New order! ₦18,500
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
