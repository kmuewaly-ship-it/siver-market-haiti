import { Heart } from "lucide-react";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  badge?: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount || 0;

  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition group">
      {/* Image Container */}
      <div className="relative overflow-hidden h-64 bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            {discountPercentage}% DESCUENTO
          </div>
        )}

        {/* Custom Badge */}
        {product.badge && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
            {product.badge}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-2 left-2 p-2 rounded-full bg-white/80 hover:bg-white transition"
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
          {product.name}
        </h3>

        <div className="space-y-1">
          <div className="text-lg font-bold text-red-500">
            ${product.price.toFixed(2)}
          </div>
          {product.originalPrice && (
            <div className="text-sm text-gray-500 line-through">
              ${product.originalPrice.toFixed(2)}
            </div>
          )}
        </div>

        <button className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition">
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
};

export default ProductCard;