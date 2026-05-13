"use client";

import { usePathname } from "next/navigation";
import Navigation from "@/components/Navbar";

// Routes where the navbar should be hidden
// Onboarding, terms, and dashboard have their own full-screen layouts
const NO_NAV_PREFIXES = [
  "/supplier/onboard",
  "/supplier/terms",
  "/supplier/dashboard",
];

export default function ConditionalNav() {
  const pathname = usePathname();
  const hide = NO_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (hide) return null;
  return <Navigation />;
}
