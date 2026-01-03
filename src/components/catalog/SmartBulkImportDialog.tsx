import { useState, useRef } from 'react';
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
import { useCatalog } from '@/hooks/useCatalog';
import { usePriceEngine } from '@/hooks/usePriceEngine';
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
  ArrowRight, ChevronRight, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HierarchicalCategorySelect from './HierarchicalCategorySelect';

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
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'grouping' | 'preview' | 'importing'>('upload');
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
    const { groups, detectedAttributeColumns: attrs } = groupProductsByParent(rows, headers, mappingRecord);
    
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
    setStep('grouping');
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
    if (lower.includes('color')) return <Palette className="h-3 w-3" />;
    if (lower.includes('size') || lower.includes('talla')) return <Ruler className="h-3 w-3" />;
    if (lower.includes('volt') || lower.includes('watt') || lower.includes('power')) return <Zap className="h-3 w-3" />;
    return <Package className="h-3 w-3" />;
  };

  const activeExpenses = expenses?.filter(e => e.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Importación Inteligente EAV
          </DialogTitle>
          <DialogDescription>
            Agrupa automáticamente variantes y detecta atributos dinámicos (Color, Talla, Voltaje, etc.)
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 text-xs border-b pb-3">
          {['upload', 'mapping', 'grouping', 'importing'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-primary text-primary-foreground' : 
                ['upload', 'mapping', 'grouping', 'importing'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className={step === s ? 'font-medium' : 'text-muted-foreground'}>
                {s === 'upload' ? 'Subir' : s === 'mapping' ? 'Mapear' : s === 'grouping' ? 'Agrupar' : 'Importar'}
              </span>
              {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Motor de Precios + Atributos EAV
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margen de Ganancia:</span>
                    <Badge variant="secondary">{profitMargin}%</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    ✨ Detecta automáticamente: Color, Talla, Voltaje, Potencia, Material y más
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Subir archivo CSV con variantes</h3>
                      <p className="text-sm text-muted-foreground">
                        Los productos con mismo nombre/SKU base se agrupan automáticamente
                      </p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla con Variantes
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  ¿Cómo funciona?
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Las filas con mismo <strong>nombre base</strong> o <strong>SKU base</strong> se agrupan como un producto padre</li>
                  <li>• Columnas extra (Color, Size, Voltage, etc.) se detectan como <strong>atributos dinámicos</strong></li>
                  <li>• Cada combinación de atributos genera una <strong>variante (SKU)</strong> única</li>
                  <li>• El sistema crea automáticamente las tablas EAV necesarias</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6 py-4">
              <p className="text-sm text-muted-foreground">
                Encontramos <strong>{rawData.length}</strong> filas y <strong>{headers.length}</strong> columnas. 
                Mapee las columnas principales:
              </p>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(mapping).map(([field, value]) => (
                  <div key={field} className="space-y-2">
                    <Label className="capitalize text-xs">{field.replace(/_/g, ' ')}</Label>
                    <Select
                      value={value}
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

              <Card className="bg-accent/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Columnas detectadas como atributos</CardTitle>
                  <CardDescription className="text-xs">
                    Las columnas no mapeadas arriba se tratarán como atributos de variante
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {headers.filter(h => !Object.values(mapping).includes(h)).map(col => (
                      <Badge key={col} variant="outline" className="gap-1">
                        {getAttributeIcon(col)}
                        {col}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
                <Button onClick={processGrouping}>
                  <Layers className="h-4 w-4 mr-2" />
                  Agrupar Productos
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Grouping Preview */}
          {step === 'grouping' && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" />
                  {groupedProducts.length} productos padre
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {groupedProducts.reduce((sum, g) => sum + g.variants.length, 0)} variantes
                </Badge>
                {detectedAttributeColumns.length > 0 && (
                  <Badge variant="outline" className="gap-1 text-primary border-primary">
                    {detectedAttributeColumns.length} atributos detectados
                  </Badge>
                )}
              </div>

              {/* Detected Attributes */}
              {detectedAttributeColumns.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Atributos Dinámicos Detectados</CardTitle>
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
                      {duplicateSkus.length} SKU(s) ya existen en la base de datos
                    </CardTitle>
                    <CardDescription className="text-xs text-orange-600 dark:text-orange-500">
                      Los siguientes productos ya están registrados. Puedes ignorarlos o continuar para actualizar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {duplicateSkus.slice(0, 10).map(sku => (
                        <Badge key={sku} variant="outline" className="text-xs text-orange-700 border-orange-300 dark:text-orange-400">
                          {sku}
                        </Badge>
                      ))}
                      {duplicateSkus.length > 10 && (
                        <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                          +{duplicateSkus.length - 10} más
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={removeDuplicates}
                        className="text-xs"
                      >
                        Ignorar duplicados
                      </Button>
                      <p className="text-[10px] text-muted-foreground self-center">
                        o continúa para intentar importar (puede fallar si el SKU ya existe)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Grouped Products Preview */}
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Vista Previa</TabsTrigger>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-2 mt-4">
                  {groupedProducts.slice(0, 10).map((group, i) => (
                    <Card key={i} className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{group.parentName}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>SKU: {group.baseSku}</span>
                            <span>•</span>
                            <span>{group.variants.length} variantes</span>
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

                <TabsContent value="details" className="mt-4">
                  <div className="space-y-4">
                    {groupedProducts.slice(0, 5).map((group, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{group.parentName}</CardTitle>
                          <CardDescription className="text-xs">
                            {group.variants.length} variantes • {group.detectedAttributes.length} atributos
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3">
                          {/* Attributes */}
                          <div className="space-y-2">
                            {group.detectedAttributes.map(attr => (
                              <div key={attr.columnName} className="flex items-center gap-2">
                                {getAttributeIcon(attr.columnName)}
                                <span className="font-medium">{attr.columnName}:</span>
                                <div className="flex gap-1 flex-wrap">
                                  {Array.from(attr.uniqueValues).slice(0, 5).map(v => (
                                    <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
                                  ))}
                                  {attr.uniqueValues.size > 5 && (
                                    <Badge variant="outline" className="text-[10px]">+{attr.uniqueValues.size - 5}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Variant Images Preview */}
                          {group.variants.some(v => v.imageUrl) && (
                            <div className="border-t pt-2">
                              <p className="text-muted-foreground mb-2">Imágenes por variante:</p>
                              <div className="flex gap-2 flex-wrap">
                                {group.variants.slice(0, 6).map((variant, vi) => (
                                  <div key={vi} className="relative group">
                                    {variant.imageUrl ? (
                                      <img 
                                        src={variant.imageUrl} 
                                        alt={Object.values(variant.attributeValues).join(' ')}
                                        className="w-12 h-12 rounded object-cover border"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                      <span className="text-[8px] text-white text-center px-1">
                                        {Object.values(variant.attributeValues).slice(0, 2).join(' / ')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {group.variants.length > 6 && (
                                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center border text-xs text-muted-foreground">
                                    +{group.variants.length - 6}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>Atrás</Button>
                <Button onClick={handleImport}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Importar {groupedProducts.length} Productos
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
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
