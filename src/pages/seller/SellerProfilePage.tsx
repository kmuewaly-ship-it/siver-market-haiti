import { UserEditDialog } from "@/components/seller/UserEditDialog";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useAuth } from "@/hooks/useAuth";
import { useStoreByOwner } from "@/hooks/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  User, MapPin, Calendar, Shield, Mail, Phone, 
  CheckCircle, Edit, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SellerProfilePage = () => {
  const { user } = useAuth();
  const { data: store } = useStoreByOwner(user?.id);
  const navigate = useNavigate();

  // Helper for semi-complete name
  const getSemiCompleteName = (fullName: string) => {
    if (!fullName) return "";
    const parts = fullName.split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gray-50/50 pb-12 w-full font-sans">
        {/* Hero Section */}
        <div className="relative h-64 w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#071d7f] via-[#0a2a9f] to-[#051560]" />
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
            
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl" />

            <div className="container mx-auto px-6 h-full flex items-end pb-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full blur opacity-30"></div>
                        <Avatar className="h-32 w-32 border-4 border-white shadow-2xl relative">
                            <AvatarFallback className="text-4xl font-bold bg-white text-[#071d7f]">
                                {user?.name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    
                    <div className="mb-2 text-white flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
                                    {user?.name}
                                </h1>
                                <p className="text-blue-100/80 flex items-center gap-2 mt-2 text-lg">
                                    <Mail className="h-4 w-4" />
                                    {user?.email}
                                </p>
                            </div>
                            
                            <Button 
                                onClick={() => navigate(-1)}
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="container mx-auto px-6 mt-8">
            <div className="grid gap-8 md:grid-cols-12">
                {/* Left Column: Quick Info */}
                <div className="md:col-span-4 lg:col-span-3 space-y-6">
                    <Card className="shadow-lg border-none overflow-hidden sticky top-28">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="text-lg font-bold text-gray-900">Estado de Cuenta</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 font-medium">Estado</span>
                                <Badge className="bg-green-500 hover:bg-green-600">
                                    Activo
                                </Badge>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-[#071d7f] rounded-lg">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Fecha de Creación</p>
                                        <p className="font-medium text-gray-900">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-[#071d7f] rounded-lg">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Rol</p>
                                        <p className="font-medium text-gray-900 capitalize">
                                            {user?.role || "Vendedor"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Detailed Info */}
                <div className="md:col-span-8 lg:col-span-9 space-y-6">
                    <Card className="shadow-lg border-none overflow-hidden">
                        <CardHeader className="border-b bg-white px-8 py-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold text-[#071d7f] flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información Personal
                                </CardTitle>
                                <UserEditDialog user={user} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nombre Completo</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 font-medium">
                                        {user?.name}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nombre Semi-Completo</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 font-medium">
                                        {getSemiCompleteName(user?.name || "")}
                                    </div>
                                    <p className="text-xs text-gray-400">Visible para compradores antes de la compra.</p>
                                </div>
                                
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dirección</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-gray-400" />
                                        <span className="font-medium">{(store as any)?.address || "Dirección no configurada"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-none overflow-hidden">
                        <CardHeader className="border-b bg-white px-8 py-6">
                            <CardTitle className="text-xl font-bold text-[#071d7f] flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Información de Contacto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Email Principal</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                        <span className="font-medium">{user?.email}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Teléfono</label>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-900 flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                        <span className="font-medium">{(store as any)?.phone || "No configurado"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </div>
    </SellerLayout>
  );
};

export default SellerProfilePage;
