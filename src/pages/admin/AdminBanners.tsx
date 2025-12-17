import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminBanners, AdminBanner } from "@/hooks/useAdminBanners";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  Smartphone,
  Save
} from "lucide-react";

const TARGET_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "sellers", label: "Solo vendedores" },
  { value: "public", label: "Solo público" },
];

const AdminBanners = () => {
  const { banners, loading, createBanner, updateBanner, deleteBanner, uploadBannerImage } = useAdminBanners();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // B2B Hero Config State
  const [b2bFeaturedIds, setB2bFeaturedIds] = useState("");

  useEffect(() => {
    const savedIds = localStorage.getItem("admin_b2b_featured_ids");
    if (savedIds) setB2bFeaturedIds(savedIds);
  }, []);

  const handleSaveB2B = () => {
    localStorage.setItem("admin_b2b_featured_ids", b2bFeaturedIds);
    toast({
      title: "Configuración guardada",
      description: "Los productos destacados del Hero B2B han sido actualizados.",
    });
  };

  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    target_audience: "all",
    is_active: true,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      image_url: "",
      link_url: "",
      target_audience: "all",
      is_active: true,
      sort_order: 0,
    });
    setEditingBanner(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: AdminBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      target_audience: banner.target_audience,
      is_active: banner.is_active,
      sort_order: banner.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es muy grande. Máximo 5MB.");
      return;
    }

    setUploading(true);
    const url = await uploadBannerImage(file);
    if (url) {
      setFormData(prev => ({ ...prev, image_url: url }));
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.image_url) {
      alert("El título y la imagen son requeridos");
      return;
    }

    setSaving(true);
    try {
      const bannerData = {
        ...formData,
        starts_at: null,
        ends_at: null,
      };
      
      if (editingBanner) {
        await updateBanner(editingBanner.id, bannerData);
      } else {
        await createBanner(bannerData);
      }
      setIsDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner: AdminBanner) => {
    await updateBanner(banner.id, { is_active: !banner.is_active });
  };

  if (loading) {
    return (
      <AdminLayout title="Banners Promocionales" subtitle="Gestiona los banners del panel de vendedores">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Banners Promocionales" subtitle="Gestiona los banners del panel de vendedores">
      <div className="space-y-8">
        {/* B2B Hero Configuration */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-orange-600" />
              <CardTitle>Carrusel de Productos Destacados B2B (Móvil)</CardTitle>
            </div>
            <CardDescription>
              Configura qué productos aparecen en el carrusel superior de la versión móvil de "Comprar Lotes".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="b2b_ids">IDs de Productos (separados por coma)</Label>
                <Textarea
                  id="b2b_ids"
                  placeholder="Ej: 1, 2, 5"
                  value={b2bFeaturedIds}
                  onChange={(e) => setB2bFeaturedIds(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa los IDs de los productos que deseas destacar. Estos aparecerán en el slider horizontal en móviles.
                </p>
              </div>
              <Button onClick={handleSaveB2B} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración B2B
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Banners Generales</h2>
            <p className="text-muted-foreground mt-1">
              Banners de imagen para la plataforma
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Banner
          </Button>
        </div>

        {/* Banners Grid */}
        {banners.length === 0 ? (
          <Card className="p-12 text-center">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No hay banners</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Crea tu primer banner promocional
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Banner
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banners.map((banner) => (
              <Card key={banner.id} className={`overflow-hidden ${!banner.is_active ? 'opacity-60' : ''}`}>
                <div className="aspect-[16/6] relative bg-muted overflow-hidden">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant={banner.is_active ? "default" : "secondary"}>
                      {banner.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline" className="bg-background/80">
                      {TARGET_OPTIONS.find(t => t.value === banner.target_audience)?.label}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{banner.title}</h3>
                      {banner.link_url && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
                          <LinkIcon className="h-3 w-3" />
                          {banner.link_url}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(banner)}
                        title={banner.is_active ? "Desactivar" : "Activar"}
                      >
                        {banner.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(banner)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar banner?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBanner(banner.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Editar Banner" : "Nuevo Banner"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagen del banner</Label>
                {formData.image_url ? (
                  <div className="relative aspect-[16/6] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar"}
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[16/6] rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click para subir imagen</p>
                        <p className="text-xs text-muted-foreground/70">Recomendado: 1920x480px</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Nombre del banner"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Link URL */}
              <div className="space-y-2">
                <Label htmlFor="link_url">URL de destino (opcional)</Label>
                <Input
                  id="link_url"
                  placeholder="https://..."
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label>Audiencia objetivo</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label htmlFor="sort_order">Orden de aparición</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Banner activo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.title || !formData.image_url}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingBanner ? "Guardar cambios" : "Crear banner"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBanners;
