import { SellerLayout } from "@/components/seller/SellerLayout";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useIsMobile } from "@/hooks/use-mobile";

const SellerCartPage = () => {
  const { cart, removeItem, updateQuantity, clearCart } = useCartB2B();
  const items = cart.items;
  const { subtotal, totalQuantity } = { subtotal: cart.subtotal, totalQuantity: cart.totalQuantity };
  const isMobile = useIsMobile();

  // Mobile Layout
  if (isMobile) {
    return (
      <SellerLayout>
        <div className="min-h-screen bg-background flex flex-col">
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Carrito B2B</h1>
              <span className="ml-auto text-sm text-muted-foreground">
                {totalQuantity} items
              </span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-medium mb-2">Carrito vacío</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Visita el catálogo de lotes para abastecer tu inventario
              </p>
              <Button asChild size="sm">
                <Link to="/seller/adquisicion-lotes">Ir al Catálogo</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Shipping Info Banner */}
              <div className="bg-muted/50 px-4 py-2 flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Envío Nacional</span>
                <span className="text-muted-foreground text-xs">envío local</span>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-auto">
                {items.map((item) => (
                  <div key={item.productId} className="border-b last:border-b-0 px-3 py-2">
                    <div className="flex items-center gap-3">
                      {/* Product Image */}
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <div className="w-full h-full rounded-md bg-muted flex items-center justify-center overflow-hidden">
                          <Package className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <div className="absolute -bottom-1 left-0 right-0 bg-orange-500 text-white text-[8px] py-0.5 text-center rounded-sm">
                          {item.stock_fisico} left
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium line-clamp-1">{item.nombre}</h3>
                        <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-bold text-primary">${item.precio_b2b.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground line-through">${(item.precio_b2b * 1.25).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {/* Quantity & Delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, Math.max(item.moq, item.cantidad - 1))}
                            disabled={item.cantidad <= item.moq}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-xs">{item.cantidad}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, item.cantidad + 1)}
                            disabled={item.cantidad >= item.stock_fisico}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Summary & Checkout */}
              <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({totalQuantity} items)</span>
                  <span className="font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <Button className="w-full" asChild>
                  <Link to="/seller/checkout">Proceder al Pago</Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={clearCart}>
                  Vaciar Carrito
                </Button>
              </div>
            </>
          )}
        </div>
      </SellerLayout>
    );
  }

  // Desktop Layout
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
