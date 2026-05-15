"use client";

import { Suspense } from "react";
import NavigationProgress from "./NavigationProgress";

/**
 * Wraps NavigationProgress in Suspense because useSearchParams()
 * requires it during SSR in Next.js App Router.
 */
export default function ProgressBarProvider() {
  return (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  );
}
