import type { ReactNode } from "react";

// Auth route group layout — no html/body tags, those live in app/layout.tsx
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
