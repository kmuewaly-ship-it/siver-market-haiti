import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerOrders } from '@/hooks/useBuyerOrders';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { useKYC } from '@/hooks/useKYC';
import { SellerLayout } from '@/components/seller/SellerLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertCircle,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SellerDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders();
  const { credit, availableCredit } = useSellerCredits();
  const { isVerified } = useKYC();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (orders && orders.length > 0) {
      // Get last 5 orders
      setRecentOrders(orders.slice(0, 5));
    }
  }, [orders]);

  if (authLoading || ordersLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-[#071d7f]" />
        </div>
      </SellerLayout>
    );
  }

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === 'placed' || o.status === 'draft')?.length || 0;

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-blue-50/30 to-background">
        <Header />

        <main className="container mx-auto px-4 py-6 mt-3">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              ¡Bienvenido de vuelta, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              Aquí puedes ver un resumen de tu actividad como vendedor en Siver Market.
            </p>
          </div>

          {/* KYC Alert */}
          {!isVerified && (
            <Card className="p-4 mb-8 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-1">Verificación KYC Pendiente</h3>
                  <p className="text-sm text-orange-700 mb-3">
                    Completa tu verificación para acceder a todas las funcionalidades y maximizar tu crédito.
                  </p>
                  <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
                    <Link to="/seller/cuenta">
                      Completar Verificación
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Orders Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total de Compras</p>
                  <p className="text-3xl font-bold text-foreground">{totalOrders}</p>
                  <p className="text-xs text-muted-foreground mt-2">Órdenes realizadas</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            {/* Total Spent Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Monto Total Gastado</p>
                  <p className="text-3xl font-bold text-foreground">${totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">En todas tus compras</p>
                </div>
                <div className="p-3 rounded-lg bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            {/* Pending Orders Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Pedidos Pendientes</p>
                  <p className="text-3xl font-bold text-foreground">{pendingOrders}</p>
                  <p className="text-xs text-muted-foreground mt-2">En proceso</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-100">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>

            {/* Available Credit Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Crédito Disponible</p>
                  <p className="text-3xl font-bold text-foreground">${availableCredit.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Para usar en compras</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders */}
            <div className="lg:col-span-2">
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Package className="h-5 w-5 text-[#071d7f]" />
                      Órdenes Recientes
                    </h2>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/seller/mis-compras">
                        Ver todas
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>

                  {recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No tienes órdenes aún</p>
                      <Button asChild className="mt-4 bg-[#071d7f] hover:bg-[#0a2a9f]">
                        <Link to="/seller/adquisicion-lotes">
                          Comienza a Comprar
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">
                                Orden #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(order.created_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                order.status === 'paid'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : order.status === 'placed'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }
                            >
                              {order.status === 'paid'
                                ? 'Completado'
                                : order.status === 'placed'
                                  ? 'En Proceso'
                                  : 'Pendiente'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              <span className="text-muted-foreground">{order.total_quantity} productos - </span>
                              <span className="font-semibold text-foreground">
                                ${order.total_amount.toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#071d7f]" />
                    Acciones Rápidas
                  </h2>

                  <div className="space-y-3">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start border-[#071d7f] text-[#071d7f] hover:bg-blue-50"
                    >
                      <Link to="/seller/adquisicion-lotes">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Comprar Lotes
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start border-[#071d7f] text-[#071d7f] hover:bg-blue-50"
                    >
                      <Link to="/seller/catalogo">
                        <Package className="h-4 w-4 mr-2" />
                        Mi Catálogo
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start border-[#071d7f] text-[#071d7f] hover:bg-blue-50"
                    >
                      <Link to="/seller/wallet">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Mi Billetera
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start border-[#071d7f] text-[#071d7f] hover:bg-blue-50"
                    >
                      <Link to="/seller/inventario">
                        <Package className="h-4 w-4 mr-2" />
                        Inventario B2C
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-start border-[#071d7f] text-[#071d7f] hover:bg-blue-50"
                    >
                      <Link to="/seller/cuenta">
                        <User className="h-4 w-4 mr-2" />
                        KYC & Créditos
                      </Link>
                    </Button>
                  </div>

                  <Separator className="my-6" />

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground mb-3">Estado de Verificación</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="text-sm">
                          {isVerified ? 'KYC Verificado' : 'KYC Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {credit ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="text-sm">
                          {credit ? 'Crédito Activo' : 'Sin Crédito'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </SellerLayout>
  );
};

export default SellerDashboard;
