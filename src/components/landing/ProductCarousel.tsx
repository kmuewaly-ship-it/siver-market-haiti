import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  badge?: string;
  sku: string;
  storeId?: string;
  storeName?: string;
  storeWhatsapp?: string;
  // B2B fields
  priceB2B?: number;
  moq?: number;
  stock?: number;
}

interface ProductCarouselProps {
  title: string;
  products: Product[];
  itemsPerView?: number;
  isLoading?: boolean;
  linkTo?: string;
}

const ProductCarousel = ({
  title,
  products,
  itemsPerView = 5,
  isLoading = false,
  linkTo = "/",
}: ProductCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (direction === "left") {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    } else {
      setCurrentIndex(
        Math.min(products.length - itemsPerView, currentIndex + 1)
      );
    }
  };

  const visibleProducts = products.slice(
    currentIndex,
    currentIndex + itemsPerView
  );

  if (isLoading) {
    return (
      <section className="w-full">
        {/* Box Container */}
        <div className="bg-[#fff3f3] border-2 border-gray-300 shadow-sm">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-1 border-b border-gray-200">
            <h2 className="text-sm font-bold text-foreground">
              {title}
            </h2>
          </div>
          {/* Content */}
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      {/* Box Container */}
      <div className="bg-[#fff3f3] border-2 border-gray-300 shadow-sm">
        {/* Header */}
        <div className="bg-gray-100 px-4 py-0 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground">
              {title}
            </h2>
            <a href={linkTo} className="inline-flex items-center justify-center w-6 h-6 border-2 border-[#94111f] rounded hover:bg-[#94111f]/10 transition">
              <ChevronRight className="w-3 h-3 text-[#94111f]" />
            </a>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative p-2">
          {/* Left Arrow */}
          {currentIndex > 0 && (
            <button
              onClick={() => scroll("left")}
              className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10 bg-muted hover:bg-muted/80 p-2 rounded-full transition"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 overflow-hidden">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Right Arrow */}
          {currentIndex < products.length - itemsPerView && (
            <button
              onClick={() => scroll("right")}
              className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10 bg-muted hover:bg-muted/80 p-2 rounded-full transition"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductCarousel;