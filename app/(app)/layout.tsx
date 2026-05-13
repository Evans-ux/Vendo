import "../globals.css";
import { Toaster } from "sonner";
import ConditionalNav from "@/components/ConditionalNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ConditionalNav />
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
