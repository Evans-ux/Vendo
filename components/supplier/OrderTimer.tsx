"use client";

import { useEffect, useState } from "react";

interface OrderTimerProps {
  createdAt: string;
  supplierType: "LOCAL" | "DROPSHIP";
  status: string;
}

export default function OrderTimer({ createdAt, supplierType, status }: OrderTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    // Don't show timer for completed/cancelled orders
    if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(status)) {
      return;
    }

    const calculateTimeLeft = () => {
      const orderDate = new Date(createdAt);
      const now = new Date();
      
      // Set deadline based on supplier type
      const deadlineHours = supplierType === "LOCAL" ? 72 : 504; // 72h = 3 days, 504h = 21 days
      const deadline = new Date(orderDate.getTime() + deadlineHours * 60 * 60 * 1000);
      
      const diff = deadline.getTime() - now.getTime();
      const isOverdue = diff < 0;
      
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
      
      // Calculate percentage of time elapsed
      const totalTime = deadlineHours * 60 * 60 * 1000;
      const elapsed = now.getTime() - orderDate.getTime();
      const percentage = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
      
      return { days, hours, minutes, seconds, isOverdue, percentage };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, supplierType, status]);

  if (!timeLeft) return null;

  // Determine color based on time left
  const getColorClass = () => {
    if (timeLeft.isOverdue) return "text-red-500 bg-red-500/10 border-red-500/30";
    if (timeLeft.percentage > 75) return "text-red-500 bg-red-500/10 border-red-500/30";
    if (timeLeft.percentage > 50) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    return "text-green-500 bg-green-500/10 border-green-500/30";
  };

  const getProgressColor = () => {
    if (timeLeft.isOverdue) return "bg-red-500";
    if (timeLeft.percentage > 75) return "bg-red-500";
    if (timeLeft.percentage > 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={`rounded-lg border p-3 ${getColorClass()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">
          {timeLeft.isOverdue ? "⚠️ OVERDUE" : "⏱️ Time Remaining"}
        </span>
        <span className="text-xs opacity-70">
          {supplierType === "LOCAL" ? "3-day delivery" : "21-day delivery"}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        {timeLeft.days > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold">{timeLeft.days}</div>
            <div className="text-xs opacity-70">days</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-2xl font-bold">{timeLeft.hours}</div>
          <div className="text-xs opacity-70">hrs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{timeLeft.minutes}</div>
          <div className="text-xs opacity-70">min</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{timeLeft.seconds}</div>
          <div className="text-xs opacity-70">sec</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${timeLeft.percentage}%` }}
        />
      </div>
    </div>
  );
}
