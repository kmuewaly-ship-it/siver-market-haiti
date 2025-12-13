import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingBag, Search, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePublicCategories, Category } from "@/hooks/useCategories";
import CategoryCard from "@/components/landing/CategoryCard";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [], isLoading: categoriesLoading } = usePublicCategories();
  const navigate = useNavigate();

  const catBarRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = catBarRef.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [categories]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scrollHeader = (dir) => {
    const el = catBarRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.5, 240);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Root categories (no parent)
  const rootCategories = categories.filter((c) => !c.parent_id);

  const getSubcategories = (parentId) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <>
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      {/* Top Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>Envío desde el extranjero</span>
              <span>•</span>
              <span>Devolución Gratis</span>
            </div>
            <div className="flex items-center gap-4">
              <button>Centro de Ayuda</button>
              <span>•</span>
              <Link to="/admin/login">Vender</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded bg-red-500 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">SIVER</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 mx-8 max-w-md">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/favoritos" className="flex flex-col items-center gap-1 text-gray-700 hover:text-red-500 transition">
              <Heart className="w-6 h-6" />
              <span className="text-xs">Favoritos</span>
            </Link>
            <Link to="/cuenta" className="flex flex-col items-center gap-1 text-gray-700 hover:text-red-500 transition">
              <User className="w-6 h-6" />
              <span className="text-xs">Cuenta</span>
            </Link>
            <Link to="/carrito" className="flex flex-col items-center gap-1 text-gray-700 hover:text-red-500 transition">
              <ShoppingBag className="w-6 h-6" />
              <span className="text-xs">Carrito</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="hidden lg:block border-t border-gray-200 relative">
          <div ref={catBarRef} className="flex items-center gap-0 h-12 overflow-hidden whitespace-nowrap pl-12 pr-12">
          {categoriesLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Cargando categorías...</div>
          ) : (
            rootCategories.map((cat) => {
              const subs = getSubcategories(cat.id);
              return (
                <div key={cat.id} className="relative group inline-block">
                      <button
                        type="button"
                        onClick={() => navigate(`/categoria/${cat.slug}`)}
                        className="px-4 py-3 text-sm font-medium text-gray-700 hover:text-red-500 hover:bg-gray-50 border-b-2 border-transparent hover:border-red-500 transition whitespace-nowrap flex items-center gap-2"
                      >
                        {cat.name}
                      </button>

                  {/* Subcategories dropdown on hover */}
                  {subs.length > 0 && (
                    <div className="absolute left-0 top-full mt-2 hidden group-hover:flex p-6 bg-white border border-gray-100 shadow-lg rounded-lg z-40 max-w-screen-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {subs.map((sub) => (
                          <button key={sub.id} type="button" onClick={() => navigate(`/categoria/${sub.slug}`)} className="flex flex-col items-center text-center w-36">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center mb-2 border border-border">
                              {sub.icon ? (
                                <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <span className="text-xl text-muted-foreground">{sub.name.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">{sub.name}</div>
                            {sub.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{sub.description}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>

          {/* Scroll buttons */}
          {hasOverflow && (
            <>
              <button
                aria-label="scroll left"
                onClick={() => scrollHeader(-1)}
                className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-50"
              >
                <div className="w-6 h-6 bg-gray-200 border-2 border-black rounded flex items-center justify-center shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </button>
              <button
                aria-label="scroll right"
                onClick={() => scrollHeader(1)}
                className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-50"
              >
                <div className="w-6 h-6 bg-gray-200 border-2 border-black rounded flex items-center justify-center shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <Input type="text" placeholder="Buscar..." className="w-full mb-4 rounded-full" />

            <nav className="flex flex-col gap-2">
              <div className="flex items-center justify-around py-4 border-b border-gray-100">
                <Link to="/favoritos" className="flex flex-col items-center gap-1 text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  <Heart className="w-6 h-6" />
                  <span className="text-xs">Favoritos</span>
                </Link>
                <Link to="/cuenta" className="flex flex-col items-center gap-1 text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  <User className="w-6 h-6" />
                  <span className="text-xs">Cuenta</span>
                </Link>
                <Link to="/carrito" className="flex flex-col items-center gap-1 text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-xs">Carrito</span>
                </Link>
              </div>
              {rootCategories.map((cat) => {
                const subs = getSubcategories(cat.id);
                const isOpen = openMobileCategory === cat.id;
                return (
                  <div key={cat.id} className="border-b border-gray-100">
                    <div className="flex items-center justify-between w-full">
                      <button onClick={() => { setOpenMobileCategory(isOpen ? null : cat.id); }} className="w-full text-left py-3 px-2 text-gray-800 hover:bg-gray-50 font-medium">{cat.name}</button>
                      <button onClick={() => navigate(`/categoria/${cat.slug}`)} className="px-3 py-2 text-gray-600">Ir</button>
                    </div>

                    {isOpen && subs.length > 0 && (
                      <div className="px-2 py-2 bg-white">
                        <div className="grid grid-cols-3 gap-2">
                          {subs.map((sub) => (
                            <button key={sub.id} type="button" onClick={() => { setIsMenuOpen(false); navigate(`/categoria/${sub.slug}`); }} className="flex flex-col items-center text-center p-2">
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center mb-2 border border-border">
                                {sub.icon ? (
                                  <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <span className="text-xl text-muted-foreground">{sub.name.charAt(0).toUpperCase()}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-700">{sub.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>

    {/* spacer to push page content below fixed header */}
    <div aria-hidden style={{ height: headerHeight }} />
    </>
  );
};

export default Header;