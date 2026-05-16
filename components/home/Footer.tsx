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
    
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    
    // In production, this would send to your backend
    // For now, we'll just show a success message
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
    <footer className="bg-[#080d12] border-t border-white/5 px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 mb-10 sm:mb-12">
          {/* Brand & Contact Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-orange flex items-center justify-center">
                <span className="text-white font-black text-lg">V</span>
              </div>
              <div>
                <span className="text-brand-cream font-bold text-2xl">Vendo</span>
                <p className="text-brand-cream/50 text-sm">AI-Powered Commerce</p>
              </div>
            </div>
            
            <p className="text-brand-cream/50 text-sm leading-relaxed">
              Nigeria's leading conversational commerce platform. Shop on Telegram and WhatsApp with Vee AI.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-orange" />
                <span className="text-brand-cream/70 text-sm">support@vendo.ng</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-brand-orange" />
                <span className="text-brand-cream/70 text-sm">+234 901 234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <span className="text-brand-cream/70 text-sm">Onitsha, Anambra, Nigeria</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 pt-4">
              <a
                href="https://t.me/VeeAI_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-[#2aabee]/10 border border-[#2aabee]/20 flex items-center justify-center text-[#2aabee] hover:bg-[#2aabee]/20 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.892z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-[#25d366]/10 border border-[#25d366]/20 flex items-center justify-center text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-brand-cream font-semibold mb-4 text-lg">Platform</p>
              <ul className="space-y-3 text-brand-cream/50 text-sm">
                <li><Link href="/auth/signup" className="hover:text-brand-orange transition-colors">Become a Supplier</Link></li>
                <li><Link href="/auth/login" className="hover:text-brand-orange transition-colors">Supplier Login</Link></li>
                <li><a href="https://t.me/VeeAI_bot" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors">Shop on Telegram</a></li>
                <li><a href="#" className="hover:text-brand-orange transition-colors">Shop on WhatsApp</a></li>
                <li><Link href="/supplier/dashboard" className="hover:text-brand-orange transition-colors">Supplier Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-brand-cream font-semibold mb-4 text-lg">Company</p>
              <ul className="space-y-3 text-brand-cream/50 text-sm">
                <li><a href="#" className="hover:text-brand-orange transition-colors">About Vendo</a></li>
                <li><a href="#" className="hover:text-brand-orange transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-brand-orange transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-brand-orange transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-brand-orange transition-colors">Delivery & Logistics</a></li>
              </ul>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-brand-charcoal/50 rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="text-brand-cream font-semibold text-lg">Feedback & Suggestions</p>
                <p className="text-brand-cream/50 text-sm">We value your input</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-brand-cream/70 mb-1 block">Your Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-brand-cream placeholder:text-brand-cream/30 focus:border-brand-orange"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-brand-cream/70 mb-1 block">Your Feedback</label>
                <Textarea
                  placeholder="Share your suggestions, complaints, or ideas..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="bg-white/5 border-white/10 text-brand-cream placeholder:text-brand-cream/30 focus:border-brand-orange resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>

              <p className="text-xs text-brand-cream/40 text-center">
                We read every submission and respond within 48 hours
              </p>
            </form>
          </div>
        </div>

        {/* Delivery & Logistics Notice */}
        <div className="mb-8 p-4 sm:p-6 bg-brand-charcoal/30 rounded-2xl border border-brand-orange/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-brand-cream font-semibold mb-1">Delivery Options Available</p>
              <p className="text-brand-cream/50 text-sm">
                Suppliers can choose: Self-Delivery (own waybill) or Platform Logistics (we handle delivery)
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full">
                Self-Delivery
              </span>
              <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
                Platform Logistics
              </span>
              <span className="px-3 py-1.5 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full">
                Dropship API
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brand-cream/30 text-sm text-center sm:text-left">
            © {new Date().getFullYear()} Vendo · Rocybits Technology, Onitsha, Anambra, Nigeria
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-brand-cream/30 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              All systems operational
            </div>
            <div className="hidden sm:block text-brand-cream/30">|</div>
            <div className="text-brand-cream/30 text-sm">
              Powered by Vee AI
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
