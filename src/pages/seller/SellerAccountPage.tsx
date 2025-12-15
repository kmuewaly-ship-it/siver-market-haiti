import { StoreEditDialog } from "@/components/seller/StoreEditDialog";
import { UserEditDialog } from "@/components/seller/UserEditDialog";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useAuth } from "@/hooks/useAuth";
import { useStoreByOwner } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Store, Mail, Calendar, Shield, LogOut,
  Settings, CreditCard, Bell, Globe, Edit, MapPin, Phone, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const SellerAccountPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: store, isLoading } = useStoreByOwner(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  // Fetch seller verification status
  const { data: seller } = useQuery({
    queryKey: ["seller", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("sellers")
        .select("is_verified")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching seller:", error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const isVerified = seller?.is_verified || false;

  useEffect(() => {
    console.log("SellerAccountPage - User:", user);
    console.log("SellerAccountPage - Store:", store);
    console.log("SellerAccountPage - IsLoading:", isLoading);
  }, [user, store, isLoading]);

  const handleViewStore = () => {
    console.log("Store data:", store);
    if (store?.id) {
      navigate(`/tienda/${store.id}`);
    } else {
      toast({
        title: "Error",
        description: "No se encontró la información de la tienda. Por favor contacta a soporte.",
        variant: "destructive",
      });
    }
  };

  const handleCreateStore = async () => {
    if (!user) return;
    setIsCreatingStore(true);
    try {
        const slug = (user.name || "tienda")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") + "-" + Math.floor(Math.random() * 1000);

        const { error } = await supabase.from("stores").insert({
            owner_user_id: user.id,
            name: user.name || "Mi Tienda",
            slug: slug,
            is_active: true
        });
        
        if (error) throw error;
        
        toast({ title: "Tienda creada", description: "Tu tienda ha sido inicializada correctamente." });
        queryClient.invalidateQueries({ queryKey: ["store"] });
        // Force reload to ensure everything is fresh
        window.location.reload();
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "No se pudo crear la tienda", variant: "destructive" });
    } finally {
        setIsCreatingStore(false);
    }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="p-8 space-y-8 w-full animate-pulse">
          <div className="h-64 bg-gray-200 rounded-xl w-full" />
          <div className="grid gap-8 md:grid-cols-3">
            <div className="h-96 bg-gray-200 rounded-xl" />
            <div className="col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gray-50/50 pb-12 w-full font-sans">
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
                            <AvatarImage src={store?.logo || ""} alt={store?.name} className="object-cover" />
                            <AvatarFallback className="text-4xl font-bold bg-white text-[#071d7f]">
                                {store?.name?.substring(0, 2).toUpperCase() || user?.name?.substring(0, 2).toUpperCase() || "ST"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-2 right-2 h-6 w-6 bg-green-500 border-4 border-white rounded-full" title="Online"></div>
                    </div>

                    <div className="mb-2 text-white flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
                                        {store?.name || user?.name || "Mi Tienda"}
                                    </h1>
                                    {store?.is_active && (
                                        <Badge className="bg-green-500/20 text-green-100 hover:bg-green-500/30 border-green-500/50 backdrop-blur-sm">
                                            Verificado
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-blue-100/80 flex items-center gap-2 mt-2 text-lg">
                                    <MapPin className="h-4 w-4" />
                                    <span>
                                        {store?.city && store?.country 
                                          ? `${store.city}, ${store.country}` 
                                          : store?.country || "Ubicación no configurada"}
                                    </span>
                                </p>
                            </div>

                            <div className="flex gap-3">
                                {store?.id ? (
                                <Button
                                    onClick={handleViewStore}
                                    className="bg-[#94111f] hover:bg-[#7a0e19] text-white shadow-lg shadow-red-900/20 border-none"
                                >
                                    Ver Tienda
                                </Button>
                                ) : (
                                <Button
                                    onClick={handleCreateStore}
                                    disabled={isCreatingStore}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg border-none"
                                >
                                    {isCreatingStore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Activar Tienda
                                </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="container mx-auto px-6 mt-8">
          <div className="grid gap-8 md:grid-cols-12">

            {/* Left Column: User Profile (Sticky) */}
            <div className="md:col-span-4 lg:col-span-3 space-y-6">
                <Card className="shadow-lg border-none overflow-hidden sticky top-28 group hover:shadow-xl transition-all duration-300">
                  {/* User Banner */}
                  <div className="h-24 relative overflow-hidden">
                    {user?.banner_url ? (
                      <img 
                        src={user.banner_url} 
                        alt="Banner de perfil" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200" />
                    )}
                  </div>
                  <div className="px-6 -mt-12 flex justify-center">
                     <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                        {user?.avatar_url && (
                          <AvatarImage src={user.avatar_url} alt={user?.name || "Usuario"} />
                        )}
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xl">
                            {user?.name ? user.name.substring(0, 2).toUpperCase() : <User className="h-10 w-10" />}
                        </AvatarFallback>
                    </Avatar>
                  </div>

                  <CardContent className="pt-4 text-center space-y-6 pb-8">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">{user?.name || "Usuario"}</h3>
                        <p className="text-sm text-gray-500 font-medium">{user?.email}</p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Badge variant="secondary" className="px-4 py-1 bg-blue-50 text-[#071d7f] hover:bg-blue-100 transition-colors">
                              {user?.role || "Vendedor"}
                          </Badge>
                          {isVerified && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                              Verificado
                            </Badge>
                          )}
                        </div>
                    </div>

                    {/* Edit User Button */}
                    <UserEditDialog user={user} isVerified={isVerified} />

                    <Separator className="bg-gray-100" />

                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 text-sm group/item p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-[#071d7f] rounded-full">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Miembro desde</p>
                                <p className="font-medium text-gray-700">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm group/item p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-50 text-[#071d7f] rounded-full">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Estado de cuenta</p>
                                <p className="font-medium text-green-600">Activa y Segura</p>
                            </div>
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </div>

            {/* Right Column: Store Details & Settings */}
            <div className="md:col-span-8 lg:col-span-9 space-y-8">

                {/* Store Information Card */}
                <Card className="shadow-lg border-none overflow-hidden hover:shadow-xl transition-all duration-300">
                    <CardHeader className="border-b bg-white px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-[#071d7f] flex items-center gap-3">
                                    <Store className="h-6 w-6" />
                                    Información de la Tienda
                                </CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    Gestiona la información pública de tu negocio.
                                </CardDescription>
                            </div>
                            <StoreEditDialog store={store} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nombre Comercial</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 font-medium text-lg">
                                        {store?.name || "No configurado"}
                                    </div>
                                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Modificable una vez al año
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Estado Operativo</label>
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className={`h-3 w-3 rounded-full ${store?.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-yellow-500"}`} />
                                        <span className="font-medium text-gray-900">{store?.is_active ? "Tienda Activa" : "Tienda Inactiva"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Descripción Pública</label>
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 h-full min-h-[140px]">
                                    <p className="text-gray-700 leading-relaxed">
                                        {store?.description || "Sin descripción. Añade una descripción detallada para mejorar tu posicionamiento y atraer más clientes."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings & Actions Grid */}
                <div>
                    <h3 className="text-xl font-bold text-[#071d7f] mb-6 flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Panel de Control
                    </h3>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                        {/* Action Card 1 */}
                        <button className="flex flex-col items-start p-4 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                            <div className="p-2 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-3 shadow-sm">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-base text-gray-900 group-hover:text-[#071d7f] transition-colors">Métodos de Pago</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Gestiona tus tarjetas y cuentas.
                            </p>
                        </button>

                        {/* Action Card 2 */}
                        <button className="flex flex-col items-start p-4 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                            <div className="p-2 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-3 shadow-sm">
                                <Bell className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-base text-gray-900 group-hover:text-[#071d7f] transition-colors">Notificaciones</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Configura alertas de pedidos.
                            </p>
                        </button>

                        {/* Action Card 3 */}
                        <button className="flex flex-col items-start p-4 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-blue-100 transition-all duration-300 group text-left">
                            <div className="p-2 rounded-xl bg-blue-50 text-[#071d7f] group-hover:bg-[#071d7f] group-hover:text-white transition-colors mb-3 shadow-sm">
                                <Shield className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-base text-gray-900 group-hover:text-[#071d7f] transition-colors">Seguridad</h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Contraseña y accesos.
                            </p>
                        </button>

                        {/* Logout Card */}
                        <button
                            onClick={signOut}
                            className="flex flex-col items-start p-4 bg-white rounded-xl shadow-md hover:shadow-xl border border-transparent hover:border-red-100 transition-all duration-300 group text-left bg-gradient-to-r hover:from-red-50 hover:to-white"
                        >
                            <div className="flex flex-col items-start w-full">
                                <div className="p-2 rounded-xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-sm mb-3">
                                    <LogOut className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-gray-900 group-hover:text-red-700 transition-colors">Cerrar Sesión</h4>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Salir de tu cuenta.
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerAccountPage;
