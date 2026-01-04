import { useState, useRef, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCatalog } from '@/hooks/useCatalog';
import { usePriceEngine } from '@/hooks/usePriceEngine';
import { useTemplatesForCategory, applyTemplateToImport } from '@/hooks/useCategoryAttributeTemplates';
import AttributeConfigCard, { AttributeConfig } from './AttributeConfigCard';
import { 
  groupProductsByParent, 
  importGroupedProducts,
  checkExistingSkus,
  type GroupedProduct,
  type RawImportRow,
} from '@/hooks/useSmartProductGrouper';
import { 
  Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, 
  Loader2, Calculator, Layers, Palette, Ruler, Zap, Package,
  ArrowRight, ChevronRight, AlertTriangle, Plus, Sparkles, X,
  ImageIcon, Table, Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HierarchicalCategorySelect from './HierarchicalCategorySelect';
import { cn } from '@/lib/utils';

interface SmartBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColumnMapping {
  sku_interno: string;
  nombre: string;
  descripcion_corta: string;
  costo_base: string;
  moq: string;
  stock_fisico: string;
  url_imagen: string;
  categoria: string;
  proveedor: string;
  url_origen: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  sku_interno: 'SKU_Interno',
  nombre: 'Nombre',
  descripcion_corta: 'Descripcion_Corta',
  costo_base: 'Costo_Base_Proveedor',
  moq: 'MOQ_Cantidad_Minima',
  stock_fisico: 'Stock_Fisico',
  url_imagen: 'URL_Imagen_Principal',
  categoria: 'Categoria',
  proveedor: 'Proveedor',
  url_origen: 'URL_Proveedor'
};

const STEPS = [
  { id: 'upload', label: 'Subir', icon: Upload },
  { id: 'mapping', label: 'Mapear', icon: Table },
  { id: 'attributes', label: 'Atributos', icon: Settings2 },
  { id: 'preview', label: 'Confirmar', icon: CheckCircle2 },
];

const SmartBulkImportDialog = ({ open, onOpenChange }: SmartBulkImportDialogProps) => {
  const { useCategories, useSuppliers } = useCatalog();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    usePriceSettings, 
    useDynamicExpenses, 
    getProfitMargin, 
    calculateB2BPrice 
  } = usePriceEngine();
  const { data: priceSettings } = usePriceSettings();
  const { data: expenses } = useDynamicExpenses();
  const profitMargin = getProfitMargin(priceSettings);
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'attributes' | 'preview' | 'importing'>('upload');
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [detectedAttributeColumns, setDetectedAttributeColumns] = useState<string[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [defaultSupplierId, setDefaultSupplierId] = useState<string>('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, message: '' });
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [duplicateSkus, setDuplicateSkus] = useState<string[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  
  // New: Dynamic attribute configuration
  const [attributeConfigs, setAttributeConfigs] = useState<AttributeConfig[]>([]);
  const [showTemplateHint, setShowTemplateHint] = useState(false);
  
  // Fetch category templates when category is selected
  const { data: categoryTemplates } = useTemplatesForCategory(defaultCategoryId);

  // Get available columns (not mapped to standard fields)
  const availableColumns = useMemo(() => {
    const mappedCols = Object.values(mapping);
    return headers.filter(h => !mappedCols.includes(h));
  }, [headers, mapping]);

  // Auto-apply templates when category changes
  useEffect(() => {
    if (categoryTemplates && categoryTemplates.length > 0 && headers.length > 0) {
      const suggestions = applyTemplateToImport(categoryTemplates, headers);
      const hasMatchingColumns = suggestions.some(s => s.suggestedColumn);
      
      if (hasMatchingColumns && attributeConfigs.length === 0) {
        setShowTemplateHint(true);
      }
    }
  }, [categoryTemplates, headers]);

  // Apply category template
  const applyTemplate = () => {
    if (!categoryTemplates) return;
    
    const suggestions = applyTemplateToImport(categoryTemplates, headers);
    const newConfigs: AttributeConfig[] = suggestions
      .filter(s => s.suggestedColumn)
      .map((s, i) => ({
        id: `template-${i}-${Date.now()}`,
        nameType: 'manual' as const,
        nameValue: s.displayName,
        valueColumn: s.suggestedColumn!,
        imageColumn: undefined,
      }));
    
    if (newConfigs.length > 0) {
      setAttributeConfigs(newConfigs);
      setShowTemplateHint(false);
      toast({ 
        title: `${newConfigs.length} atributos aplicados desde plantilla`,
        description: `Categoría: ${categories?.find(c => c.id === defaultCategoryId)?.name}`,
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'SKU_Interno,Nombre,Descripcion_Corta,Costo_Base_Proveedor,MOQ_Cantidad_Minima,Stock_Fisico,URL_Imagen_Principal,Categoria,Proveedor,URL_Proveedor,Color,Size',
      'SHIRT-001-RED-S,Camisa Casual Roja S,Camisa de algodón,15.00,10,50,https://example.com/red-s.jpg,Ropa,AliExpress,https://ali.com/123,Rojo,S',
      'SHIRT-001-RED-M,Camisa Casual Roja M,Camisa de algodón,15.00,10,45,https://example.com/red-m.jpg,Ropa,AliExpress,https://ali.com/123,Rojo,M',
      'SHIRT-001-BLUE-S,Camisa Casual Azul S,Camisa de algodón,15.00,10,40,https://example.com/blue-s.jpg,Ropa,AliExpress,https://ali.com/123,Azul,S',
      'LAMP-220V-100W,Lámpara LED 100W 220V,Lámpara industrial,8.00,5,100,https://example.com/lamp1.jpg,Electrónica,AliExpress,https://ali.com/456,N/A,N/A',
      'LAMP-110V-100W,Lámpara LED 100W 110V,Lámpara industrial,8.50,5,80,https://example.com/lamp2.jpg,Electrónica,AliExpress,https://ali.com/456,N/A,N/A',
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_importacion_inteligente.csv';
    link.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (parsed.length > 0) {
        setHeaders(parsed[0]);
        setRawData(parsed.slice(1));
        autoMapColumns(parsed[0]);
        setStep('mapping');
      }
    };
    reader.readAsText(file);
  };

  const autoMapColumns = (headerRow: string[]) => {
    const autoMapping = { ...DEFAULT_MAPPING };
    headerRow.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('sku') || lower.includes('codigo')) {
        autoMapping.sku_interno = header;
      } else if (lower.includes('nombre') || lower.includes('name') || lower.includes('title')) {
        autoMapping.nombre = header;
      } else if (lower.includes('desc')) {
        autoMapping.descripcion_corta = header;
      } else if (lower.includes('costo') || lower.includes('cost') || lower.includes('precio') || lower.includes('price')) {
        autoMapping.costo_base = header;
      } else if (lower.includes('moq') || lower.includes('minimo') || lower.includes('min')) {
        autoMapping.moq = header;
      } else if (lower.includes('stock') || lower.includes('cantidad') || lower.includes('qty')) {
        autoMapping.stock_fisico = header;
      } else if (lower.includes('imagen') || lower.includes('image') || lower.includes('foto')) {
        autoMapping.url_imagen = header;
      } else if (lower.includes('categ') || lower.includes('category')) {
        autoMapping.categoria = header;
      } else if (lower.includes('proveedor') || lower.includes('supplier') || lower.includes('vendor')) {
        autoMapping.proveedor = header;
      } else if (lower.includes('url_proveedor') || lower.includes('url_origen') || lower.includes('source_url') || lower.includes('link')) {
        autoMapping.url_origen = header;
      }
    });
    setMapping(autoMapping);
  };

  const processGrouping = async () => {
    // Convert raw data to rows with headers
    const rows: RawImportRow[] = rawData.map(row => {
      const obj: RawImportRow = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    const mappingRecord: Record<string, string> = { ...mapping };
    
    // Build attribute columns from configuration
    const configuredColumns = attributeConfigs
      .filter(c => c.valueColumn)
      .map(c => c.valueColumn);
    
    const { groups, detectedAttributeColumns: attrs } = groupProductsByParent(
      rows, 
      headers, 
      mappingRecord,
      configuredColumns.length > 0 ? configuredColumns : undefined
    );
    
    // Check for duplicate SKUs in database
    setIsCheckingDuplicates(true);
    try {
      const baseSkus = groups.map(g => g.baseSku);
      const existingCheck = await checkExistingSkus(baseSkus);
      
      // Mark groups that already exist and collect duplicate SKUs
      const duplicates: string[] = [];
      groups.forEach(group => {
        const check = existingCheck[group.baseSku];
        if (check?.exists) {
          group.existsInDb = true;
          group.existingProductId = check.productId;
          duplicates.push(group.baseSku);
        }
      });
      
      setDuplicateSkus(duplicates);
    } catch (err) {
      console.error('Error checking duplicates:', err);
    }
    setIsCheckingDuplicates(false);
    
    setGroupedProducts(groups);
    setDetectedAttributeColumns(attrs);
    setStep('preview');
  };

  const handleImport = async () => {
    if (groupedProducts.length === 0) {
      toast({ title: 'No hay productos para importar', variant: 'destructive' });
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: groupedProducts.length, message: 'Iniciando importación...' });

    const priceCalculator = (cost: number) => {
      const calc = calculateB2BPrice(cost, expenses, profitMargin);
      return calc.precioFinal;
    };

    const result = await importGroupedProducts(
      groupedProducts,
      defaultCategoryId || undefined,
      defaultSupplierId || undefined,
      priceCalculator,
      (current, total, message) => {
        setImportProgress({ current, total, message });
      }
    );

    setImportResult(result);
    
    if (result.success > 0) {
      toast({
        title: `Importación completada`,
        description: `${result.success} productos padre importados${result.failed > 0 ? `, ${result.failed} fallidos` : ''}`
      });
    }
  };

  const resetState = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setMapping(DEFAULT_MAPPING);
    setGroupedProducts([]);
    setDetectedAttributeColumns([]);
    setDefaultCategoryId('');
    setDefaultSupplierId('');
    setImportProgress({ current: 0, total: 0, message: '' });
    setImportResult(null);
    setDuplicateSkus([]);
    setIsCheckingDuplicates(false);
    setAttributeConfigs([]);
    setShowTemplateHint(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove duplicate products from import list
  const removeDuplicates = () => {
    setGroupedProducts(prev => prev.filter(g => !g.existsInDb));
    setDuplicateSkus([]);
  };

  const getAttributeIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('color') || lower.includes('colour')) return <Palette className="h-3 w-3" />;
    if (lower.includes('size') || lower.includes('talla')) return <Ruler className="h-3 w-3" />;
    if (lower.includes('volt') || lower.includes('watt') || lower.includes('power')) return <Zap className="h-3 w-3" />;
    return <Package className="h-3 w-3" />;
  };

  // Attribute config handlers
  const addAttributeConfig = (column?: string) => {
    const newConfig: AttributeConfig = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nameType: column ? 'column' : 'manual',
      nameValue: column || '',
      valueColumn: column || '',
      imageColumn: undefined,
    };
    setAttributeConfigs(prev => [...prev, newConfig]);
  };

  const updateAttributeConfig = (id: string, updates: Partial<AttributeConfig>) => {
    setAttributeConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const removeAttributeConfig = (id: string) => {
    setAttributeConfigs(prev => prev.filter(c => c.id !== id));
  };

  // Get columns not yet used in attribute configs
  const unusedColumns = useMemo(() => {
    const usedCols = new Set(attributeConfigs.map(c => c.valueColumn).filter(Boolean));
    return availableColumns.filter(col => !usedCols.has(col));
  }, [availableColumns, attributeConfigs]);

  const activeExpenses = expenses?.filter(e => e.is_active) || [];
  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Importación Inteligente de Productos
          </DialogTitle>
          <DialogDescription>
            Configura atributos dinámicos y agrupa variantes automáticamente
          </DialogDescription>
        </DialogHeader>

        {/* Enhanced Stepper */}
        <div className="flex items-center gap-1 border-b pb-4 mb-2">
          {STEPS.map((s, i) => {
            const isCompleted = currentStepIndex > i;
            const isCurrent = step === s.id || (step === 'importing' && s.id === 'preview');
            const StepIcon = s.icon;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  isCurrent && "bg-primary/10",
                  isCompleted && "text-green-600"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    isCurrent && "bg-primary text-primary-foreground",
                    isCompleted && "bg-green-500 text-white",
                    !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium hidden sm:block",
                    isCurrent && "text-primary",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className={cn(
                    "h-4 w-4 mx-1",
                    isCompleted ? "text-green-500" : "text-muted-foreground"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Motor de Precios Automático
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margen de Ganancia:</span>
                    <Badge variant="secondary">{profitMargin}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    ✨ Detecta automáticamente: Color, Talla, Voltaje, Material y más
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" 
                    onClick={() => fileInputRef.current?.click()}>
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Arrastra tu archivo CSV aquí</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        o haz clic para seleccionar • Formatos: CSV, XLSX
                      </p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla de Ejemplo
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  ¿Cómo funciona?
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Sube tu archivo CSV con productos y variantes</li>
                  <li>2. Mapea las columnas principales (SKU, Nombre, Precio)</li>
                  <li>3. Configura los atributos de variantes (Color, Talla, etc.)</li>
                  <li>4. El sistema agrupa automáticamente las variantes por producto padre</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6 py-4">
              {/* CSV Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Vista Previa del Archivo
                  </CardTitle>
                  <CardDescription>{rawData.length} filas • {headers.length} columnas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          {headers.map((h, i) => (
                            <th key={i} className="border px-2 py-1 text-left font-medium max-w-[120px] truncate">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 3).map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="border px-2 py-1 max-w-[120px] truncate text-muted-foreground">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rawData.length > 3 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      ... y {rawData.length - 3} filas más
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Column Mapping */}
              <Accordion type="single" collapsible defaultValue="required">
                <AccordionItem value="required">
                  <AccordionTrigger className="text-sm font-medium">
                    Campos Requeridos
                    <Badge variant="secondary" className="ml-2">4</Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {(['sku_interno', 'nombre', 'costo_base', 'stock_fisico'] as const).map((field) => (
                        <div key={field} className="space-y-2">
                          <Label className="capitalize text-xs flex items-center gap-2">
                            {field.replace(/_/g, ' ')}
                            {headers.includes(mapping[field]) && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </Label>
                          <Select
                            value={mapping[field]}
                            onValueChange={(v) => setMapping(m => ({ ...m, [field]: v }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- No mapear --</SelectItem>
                              {headers.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="optional">
                  <AccordionTrigger className="text-sm font-medium">
                    Campos Opcionales
                    <Badge variant="outline" className="ml-2">6</Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {(['descripcion_corta', 'moq', 'url_imagen', 'categoria', 'proveedor', 'url_origen'] as const).map((field) => (
                        <div key={field} className="space-y-2">
                          <Label className="capitalize text-xs">{field.replace(/_/g, ' ')}</Label>
                          <Select
                            value={mapping[field]}
                            onValueChange={(v) => setMapping(m => ({ ...m, [field]: v }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- No mapear --</SelectItem>
                              {headers.map((header) => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Default Category & Supplier */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categoría por defecto</Label>
                  <HierarchicalCategorySelect
                    categories={categories}
                    value={defaultCategoryId}
                    onValueChange={setDefaultCategoryId}
                    placeholder="Seleccionar categoría"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Proveedor por defecto</Label>
                  <Select value={defaultSupplierId} onValueChange={setDefaultSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
                <Button onClick={() => setStep('attributes')}>
                  Siguiente: Configurar Atributos
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Attribute Configuration (NEW) */}
          {step === 'attributes' && (
            <div className="space-y-6 py-4">
              {/* Template Hint */}
              {showTemplateHint && categoryTemplates && categoryTemplates.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Plantilla disponible</p>
                          <p className="text-xs text-muted-foreground">
                            {categoryTemplates.length} atributos predefinidos para esta categoría
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowTemplateHint(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={applyTemplate}>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Aplicar Plantilla
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Available Columns */}
              {unusedColumns.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Columnas Disponibles</CardTitle>
                    <CardDescription className="text-xs">
                      Haz clic en una columna para agregarla como atributo de variante
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {unusedColumns.map(col => (
                        <Badge 
                          key={col}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors gap-1.5 py-1.5 px-3"
                          onClick={() => addAttributeConfig(col)}
                        >
                          {getAttributeIcon(col)}
                          {col}
                          <Plus className="h-3 w-3 ml-1 text-primary" />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Configured Attributes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Atributos Configurados ({attributeConfigs.length})
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => addAttributeConfig()}
                    disabled={unusedColumns.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Atributo
                  </Button>
                </div>

                {attributeConfigs.length === 0 ? (
                  <Card className="p-8 text-center border-dashed">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      No hay atributos configurados. Haz clic en las columnas disponibles arriba 
                      o usa "Agregar Atributo" para crear uno.
                    </p>
                    {categoryTemplates && categoryTemplates.length > 0 && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="mt-4"
                        onClick={applyTemplate}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Usar Plantilla de Categoría
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {attributeConfigs.map((config, index) => (
                      <AttributeConfigCard
                        key={config.id}
                        config={config}
                        index={index}
                        availableColumns={[...unusedColumns, config.valueColumn].filter(Boolean)}
                        rawData={rawData}
                        headers={headers}
                        onUpdate={updateAttributeConfig}
                        onRemove={removeAttributeConfig}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('mapping')}>Atrás</Button>
                <Button onClick={processGrouping} disabled={isCheckingDuplicates}>
                  {isCheckingDuplicates && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Agrupar y Previsualizar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Preview & Confirm */}
          {step === 'preview' && (
            <div className="space-y-6 py-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-primary">{groupedProducts.length}</div>
                  <p className="text-sm text-muted-foreground">Productos Padre</p>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-primary">
                    {groupedProducts.reduce((sum, g) => sum + g.variants.length, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Variantes Totales</p>
                </Card>
                <Card className="text-center p-4">
                  <div className="text-3xl font-bold text-primary">{detectedAttributeColumns.length}</div>
                  <p className="text-sm text-muted-foreground">Atributos</p>
                </Card>
              </div>

              {/* Detected Attributes */}
              {detectedAttributeColumns.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Atributos Detectados</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {detectedAttributeColumns.map(col => (
                      <Badge key={col} className="gap-1">
                        {getAttributeIcon(col)}
                        {col}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Duplicate SKU Warning */}
              {duplicateSkus.length > 0 && (
                <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      {duplicateSkus.length} SKU(s) ya existen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {duplicateSkus.slice(0, 8).map(sku => (
                        <Badge key={sku} variant="outline" className="text-xs text-orange-700 border-orange-300">
                          {sku}
                        </Badge>
                      ))}
                      {duplicateSkus.length > 8 && (
                        <Badge variant="outline" className="text-xs">+{duplicateSkus.length - 8}</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={removeDuplicates}>
                      Ignorar duplicados
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Products Preview */}
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list">Lista</TabsTrigger>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                </TabsList>
                
                <TabsContent value="list" className="space-y-2 mt-4">
                  {groupedProducts.slice(0, 10).map((group, i) => (
                    <Card key={i} className={cn("p-3", group.existsInDb && "opacity-50")}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {group.variants[0]?.imageUrl && (
                            <img 
                              src={group.variants[0].imageUrl} 
                              alt=""
                              className="w-10 h-10 rounded object-cover border"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-medium truncate">{group.parentName}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>SKU: {group.baseSku}</span>
                              <span>•</span>
                              <span>{group.variants.length} variantes</span>
                              {group.existsInDb && (
                                <>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-[10px]">Duplicado</Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {group.detectedAttributes.slice(0, 3).map(attr => (
                            <Badge key={attr.columnName} variant="outline" className="text-[10px] gap-1">
                              {getAttributeIcon(attr.columnName)}
                              {attr.uniqueValues.size}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {groupedProducts.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... y {groupedProducts.length - 10} productos más
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="details" className="mt-4 space-y-4">
                  {groupedProducts.slice(0, 5).map((group, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{group.parentName}</CardTitle>
                        <CardDescription className="text-xs">
                          SKU: {group.baseSku} • {group.variants.length} variantes
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-xs space-y-3">
                        {/* Attributes */}
                        {group.detectedAttributes.map(attr => (
                          <div key={attr.columnName} className="flex items-center gap-2">
                            {getAttributeIcon(attr.columnName)}
                            <span className="font-medium">{attr.columnName}:</span>
                            <div className="flex gap-1 flex-wrap">
                              {Array.from(attr.uniqueValues).slice(0, 6).map(v => (
                                <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
                              ))}
                              {attr.uniqueValues.size > 6 && (
                                <Badge variant="outline" className="text-[10px]">+{attr.uniqueValues.size - 6}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Variant Images */}
                        {group.variants.some(v => v.imageUrl) && (
                          <div className="border-t pt-2">
                            <p className="text-muted-foreground mb-2 flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              Imágenes:
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {group.variants.slice(0, 6).map((variant, vi) => (
                                <div key={vi} className="relative group">
                                  {variant.imageUrl ? (
                                    <img 
                                      src={variant.imageUrl} 
                                      alt=""
                                      className="w-12 h-12 rounded object-cover border"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {group.variants.length > 6 && (
                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border text-xs">
                                  +{group.variants.length - 6}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep('attributes')}>Atrás</Button>
                <Button onClick={handleImport} size="lg">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Importar {groupedProducts.filter(g => !g.existsInDb).length} Productos
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <div className="space-y-6 py-8">
              {!importResult ? (
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <div>
                    <h3 className="font-medium">Importando productos...</h3>
                    <p className="text-sm text-muted-foreground mt-1">{importProgress.message}</p>
                  </div>
                  <Progress value={(importProgress.current / importProgress.total) * 100} className="max-w-md mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {importProgress.current} de {importProgress.total}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  {importResult.success > 0 ? (
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                  ) : (
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                  )}
                  
                  <div>
                    <h3 className="text-xl font-bold">Importación Completada</h3>
                    <p className="text-muted-foreground mt-1">
                      {importResult.success} productos importados exitosamente
                      {importResult.failed > 0 && `, ${importResult.failed} fallidos`}
                    </p>
                  </div>

                  <div className="flex justify-center gap-4">
                    <Badge variant="secondary" className="text-lg px-4 py-2 gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {importResult.success} exitosos
                    </Badge>
                    {importResult.failed > 0 && (
                      <Badge variant="destructive" className="text-lg px-4 py-2 gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {importResult.failed} fallidos
                      </Badge>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <Card className="max-w-lg mx-auto text-left">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-destructive">Errores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-32">
                          <ul className="text-xs space-y-1">
                            {importResult.errors.map((err, i) => (
                              <li key={i} className="text-muted-foreground">{err}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  <Button onClick={() => { onOpenChange(false); resetState(); }}>
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SmartBulkImportDialog;
