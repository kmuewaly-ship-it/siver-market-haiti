import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2, Upload, X, Store, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface StoreEditDialogProps {
  store: {
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
  } | null;
}

export function StoreEditDialog({ store }: StoreEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [name, setName] = useState(store?.name || "");
  const [description, setDescription] = useState(store?.description || "");
  const [logo, setLogo] = useState(store?.logo || "");
  const [banner, setBanner] = useState(store?.banner || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    file: File,
    type: "logo" | "banner"
  ): Promise<string | null> => {
    const setUploading = type === "logo" ? setIsUploadingLogo : setIsUploadingBanner;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${store?.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Error al subir imagen",
        description: `No se pudo subir la imagen de ${type === "logo" ? "perfil" : "portada"}.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file, "logo");
    if (url) setLogo(url);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file, "banner");
    if (url) setBanner(url);
  };

  const handleSave = async () => {
    if (!store?.id) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ 
          name, 
          description,
          logo,
          banner,
          updated_at: new Date().toISOString()
        })
        .eq("id", store.id);

      if (error) throw error;

      toast({
        title: "Tienda actualizada",
        description: "Los detalles de tu tienda han sido guardados.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["store"] });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating store:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tienda. Inténtalo de nuevo.",
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#071d7f]">Editar Información de la Tienda</DialogTitle>
        </DialogHeader>
        
        {/* Preview Section */}
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Vista Previa</p>
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            {/* Mini Banner Preview */}
            <div className="relative h-20 bg-gradient-to-r from-blue-900 to-blue-600">
              {banner && (
                <img src={banner} alt="Banner preview" className="w-full h-full object-cover" />
              )}
            </div>
            {/* Mini Profile Card Preview */}
            <div className="px-4 pb-4 -mt-6">
              <div className="flex items-end gap-3">
                <div className="w-14 h-14 rounded-lg border-2 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                  {logo ? (
                    <img src={logo} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-gray-300">
                      {name.substring(0, 2).toUpperCase() || "TI"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <h3 className="font-bold text-gray-900 truncate text-sm">
                    {name || "Nombre de la tienda"}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1">
                    {description || "Descripción de la tienda..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 py-4">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Foto de Perfil (Logo)
            </Label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center group">
                {logo ? (
                  <>
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLogo("")}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-gray-400 text-center">
                    <Store className="h-8 w-8 mx-auto mb-1" />
                    <span className="text-xs">Sin logo</span>
                  </div>
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Logo
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: 200x200px, formato JPG o PNG
                </p>
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Imagen de Portada (Banner)
            </Label>
            <div className="relative w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center group">
              {banner ? (
                <>
                  <img src={banner} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBanner("")}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="text-gray-400 text-center">
                  <Image className="h-8 w-8 mx-auto mb-1" />
                  <span className="text-xs">Sin imagen de portada</span>
                </div>
              )}
              {isUploadingBanner && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Portada
              </Button>
              <p className="text-xs text-gray-500">
                Recomendado: 1200x400px
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-right">
              Nombre Comercial
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Nombre de tu tienda"
            />
            <p className="text-xs text-gray-500">
              Este es el nombre que verán tus clientes.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-right">
              Descripción Pública
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3 min-h-[120px]"
              placeholder="Describe tu negocio, productos y servicios..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isUploadingLogo || isUploadingBanner} 
            className="bg-[#071d7f] hover:bg-[#051560]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
