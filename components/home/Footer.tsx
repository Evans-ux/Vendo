"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) { toast.error("Please enter your feedback"); return; }
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setLoading(true);
    setTimeout(() => {
      toast.success("Thank you for your feedback!", {
        description: "We'll review your suggestion/complaint and get back to you soon.",
      });
      setFeedback("");
      setEmail("");
      setLoading(false);
    }, 1000);
  };

  return (
    <footer className="bg-surface-2 dark:bg-surface border-t border-border px-4 sm:px-6 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto">

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">

          {/* Brand & Contact */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center shadow-md shadow-brand-orange/30">
                <span className="text-white font-black text-lg">V</span>
              </div>
              <div>
                <span className="text-foreground font-bold text-xl">Vendo</span>
                <p className="text-muted text-xs">AI-Powered Commerce</p>
              </div>
            </div>

            <p className="text-muted text-sm leading-relaxed">
              Nigeria's leading conversational commerce platform. Shop on Telegram and WhatsApp with Vee AI.
            </p>

            <div className="space-y-2.5">
              {[
                { icon: Mail, text: "support@vendo.ng" },
                { icon: Phone, text: "+234 901 234 5678" },
                { icon: MapPin, text: "Onitsha, Anambra, Nigeria" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-brand-orange" />
                  </div>
                  <span className="text-muted text-sm">{text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 pt-2">
              <a
                href="https://t.me/VeeAI_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#2aabee]/10 border border-[#2aabee]/25 flex items-center justify-center text-[#2aabee] hover:bg-[#2aabee]/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.892z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-[#25d366]/10 border border-[#25d366]/25 flex items-center justify-center text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-foreground font-bold mb-4 text-sm uppercase tracking-wider">Platform</p>
              <ul className="space-y-3">
                {[
                  { label: "Become a Supplier", href: "/auth/signup" },
                  { label: "Supplier Login", href: "/auth/login" },
                  { label: "Shop on Telegram", href: "https://t.me/VeeAI_bot", external: true },
                  { label: "Shop on WhatsApp", href: "#" },
                  { label: "Supplier Dashboard", href: "/supplier/dashboard" },
                ].map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer"
                        className="text-muted text-sm hover:text-brand-orange transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href}
                        className="text-muted text-sm hover:text-brand-orange transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-foreground font-bold mb-4 text-sm uppercase tracking-wider">Company</p>
              <ul className="space-y-3">
                {[
                  { label: "About Vendo", href: "#" },
                  { label: "How it Works", href: "#" },
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Delivery & Logistics", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href}
                      className="text-muted text-sm hover:text-brand-orange transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-card rounded-2xl border border-border card-shadow p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-foreground font-bold text-base">Feedback & Suggestions</p>
                <p className="text-muted text-xs">We read every message</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block uppercase tracking-wide">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted/60 focus:border-brand-orange text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block uppercase tracking-wide">Message</label>
                <Textarea
                  placeholder="Share your suggestions, complaints, or ideas..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="bg-background border-border text-foreground placeholder:text-muted/60 focus:border-brand-orange resize-none text-sm"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
              >
                {loading ? "Sending..." : (
                  <><Send className="w-4 h-4 mr-2" />Submit Feedback</>
                )}
              </Button>

              <p className="text-xs text-muted text-center">
                We respond within 48 hours
              </p>
            </form>
          </div>
        </div>

        {/* Delivery notice */}
        <div className="mb-8 p-5 bg-brand-orange/5 rounded-2xl border border-brand-orange/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-foreground font-semibold text-sm mb-0.5">Delivery Options Available</p>
              <p className="text-muted text-sm">
                Suppliers choose: Self-Delivery (own waybill) or Platform Logistics (we handle it)
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold rounded-full">
                Self-Delivery
              </span>
              <span className="px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 text-xs font-semibold rounded-full">
                Platform Logistics
              </span>
              <span className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 text-xs font-semibold rounded-full">
                Dropship API
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm text-center sm:text-left">
            © {new Date().getFullYear()} Vendo · Rocybits Technology, Onitsha, Anambra, Nigeria
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </div>
            <span className="hidden sm:block text-border">|</span>
            <span className="text-muted text-sm">Powered by Vee AI</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
