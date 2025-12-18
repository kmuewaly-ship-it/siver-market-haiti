import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import { CartItemB2B } from "@/types/b2b";
import { UserRole } from "@/types/auth";
import { toast } from "sonner";

interface ProductForCart {
  id: string;
  name: string;
  sku: string;
  price: number;
  b2bPrice?: number;
  moq?: number;
  stock: number;
  image: string;
}

export const useSmartCart = () => {
  const { user, role } = useAuth();
  const b2cCart = useCart();
  const { cart: b2bCart, addItem: addB2BItem } = useCartB2B();
  
  const isSeller = role === UserRole.SELLER;

  const addToCart = (product: ProductForCart, quantity: number = 1) => {
    if (isSeller) {
      // Sellers add to B2B cart with MOQ
      const moq = product.moq || 1;
      const b2bPrice = product.b2bPrice || product.price;
      const finalQuantity = Math.max(quantity, moq);
      
      const b2bItem: CartItemB2B = {
        productId: product.id,
        sku: product.sku,
        nombre: product.name,
        precio_b2b: b2bPrice,
        cantidad: finalQuantity,
        moq: moq,
        stock_fisico: product.stock,
        subtotal: finalQuantity * b2bPrice,
      };
      
      addB2BItem(b2bItem);
      toast.success(`Agregado al carrito B2B`, {
        description: `${product.name} (${finalQuantity} unidades - MOQ: ${moq})`,
      });
    } else {
      // Regular users add to B2C cart
      b2cCart.addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        sku: product.sku,
      });
      toast.success("Producto agregado al carrito");
    }
  };

  return {
    isSeller,
    addToCart,
    b2cCart,
    b2bCart,
    totalItems: isSeller ? b2bCart.totalItems : b2cCart.totalItems(),
  };
};
