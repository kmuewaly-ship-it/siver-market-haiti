import { ShoppingCart, X, Trash2, AlertCircle } from 'lucide-react';
import { CartB2B, CartItemB2B } from '@/types/b2b';
import { Link } from 'react-router-dom';

interface CartSidebarB2BProps {
  cart: CartB2B;
  onUpdateQuantity: (productId: string, cantidad: number) => void;
  onRemoveItem: (productId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CartSidebarB2B = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  isOpen,
  onToggle,
}: CartSidebarB2BProps) => {
  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-6 z-40 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ backgroundColor: '#94111f' }}
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.totalItems > 0 && (
          <span 
            className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
            style={{ backgroundColor: '#071d7f' }}
          >
            {cart.totalItems}
          </span>
        )}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onToggle} />
      )}

      <div
        className={`fixed right-0 top-0 h-screen w-full sm:w-96 bg-white shadow-2xl z-50 transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 text-white p-4 flex items-center justify-between shadow-lg" style={{ backgroundColor: '#071d7f' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            <h2 className="font-bold text-lg">Carrito B2B</h2>
            {cart.totalItems > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                {cart.totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-white/20 rounded transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
              <p className="text-xs text-gray-500">Comienza a añadir productos para verlos aquí</p>
            </div>
          ) : (
            <>
              {/* Aviso importante */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Revisa el total antes de proceder al checkout. Puedes modificar cantidades.
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-white"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">
                          {item.nombre}
                        </p>
                        <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.productId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"
                        title="Eliminar del carrito"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() =>
                          onUpdateQuantity(
                            item.productId,
                            Math.max(item.moq, item.cantidad - 1)
                          )
                        }
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium transition"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={item.moq}
                        max={item.stock_fisico}
                        value={item.cantidad}
                        onChange={(e) =>
                          onUpdateQuantity(
                            item.productId,
                            parseInt(e.target.value) || item.moq
                          )
                        }
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium"
                      />
                      <button
                        onClick={() =>
                          onUpdateQuantity(
                            item.productId,
                            Math.min(item.stock_fisico, item.cantidad + 1)
                          )
                        }
                        className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium transition"
                      >
                        +
                      </button>
                    </div>

                    {/* Precio y Subtotal */}
                    <div className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <span className="text-gray-600">
                        ${item.precio_b2b.toFixed(2)} × {item.cantidad}
                      </span>
                      <span className="font-bold" style={{ color: '#071d7f' }}>
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total de Unidades:</span>
                  <span className="font-bold text-gray-900">{cart.totalQuantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total de Items:</span>
                  <span className="font-bold text-gray-900">{cart.items.length}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="font-bold" style={{ color: '#071d7f' }}>
                    ${cart.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón Checkout */}
              <Link
                to="/seller/checkout"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-bold text-center transition block mt-4 shadow-lg"
              >
                Proceder al Checkout
              </Link>

              {/* Botón Continuar comprando */}
              <button
                onClick={onToggle}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium text-center transition"
              >
                Continuar Comprando
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartSidebarB2B;
