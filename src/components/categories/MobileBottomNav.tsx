import { Link, useLocation } from "react-router-dom";
import { Home, Search, TrendingUp, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";

const MobileBottomNav = () => {
  const location = useLocation();
  const { role } = useAuth();
  
  const accountLink = role === UserRole.SELLER ? "/seller/cuenta" : "/cuenta";
  
  const navItems = [
    { href: "/", icon: Home, label: "Inicio" },
    { href: "/categorias", icon: Search, label: "Categorías" },
    { href: "/productos", icon: TrendingUp, label: "Tendencias" },
    { href: "/carrito", icon: ShoppingBag, label: "Carrito", badge: true },
    { href: accountLink, icon: User, label: "Yo" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/categorias" && location.pathname.startsWith("/categoria"));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full",
                "transition-colors",
                isActive ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    9+
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
