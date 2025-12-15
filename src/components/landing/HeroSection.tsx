import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const slides = [
    {
      id: 1,
      title: "Navidad",
      image: "/navidad-1.png",
      fallback:
        "https://images.unsplash.com/photo-1482684364924-3be32fe17ce9?w=1200&h=400&fit=crop",
      color: "bg-red-600",
    },
    {
      id: 2,
      title: "Súper Rebajas",
      image: "/navidad-2.png",
      fallback:
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop",
      color: "bg-orange-600",
    },
    {
      id: 3,
      title: "Ofertas Especiales",
      image: "/navidad-3.png",
      fallback:
        "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=1200&h=400&fit=crop",
      color: "bg-green-600",
    },
    {
      id: 4,
      title: "Colección de Invierno",
      image: "/navidad-4.png",
      fallback:
        "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=1200&h=400&fit=crop",
      color: "bg-blue-600",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Carousel Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                // try fallback then placeholder
                if (slide.fallback && img.src !== slide.fallback) {
                  img.src = slide.fallback;
                } else if (!img.src.includes("/placeholder.svg")) {
                  img.src = "/placeholder.svg";
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows - smaller on mobile */}
      <button
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 p-1.5 sm:p-2 rounded-full transition"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/30 hover:bg-white/50 p-1.5 sm:p-2 rounded-full transition"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
      </button>

      {/* Dots - smaller on mobile */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition ${
              index === currentSlide ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
