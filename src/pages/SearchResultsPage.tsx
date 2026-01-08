import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Star, ShoppingBag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { products = [], type, imageUrl, query } = location.state || {};

  // Helper functions to handle different product structures (B2B vs B2C vs Mock)
  const getSku = (p: any) => p.sku || p.id;
  const getName = (p: any) => p.name || p.nombre;
  const getPrice = (p: any) => p.price || p.precio;
  const getImage = (p: any) => p.image || p.imagen || p.images?.[0] || "https://via.placeholder.com/300";
  const getSeller = (p: any) => p.seller || { id: "unknown", name: "Siver Market" };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && <Header />}
      <main className={`container mx-auto px-4 py-8 ${isMobile ? 'pb-20' : ''}`}>
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
            {type === 'image' ? 'Resultados de búsqueda visual' : `Resultados para "${query || ''}"`}
            </h1>
            <p className="text-gray-500 mt-1">
                {products.length} productos encontrados
            </p>
        </div>

        {imageUrl && (
           <div className="mb-8 flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="w-20 h-20 rounded overflow-hidden border border-gray-200 bg-gray-50">
                <img src={imageUrl} alt="Search query" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Búsqueda por imagen</p>
                <p className="text-sm text-gray-500">Mostrando productos visualmente similares</p>
              </div>
           </div>
        )}
        
        {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((p: any) => {
                    const sku = getSku(p);
                    const name = getName(p);
                    const price = getPrice(p);
                    const image = getImage(p);
                    const seller = getSeller(p);
                    const rating = p.rating ?? 4.5;
                    const reviews = p.reviews ?? 10;

                    return (
                    <div key={sku} className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition duration-300 flex flex-col group">
                        <div className="relative h-64 bg-gray-100 cursor-pointer overflow-hidden" onClick={() => navigate(`/producto/${sku}`)}>
                        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 cursor-pointer hover:text-blue-600 transition" onClick={() => navigate(`/producto/${sku}`)}>{name}</h3>

                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex text-yellow-400">{Array.from({ length: Math.round(rating) }).map((_, i) => (<Star key={i} className="w-3 h-3 fill-current" />))}</div>
                            <span className="text-xs text-gray-600">({reviews})</span>
                        </div>

                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-gray-900">${Number(price).toFixed(2)}</span>
                            </div>
                        </div>

                        <Button onClick={() => navigate(`/producto/${sku}`)} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                            <ShoppingBag className="w-4 h-4 mr-2" />Ver Detalles
                        </Button>
                        </div>
                    </div>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No se encontraron productos similares.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Volver al inicio</Button>
            </div>
        )}
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default SearchResultsPage;
