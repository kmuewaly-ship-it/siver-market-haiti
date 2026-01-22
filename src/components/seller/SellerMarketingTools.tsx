import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Image, 
  Download, 
  Check, 
  Package,
  Loader2,
  Share2,
  RefreshCw,
  CheckSquare,
  XSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  openPDFCatalog, 
  downloadWhatsAppStatusImage, 
  downloadWhatsAppStatusBulk,
} from '@/services/marketingGenerators';
import { useSellerCatalog } from '@/hooks/useSellerCatalog';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';

interface CatalogProduct {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  images: string[];
  variants?: Array<{
    id: string;
    sku: string;
    color?: string;
    size?: string;
    image?: string;
  }>;
  store_slug: string;
  store_name: string;
}

export const SellerMarketingTools: React.FC = () => {
  const { user } = useAuth();
  const { items: catalogItems, storeId, refetch } = useSellerCatalog();
  const { data: store } = useStore(storeId || undefined);
  
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transform catalog items to CatalogProduct format
  const products: CatalogProduct[] = useMemo(() => {
    return catalogItems.map(item => ({
      id: item.id,
      sku: item.sku,
      nombre: item.nombre,
      descripcion: item.descripcion,
      precio_venta: item.precioVenta,
      images: item.images,
      variants: [], // Would need to fetch from product_variants if needed
      store_slug: store?.slug || '',
      store_name: store?.name || '',
    }));
  }, [catalogItems, store]);

  const selectedProductsData = useMemo(() => {
    return products.filter(p => selectedProducts.has(p.id));
  }, [products, selectedProducts]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedProducts(new Set(products.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Generate PDF Catalog
  const handleGeneratePDF = async () => {
    if (selectedProductsData.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await openPDFCatalog({
        products: selectedProductsData,
        storeId: storeId || '',
        storeName: store?.name || 'Mi Tienda',
        storeLogo: store?.logo || undefined,
        storeSlug: store?.slug || '',
        primaryColor: '#8B5CF6',
        showQR: true,
        trackingEnabled: true,
      });
      toast.success('Catálogo PDF generado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar catálogo');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Download single WhatsApp status
  const handleDownloadSingleStatus = async (product: CatalogProduct) => {
    try {
      await downloadWhatsAppStatusImage({
        product,
        storeId: storeId || '',
        storeName: store?.name || 'Mi Tienda',
        storeLogo: store?.logo || undefined,
        storeSlug: store?.slug || '',
      });
      toast.success('Imagen descargada');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Error al descargar imagen');
    }
  };

  // Download bulk WhatsApp status images
  const handleDownloadBulkStatus = async () => {
    if (selectedProductsData.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    setIsGeneratingImages(true);
    setDownloadProgress({ current: 0, total: selectedProductsData.length });
    
    try {
      await downloadWhatsAppStatusBulk(
        selectedProductsData,
        {
          storeId: storeId || '',
          storeName: store?.name || 'Mi Tienda',
          storeLogo: store?.logo || undefined,
          storeSlug: store?.slug || '',
        },
        (current, total) => setDownloadProgress({ current, total })
      );
      toast.success(`${selectedProductsData.length} imágenes descargadas`);
    } catch (error) {
      console.error('Error downloading images:', error);
      toast.error('Error al descargar imágenes');
    } finally {
      setIsGeneratingImages(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  if (!storeId) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Necesitas tener una tienda configurada</p>
          <Button asChild variant="outline">
            <a href="/seller/cuenta">Configurar tienda</a>
          </Button>
        </div>
      </div>
    );
  }

  // Stats for the header
  const stats = [
    {
      label: "Seleccionados",
      value: selectedProducts.size,
      icon: Check,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    {
      label: "Total",
      value: products.length,
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Card - Stats Style like Inventario B2C */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-3">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Marketing</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={selectAll}
                title="Seleccionar todo"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={clearSelection}
                title="Limpiar selección"
              >
                <XSquare className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="icon"
                className="rounded-full h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Stats + Action Buttons - Single Row */}
          <div className="flex items-stretch gap-1">
            {/* Stats - Compact */}
            {stats.map((stat) => (
              <Card key={stat.label} className={`${stat.bgColor} ${stat.borderColor} border flex-1`}>
                <CardContent className="p-1 text-center">
                  <stat.icon className={`h-2.5 w-2.5 ${stat.color} mx-auto`} />
                  <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
                  <p className="text-[8px] text-muted-foreground leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
            
            {/* PDF Button */}
            <Button 
              onClick={handleGeneratePDF} 
              disabled={isGeneratingPDF || selectedProducts.size === 0}
              className="flex-1 h-auto py-1.5 flex flex-col items-center justify-center gap-0"
              style={{ backgroundColor: '#071d7f' }}
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span className="text-[8px] font-medium leading-tight">PDF</span>
            </Button>

            {/* WhatsApp Button */}
            <Button 
              onClick={handleDownloadBulkStatus} 
              disabled={isGeneratingImages || selectedProducts.size === 0}
              variant="outline"
              className="flex-1 h-auto py-1.5 flex flex-col items-center justify-center gap-0 border-green-500 text-green-600 hover:bg-green-50"
            >
              {isGeneratingImages ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Image className="h-3.5 w-3.5" />
              )}
              <span className="text-[8px] font-medium leading-tight">Status</span>
            </Button>
          </div>

          {/* Progress Bar */}
          {isGeneratingImages && downloadProgress.total > 0 && (
            <div className="mt-2 space-y-1">
              <Progress 
                value={(downloadProgress.current / downloadProgress.total) * 100} 
              />
              <p className="text-[10px] text-muted-foreground text-center">
                {downloadProgress.current} de {downloadProgress.total}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid - Clean */}
      {products.length === 0 ? (
        <div className="bg-muted/50 rounded-lg text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin productos en inventario</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            Importa productos desde el catálogo B2B para crear materiales de marketing
          </p>
          <Button asChild variant="outline">
            <a href="/seller/inventario">
              <Download className="h-4 w-4 mr-2" />
              Ver Catálogo B2B
            </a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {products.map(product => {
            const isSelected = selectedProducts.has(product.id);
            return (
              <div 
                key={product.id}
                className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all bg-card ${
                  isSelected 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                {/* Selection indicator */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <Checkbox 
                    checked={isSelected}
                    className="h-4 w-4 bg-white/90 backdrop-blur-sm"
                  />
                </div>
                
                {/* Quick download button */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 z-10 h-6 w-6 bg-white/90 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSingleStatus(product);
                  }}
                >
                  <Download className="h-3 w-3" />
                </Button>
                
                {/* Product image */}
                <div className="aspect-square bg-muted">
                  <img 
                    src={product.images[0] || '/placeholder.svg'} 
                    alt={product.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Product info - minimal */}
                <div className="p-1.5">
                  <p className="text-[11px] font-medium truncate text-foreground">{product.nombre}</p>
                  <p className="text-xs text-primary font-bold">
                    ${product.precio_venta.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerMarketingTools;
