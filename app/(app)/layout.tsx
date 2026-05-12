import "../globals.css";
import Navigation from "@/components/Navbar";
import { Toaster } from "sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
