"use client";
 
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Stepper } from "@/components/ui/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const steps = ["Business Profile", "KYC Verification", "First Product"];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  let currentStep = 0;
  if (pathname.includes("/kyc")) currentStep = 1;
  if (pathname.includes("/products")) currentStep = 2;

  const stepTitles = [
    "Tell us about your business",
    "Verify your identity",
    "Add your first product",
  ];

  const stepDescriptions = [
    "This information will appear on your Vendo store profile.",
    "All Vendo suppliers are verified to maintain a trusted marketplace.",
    "Your first product will be listed on Vendo once approved by our team.",
  ];

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center py-12 md:py-16 md:justify-center px-2 sm:px-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-orange/15 dark:bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-orange/10 dark:bg-foreground/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-3xl z-10">
        {/* Header with logo + bag image */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/vendo-logo.png"
              alt="Vendo"
              width={160}
              height={52}
              className="h-14 w-auto object-contain mx-auto"
              priority
            />
          </Link>

          {/* Bag image — decorative */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-orange/20 blur-[50px] rounded-full" />
              <Image
                src="/vendo-baglogo.png"
                alt="Vendo products"
                width={100}
                height={100}
                className="relative z-10 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Join Vendo</h1>
          <p className="text-muted-foreground text-sm">
            Set up your supplier account. Vee AI will handle selling your products to customers.
          </p>
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

          <CardContent className="pt-8 px-4 sm:px-8 pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
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
