import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types/auth";

// Public Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StorePage from "./pages/StorePage";
import ProductPage from "./pages/ProductPage";
import SellerRegistrationPage from "./pages/SellerRegistrationPage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminConciliacion from "./pages/admin/AdminConciliacion";
import AdminCatalogo from "./pages/admin/AdminCatalogo";
import AdminCategorias from "./pages/admin/AdminCategorias";

// Seller Pages
import SellerAcquisicionLotes from "./pages/seller/SellerAcquisicionLotes";
import SellerCheckout from "./pages/seller/SellerCheckout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* ========== PUBLIC ROUTES (B2C) ========== */}
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<Index />} />
            <Route path="/tienda/:sellerId" element={<StorePage />} />
            <Route path="/producto/:sku" element={<ProductPage />} />
            
            {/* Seller Registration Landing Page */}
            <Route path="/registro-vendedor" element={<SellerRegistrationPage />} />
            
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
            
            {/* ========== 404 CATCH-ALL ========== */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
