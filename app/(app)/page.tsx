import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-brand-charcoal px-6 text-center">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-orange/10 blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-cream/5 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-2xl">
        <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
          Powered by Vee AI
        </span>

        <h1 className="text-5xl sm:text-6xl font-bold text-brand-cream leading-tight mb-6">
          Sell smarter with{" "}
          <span className="text-brand-orange">AI-powered</span> commerce
        </h1>

        <p className="text-lg text-brand-cream/60 mb-10 leading-relaxed">
          Vendo connects Nigerian suppliers with customers through Telegram and WhatsApp.
          List your products once — Vee AI handles discovery, orders, and payments.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-colors"
          >
            Become a Supplier
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-8 py-3 rounded-lg border border-brand-cream/20 text-brand-cream hover:bg-brand-cream/5 font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
