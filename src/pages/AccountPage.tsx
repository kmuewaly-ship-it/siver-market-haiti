import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, Mail, Calendar, Package, MapPin, LogOut, Settings, Shield, CreditCard, Bell, Edit
} from "lucide-react";
import { Link } from "react-router-dom";
import { UserRole } from "@/types/auth";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const AccountPage = () => {
  const { user, signOut, role } = useAuth();
  const isMobile = useIsMobile();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isMobile && <Header />}
        <main className={`flex-1 container mx-auto px-4 flex items-center justify-center ${isMobile ? 'pb-20' : 'pb-8'}`}>
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-[#071d7f]">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-muted-foreground">
                Por favor inicia sesión para ver tu perfil.
              </p>
              <Link to="/login">
                <Button className="w-full bg-[#071d7f] hover:bg-[#0a2a9f]">Ir al Login</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  const Content = () => (
    <div className={`min-h-screen bg-gray-50/50 flex flex-col font-sans ${isMobile ? 'pb-14' : ''}`}>
      {!isMobile && <Header />}
      
      {/* Modern Hero Section */}
      <div className="relative h-64 w-full overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#071d7f] via-[#0a2a9f] to-[#051560]" />
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl" />

          <div className="container mx-auto px-6 h-full flex items-end pb-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
                  <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                      <Avatar className="h-32 w-32 border-4 border-white shadow-2xl relative">
                          <AvatarFallback className="text-4xl font-bold bg-white text-[#071d7f]">
                              {user?.name?.substring(0, 2).toUpperCase() || "US"}
                          </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-2 right-2 h-6 w-6 bg-green-500 border-4 border-white rounded-full" title="Online"></div>
                  </div>
                  
                  <div className="mb-2 text-white flex-1">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
                                  {user?.name || "Mi Cuenta"}
                              </h1>
                              <p className="text-blue-100/80 flex items-center gap-2 mt-2 text-lg">
                                  <Mail className="h-4 w-4" />
                                  {user?.email}
                              </p>
                          </div>
                          
                          <div className="flex gap-3">
                              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar Perfil
                              </Button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="grid gap-8 md:grid-cols-12">
            
            {/* Left Column: User Info */}
            <div className="md:col-span-4 lg:col-span-3 space-y-6">
                <Card className="shadow-lg border-none overflow-hidden sticky top-28 group hover:shadow-xl transition-all duration-300">
                  <CardHeader className="bg-white border-b">
                    <CardTitle className="text-[#071d7f] flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm group/item p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-[#071d7f] rounded-full">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Nombre Completo</p>
                                <p className="font-medium text-gray-700">{user.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm group/item p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-[#071d7f] rounded-full">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="font-medium text-gray-700">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm group/item p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-[#071d7f] rounded-full">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Miembro desde</p>
                                <p className="font-medium text-gray-700">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

            {/* Right Column: Actions */}
            <div className="md:col-span-8 lg:col-span-9 space-y-8">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <button className="flex flex-col items-start p-6 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                        <div className="p-3 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-4 shadow-sm">
                            <Package className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#071d7f] transition-colors">Mis Pedidos</h4>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Rastrea tus compras y ver historial.
                        </p>
                    </button>

                    <button className="flex flex-col items-start p-6 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                        <div className="p-3 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-4 shadow-sm">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#071d7f] transition-colors">Direcciones</h4>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Gestiona tus direcciones de envío.
                        </p>
                    </button>

                    <button className="flex flex-col items-start p-6 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                        <div className="p-3 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-4 shadow-sm">
                            <Settings className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#071d7f] transition-colors">Configuración</h4>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Preferencias de cuenta y seguridad.
                        </p>
                    </button>

                    <button 
                        onClick={signOut}
                        className="flex flex-col items-start p-6 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-red-100 transition-all duration-300 group text-left md:col-span-2 lg:col-span-3 bg-gradient-to-r hover:from-red-50 hover:to-white"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className="p-3 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-sm">
                                <LogOut className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-gray-900 group-hover:text-red-700 transition-colors">Cerrar Sesión</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                    Finalizar tu sesión actual.
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </main>
      {!isMobile && <Footer />}
    </div>
  );

  if (role === UserRole.SELLER) {
    return (
      <SellerLayout>
        <Content />
      </SellerLayout>
    );
  }

  return <Content />;
};

export default AccountPage;
