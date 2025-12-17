import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Sparkles, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";

const MobileBottomNav = () => {
  // Mobile navigation component
  const location = useLocation();
  const { role } = useAuth();
  
  // Hide on admin routes
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLoginRoute = location.pathname === "/login";
  
  if (isAdminRoute || isLoginRoute) {
    return null;
  }
  
  const accountLink = role === UserRole.SELLER ? "/seller/cuenta" : "/cuenta";
  const cartLink = role === UserRole.SELLER ? "/seller/carrito" : "/carrito";
  
  // If seller, "Categorías" should link to B2B catalog or open filter
  // For now, let"s point it to the B2B catalog page if user is seller
  const categoriesLink = role === UserRole.SELLER ? "/seller/adquisicion-lotes" : "/categorias";
  
  const navItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: categoriesLink, icon: LayoutGrid, label: "Categorías" },
    { href: "/tendencias", icon: Sparkles, label: "Tendencias", hasDot: true },
    { href: cartLink, icon: ShoppingBag, label: "Carrito", badge: "99+" },
    { href: accountLink, icon: User, label: "Cuenta" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-14 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/categorias" && location.pathname.startsWith("/categoria")) ||
            (item.href === "/seller/adquisicion-lotes" && location.pathname === "/seller/adquisicion-lotes");
          
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
