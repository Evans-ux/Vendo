"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import { Quote, Star, User, TrendingUp, Package, Shield } from "lucide-react";

// Mock testimonial data
const TESTIMONIALS = [
  {
    id: 1,
    name: "Chinwe Okonkwo",
    role: "Fashion Store Owner",
    business: "Rocybits Fashion",
    location: "Lagos",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&auto=format&fit=crop",
    rating: 5,
    content: "Vendo has transformed my business! I went from selling 10 items a month to over 200. The platform logistics option saves me so much time - I just package and Vendo handles delivery.",
    stats: "Revenue increased by 300%",
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
    icon: <Package className="w-5 h-5 text-blue-500" />,
  },
];

export default function TestimonialsSwiper() {
  return (
    <div className="w-full py-12 sm:py-16 bg-gradient-to-b from-background to-brand-charcoal/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-orange/10 mb-4">
            <Quote className="w-8 h-8 text-brand-orange" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Supplier Success Stories
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from suppliers who have grown their businesses with Vendo
          </p>
        </div>

        {/* Swiper Container */}
        <div className="relative">
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            spaceBetween={30}
            slidesPerView={1}
            autoplay={{
              delay: 6000,
              disableOnInteraction: false,
            }}
            loop={true}
            className="!pb-8"
          >
            {TESTIMONIALS.map((testimonial) => (
              <SwiperSlide key={testimonial.id}>
                <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 p-6 sm:p-8 lg:p-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Column - Testimonial Content */}
                    <div className="space-y-6">
                      {/* Quote */}
                      <div className="relative">
                        <Quote className="w-12 h-12 text-brand-orange/20 absolute -top-2 -left-2" />
                        <p className="text-lg sm:text-xl lg:text-2xl text-foreground font-medium leading-relaxed pl-8">
                          "{testimonial.content}"
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 p-4 bg-brand-charcoal/20 rounded-xl">
                        {testimonial.icon}
                        <div>
                          <p className="font-semibold text-foreground">{testimonial.stats}</p>
                          <p className="text-sm text-muted-foreground">Since joining Vendo</p>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < testimonial.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium text-foreground ml-2">
                          {testimonial.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Right Column - Supplier Info */}
                    <div className="space-y-6">
                      {/* Supplier Card */}
                      <div className="bg-background rounded-2xl border border-border p-6">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <img
                              src={testimonial.image}
                              alt={testimonial.name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-brand-orange/20"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground text-lg">
                              {testimonial.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium px-2 py-1 bg-brand-orange/10 text-brand-orange rounded">
                                  {testimonial.business}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {testimonial.location}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Method Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-500/10 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Package className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-foreground">Delivery</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {testimonial.id === 1 || testimonial.id === 5
                              ? "Platform Logistics"
                              : testimonial.id === 2
                              ? "Dropship API"
                              : "Self-Delivery"}
                          </p>
                        </div>
                        <div className="bg-green-500/10 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-foreground">Growth</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {testimonial.id === 1
                              ? "300% Revenue"
                              : testimonial.id === 2
                              ? "500+ Orders"
                              : testimonial.id === 3
                              ? "98% Reviews"
                              : testimonial.id === 4
                              ? "1500+ Sales"
                              : "60% Faster"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Styles */}
          <style jsx global>{`
            .swiper-pagination-bullet {
              background: #D1D5DB !important;
              opacity: 0.5 !important;
            }
            .swiper-pagination-bullet-active {
              background: #F97316 !important;
              opacity: 1 !important;
            }
            .swiper-slide {
              opacity: 0.5 !important;
              transition: opacity 0.5s ease !important;
            }
            .swiper-slide-active {
              opacity: 1 !important;
            }
          `}</style>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 sm:mt-14">
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-orange">500+</p>
            <p className="text-sm text-muted-foreground">Active Suppliers</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-orange">10,000+</p>
            <p className="text-sm text-muted-foreground">Products Listed</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-orange">98%</p>
            <p className="text-sm text-muted-foreground">Positive Reviews</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-brand-orange">₦50M+</p>
            <p className="text-sm text-muted-foreground">Total Sales</p>
          </div>
        </div>
      </div>
    </div>
  );
}