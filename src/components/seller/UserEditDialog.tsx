import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2, Upload, AlertCircle, ShieldCheck, ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserEditDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    banner_url?: string | null;
  } | null;
  isVerified?: boolean;
}

export function UserEditDialog({ user, isVerified = false }: UserEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "banner",
    setLoading: (val: boolean) => void,
    setUrl: (url: string) => void
  ) => {
    if (!user?.id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona una imagen válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB for avatar, 5MB for banner)
    const maxSize = type === "avatar" ? 2 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "Error",
        description: `La imagen no puede ser mayor a ${maxSize}MB.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      toast({
        title: "Imagen subida",
        description: "Recuerda guardar los cambios.",
      });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file, "avatar", setIsUploadingAvatar, setAvatarUrl);
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file, "banner", setIsUploadingBanner, setBannerUrl);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Update user metadata in Supabase Auth
      const updateData: { full_name?: string; avatar_url?: string; banner_url?: string } = {};
      
      // Only update name if not verified
      if (!isVerified) {
        updateData.full_name = name;
      }
      
      // Avatar and banner can always be updated
      if (avatarUrl !== user?.avatar_url) {
        updateData.avatar_url = avatarUrl;
      }
      if (bannerUrl !== user?.banner_url) {
        updateData.banner_url = bannerUrl;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: updateData
      });

      if (authError) throw authError;

      // Also update the profiles table
      const profileUpdate: { full_name?: string; avatar_url?: string; banner_url?: string } = {};
      if (!isVerified) {
        profileUpdate.full_name = name;
      }
      if (avatarUrl !== user?.avatar_url) {
        profileUpdate.avatar_url = avatarUrl;
      }
      if (bannerUrl !== user?.banner_url) {
        profileUpdate.banner_url = bannerUrl;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      toast({
        title: "Perfil actualizado",
        description: "Tu información personal ha sido guardada.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      window.location.reload(); 
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[#071d7f] border-blue-200 hover:bg-blue-50">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#071d7f]">Editar Información Personal</DialogTitle>
        </DialogHeader>
        
        {isVerified && (
          <Alert className="bg-amber-50 border-amber-200">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Tu cuenta está verificada. Solo puedes cambiar tu foto de perfil y banner. Para modificar otros datos, contacta a soporte.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 py-4">
          {/* Banner Upload Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Banner de Perfil</Label>
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
              {bannerUrl ? (
                <>
                  <img 
                    src={bannerUrl} 
                    alt="Banner" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setBannerUrl("")}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-sm">Sin banner</span>
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="w-full text-[#071d7f] border-blue-200 hover:bg-blue-50"
            >
              {isUploadingBanner ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {bannerUrl ? "Cambiar Banner" : "Subir Banner"}
            </Button>
            <p className="text-xs text-gray-500">Recomendado: 1200x300px. Máximo 5MB.</p>
          </div>

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <Label className="text-sm font-semibold self-start">Foto de Perfil</Label>
            <Avatar className="h-24 w-24 border-4 border-blue-100">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="bg-blue-50 text-[#071d7f] text-2xl">
                {name?.substring(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="text-[#071d7f] border-blue-200 hover:bg-blue-50"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Cambiar Foto
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userName">Nombre Completo</Label>
            <Input
              id="userName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isVerified}
              className={isVerified ? "bg-gray-100 cursor-not-allowed" : ""}
              placeholder="Tu nombre completo"
            />
            {isVerified && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Campo bloqueado por verificación
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userEmail">Email</Label>
            <Input
              id="userEmail"
              value={user?.email || ""}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">
              El email no se puede cambiar directamente.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-[#071d7f] hover:bg-[#051560]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
