"use client";

import { usePathname } from "next/navigation";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const steps = ["Business Profile", "KYC Verification", "First Product"];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Determine current step based on the URL
  let currentStep = 0;
  if (pathname.includes("/kyc")) currentStep = 1;
  if (pathname.includes("/products")) currentStep = 2;

  const stepTitles = [
    "Tell us about your business",
    "Verify your identity",
    "Add your first product"
  ];

  const stepDescriptions = [
    "This information will appear on your Vendo store profile.",
    "All Vendo suppliers are verified to maintain a trusted marketplace.",
    "Your first product will be listed on Vendo once approved by our team."
  ];

  return (
    <div className="min-h-screen bg-brand-charcoal flex flex-col items-center justify-center p-4">
      {/* Background decorations for IRAP modern feel */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-cream/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-3xl z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-brand-cream mb-2">Join Vendo</h1>
          <p className="text-brand-cream/70">Set up your supplier account. Vee AI will handle selling your products to customers.</p>
        </div>

        <Card className="bg-background/80 backdrop-blur-md border-muted/20 shadow-2xl overflow-hidden">
          <CardHeader className="bg-muted/10 pt-8 pb-10 px-6 border-b border-muted/20">
            <Stepper steps={steps} currentStep={currentStep} />
            
            <div className="mt-8 text-center">
              <CardTitle className="text-2xl text-foreground font-semibold tracking-tight">
                {stepTitles[currentStep]}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {stepDescriptions[currentStep]}
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pt-8 px-4 sm:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
