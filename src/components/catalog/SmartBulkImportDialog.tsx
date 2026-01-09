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
import * as XLSX from 'xlsx';

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
  const [attributeConfigs, setAttributeConfigs] = useState<AttributeConfig[]>([]);
  const [showTemplateHint, setShowTemplateHint] = useState(false);
  
  const { data: categoryTemplates } = useTemplatesForCategory(defaultCategoryId);

  const availableColumns = useMemo(() => {
    const mappedCols = Object.values(mapping);
    return headers.filter(h => !mappedCols.includes(h));
  }, [headers, mapping]);

  // Persist modal state in sessionStorage to survive page refreshes
  const STORAGE_KEY = 'smartImportDialogState';
  
  // Load persisted state on mount
  useEffect(() => {
    if (open) {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.step && parsed.step !== 'upload') {
            setStep(parsed.step);
            const restoredHeaders = parsed.headers || [];
            setHeaders(restoredHeaders);
            setRawData(parsed.rawData || []);
            
            // Validate and restore mapping - ensure mapped columns exist in headers
            let restoredMapping = parsed.mapping || DEFAULT_MAPPING;
            // If url_imagen mapping doesn't exist in headers, try to find it
            if (restoredMapping.url_imagen && !restoredHeaders.includes(restoredMapping.url_imagen)) {
              const imageCol = restoredHeaders.find((h: string) => {
                const lower = h.toLowerCase();
                return lower.includes('imagen') || lower.includes('image') || lower.includes('foto');
              });
              if (imageCol) {
                restoredMapping = { ...restoredMapping, url_imagen: imageCol };
              }
            }
            setMapping(restoredMapping);
            
            setDefaultCategoryId(parsed.defaultCategoryId || '');
            setDefaultSupplierId(parsed.defaultSupplierId || '');
            setAttributeConfigs(parsed.attributeConfigs || []);
            if (parsed.groupedProducts) {
              // Restore groupedProducts with proper Set reconstruction
              const restored = parsed.groupedProducts.map((g: any) => ({
                ...g,
                detectedAttributes: g.detectedAttributes.map((a: any) => ({
                  ...a,
                  uniqueValues: new Set(a.uniqueValues || []),
                }))
              }));
              setGroupedProducts(restored);
            }
            setDetectedAttributeColumns(parsed.detectedAttributeColumns || []);
          }
        } catch (err) {
          console.error('Error loading persisted import state:', err);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, [open]);
  
  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (open && step !== 'upload' && step !== 'importing') {
      const stateToSave = {
        step,
        headers,
        rawData,
        mapping,
        defaultCategoryId,
        defaultSupplierId,
        attributeConfigs,
        groupedProducts: groupedProducts.map(g => ({
          ...g,
          detectedAttributes: g.detectedAttributes.map(a => ({
            ...a,
            uniqueValues: Array.from(a.uniqueValues),
          }))
        })),
        detectedAttributeColumns,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [open, step, headers, rawData, mapping, defaultCategoryId, defaultSupplierId, attributeConfigs, groupedProducts, detectedAttributeColumns]);
  
  // Clear persisted state when closing dialog
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      sessionStorage.removeItem(STORAGE_KEY);
      resetState();
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (categoryTemplates && categoryTemplates.length > 0 && headers.length > 0) {
      const suggestions = applyTemplateToImport(categoryTemplates, headers);
      const hasMatchingColumns = suggestions.some(s => s.suggestedColumn);
      if (hasMatchingColumns && attributeConfigs.length === 0) {
        setShowTemplateHint(true);
      }
    }
  }, [categoryTemplates, headers]);

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
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'SKU_Interno,Nombre,Descripcion_Corta,Costo_Base_Proveedor,MOQ_Cantidad_Minima,Stock_Fisico,URL_Imagen_Principal,Color,Size',
      'SHIRT-001-RED-S,Camisa Casual,Camisa de algodón,15.00,10,50,https://example.com/red-s.jpg,Rojo,S',
      'SHIRT-001-RED-M,Camisa Casual,Camisa de algodón,15.00,10,45,https://example.com/red-m.jpg,Rojo,M',
      'SHIRT-001-BLUE-S,Camisa Casual,Camisa de algodón,15.00,10,40,https://example.com/blue-s.jpg,Azul,S',
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_importacion.csv';
    link.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isExcel) {
      // Parse Excel files using XLSX library
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to array of arrays with raw: false to preserve formatted strings (avoid scientific notation)
          const jsonData: (string | number | boolean | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            raw: false // This ensures numbers are returned as formatted strings
          });
          
          if (jsonData.length > 0) {
            // First row is headers
            const headerRow = jsonData[0].map(h => String(h ?? '').trim());
            const dataRows = jsonData.slice(1).filter(row => 
              row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
            ).map(row => row.map(cell => {
              let val = String(cell ?? '').trim();
              // Clean potential escaped characters from Excel (backslashes before colons and underscores)
              val = val.replace(/\\:/g, ':').replace(/\\_/g, '_');
              return val;
            }));
            
            setHeaders(headerRow);
            setRawData(dataRows);
            autoMapColumns(headerRow);
            setStep('mapping');
          }
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          toast({
            title: 'Error al leer el archivo Excel',
            description: 'Asegúrate de que el archivo es un Excel válido (.xlsx o .xls)',
            variant: 'destructive'
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Parse CSV files
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
    }
  };

  const autoMapColumns = (headerRow: string[]) => {
    const autoMapping = { ...DEFAULT_MAPPING };
    headerRow.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('sku') || lower.includes('codigo')) autoMapping.sku_interno = header;
      else if (lower.includes('nombre') || lower.includes('name') || lower.includes('title') || lower.includes('product')) {
        // Prioriza nombre, pero también puede usar para descripción si no hay columna específica
        if (!autoMapping.nombre) autoMapping.nombre = header;
      }
      else if (lower.includes('desc') || lower.includes('descripcion') || lower.includes('description') || lower.includes('detail')) {
        autoMapping.descripcion_corta = header;
      }
      else if (lower.includes('costo') || lower.includes('cost') || lower.includes('precio') || lower.includes('price')) autoMapping.costo_base = header;
      else if (lower.includes('moq') || lower.includes('minimo')) autoMapping.moq = header;
      else if (lower.includes('stock') || lower.includes('cantidad') || lower.includes('qty')) autoMapping.stock_fisico = header;
      else if (lower.includes('imagen') || lower.includes('image') || lower.includes('foto')) {
        autoMapping.url_imagen = header;
      }
      else if (lower.includes('categ')) autoMapping.categoria = header;
      else if (lower.includes('proveedor') || lower.includes('supplier')) autoMapping.proveedor = header;
      else if (lower.includes('url_proveedor') || lower.includes('url_origen') || lower.includes('link')) autoMapping.url_origen = header;
    });
    setMapping(autoMapping);
  };

  const processGrouping = async () => {
    const rows: RawImportRow[] = rawData.map(row => {
      const obj: RawImportRow = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });

    const mappingRecord: Record<string, string> = { ...mapping };
    const configuredColumns = attributeConfigs.filter(c => c.valueColumn).map(c => c.valueColumn);
    
    const { groups, detectedAttributeColumns: attrs } = groupProductsByParent(
      rows, headers, mappingRecord,
      configuredColumns.length > 0 ? configuredColumns : undefined
    );
    
    setIsCheckingDuplicates(true);
    try {
      const baseSkus = groups.map(g => g.baseSku);
      const existingCheck = await checkExistingSkus(baseSkus);
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
    setImportProgress({ current: 0, total: groupedProducts.length, message: 'Iniciando...' });

    const priceCalculator = (cost: number) => {
      const calc = calculateB2BPrice(cost, expenses, profitMargin);
      return calc.precioFinal;
    };

    const result = await importGroupedProducts(
      groupedProducts,
      defaultCategoryId || undefined,
      defaultSupplierId || undefined,
      priceCalculator,
      (current, total, message) => setImportProgress({ current, total, message })
    );

    setImportResult(result);
    if (result.success > 0) {
      toast({ title: `${result.success} productos importados` });
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDuplicates = () => {
    setGroupedProducts(prev => prev.filter(g => !g.existsInDb));
    setDuplicateSkus([]);
  };

  const getAttributeIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('color')) return <Palette className="h-3 w-3" />;
    if (lower.includes('size') || lower.includes('talla')) return <Ruler className="h-3 w-3" />;
    if (lower.includes('volt') || lower.includes('watt')) return <Zap className="h-3 w-3" />;
    return <Package className="h-3 w-3" />;
  };

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
    setAttributeConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeAttributeConfig = (id: string) => {
    setAttributeConfigs(prev => prev.filter(c => c.id !== id));
  };

  const unusedColumns = useMemo(() => {
    const usedCols = new Set(attributeConfigs.map(c => c.valueColumn).filter(Boolean));
    return availableColumns.filter(col => !usedCols.has(col));
  }, [availableColumns, attributeConfigs]);

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <div className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Importación Inteligente de Productos
            </DialogTitle>
            <DialogDescription>
              Configura atributos dinámicos y agrupa variantes automáticamente
            </DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 border-b pb-3 mt-3 overflow-x-auto">
            {STEPS.map((s, i) => {
              const isCompleted = currentStepIndex > i;
              const isCurrent = step === s.id || (step === 'importing' && s.id === 'preview');
              const StepIcon = s.icon;
              
              return (
                <div key={s.id} className="flex items-center flex-shrink-0">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                    isCurrent && "bg-primary/10"
                  )}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      isCurrent && "bg-primary text-primary-foreground",
                      isCompleted && "bg-green-500 text-white",
                      !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:block",
                      isCurrent && "text-primary",
                      !isCurrent && !isCompleted && "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-4 space-y-6">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Motor de Precios Automático
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margen de Ganancia:</span>
                      <Badge variant="secondary">{profitMargin}%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" 
                      onClick={() => fileInputRef.current?.click()}>
                  <CardContent className="py-12 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Arrastra tu archivo CSV aquí</h3>
                      <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                    </div>
                    <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Mapping */}
            {step === 'mapping' && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Vista Previa
                    </CardTitle>
                    <CardDescription>{rawData.length} filas • {headers.length} columnas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="w-full">
                      <table className="text-xs w-full border-collapse min-w-max">
                        <thead>
                          <tr className="bg-muted">
                            {headers.map((h, i) => (
                              <th key={i} className="border px-2 py-1.5 text-left font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawData.slice(0, 3).map((row, ri) => (
                            <tr key={ri}>
                              {row.map((cell, ci) => (
                                <td key={ci} className="border px-2 py-1.5 whitespace-nowrap text-muted-foreground">{cell || '-'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                    {rawData.length > 3 && <p className="text-xs text-muted-foreground mt-2 text-center">... y {rawData.length - 3} filas más</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Campos Requeridos</CardTitle>
                      <Badge variant="secondary">4</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'sku_interno', label: 'SKU Interno' },
                        { key: 'nombre', label: 'Nombre' },
                        { key: 'costo_base', label: 'Costo Base' },
                        { key: 'stock_fisico', label: 'Stock Físico' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-2">
                            {label}
                            {headers.includes(mapping[key as keyof ColumnMapping]) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </Label>
                          <Select value={mapping[key as keyof ColumnMapping]} onValueChange={(v) => setMapping(m => ({ ...m, [key]: v }))}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- No mapear --</SelectItem>
                              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Accordion type="single" collapsible>
                  <AccordionItem value="optional" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                      <div className="flex items-center gap-2">Campos Opcionales <Badge variant="outline">6</Badge></div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'descripcion_corta', label: 'Descripción' },
                          { key: 'moq', label: 'MOQ' },
                          { key: 'url_imagen', label: 'URL Imagen' },
                          { key: 'categoria', label: 'Categoría' },
                          { key: 'proveedor', label: 'Proveedor' },
                          { key: 'url_origen', label: 'URL Origen' },
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-xs">{label}</Label>
                            <Select value={mapping[key as keyof ColumnMapping]} onValueChange={(v) => setMapping(m => ({ ...m, [key]: v }))}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">-- No mapear --</SelectItem>
                                {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Categoría por defecto</Label>
                        <HierarchicalCategorySelect categories={categories} value={defaultCategoryId} onValueChange={setDefaultCategoryId} placeholder="Seleccionar" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Proveedor por defecto</Label>
                        <Select value={defaultSupplierId} onValueChange={setDefaultSupplierId}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {suppliers?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Step 3: Attributes */}
            {step === 'attributes' && (
              <>
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
                            <p className="text-xs text-muted-foreground">{categoryTemplates.length} atributos predefinidos</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowTemplateHint(false)}><X className="h-4 w-4" /></Button>
                          <Button size="sm" onClick={applyTemplate}><Sparkles className="h-4 w-4 mr-1" />Aplicar</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {unusedColumns.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Columnas Disponibles</CardTitle>
                      <CardDescription className="text-xs">Clic para agregar como atributo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {unusedColumns.map(col => (
                          <Badge key={col} variant="outline" className="cursor-pointer hover:bg-primary/10 gap-1.5 py-1.5 px-3" onClick={() => addAttributeConfig(col)}>
                            {getAttributeIcon(col)} {col} <Plus className="h-3 w-3 text-primary" />
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Atributos Configurados ({attributeConfigs.length})</h3>
                    <Button variant="outline" size="sm" onClick={() => addAttributeConfig()} disabled={unusedColumns.length === 0}>
                      <Plus className="h-4 w-4 mr-1" />Agregar
                    </Button>
                  </div>

                  {attributeConfigs.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No hay atributos configurados</p>
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
                          imageColumnName={mapping.url_imagen}
                          onUpdate={updateAttributeConfig}
                          onRemove={removeAttributeConfig}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Step 4: Preview */}
            {step === 'preview' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="text-center p-4">
                    <div className="text-3xl font-bold text-primary">{groupedProducts.length}</div>
                    <p className="text-sm text-muted-foreground">Productos Padre</p>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-3xl font-bold text-primary">{groupedProducts.reduce((sum, g) => sum + g.variants.length, 0)}</div>
                    <p className="text-sm text-muted-foreground">Variantes</p>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-3xl font-bold text-primary">{detectedAttributeColumns.length}</div>
                    <p className="text-sm text-muted-foreground">Atributos</p>
                  </Card>
                </div>

                {duplicateSkus.length > 0 && (
                  <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                        <AlertTriangle className="h-4 w-4" /> {duplicateSkus.length} SKU(s) ya existen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {duplicateSkus.slice(0, 8).map(sku => <Badge key={sku} variant="outline" className="text-xs">{sku}</Badge>)}
                        {duplicateSkus.length > 8 && <Badge variant="outline" className="text-xs">+{duplicateSkus.length - 8}</Badge>}
                      </div>
                      <Button variant="outline" size="sm" onClick={removeDuplicates}>Ignorar duplicados</Button>
                    </CardContent>
                  </Card>
                )}

                <Tabs defaultValue="list">
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
                                alt={group.parentName}
                                className="w-10 h-10 rounded object-cover border"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div>
                              <h4 className="font-medium truncate max-w-xs">{group.parentName}</h4>
                              <div className="text-xs text-muted-foreground">SKU: {group.baseSku} • {group.variants.length} variantes</div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {group.detectedAttributes.slice(0, 3).map(attr => {
                              // Find configured name for this attribute
                              const configuredAttr = attributeConfigs.find(c => c.valueColumn === attr.columnName);
                              const displayName = configuredAttr?.nameType === 'manual' && configuredAttr.nameValue 
                                ? configuredAttr.nameValue 
                                : attr.columnName;
                              return (
                                <Badge key={attr.columnName} variant="outline" className="text-[10px] gap-1">
                                  {getAttributeIcon(displayName)} {displayName}: {attr.uniqueValues.size}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    ))}
                    {groupedProducts.length > 10 && <p className="text-center text-sm text-muted-foreground">... y {groupedProducts.length - 10} más</p>}
                  </TabsContent>
                  <TabsContent value="details" className="mt-4 space-y-4">
                    {groupedProducts.slice(0, 5).map((group, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{group.parentName}</CardTitle>
                          <CardDescription className="text-xs">{group.variants.length} variantes</CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3">
                          {group.detectedAttributes.map(attr => {
                            // Find configured name for this attribute
                            const configuredAttr = attributeConfigs.find(c => c.valueColumn === attr.columnName);
                            const displayName = configuredAttr?.nameType === 'manual' && configuredAttr.nameValue 
                              ? configuredAttr.nameValue 
                              : attr.columnName;
                            const isColorAttr = (displayName.toLowerCase().includes('color') || attr.type === 'color');
                            
                            return (
                              <div key={attr.columnName} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {getAttributeIcon(displayName)}
                                  <span className="font-semibold">{displayName}:</span>
                                  <span className="text-muted-foreground">({attr.uniqueValues.size} valores)</span>
                                </div>
                                <div className="flex gap-2 flex-wrap ml-6">
                                  {Array.from(attr.uniqueValues).slice(0, 8).map(v => {
                                    const imgUrl = attr.valueImageMap?.[v];
                                    return (
                                      <div key={v} className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
                                        {imgUrl && (
                                          <img 
                                            src={imgUrl} 
                                            alt={v} 
                                            className="w-5 h-5 rounded object-cover border flex-shrink-0"
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                          />
                                        )}
                                        <Badge variant="secondary" className="text-[10px]">{v}</Badge>
                                      </div>
                                    );
                                  })}
                                  {attr.uniqueValues.size > 8 && (
                                    <Badge variant="outline" className="text-[10px]">+{attr.uniqueValues.size - 8}</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </>
            )}

            {/* Step 5: Importing */}
            {step === 'importing' && (
              <div className="py-8 text-center space-y-6">
                {!importResult ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <div>
                      <h3 className="font-medium">Importando productos...</h3>
                      <p className="text-sm text-muted-foreground">{importProgress.message}</p>
                    </div>
                    <Progress value={(importProgress.current / importProgress.total) * 100} className="max-w-md mx-auto" />
                    <p className="text-xs text-muted-foreground">{importProgress.current} de {importProgress.total}</p>
                  </>
                ) : (
                  <>
                    {importResult.success > 0 ? <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" /> : <AlertCircle className="h-16 w-16 text-destructive mx-auto" />}
                    <div>
                      <h3 className="text-xl font-bold">Importación Completada</h3>
                      <p className="text-muted-foreground">{importResult.success} productos importados{importResult.failed > 0 && `, ${importResult.failed} fallidos`}</p>
                    </div>
                    <div className="flex justify-center gap-4">
                      <Badge variant="secondary" className="text-lg px-4 py-2"><CheckCircle2 className="h-4 w-4 mr-1" />{importResult.success}</Badge>
                      {importResult.failed > 0 && <Badge variant="destructive" className="text-lg px-4 py-2"><AlertCircle className="h-4 w-4 mr-1" />{importResult.failed}</Badge>}
                    </div>
                    {importResult.errors.length > 0 && (
                      <Card className="max-w-lg mx-auto text-left">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Errores</CardTitle></CardHeader>
                        <CardContent><ScrollArea className="h-32"><ul className="text-xs space-y-1">{importResult.errors.map((err, i) => <li key={i} className="text-muted-foreground">{err}</li>)}</ul></ScrollArea></CardContent>
                      </Card>
                    )}
                    <Button onClick={() => { onOpenChange(false); resetState(); }}>Cerrar</Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Navigation */}
        {step !== 'upload' && step !== 'importing' && (
          <div className="flex justify-between items-center p-6 pt-4 border-t flex-shrink-0 bg-background">
            <Button variant="outline" onClick={() => {
              if (step === 'mapping') setStep('upload');
              else if (step === 'attributes') setStep('mapping');
              else if (step === 'preview') setStep('attributes');
            }}>
              Atrás
            </Button>
            
            {step === 'mapping' && (
              <Button onClick={() => setStep('attributes')}>
                Siguiente: Atributos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'attributes' && (
              <Button onClick={processGrouping} disabled={isCheckingDuplicates}>
                {isCheckingDuplicates && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Previsualizar <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {step === 'preview' && (
              <Button onClick={handleImport}>
                Importar {groupedProducts.filter(g => !g.existsInDb).length} Productos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SmartBulkImportDialog;
