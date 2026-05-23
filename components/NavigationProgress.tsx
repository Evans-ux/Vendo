"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin orange progress bar that fires on every client-side navigation.
 * Mounts in the root layout so it covers all routes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track the previous route so we only trigger on actual changes
  const prevRoute = useRef(`${pathname}${searchParams}`);

  useEffect(() => {
    const currentRoute = `${pathname}${searchParams}`;

    if (currentRoute === prevRoute.current) return;
    prevRoute.current = currentRoute;

    // Clear any in-flight animation
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Start the bar
    setProgress(10);
    setVisible(true);

    // Crawl to ~85% while the page loads
    let current = 10;
    intervalRef.current = setInterval(() => {
      current += Math.random() * 12;
      if (current >= 85) {
        current = 85;
        clearInterval(intervalRef.current!);
      }
      setProgress(current);
    }, 150);

    // Complete and hide after a short delay
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      setProgress(100);
      setTimeout(() => setVisible(false), 300);
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-hidden="true"
    >
      <div
        className="h-full bg-brand-orange shadow-[0_0_8px_rgba(249,115,22,0.7)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
