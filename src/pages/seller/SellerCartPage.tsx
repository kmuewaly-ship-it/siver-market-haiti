import { SellerLayout } from "@/components/seller/SellerLayout";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartB2B } from "@/hooks/useCartB2B";

const SellerCartPage = () => {
  const { cart, removeItem, updateQuantity, clearCart } = useCartB2B();
  const items = cart.items;
  const { subtotal, totalQuantity } = { subtotal: cart.subtotal, totalQuantity: cart.totalQuantity };

  return (
    <SellerLayout>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 pb-8">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Carrito de Compras B2B
          </h1>

          {items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex justify-center mb-4">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Tu carrito de lotes está vacío</h2>
                <p className="text-muted-foreground mb-6">
                  Visita el catálogo de adquisición de lotes para abastecer tu inventario.
                </p>
                <Button asChild>
                  <Link to="/seller/adquisicion-lotes">Ir al Catálogo de Lotes</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <Card key={item.productId}>
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div className="h-24 w-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {/* Placeholder image since CartItemB2B might not have image property directly or it's different */}
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                          No Img
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.nombre}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          SKU: {item.sku}
                        </p>
                        <p className="font-bold text-primary">
                          ${item.precio_b2b.toFixed(2)} / unidad
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MOQ: {item.moq}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.productId, Math.max(item.moq, item.cantidad - 1))
                            }
                            disabled={item.cantidad <= item.moq}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center">{item.cantidad}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.productId, item.cantidad + 1)
                            }
                            disabled={item.cantidad >= item.stock_fisico}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={clearCart}>
                    Vaciar Carrito
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de Compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span>Total Unidades</span>
                        <span>{totalQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full" asChild>
                      <Link to="/seller/checkout">Proceder al Pago</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </SellerLayout>
  );
};

export default SellerCartPage;
