"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const TERMS_SECTIONS = [
  {
    title: "1. Supplier Agreement",
    content: `By registering as a supplier on Vendo, you agree to the terms of this agreement. You confirm that all business information, identity documents, and product details you have provided are accurate, truthful, and belong to you or your registered business. Vendo is the platform through which your products are listed and sold. Vee AI is our AI-powered sales assistant that interacts with customers on Telegram and WhatsApp on your behalf. Providing false information is grounds for immediate account suspension and potential legal action.`,
  },
  {
    title: "2. Commission & Pricing",
    content: `You agree that Vendo retains a 25% commission on every sale made through the platform. Your products will be listed at a selling price calculated as: Selling Price = Your Base Price × 1.25. You will receive your base price per unit sold, minus any applicable payment processing fees charged by our payment provider (Flutterwave). Vendo reserves the right to review and update the commission structure with 30 days' notice.`,
  },
  {
    title: "3. Product Standards",
    content: `All products listed on Vendo must be legitimate, legal, and accurately described. You must not list counterfeit goods, stolen property, prohibited items, or products that infringe on intellectual property rights. Vendo reserves the right to remove any product at its discretion without prior notice. Repeated violations will result in permanent account removal.`,
  },
  {
    title: "4. Order Fulfilment Responsibility",
    content: `You are solely responsible for fulfilling orders assigned to your Vendo store within the delivery timeframe stated during onboarding (Local suppliers: 2–3 business days; Dropship suppliers: 14–21 business days). Failure to fulfil orders on time or accurately may result in penalties, negative reviews, or account suspension. Vendo acts as a marketplace facilitator and is not liable for supplier fulfilment failures. Customer interactions are handled by Vee AI on Telegram and WhatsApp.`,
  },
  {
    title: "5. KYC & Identity Verification",
    content: `Your KYC documents are stored securely in private Vendo storage and are only accessible to the Vendo administrative team for verification purposes. Your documents will not be shared with third parties except where required by Nigerian law or financial regulations. You consent to Vendo conducting reasonable verification checks on your submitted documents.`,
  },
  {
    title: "6. Account Termination",
    content: `Vendo reserves the right to suspend or permanently terminate your supplier account for: (a) providing false information, (b) repeated customer complaints, (c) non-fulfilment of orders, (d) violation of product standards, or (e) any activity deemed harmful to the platform or its users. Upon termination, any unpaid commissions due to you will be reviewed and settled within 14 business days, subject to outstanding disputes.`,
  },
  {
    title: "7. Privacy & Data",
    content: `By using this platform, you consent to the collection and processing of your business data, transaction history, and product information as outlined in our Privacy Policy. Your data will be used to operate Vendo, power Vee AI's product recommendations, and comply with applicable Nigerian laws including the Nigeria Data Protection Regulation (NDPR). You have the right to request deletion of your data, subject to legal retention requirements.`,
  },
  {
    title: "8. Governing Law",
    content: `This agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes arising from this agreement shall first be addressed through good-faith negotiation. If unresolved, disputes shall be subject to the jurisdiction of the courts of Anambra State, Nigeria. Rocybits Technology is the registered operator of Vendo and its associated services, including the Vee AI customer assistant.`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-orange/15 dark:bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-brand-orange/10 dark:bg-foreground/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-3xl z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-brand-orange" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
          <p className="text-muted">
            Please read our supplier agreement before accessing your dashboard.
          </p>
        </motion.div>

        {/* Terms Box */}
        <motion.div
          className="bg-card rounded-2xl border border-border card-shadow overflow-hidden mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Terms Header */}
          <div className="px-6 py-4 border-b border-border bg-surface">
            <p className="text-sm text-muted font-medium">
              Vendo Supplier Agreement — Version 1.0 | Rocybits Technology, Onitsha, Anambra, Nigeria
            </p>
          </div>

          {/* Scrollable content */}
          <div className="h-[500px] overflow-y-auto px-6 py-6 space-y-6">
            {TERMS_SECTIONS.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <h3 className="font-bold text-foreground mb-2">{section.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
            <div className="h-4" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
