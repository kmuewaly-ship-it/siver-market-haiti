import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Package, Store, TrendingUp, Loader2 } from "lucide-react";
import { useAdminWishlistStats } from "@/hooks/useAdminWishlistStats";
import { Badge } from "@/components/ui/badge";

const AdminWishlistPage = () => {
  const { b2bStats, b2cStats, totals, isLoading } = useAdminWishlistStats();

  if (isLoading) {
    return (
      <AdminLayout title="Estadísticas de Wishlist" subtitle="Productos más deseados">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Estadísticas de Wishlist" subtitle="Productos más deseados por sellers y clientes">
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Favoritos</CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.total}</div>
              <p className="text-xs text-muted-foreground">
                Productos guardados en wishlist
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Deseos B2B</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{totals.b2b}</div>
              <p className="text-xs text-muted-foreground">
                Interés de compra de Sellers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Deseos B2C</CardTitle>
              <Store className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totals.b2c}</div>
              <p className="text-xs text-muted-foreground">
                Interés de compra de Clientes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for B2B and B2C */}
        <Tabs defaultValue="b2b" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="b2b" className="gap-2">
              <Package className="h-4 w-4" />
              Deseos B2B ({b2bStats.length})
            </TabsTrigger>
            <TabsTrigger value="b2c" className="gap-2">
              <Store className="h-4 w-4" />
              Deseos B2C ({b2cStats.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="b2b" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Productos B2B Más Deseados
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Productos del catálogo mayorista con más interés de compra por Sellers
                </p>
              </CardHeader>
              <CardContent>
                {b2bStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos B2B en wishlists aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {b2bStats.slice(0, 20).map((stat, index) => (
                      <div 
                        key={stat.product_id} 
                        className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-lg font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <img 
                          src={stat.image} 
                          alt={stat.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{stat.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            ID: {stat.product_id}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Heart className="h-3 w-3 mr-1 fill-current" />
                          {stat.count} deseos
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="b2c" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Productos B2C Más Deseados
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Productos de tiendas con más interés de compra por Clientes finales
                </p>
              </CardHeader>
              <CardContent>
                {b2cStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay productos B2C en wishlists aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {b2cStats.slice(0, 20).map((stat, index) => (
                      <div 
                        key={stat.seller_catalog_id} 
                        className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-lg font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </span>
                        <img 
                          src={stat.image} 
                          alt={stat.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{stat.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Catálogo: {stat.seller_catalog_id}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Heart className="h-3 w-3 mr-1 fill-current" />
                          {stat.count} deseos
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminWishlistPage;
