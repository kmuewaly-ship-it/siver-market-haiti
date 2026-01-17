import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageWrapper } from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.user_metadata?.nombre || "",
        email: user.email || "",
        telefono: user.user_metadata?.telefono || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          nombre: formData.nombre,
          telefono: formData.telefono,
        },
      });

      if (error) throw error;

      await refreshUser();
      toast.success("Perfil actualizado correctamente");
      navigate("/perfil");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (!formData.nombre && !formData.email) return "U";
    const name = formData.nombre || formData.email || "";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/perfil")}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Editar Perfil</h1>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Avatar Section */}
          <div className="bg-white rounded-lg p-6 text-center">
            <Avatar className="w-24 h-24 mx-auto border-4 border-blue-100 mb-4">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => toast.info("Función en desarrollo")}
            >
              <Upload className="w-4 h-4" />
              Cambiar Foto
            </Button>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nombre Completo
              </label>
              <Input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="w-full bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">
                El email no se puede cambiar
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <Input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000"
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sticky bottom-0 bg-white p-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/perfil")}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default EditProfilePage;
