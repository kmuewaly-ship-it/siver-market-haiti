import { useState } from 'react';
import { 
  useMarketplaceSectionSettings, 
  useUpdateSectionSetting,
  MarketplaceSectionSetting 
} from '@/hooks/useMarketplaceSectionSettings';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  LayoutGrid, 
  List, 
  Columns3, 
  Save, 
  Eye, 
  EyeOff,
  GripVertical,
  Settings2,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Tag,
  Store,
  Lightbulb,
  Image
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const sectionIcons: Record<string, React.ReactNode> = {
  featured_products: <Sparkles className="w-5 h-5" />,
  best_sellers: <TrendingUp className="w-5 h-5" />,
  new_arrivals: <ShoppingBag className="w-5 h-5" />,
  deals: <Tag className="w-5 h-5" />,
  top_stores: <Store className="w-5 h-5" />,
  recommended_products: <Lightbulb className="w-5 h-5" />,
  banners: <Image className="w-5 h-5" />,
};

const displayModeIcons: Record<string, React.ReactNode> = {
  carousel: <Columns3 className="w-4 h-4" />,
  grid: <LayoutGrid className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
};

const AdminMarketplaceSections = () => {
  const { data: sections, isLoading, error } = useMarketplaceSectionSettings();
  const updateSection = useUpdateSectionSetting();
  const [editingSection, setEditingSection] = useState<MarketplaceSectionSetting | null>(null);
  const [formData, setFormData] = useState<Partial<MarketplaceSectionSetting>>({});

  const handleToggleEnabled = async (section: MarketplaceSectionSetting) => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        updates: { is_enabled: !section.is_enabled }
      });
      toast.success(`Sección "${section.title}" ${section.is_enabled ? 'desactivada' : 'activada'}`);
    } catch {
      toast.error('Error al actualizar la sección');
    }
  };

  const handleEditSection = (section: MarketplaceSectionSetting) => {
    setEditingSection(section);
    setFormData({
      title: section.title,
      description: section.description || '',
      item_limit: section.item_limit,
      display_mode: section.display_mode,
      target_audience: section.target_audience,
      sort_order: section.sort_order,
    });
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    try {
      await updateSection.mutateAsync({
        id: editingSection.id,
        updates: formData
      });
      toast.success('Sección actualizada correctamente');
      setEditingSection(null);
    } catch {
      toast.error('Error al guardar los cambios');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Secciones del Marketplace" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Secciones del Marketplace" subtitle="Error">
        <div className="text-center py-12">
          <p className="text-destructive">Error al cargar las secciones</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Secciones del Marketplace" 
      subtitle="Configura las secciones que aparecen en la página principal y el marketplace"
    >
      <div className="space-y-6 p-4 md:p-6">

        <div className="grid gap-4">
          {sections?.map((section) => (
            <Card key={section.id} className={`transition-opacity ${!section.is_enabled ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {sectionIcons[section.section_key] || <Settings2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {section.title}
                        {!section.is_enabled && (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Oculto
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {section.description || `Sección: ${section.section_key}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(section)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditSection(section)}
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Configurar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Límite:</span>
                    <Badge variant="outline">{section.item_limit} items</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Modo:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {displayModeIcons[section.display_mode]}
                      {section.display_mode === 'carousel' ? 'Carrusel' : 
                       section.display_mode === 'grid' ? 'Cuadrícula' : 'Lista'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Audiencia:</span>
                    <Badge variant="outline">
                      {section.target_audience === 'all' ? 'Todos' : 
                       section.target_audience === 'b2b' ? 'B2B' : 'B2C'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Orden:</span>
                    <Badge variant="outline">{section.sort_order}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingSection && sectionIcons[editingSection.section_key]}
                Configurar Sección
              </DialogTitle>
              <DialogDescription>
                Personaliza cómo se muestra esta sección en el marketplace
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título de la sección"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción breve de la sección"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_limit">Cantidad de items</Label>
                  <Input
                    id="item_limit"
                    type="number"
                    min={1}
                    max={50}
                    value={formData.item_limit || 10}
                    onChange={(e) => setFormData({ ...formData, item_limit: parseInt(e.target.value) || 10 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Orden de aparición</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min={0}
                    value={formData.sort_order || 0}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modo de visualización</Label>
                  <Select
                    value={formData.display_mode || 'carousel'}
                    onValueChange={(value) => setFormData({ ...formData, display_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <Columns3 className="w-4 h-4" />
                          Carrusel
                        </div>
                      </SelectItem>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" />
                          Cuadrícula
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="w-4 h-4" />
                          Lista
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Audiencia</Label>
                  <Select
                    value={formData.target_audience || 'all'}
                    onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="b2b">Solo B2B (Vendedores)</SelectItem>
                      <SelectItem value="b2c">Solo B2C (Clientes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSection} disabled={updateSection.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {updateSection.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketplaceSections;
