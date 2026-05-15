import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#080d12] border-t border-white/5 px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center">
                <span className="text-white font-black text-sm">V</span>
              </div>
              <span className="text-brand-cream font-bold text-xl">Vendo</span>
            </div>
            <p className="text-brand-cream/50 text-sm leading-relaxed max-w-xs">
              AI-powered conversational commerce for Nigeria. Shop on Telegram and WhatsApp. Powered by Vee AI.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://t.me/VeeAI_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-[#2aabee]/10 border border-[#2aabee]/20 flex items-center justify-center text-[#2aabee] hover:bg-[#2aabee]/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.978.892z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-[#25d366]/10 border border-[#25d366]/20 flex items-center justify-center text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <p className="text-brand-cream font-semibold mb-4">Platform</p>
            <ul className="space-y-3 text-brand-cream/50 text-sm">
              <li><Link href="/auth/signup" className="hover:text-brand-orange transition-colors">Become a Supplier</Link></li>
              <li><Link href="/auth/login" className="hover:text-brand-orange transition-colors">Supplier Login</Link></li>
              <li><a href="https://t.me/VeeAI_bot" target="_blank" rel="noopener noreferrer" className="hover:text-brand-orange transition-colors">Shop on Telegram</a></li>
              <li><a href="#" className="hover:text-brand-orange transition-colors">Shop on WhatsApp</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-brand-cream font-semibold mb-4">Company</p>
            <ul className="space-y-3 text-brand-cream/50 text-sm">
              <li><a href="#" className="hover:text-brand-orange transition-colors">About Vendo</a></li>
              <li><a href="#" className="hover:text-brand-orange transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-brand-orange transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-brand-orange transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brand-cream/30 text-sm">
            © {new Date().getFullYear()} Vendo · Rocybits Technology, Onitsha, Anambra, Nigeria
          </p>
          <div className="flex items-center gap-2 text-brand-cream/30 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
