"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    icon: "🛍️",
    title: "Message Vee AI",
    description: "Open Telegram or WhatsApp and send a message like \"Show me size 42 black sneakers under ₦15,000\"",
    accent: "brand-orange",
    iconBg: "bg-brand-orange/10 dark:bg-brand-orange/15",
    border: "border-brand-orange/25 dark:border-brand-orange/30",
    numColor: "text-brand-orange/10 dark:text-white/5",
  },
  {
    number: "02",
    icon: "🤖",
    title: "AI Finds Your Match",
    description: "Vee AI searches verified suppliers, checks your size profile, and returns the best matches with photos and prices.",
    accent: "blue-500",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/25 dark:border-blue-500/30",
    numColor: "text-blue-500/10 dark:text-white/5",
  },
  {
    number: "03",
    icon: "💳",
    title: "Pay & Track",
    description: "Confirm your order in chat. Vee AI generates a secure Flutterwave payment link and tracks your delivery.",
    accent: "green-500",
    iconBg: "bg-green-500/10 dark:bg-green-500/15",
    border: "border-green-500/25 dark:border-green-500/30",
    numColor: "text-green-500/10 dark:text-white/5",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-background px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-brand-orange text-sm font-semibold tracking-widest uppercase">How it works</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-3 mb-4">
            Shopping made ridiculously simple
          </h2>
          <p className="text-muted text-lg max-w-xl mx-auto">
            No app downloads. No account creation. Just chat and shop.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-brand-orange/40 via-blue-500/40 to-green-500/40" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className={`relative rounded-2xl border ${step.border} bg-card card-shadow p-8 hover:scale-[1.02] transition-transform duration-300`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {/* Step number watermark */}
              <span className={`absolute top-4 right-5 text-7xl font-black select-none ${step.numColor}`}>
                {step.number}
              </span>
              {/* Icon circle */}
              <div className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6`}>
                <span className="text-3xl">{step.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
