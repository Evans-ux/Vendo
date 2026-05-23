"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Star, Truck } from "lucide-react";

// Mock product data - in production, this would come from an API
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Premium Leather Sneakers",
    category: "Footwear",
    price: 25000,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop",
    rating: 4.8,
    delivery: "2-3 days",
    supplier: "Rocybits Fashion",
  },
  {
    id: 2,
    name: "Designer Handbag",
    category: "Bags",
    price: 45000,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w-800&auto=format&fit=crop",
    rating: 4.9,
    delivery: "2-3 days",
    supplier: "Luxe Accessories",
  },
  {
    id: 3,
    name: "Casual T-Shirt",
    category: "Tops",
    price: 8500,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop",
    rating: 4.5,
    delivery: "2-3 days",
    supplier: "Urban Wear",
  },
  {
    id: 4,
    name: "Smart Watch",
    category: "Accessories",
    price: 35000,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop",
    rating: 4.7,
    delivery: "14-21 days",
    supplier: "Tech Gadgets",
  },
  {
    id: 5,
    name: "Running Shoes",
    category: "Footwear",
    price: 22000,
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&auto=format&fit=crop",
    rating: 4.6,
    delivery: "2-3 days",
    supplier: "Active Gear",
  },
  {
    id: 6,
    name: "Sunglasses",
    category: "Accessories",
    price: 12000,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop",
    rating: 4.4,
    delivery: "2-3 days",
    supplier: "Style Optics",
  },
];

export default function ProductsSwiper() {
  return (
    <div className="w-full py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Featured Products
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover trending products from our verified suppliers. Fast delivery guaranteed.
          </p>
        </div>

        {/* Swiper Container */}
        <div className="relative">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 24,
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 28,
              },
            }}
            className="!pb-12"
          >
            {MOCK_PRODUCTS.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Delivery Badge */}
                    <div className="absolute top-3 left-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full">
                        <Truck className="w-3 h-3 text-brand-orange" />
                        <span className="text-xs font-medium text-foreground">
                          {product.delivery}
                        </span>
                      </div>
                    </div>
                    {/* Rating Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-full">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-foreground">
                          {product.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col">
                    <div className="mb-3">
                      <span className="text-xs font-medium text-brand-orange bg-brand-orange/10 px-2 py-1 rounded">
                        {product.category}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-foreground text-base sm:text-lg mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      By {product.supplier}
                    </p>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-bold text-foreground text-xl sm:text-2xl">
                            ₦{product.price.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-brand-orange hover:bg-brand-orange/90 text-white"
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom Navigation Styles */}
          <style jsx global>{`
            .swiper-button-next,
            .swiper-button-prev {
              color: #F97316 !important;
              background: rgba(249, 115, 22, 0.1);
              width: 44px !important;
              height: 44px !important;
              border-radius: 50%;
              backdrop-filter: blur(8px);
            }
            .swiper-button-next:after,
            .swiper-button-prev:after {
              font-size: 20px !important;
            }
            .swiper-pagination-bullet {
              background: #D1D5DB !important;
              opacity: 0.5 !important;
            }
            .swiper-pagination-bullet-active {
              background: #F97316 !important;
              opacity: 1 !important;
            }
            @media (max-width: 640px) {
              .swiper-button-next,
              .swiper-button-prev {
                display: none !important;
              }
            }
          `}</style>
        </div>

        {/* CTA */}
        <div className="text-center mt-8 sm:mt-12">
          <Button
            size="lg"
            className="bg-brand-orange hover:bg-brand-orange/90 text-white px-8 py-6 text-base sm:text-lg"
          >
            View All Products
          </Button>
        </div>
      </div>
    </div>
  );
}