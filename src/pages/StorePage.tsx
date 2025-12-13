import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const StorePage = () => {
  const { sellerId } = useParams<{ sellerId: string }>();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 pt-28 lg:pt-36 pb-12">
        <h1 className="text-3xl font-bold mb-8">Tienda del Vendedor</h1>
        <p className="text-gray-600">
          Vendedor ID: <span className="font-mono">{sellerId}</span>
        </p>
        
        {/* Grid de productos del vendedor */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {/* Aquí irían los productos del vendedor específico */}
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StorePage;
