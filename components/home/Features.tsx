"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "🔍",
    title: "Text & Image Search",
    description: "Describe what you want in plain English or Pidgin, or upload a photo. Vee AI finds the closest match from verified suppliers.",
  },
  {
    icon: "📏",
    title: "Smart Size Recommendations",
    description: "Tell Vee AI your measurements once. It remembers your shoe size, shirt size, and preferences for every future order.",
  },
  {
    icon: "🎨",
    title: "AI Outfit Generation",
    description: "Vee AI generates outfit combination previews using Hugging Face SDXL — see how a shirt looks with matching shorts before buying.",
  },
  {
    icon: "⚡",
    title: "Instant Order Placement",
    description: "From product discovery to payment link in under 2 minutes. No checkout forms, no cart abandonment.",
  },
  {
    icon: "📍",
    title: "Location-Based Delivery",
    description: "Share your location via Telegram. Vee AI captures your coordinates and routes your order to the nearest local supplier.",
  },
  {
    icon: "🔐",
    title: "Verified Suppliers Only",
    description: "Every supplier goes through KYC verification before their products appear. No fakes, no scams.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#0d1117] px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-brand-orange text-sm font-semibold tracking-widest uppercase">Features</span>
          <h2 className="text-4xl sm:text-5xl font-bold text-brand-cream mt-3 mb-4">
            Everything you need to shop smarter
          </h2>
          <p className="text-brand-cream/50 text-lg max-w-xl mx-auto">
            Vee AI combines conversational AI, computer vision, and real-time inventory to give you the best shopping experience in Nigeria.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.03] hover:border-brand-orange/30 hover:bg-brand-orange/5 p-6 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3 }}
            >
              <span className="text-4xl mb-4 block">{feature.icon}</span>
              <h3 className="text-lg font-bold text-brand-cream mb-2 group-hover:text-brand-orange transition-colors">
                {feature.title}
              </h3>
              <p className="text-brand-cream/50 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
