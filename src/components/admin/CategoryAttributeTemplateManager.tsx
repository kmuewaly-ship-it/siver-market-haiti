import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  useCategoryAttributeTemplates, 
  useCreateCategoryTemplate, 
  useUpdateCategoryTemplate,
  useDeleteCategoryTemplate,
  CategoryAttributeTemplate 
} from '@/hooks/useCategoryAttributeTemplates';
import { useCatalog } from '@/hooks/useCatalog';
import { 
  Plus, Trash2, Edit2, Palette, Ruler, Zap, Package,
  CheckCircle2, Loader2, Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateFormData {
  category_id: string;
  attribute_name: string;
  attribute_display_name: string;
  attribute_type: string;
  render_type: string;
  suggested_values: string[];
  is_required: boolean;
  sort_order: number;
}

const DEFAULT_FORM_DATA: TemplateFormData = {
  category_id: '',
  attribute_name: '',
  attribute_display_name: '',
  attribute_type: 'text',
  render_type: 'chips',
  suggested_values: [],
  is_required: false,
  sort_order: 0,
};

const ATTRIBUTE_TYPES = [
  { value: 'color', label: 'Color', icon: Palette, description: 'Para colores con swatches visuales' },
  { value: 'size', label: 'Talla', icon: Ruler, description: 'Para tallas de ropa o zapatos' },
  { value: 'technical', label: 'Técnico', icon: Zap, description: 'Para especificaciones técnicas' },
  { value: 'select', label: 'Selección', icon: Package, description: 'Para opciones genéricas' },
  { value: 'text', label: 'Texto', icon: Settings2, description: 'Para valores libres' },
];

const RENDER_TYPES = [
  { value: 'swatches', label: 'Swatches (Colores)' },
  { value: 'chips', label: 'Chips (Botones)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'buttons', label: 'Botones' },
];

const getAttributeIcon = (type: string) => {
  const config = ATTRIBUTE_TYPES.find(t => t.value === type);
  const Icon = config?.icon || Package;
  return <Icon className="h-4 w-4" />;
};

const CategoryAttributeTemplateManager = () => {
  const { data: templates, isLoading } = useCategoryAttributeTemplates();
  const { useCategories } = useCatalog();
  const { data: categories } = useCategories();
  const createTemplate = useCreateCategoryTemplate();
  const updateTemplate = useUpdateCategoryTemplate();
  const deleteTemplate = useDeleteCategoryTemplate();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CategoryAttributeTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM_DATA);
  const [suggestedValuesInput, setSuggestedValuesInput] = useState('');

  // Filter templates by selected category
  const filteredTemplates = templates?.filter(t => 
    selectedCategoryId === 'all' || t.category_id === selectedCategoryId
  ) || [];

  // Group templates by category
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const catId = template.category_id;
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(template);
    return acc;
  }, {} as Record<string, typeof filteredTemplates>);

  const openCreateDialog = (categoryId?: string) => {
    setEditingTemplate(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      category_id: categoryId || '',
    });
    setSuggestedValuesInput('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: CategoryAttributeTemplate) => {
    setEditingTemplate(template);
    setFormData({
      category_id: template.category_id,
      attribute_name: template.attribute_name,
      attribute_display_name: template.attribute_display_name,
      attribute_type: template.attribute_type,
      render_type: template.render_type,
      suggested_values: template.suggested_values || [],
      is_required: template.is_required,
      sort_order: template.sort_order,
    });
    setSuggestedValuesInput((template.suggested_values || []).join(', '));
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Parse suggested values from comma-separated input
    const values = suggestedValuesInput
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    const payload = {
      ...formData,
      suggested_values: values,
      attribute_name: formData.attribute_name.toLowerCase().replace(/\s+/g, '_'),
    };

    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        updates: payload,
      });
    } else {
      await createTemplate.mutateAsync(payload);
    }

    setIsDialogOpen(false);
    setFormData(DEFAULT_FORM_DATA);
    setSuggestedValuesInput('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla de atributo?')) return;
    await deleteTemplate.mutateAsync(id);
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories?.find(c => c.id === categoryId);
    return cat?.name || 'Categoría desconocida';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plantillas de Atributos</h2>
          <p className="text-muted-foreground">
            Define atributos predefinidos para cada categoría de productos
          </p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Label>Filtrar por categoría:</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">
              {filteredTemplates.length} plantillas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([categoryId, categoryTemplates]) => (
            <Card key={categoryId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{getCategoryName(categoryId)}</CardTitle>
                    <CardDescription>{categoryTemplates.length} atributos definidos</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openCreateDialog(categoryId)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryTemplates.sort((a, b) => a.sort_order - b.sort_order).map(template => (
                    <div 
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          template.attribute_type === 'color' && 'bg-pink-100 dark:bg-pink-900/30',
                          template.attribute_type === 'size' && 'bg-blue-100 dark:bg-blue-900/30',
                          template.attribute_type === 'technical' && 'bg-yellow-100 dark:bg-yellow-900/30',
                          !['color', 'size', 'technical'].includes(template.attribute_type) && 'bg-muted'
                        )}>
                          {getAttributeIcon(template.attribute_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.attribute_display_name}</span>
                            {template.is_required && (
                              <Badge variant="destructive" className="text-[10px]">Requerido</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">{template.render_type}</Badge>
                          </div>
                          {template.suggested_values && template.suggested_values.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.suggested_values.slice(0, 5).map(val => (
                                <Badge key={val} variant="secondary" className="text-[10px]">{val}</Badge>
                              ))}
                              {template.suggested_values.length > 5 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{template.suggested_values.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(template.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(groupedTemplates).length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No hay plantillas configuradas</h3>
                <p className="text-sm mb-4">
                  Las plantillas de atributos ayudan a estandarizar los atributos de productos por categoría.
                </p>
                <Button onClick={() => openCreateDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Plantilla
                </Button>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Atributo'}
            </DialogTitle>
            <DialogDescription>
              Define un atributo predefinido para una categoría de productos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label>Nombre del Atributo *</Label>
              <Input
                value={formData.attribute_display_name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  attribute_display_name: e.target.value,
                  attribute_name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                }))}
                placeholder="Ej: Color, Talla, Voltaje..."
              />
            </div>

            {/* Attribute Type */}
            <div className="space-y-2">
              <Label>Tipo de Atributo</Label>
              <Select 
                value={formData.attribute_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, attribute_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTRIBUTE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Render Type */}
            <div className="space-y-2">
              <Label>Tipo de Visualización</Label>
              <Select 
                value={formData.render_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, render_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENDER_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Suggested Values */}
            <div className="space-y-2">
              <Label>Valores Sugeridos (separados por coma)</Label>
              <Input
                value={suggestedValuesInput}
                onChange={(e) => setSuggestedValuesInput(e.target.value)}
                placeholder="Rojo, Azul, Verde, Negro, Blanco..."
              />
              <p className="text-xs text-muted-foreground">
                Estos valores aparecerán como sugerencias durante la importación
              </p>
            </div>

            {/* Is Required & Sort Order */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                />
                <Label>Atributo requerido</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Orden:</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-20 h-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.category_id || !formData.attribute_display_name || createTemplate.isPending || updateTemplate.isPending}
            >
              {(createTemplate.isPending || updateTemplate.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryAttributeTemplateManager;
