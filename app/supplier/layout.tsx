import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendo - Supplier Portal",
  description: "Supplier authentication and dashboard for Vendo ecommerce platform",
};

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
