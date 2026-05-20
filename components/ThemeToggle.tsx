"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = () => {
    // next-themes uses disableTransitionOnChange which strips transitions
    // during the class swap to prevent FOUC. We re-enable them for 500ms
    // so the switch feels smooth rather than instant.
    const css = document.createElement("style");
    css.textContent = `
      *, *::before, *::after {
        transition: background-color 250ms cubic-bezier(0.4,0,0.2,1),
                    border-color 250ms cubic-bezier(0.4,0,0.2,1),
                    color 250ms cubic-bezier(0.4,0,0.2,1) !important;
      }
    `;
    document.head.appendChild(css);

    setTheme(resolvedTheme === "dark" ? "light" : "dark");

    // Remove the override after the transition completes
    setTimeout(() => document.head.removeChild(css), 500);
  };

  if (!mounted) {
    return <button className="w-10 h-10 rounded-lg bg-muted/50 animate-pulse" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={toggle}
      className="relative w-10 h-10 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200 flex items-center justify-center"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {/* Sun — shown in dark mode (click to go light) */}
      <svg
        className={`absolute w-5 h-5 text-foreground transition-all duration-300 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="4" strokeWidth="2" />
        <path
          strokeLinecap="round"
          strokeWidth="2"
          d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
        />
      </svg>

      {/* Moon — shown in light mode (click to go dark) */}
      <svg
        className={`absolute w-5 h-5 text-foreground transition-all duration-300 ${
          isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        />
      </svg>
    </button>
  );
}
