import type { Metadata } from "next";

import "./globals.css";
import ProgressBarProvider from "@/components/ProgressBarProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";



export const metadata: Metadata = {
  metadataBase: new URL("https://vendo.com.ng"),
  title: {
    default: "Vendo | Conversational E-Commerce Platform",
    template: "%s | Vendo"
  },
  description: "Vendo connects local and dropshipping suppliers directly to customers on Telegram and WhatsApp using AI-powered conversational shopping.",
  keywords: ["e-commerce", "conversational commerce", "telegram shop", "whatsapp shop", "nigeria dropshipping", "vee ai", "vendo"],
  authors: [{ name: "Vendo Team" }],
  creator: "Vendo",
  publisher: "Vendo",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://vendo.com.ng",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://vendo.com.ng",
    siteName: "Vendo",
    title: "Vendo | AI Conversational Shopping on Messaging Apps",
    description: "Discover products, get personalized size recommendations, and purchase items seamlessly inside Telegram and WhatsApp with Vendo's AI agent.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vendo - Conversational Commerce",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Vendo | AI Conversational Shopping on Messaging Apps",
    description: "Shop directly inside messaging apps with the help of a personalized AI Shopping assistant.",
    images: ["/og-image.png"],
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <ProgressBarProvider />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
