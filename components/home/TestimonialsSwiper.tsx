"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Quote, Star, User, TrendingUp, Package, Shield } from "lucide-react";

const TESTIMONIALS = [
  {
    id: 1,
    name: "Chinwe Okonkwo",
    role: "Fashion Store Owner",
    business: "Rocybits Fashion",
    location: "Lagos",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&auto=format&fit=crop",
    rating: 5,
    content: "Vendo has transformed my business! I went from selling 10 items a month to over 200. The platform logistics option saves me so much time — I just package and Vendo handles delivery.",
    stats: "Revenue increased by 300%",
    delivery: "Platform Logistics",
    growth: "300% Revenue",
    icon: <TrendingUp className="w-5 h-5 text-green-500" />,
  },
  {
    id: 2,
    name: "Emeka Nwosu",
    role: "Electronics Supplier",
    business: "Tech Gadgets NG",
    location: "Abuja",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
    rating: 5,
    content: "As a dropship supplier, Vendo's API integration is seamless. They handle customer interactions through Vee AI, and I just focus on fulfillment. The 10% commission is fair for the exposure.",
    stats: "500+ orders processed",
    delivery: "Dropship API",
    growth: "500+ Orders",
    icon: <Package className="w-5 h-5 text-blue-500" />,
  },
  {
    id: 3,
    name: "Aisha Bello",
    role: "Accessories Designer",
    business: "Aisha's Creations",
    location: "Kano",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop",
    rating: 4,
    content: "The KYC verification was thorough but worth it. Customers trust my products more knowing I'm verified. The self-delivery option lets me control my brand experience.",
    stats: "98% positive reviews",
    delivery: "Self-Delivery",
    growth: "98% Reviews",
    icon: <Shield className="w-5 h-5 text-purple-500" />,
  },
  {
    id: 4,
    name: "David Okafor",
    role: "Footwear Manufacturer",
    business: "David's Shoes",
    location: "Onitsha",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop",
    rating: 5,
    content: "Local delivery with my own waybill works perfectly for me. I save on logistics fees and build direct relationships with customers. Vendo's dashboard makes order management easy.",
    stats: "1500+ pairs sold",
    delivery: "Self-Delivery",
    growth: "1500+ Sales",
    icon: <TrendingUp className="w-5 h-5 text-green-500" />,
  },
  {
    id: 5,
    name: "Funke Adebayo",
    role: "Boutique Owner",
    business: "Funke's Fashion Hub",
    location: "Ibadan",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop",
    rating: 5,
    content: "The platform logistics fee is reasonable for the convenience. No more dealing with multiple delivery companies. One platform handles everything from sales to delivery.",
    stats: "Delivery time reduced by 60%",
    delivery: "Platform Logistics",
    growth: "60% Faster",
    icon: <Package className="w-5 h-5 text-blue-500" />,
  },
];

export default function TestimonialsSwiper() {
  return (
    <div className="w-full py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 mb-4">
            <Quote className="w-7 h-7 text-brand-orange" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Supplier Success Stories
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Hear from suppliers who have grown their businesses with Vendo
          </p>
        </div>

        {/* Swiper */}
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="pb-12"
        >
          {TESTIMONIALS.map((t) => (
            <SwiperSlide key={t.id}>
              <div className="bg-card border border-border rounded-3xl card-shadow p-6 sm:p-8 lg:p-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                  {/* Left — quote + stats + rating */}
                  <div className="space-y-6">
                    <div className="relative pt-4 pl-8">
                      <Quote className="w-8 h-8 text-brand-orange/25 absolute top-0 left-0" />
                      <p className="text-lg sm:text-xl text-foreground font-medium leading-relaxed">
                        {t.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
                      {t.icon}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{t.stats}</p>
                        <p className="text-xs text-muted">Since joining Vendo</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < t.rating ? "text-yellow-500 fill-yellow-500" : "text-border"
                          }`}
                        />
                      ))}
                      <span className="text-sm font-semibold text-muted ml-2">
                        {t.rating}.0 / 5.0
                      </span>
                    </div>
                  </div>

                  {/* Right — supplier profile + delivery/growth cards */}
                  <div className="space-y-4">
                    <div className="bg-surface rounded-2xl border border-border p-5">
                      <div className="flex items-start gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={t.image}
                            alt={t.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-brand-orange/30"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center shadow-sm">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground text-base">{t.name}</h3>
                          <p className="text-sm text-muted">{t.role}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-brand-orange/10 text-brand-orange rounded-full border border-brand-orange/20">
                              {t.business}
                            </span>
                            <span className="text-xs text-muted">📍 {t.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-foreground">Delivery</span>
                        </div>
                        <p className="text-xs text-muted font-medium">{t.delivery}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-semibold text-foreground">Growth</span>
                        </div>
                        <p className="text-xs text-muted font-medium">{t.growth}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { value: "500+", label: "Active Suppliers" },
            { value: "10,000+", label: "Products Listed" },
            { value: "98%", label: "Positive Reviews" },
            { value: "₦50M+", label: "Total Sales" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card rounded-2xl border border-border card-shadow p-5 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold text-brand-orange">{s.value}</p>
              <p className="text-sm text-muted mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
