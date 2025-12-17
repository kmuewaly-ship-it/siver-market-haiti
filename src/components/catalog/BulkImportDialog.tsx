import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCatalog } from '@/hooks/useCatalog';
import { usePriceEngine, PriceCalculation } from '@/hooks/usePriceEngine';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Calculator, ChevronDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HierarchicalCategorySelect from './HierarchicalCategorySelect';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  sku_interno: string;
  nombre: string;
  descripcion_corta?: string;
  costo_base: number;
  precio_b2b_calculado: number;
  priceCalculation?: PriceCalculation;
  moq: number;
  stock_fisico: number;
  url_imagen?: string;
  categoria_id?: string;
  proveedor_id?: string;
  url_origen?: string;
  errors: string[];
  isValid: boolean;
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

const TEMPLATE_COLUMNS = [
  'SKU_Interno',
  'Nombre',
  'Descripcion_Corta',
  'Costo_Base_Proveedor',
  'MOQ_Cantidad_Minima',
  'Stock_Fisico',
  'URL_Imagen_Principal',
  'Categoria',
  'Proveedor',
  'URL_Proveedor'
];

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

const BulkImportDialog = ({ open, onOpenChange }: BulkImportDialogProps) => {
  const { bulkImportProducts, useCategories, useSuppliers } = useCatalog();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Price engine hook
  const { 
    usePriceSettings, 
    useDynamicExpenses, 
    getProfitMargin, 
    calculateB2BPrice 
  } = usePriceEngine();
  const { data: priceSettings } = usePriceSettings();
  const { data: expenses } = useDynamicExpenses();
  const profitMargin = getProfitMargin(priceSettings);
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const downloadTemplate = () => {
    const csvContent = TEMPLATE_COLUMNS.join(',') + '\n' +
      'SKU-001,Producto Ejemplo,Descripción del producto,10.00,10,100,https://ejemplo.com/imagen.jpg,Ropa,AliExpress,https://aliexpress.com/item/123';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_catalogo_siver.csv';
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
        
        const autoMapping = { ...DEFAULT_MAPPING };
        parsed[0].forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('sku') || lowerHeader.includes('codigo')) {
            autoMapping.sku_interno = header;
          } else if (lowerHeader.includes('nombre') || lowerHeader.includes('name') || lowerHeader.includes('title')) {
            autoMapping.nombre = header;
          } else if (lowerHeader.includes('desc')) {
            autoMapping.descripcion_corta = header;
          } else if (lowerHeader.includes('costo') || lowerHeader.includes('cost') || lowerHeader.includes('precio') || lowerHeader.includes('price')) {
            autoMapping.costo_base = header;
          } else if (lowerHeader.includes('moq') || lowerHeader.includes('minimo') || lowerHeader.includes('min')) {
            autoMapping.moq = header;
          } else if (lowerHeader.includes('stock') || lowerHeader.includes('cantidad') || lowerHeader.includes('qty')) {
            autoMapping.stock_fisico = header;
          } else if (lowerHeader.includes('imagen') || lowerHeader.includes('image') || lowerHeader.includes('foto')) {
            autoMapping.url_imagen = header;
          } else if (lowerHeader.includes('categ') || lowerHeader.includes('category')) {
            autoMapping.categoria = header;
          } else if (lowerHeader.includes('proveedor') || lowerHeader.includes('supplier') || lowerHeader.includes('vendor')) {
            autoMapping.proveedor = header;
          } else if (lowerHeader.includes('url_proveedor') || lowerHeader.includes('url_origen') || lowerHeader.includes('source_url') || lowerHeader.includes('link')) {
            autoMapping.url_origen = header;
          }
        });
        setMapping(autoMapping);
        setStep('mapping');
      }
    };
    reader.readAsText(file);
  };

  const getColumnIndex = (columnName: string): number => {
    if (columnName === '__none__') return -1;
    return headers.indexOf(columnName);
  };

  const validateAndParse = () => {
    const parsed: ParsedRow[] = rawData.map((row) => {
      const errors: string[] = [];
      
      const skuIndex = getColumnIndex(mapping.sku_interno);
      const nombreIndex = getColumnIndex(mapping.nombre);
      const descIndex = getColumnIndex(mapping.descripcion_corta);
      const costoIndex = getColumnIndex(mapping.costo_base);
      const moqIndex = getColumnIndex(mapping.moq);
      const stockIndex = getColumnIndex(mapping.stock_fisico);
      const imagenIndex = getColumnIndex(mapping.url_imagen);
      const categoriaIndex = getColumnIndex(mapping.categoria);
      const proveedorIndex = getColumnIndex(mapping.proveedor);
      const urlOrigenIndex = getColumnIndex(mapping.url_origen);

      const sku = skuIndex >= 0 ? row[skuIndex]?.trim() : '';
      const nombre = nombreIndex >= 0 ? row[nombreIndex]?.trim() : '';
      const descripcion = descIndex >= 0 ? row[descIndex]?.trim() : '';
      const costoStr = costoIndex >= 0 ? row[costoIndex]?.trim() : '0';
      const moqStr = moqIndex >= 0 ? row[moqIndex]?.trim() : '1';
      const stockStr = stockIndex >= 0 ? row[stockIndex]?.trim() : '0';
      const imagen = imagenIndex >= 0 ? row[imagenIndex]?.trim() : '';
      const categoriaName = categoriaIndex >= 0 ? row[categoriaIndex]?.trim() : '';
      const proveedorName = proveedorIndex >= 0 ? row[proveedorIndex]?.trim() : '';
      const urlOrigen = urlOrigenIndex >= 0 ? row[urlOrigenIndex]?.trim() : '';

      // Find category ID by name
      let categoriaId: string | undefined = undefined;
      if (categoriaName && categories) {
        const foundCat = categories.find(c => 
          c.name.toLowerCase() === categoriaName.toLowerCase()
        );
        if (foundCat) categoriaId = foundCat.id;
      }
      if (!categoriaId && defaultCategoryId) {
        categoriaId = defaultCategoryId;
      }

      // Find supplier ID by name
      let proveedorId: string | undefined = undefined;
      if (proveedorName && suppliers) {
        const foundSup = suppliers.find(s => 
          s.name.toLowerCase() === proveedorName.toLowerCase()
        );
        if (foundSup) proveedorId = foundSup.id;
      }

      // Validations
      if (!sku) errors.push('SKU requerido');
      if (!nombre) errors.push('Nombre requerido');
      
      const costoBase = parseFloat(costoStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(costoBase) || costoBase < 0) errors.push('Costo base inválido');
      
      const moq = parseInt(moqStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(moq) || moq < 1) errors.push('MOQ debe ser >= 1');
      
      const stock = parseInt(stockStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(stock) || stock < 0) errors.push('Stock inválido');

      // Calculate B2B price using price engine
      const validCosto = isNaN(costoBase) ? 0 : costoBase;
      const priceCalc = calculateB2BPrice(validCosto, expenses, profitMargin);

      return {
        sku_interno: sku,
        nombre,
        descripcion_corta: descripcion || undefined,
        costo_base: validCosto,
        precio_b2b_calculado: priceCalc.precioFinal,
        priceCalculation: priceCalc,
        moq: isNaN(moq) ? 1 : moq,
        stock_fisico: isNaN(stock) ? 0 : stock,
        url_imagen: imagen || undefined,
        categoria_id: categoriaId,
        proveedor_id: proveedorId,
        url_origen: urlOrigen || undefined,
        errors,
        isValid: errors.length === 0
      };
    });

    setParsedRows(parsed);
    setStep('preview');
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast({
        title: 'No hay filas válidas para importar',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    try {
      const products = validRows.map(row => ({
        sku_interno: row.sku_interno,
        nombre: row.nombre,
        descripcion_corta: row.descripcion_corta,
        precio_mayorista: row.precio_b2b_calculado, // Calculated B2B price
        costo_base_excel: row.costo_base, // Original base cost
        moq: row.moq,
        stock_fisico: row.stock_fisico,
        imagen_principal: row.url_imagen,
        categoria_id: row.categoria_id,
        proveedor_id: row.proveedor_id,
        url_origen: row.url_origen,
      }));

      await bulkImportProducts.mutateAsync(products);
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setMapping(DEFAULT_MAPPING);
    setParsedRows([]);
    setDefaultCategoryId('');
    setExpandedRow(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;
  const activeExpenses = expenses?.filter(e => e.is_active) || [];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Carga Masiva de Productos
          </DialogTitle>
          <DialogDescription>
            Importe productos desde un archivo CSV - Los precios B2B se calculan automáticamente
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            {/* Price Engine Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Motor de Precios Activo
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margen de Ganancia:</span>
                  <Badge variant="secondary">{profitMargin}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gastos Activos:</span>
                  <span>{activeExpenses.length}</span>
                </div>
                {activeExpenses.length > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {activeExpenses.map(e => (
                      <span key={e.id} className="inline-block mr-2">
                        {e.nombre_gasto} ({e.operacion === 'suma' ? '+' : '-'}{e.tipo === 'fijo' ? `$${e.valor}` : `${e.valor}%`})
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed border-2">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Subir archivo CSV/Excel</h3>
                    <p className="text-sm text-muted-foreground">
                      Arrastre un archivo o haga clic para seleccionar
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
                Descargar Plantilla CSV
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Campos de la plantilla:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><span className="font-mono text-xs bg-background px-1 rounded">SKU_Interno</span> - Código único del producto (obligatorio)</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Nombre</span> - Nombre del producto (obligatorio)</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Descripcion_Corta</span> - Descripción breve</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded text-primary font-semibold">Costo_Base_Proveedor</span> - Precio original del proveedor (se calcula precio B2B)</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">MOQ_Cantidad_Minima</span> - Mínimo de pedido</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Stock_Fisico</span> - Unidades disponibles</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">URL_Imagen_Principal</span> - URL de la imagen</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Categoria</span> - Nombre de la categoría</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Proveedor</span> - Nombre del proveedor (opcional)</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">URL_Proveedor</span> - Link al producto del proveedor (opcional)</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Encontramos {rawData.length} filas en el archivo. Mapee las columnas del archivo a los campos del catálogo.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(mapping).map(([field, value]) => (
                <div key={field} className="space-y-2">
                  <Label className="capitalize">{field.replace(/_/g, ' ')}</Label>
                  <Select
                    value={value}
                    onValueChange={(v) => setMapping(m => ({ ...m, [field]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar columna" />
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

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <Label className="text-sm font-medium">Categoría por defecto (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Se aplicará a productos sin categoría en el archivo
              </p>
              <HierarchicalCategorySelect
                categories={categories}
                value={defaultCategoryId}
                onValueChange={setDefaultCategoryId}
                placeholder="Seleccionar categoría por defecto"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
              <Button onClick={validateAndParse}>Validar y Previsualizar</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {validCount} válidas
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errorCount} con errores
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Calculator className="h-3 w-3" />
                Margen: {profitMargin}%
              </Badge>
            </div>

            {/* Price Calculation Summary */}
            <Card className="bg-accent/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumen de Cálculo de Precios</CardTitle>
                <CardDescription className="text-xs">
                  Fórmula: Costo Base + Gastos Dinámicos + Margen ({profitMargin}%) = Precio B2B Final
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  {activeExpenses.map(e => (
                    <Badge key={e.id} variant="outline">
                      {e.nombre_gasto}: {e.operacion === 'suma' ? '+' : '-'}{e.tipo === 'fijo' ? `$${e.valor}` : `${e.valor}%`}
                    </Badge>
                  ))}
                  <Badge className="bg-primary/20 text-primary">
                    Margen: +{profitMargin}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Costo Base</TableHead>
                    <TableHead className="text-primary font-semibold">Precio B2B</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, index) => (
                    <>
                      <TableRow 
                        key={index} 
                        className={`${!row.isValid ? 'bg-destructive/10' : ''} cursor-pointer hover:bg-muted/50`}
                        onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedRow === index ? 'rotate-180' : ''}`} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.sku_interno}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{row.nombre}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">${row.costo_base.toFixed(2)}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">${row.precio_b2b_calculado.toFixed(2)}</TableCell>
                        <TableCell>{row.moq}</TableCell>
                        <TableCell className="text-destructive text-xs max-w-[150px] truncate">
                          {row.errors.join(', ')}
                        </TableCell>
                      </TableRow>
                      {expandedRow === index && row.priceCalculation && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8}>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Eye className="h-4 w-4" />
                                <span className="font-medium">Desglose del Cálculo:</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-muted-foreground">Costo Base:</span>
                                  <div className="font-mono">${row.priceCalculation.costoBase.toFixed(2)}</div>
                                </div>
                                {row.priceCalculation.gastosAplicados.map((g, i) => (
                                  <div key={i}>
                                    <span className="text-muted-foreground">{g.nombre}:</span>
                                    <div className={`font-mono ${g.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {g.resultado >= 0 ? '+' : ''}{g.resultado.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                                <div>
                                  <span className="text-muted-foreground">Subtotal:</span>
                                  <div className="font-mono">${row.priceCalculation.subtotalConGastos.toFixed(2)}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Margen ({row.priceCalculation.margenPorcentaje}%):</span>
                                  <div className="font-mono text-green-600">+{row.priceCalculation.margenValor.toFixed(2)}</div>
                                </div>
                                <div className="bg-primary/10 p-2 rounded">
                                  <span className="text-primary font-medium">Precio B2B Final:</span>
                                  <div className="font-mono font-bold text-primary text-lg">${row.priceCalculation.precioFinal.toFixed(2)}</div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>Atrás</Button>
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>Importar {validCount} productos</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
