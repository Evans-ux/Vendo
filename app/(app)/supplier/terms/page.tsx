"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, ShieldCheck, AlertCircle } from "lucide-react";

const TERMS_SECTIONS = [
  {
    title: "1. Supplier Agreement",
    content: `By completing onboarding on Vee AI, you agree to become a verified supplier on the Vendo platform. You confirm that all business information, identity documents, and product details you have provided are accurate, truthful, and belong to you or your business. Providing false information is grounds for immediate account suspension and potential legal action.`,
  },
  {
    title: "2. Commission & Pricing",
    content: `You agree that Vee AI retains a 25% commission on every sale made through the platform. Your products will be listed at a selling price calculated as: Selling Price = Your Base Price × 1.25. You will receive your base price per unit sold, minus any applicable payment processing fees charged by our payment provider (Flutterwave). Vee AI reserves the right to review and update the commission structure with 30 days' notice.`,
  },
  {
    title: "3. Product Standards",
    content: `All products listed on Vee AI must be legitimate, legal, and accurately described. You must not list counterfeit goods, stolen property, prohibited items, or products that infringe on intellectual property rights. Vee AI reserves the right to remove any product at its discretion without prior notice. Repeated violations will result in permanent account removal.`,
  },
  {
    title: "4. Order Fulfilment Responsibility",
    content: `You are solely responsible for fulfilling orders assigned to your store within the delivery timeframe stated during onboarding (Local suppliers: 2–3 business days; Dropship suppliers: 14–21 business days). Failure to fulfil orders on time or accurately may result in penalties, negative reviews, or account suspension. Vee AI acts as a marketplace facilitator and is not liable for supplier fulfilment failures.`,
  },
  {
    title: "5. KYC & Identity Verification",
    content: `Your KYC documents are stored securely in private Supabase Storage and are only accessible to Vee AI's administrative team for verification purposes. Your documents will not be shared with third parties except where required by Nigerian law or financial regulations. You consent to Vee AI conducting reasonable verification checks on your submitted documents.`,
  },
  {
    title: "6. Account Termination",
    content: `Vee AI reserves the right to suspend or permanently terminate your supplier account for: (a) providing false information, (b) repeated customer complaints, (c) non-fulfilment of orders, (d) violation of product standards, or (e) any activity deemed harmful to the platform or its users. Upon termination, any unpaid commissions due to you will be reviewed and settled within 14 business days, subject to outstanding disputes.`,
  },
  {
    title: "7. Privacy & Data",
    content: `By using this platform, you consent to the collection and processing of your business data, transaction history, and product information as outlined in our Privacy Policy. Your data will be used to operate the platform, improve services, and comply with applicable Nigerian laws, including the Nigeria Data Protection Regulation (NDPR). You have the right to request deletion of your data, subject to legal retention requirements.`,
  },
  {
    title: "8. Governing Law",
    content: `This agreement is governed by the laws of the Federal Republic of Nigeria. Any disputes arising from this agreement shall first be addressed through good-faith negotiation. If unresolved, disputes shall be subject to the jurisdiction of the courts of Anambra State, Nigeria. Rocybits Technology is the registered operator of the Vee AI / Vendo platform.`,
  },
];

export default function TermsPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/supplier/onboard/terms", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      // Terms accepted — proceed to the supplier dashboard
      router.push("/supplier/dashboard");
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-charcoal flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-brand-cream/5 blur-[120px]" />
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
            <div className="w-16 h-16 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-brand-orange" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-brand-cream mb-2">Terms & Conditions</h1>
          <p className="text-brand-cream/60">
            Please read and accept our supplier agreement before accessing your dashboard.
          </p>
        </motion.div>

        {/* Scrollable Terms Box */}
        <motion.div
          className="bg-background/80 backdrop-blur-md rounded-2xl border border-muted/20 shadow-2xl overflow-hidden mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Terms Header */}
          <div className="px-6 py-4 border-b border-muted/20 bg-muted/10">
            <p className="text-sm text-muted-foreground">
              Vee AI Supplier Agreement — Version 1.0 | Rocybits Technology, Onitsha, Anambra, Nigeria
            </p>
          </div>

          {/* Scrollable content */}
          <div className="h-[400px] overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {TERMS_SECTIONS.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </motion.div>
            ))}

            {/* Spacer for readability */}
            <div className="h-4" />
          </div>
        </motion.div>

        {/* Checkbox Agreement */}
        <motion.button
          type="button"
          onClick={() => setAgreed(!agreed)}
          className="w-full flex items-start gap-3 p-4 rounded-xl border border-muted/30 hover:border-brand-orange/50 bg-background/40 hover:bg-brand-orange/5 transition-all duration-300 mb-4 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mt-0.5 flex-shrink-0">
            {agreed ? (
              <CheckSquare className="w-5 h-5 text-brand-orange" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm text-foreground leading-relaxed">
            I have read and understood the Vee AI Supplier Terms & Conditions. I agree to operate
            my store in accordance with the policies stated above, including the{" "}
            <span className="text-brand-orange font-medium">25% commission structure</span>,
            fulfilment responsibilities, and KYC verification requirements.
          </span>
        </motion.button>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleAccept}
            disabled={!agreed || loading}
            className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-300 ${
              agreed
                ? "bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg hover:shadow-brand-orange/30"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {loading ? "Saving your acceptance..." : agreed ? "I Accept — Take Me to My Dashboard" : "Please read and check the box above"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            By clicking accept, your agreement is timestamped and stored for legal record.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
