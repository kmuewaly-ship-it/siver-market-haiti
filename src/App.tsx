import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToastNotification";
import { ViewModeProvider } from "@/contexts/ViewModeContext";

// Public Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StorePage from "./pages/StorePage";
import ProductPage from "./pages/ProductPage";
import SellerRegistrationPage from "./pages/SellerRegistrationPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryProductsPage from "./pages/CategoryProductsPage";
import StoreProfilePage from "./pages/StoreProfilePage";
import AccountPage from "./pages/AccountPage";
import CartPage from "./pages/CartPage";
import FavoritesPage from "./pages/FavoritesPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import TrendsPage from "./pages/TrendsPage";
import LoginPage from "./pages/LoginPage";
import MarketplacePage from "./pages/MarketplacePage";
import MyPurchasesPage from "./pages/MyPurchasesPage";
import CheckoutPage from "./pages/CheckoutPage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminConciliacion from "./pages/admin/AdminConciliacion";
import AdminCatalogo from "./pages/admin/AdminCatalogo";
import AdminCategorias from "./pages/admin/AdminCategorias";
import AdminVendedores from "./pages/admin/AdminVendedores";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminProveedores from "./pages/admin/AdminProveedores";
import AdminPedidos from "./pages/admin/AdminPedidos";
import AdminPreciosConfig from "./pages/admin/AdminPreciosConfig";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminCotizaciones from "./pages/admin/AdminCotizaciones";
import AdminReembolsos from "./pages/admin/AdminReembolsos";

// Seller Pages
import SellerAcquisicionLotes from "./pages/seller/SellerAcquisicionLotes";
import SellerCheckout from "./pages/seller/SellerCheckout";
import SellerCatalogo from "./pages/seller/SellerCatalogo";
import SellerAccountPage from "./pages/seller/SellerAccountPage";
import SellerProfilePage from "./pages/seller/SellerProfilePage";
import SellerCartPage from "./pages/seller/SellerCartPage";
import SellerFavoritesPage from "./pages/seller/SellerFavoritesPage";
import SellerInventarioB2C from "./pages/seller/SellerInventarioB2C";
import SellerPedidosPage from "./pages/seller/SellerPedidosPage";
import SellerMisComprasPage from "./pages/seller/SellerMisComprasPage";
import SellerOnboardingPage from "./pages/seller/SellerOnboardingPage";
import SellerKYCPage from "./pages/seller/SellerKYCPage";
import { PageLoader } from "./components/ui/PageLoader";
import { NavigationLoader } from "./components/ui/NavigationLoader";
import MobileBottomNav from "./components/categories/MobileBottomNav";
import GlobalMobileHeader from "./components/layout/GlobalMobileHeader";

const AppContent = () => {
  const { toasts, removeToast } = useToast();
  const { isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <NavigationLoader />
      <GlobalMobileHeader />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Toaster />
      <Sonner />
      <Routes>
            {/* ========== PUBLIC ROUTES (B2C) ========== */}
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/categoria/:slug" element={<CategoryProductsPage />} />
            <Route path="/tienda/:storeId" element={<StoreProfilePage />} />
            <Route path="/producto/:sku" element={<ProductPage />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/mis-compras" element={<MyPurchasesPage />} />
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/favoritos" element={<FavoritesPage />} />
            <Route path="/tendencias" element={<TrendsPage />} />
            <Route path="/busqueda" element={<SearchResultsPage />} />
            <Route path="/tendencias" element={<TrendsPage />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/seller/login" element={<LoginPage />} />
            
            {/* Seller Registration Landing Page */}
            <Route path="/registro-vendedor" element={<SellerRegistrationPage />} />
            
            {/* Seller Onboarding (no auth required, just registered) */}
            <Route path="/seller/onboarding" element={<SellerOnboardingPage />} />
            
            {/* ========== ADMIN ROUTES ========== */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/conciliacion" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminConciliacion />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/catalogo" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminCatalogo />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/categorias" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminCategorias />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/vendedores" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminVendedores />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/banners" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminBanners />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/proveedores" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminProveedores />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/pedidos" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminPedidos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/precios" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminPreciosConfig />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/aprobaciones" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminApprovals />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/cotizaciones" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminCotizaciones />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reembolsos" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                  <AdminReembolsos />
                </ProtectedRoute>
              } 
            />
            <Route path="/admin" element={<AdminLogin />} />
            
            {/* ========== SELLER ROUTES (B2B) ========== */}
            <Route 
              path="/seller/adquisicion-lotes" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerAcquisicionLotes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/checkout" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerCheckout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/catalogo" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerCatalogo />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/inventario" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerInventarioB2C />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/kyc" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerKYCPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/seller/pedidos" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerPedidosPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/seller/mis-compras" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerMisComprasPage />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/seller/cuenta"
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/profile"
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/seller/carrito" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerCartPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/favoritos" 
              element={
                <ProtectedRoute requiredRoles={[UserRole.SELLER, UserRole.ADMIN]}>
                  <SellerFavoritesPage />
                </ProtectedRoute>
              } 
            />
            
            {/* ========== 404 CATCH-ALL ========== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      <MobileBottomNav />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <ViewModeProvider>
            <AppContent />
          </ViewModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
