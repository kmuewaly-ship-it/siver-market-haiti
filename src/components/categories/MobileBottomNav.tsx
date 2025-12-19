import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Sparkles, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useB2CCartSupabase } from "@/hooks/useB2CCartSupabase";
import { useB2BCartSupabase } from "@/hooks/useB2BCartSupabase";

const MobileBottomNav = () => {
  const location = useLocation();
  const { role } = useAuth();
  const { cart: b2cCart } = useB2CCartSupabase();
  const { cart: b2bCart } = useB2BCartSupabase();
  
  // Hide on admin routes
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLoginRoute = location.pathname === "/login";
  
  if (isAdminRoute || isLoginRoute) {
    return null;
  }
  
  const isB2B = role === UserRole.SELLER || role === UserRole.ADMIN;
  const accountLink = isB2B ? "/seller/cuenta" : "/cuenta";
  const cartLink = isB2B ? "/seller/carrito" : "/carrito";
  
  // Get cart count based on user type
  const cartCount = isB2B ? b2bCart.totalItems : b2cCart.totalItems;
  const cartBadge = cartCount > 0 ? (cartCount > 99 ? "99+" : cartCount.toString()) : undefined;
  
  const categoriesLink = "/categorias";
  
  const navItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: categoriesLink, icon: LayoutGrid, label: "Categorías" },
    { href: "/tendencias", icon: Sparkles, label: "Tendencias", hasDot: true },
    { href: cartLink, icon: ShoppingBag, label: "Carrito", badge: cartBadge },
    { href: accountLink, icon: User, label: "Cuenta" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/categorias" && location.pathname.startsWith("/categoria"));
          
          const IconComponent = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-full",
                "transition-colors"
              )}
            >
              <div className="relative">
                <IconComponent 
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-gray-900" : "text-gray-500"
                  )} 
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[20px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {item.badge}
                  </span>
                )}
                {item.hasDot && (
                  <span className="absolute -top-0.5 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px]",
                isActive ? "text-gray-900 font-medium" : "text-gray-500"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
