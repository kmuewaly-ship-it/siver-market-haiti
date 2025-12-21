import ProductCard from "./ProductCard";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  badge?: string;
  sku: string;
}

interface ProductGridProps {
  title: string;
  subtitle?: string;
  products: Product[];
}

const ProductGrid = ({ title, subtitle, products }: ProductGridProps) => {
  return (
    <section className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {title}
        </h2>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;