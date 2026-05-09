"use client";

import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

// Circle diameter in px — used to perfectly centre the connecting line
const CIRCLE_SIZE = 40; // w-10 = 40px

export function Stepper({ steps, currentStep }: StepperProps) {
  const half = CIRCLE_SIZE / 2; // 20px — half circle, so line starts/ends at circle centre

  return (
    // px-5 keeps the circles from touching the card edge on any screen size
    <div className="relative flex justify-between w-full mb-10 px-5">

      {/*
        The line sits at the vertical midpoint of the circles.
        left-5 / right-5 aligns the line's edges to the circle centres
        because px-5 (20px) on the wrapper = half the circle width (20px).
        This means: line starts at centre of circle 1, ends at centre of circle 3.
      */}
      <div
        className="absolute h-[2px] -translate-y-1/2 z-0"
        style={{ top: `${half}px`, left: `${half}px`, right: `${half}px` }}
      >
        {/* Grey background track */}
        <div className="w-full h-full bg-muted rounded-full" />
        {/* Animated orange fill */}
        <motion.div
          className="absolute top-0 left-0 h-full bg-brand-orange rounded-full"
          initial={{ width: "0%" }}
          animate={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={index} className="relative z-10 flex flex-col items-center">
            <motion.div
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full border-2 bg-background transition-colors duration-300",
                isCompleted || isActive
                  ? "border-brand-orange"
                  : "border-muted-foreground/40",
                isCompleted ? "bg-brand-orange" : "",
                isActive
                  ? "shadow-[0_0_16px_rgba(249,115,22,0.45)] bg-background"
                  : ""
              )}
              initial={false}
              animate={{ scale: isActive ? 1.12 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              ) : (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-brand-orange" : "text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
              )}
            </motion.div>

            {/* Step label — hidden on very small screens to avoid overlap */}
            <span
              className={cn(
                "absolute top-12 text-[11px] font-medium whitespace-nowrap transition-colors duration-300 hidden sm:block",
                isActive ? "text-brand-orange" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
