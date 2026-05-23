import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/home/HeroSection";
import Stats from "@/components/home/Stats";
import HowItWorks from "@/components/home/HowItWorks";
import ChatDemo from "@/components/home/ChatDemo";
import Features from "@/components/home/Features";
import ForSuppliers from "@/components/home/ForSuppliers";
import TestimonialsSwiper from "@/components/home/TestimonialsSwiper";
import Footer from "@/components/home/Footer";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="bg-background">
      <HeroSection isLoggedIn={!!user} />
      <Stats />
      <HowItWorks />
      <ChatDemo />
      <Features />
      <ForSuppliers />
      <TestimonialsSwiper />
      <Footer />
    </main>
  );
}
