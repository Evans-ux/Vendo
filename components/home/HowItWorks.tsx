"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    icon: "🛍️",
    title: "Message Vee AI",
    description: "Open Telegram or WhatsApp and send a message like \"Show me size 42 black sneakers under ₦15,000\"",
    color: "from-brand-orange/20 to-brand-orange/5",
    border: "border-brand-orange/30",
  },
  {
    number: "02",
    icon: "🤖",
    title: "AI Finds Your Match",
    description: "Vee AI searches verified suppliers, checks your size profile, and returns the best matches with photos and prices.",
    color: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/30",
  },
  {
    number: "03",
    icon: "💳",
    title: "Pay & Track",
    description: "Confirm your order in chat. Vee AI generates a secure Flutterwave payment link and tracks your delivery.",
    color: "from-green-500/20 to-green-500/5",
    border: "border-green-500/30",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-brand-charcoal px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-brand-orange text-sm font-semibold tracking-widest uppercase">How it works</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-cream mt-3 mb-4">
            Shopping made ridiculously simple
          </h2>
          <p className="text-brand-cream/50 text-lg max-w-xl mx-auto">
            No app downloads. No account creation. Just chat and shop.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-brand-orange/30 via-blue-500/30 to-green-500/30" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className={`relative rounded-2xl border ${step.border} bg-gradient-to-b ${step.color} p-8`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">{step.icon}</span>
                <span className="text-5xl font-black text-white/5 select-none">{step.number}</span>
              </div>
              <h3 className="text-xl font-bold text-brand-cream mb-3">{step.title}</h3>
              <p className="text-brand-cream/60 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
