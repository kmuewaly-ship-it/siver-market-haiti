import React, { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertTriangle,
  Download,
  ArrowRight
} from 'lucide-react';

interface LogisticsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  sku: string;
  weight_kg: number | null;
  is_oversize: boolean;
  shipping_mode: string;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
}

interface ValidationResult {
  row: number;
  sku: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  productId?: string;
  data: ImportRow;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const COLUMN_OPTIONS = [
  { key: 'sku', label: 'SKU', required: true },
  { key: 'weight_kg', label: 'Peso (kg)', required: true },
  { key: 'is_oversize', label: 'Oversize (Sí/No)', required: false },
  { key: 'shipping_mode', label: 'Modo Envío', required: false },
  { key: 'length_cm', label: 'Largo (cm)', required: false },
  { key: 'width_cm', label: 'Ancho (cm)', required: false },
  { key: 'height_cm', label: 'Alto (cm)', required: false },
];

const LogisticsImportDialog: React.FC<LogisticsImportDialogProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<ImportStep>('upload');
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ 
    success: 0, 
    failed: 0, 
    errors: [] 
  });

  // Reset state when dialog closes
  const handleClose = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setValidationResults([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });
    onOpenChange(false);
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('El archivo debe tener al menos una fila de encabezados y una de datos');
        return;
      }

      const headerRow = jsonData[0].map(h => String(h || '').trim());
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      setHeaders(headerRow);
      setRawData(dataRows);
      
      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      headerRow.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('sku') || headerLower.includes('codigo')) {
          autoMapping['sku'] = index.toString();
        } else if (headerLower.includes('peso') || headerLower.includes('weight')) {
          autoMapping['weight_kg'] = index.toString();
        } else if (headerLower.includes('oversize') || headerLower.includes('sobredimensionado')) {
          autoMapping['is_oversize'] = index.toString();
        } else if (headerLower.includes('modo') || headerLower.includes('mode') || headerLower.includes('shipping')) {
          autoMapping['shipping_mode'] = index.toString();
        } else if (headerLower.includes('largo') || headerLower.includes('length') || headerLower === 'l') {
          autoMapping['length_cm'] = index.toString();
        } else if (headerLower.includes('ancho') || headerLower.includes('width') || headerLower === 'w') {
          autoMapping['width_cm'] = index.toString();
        } else if (headerLower.includes('alto') || headerLower.includes('height') || headerLower === 'h') {
          autoMapping['height_cm'] = index.toString();
        }
      });
      
      setColumnMapping(autoMapping);
      setStep('mapping');
      toast.success(`Archivo cargado: ${dataRows.length} filas encontradas`);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error al leer el archivo');
    }
  }, []);

  // Validate data and preview
  const handleValidate = useCallback(async () => {
    if (!columnMapping.sku || !columnMapping.weight_kg) {
      toast.error('Debes mapear al menos SKU y Peso');
      return;
    }

    const skuIndex = parseInt(columnMapping.sku);
    const weightIndex = parseInt(columnMapping.weight_kg);
    const oversizeIndex = columnMapping.is_oversize ? parseInt(columnMapping.is_oversize) : null;
    const modeIndex = columnMapping.shipping_mode ? parseInt(columnMapping.shipping_mode) : null;
    const lengthIndex = columnMapping.length_cm ? parseInt(columnMapping.length_cm) : null;
    const widthIndex = columnMapping.width_cm ? parseInt(columnMapping.width_cm) : null;
    const heightIndex = columnMapping.height_cm ? parseInt(columnMapping.height_cm) : null;

    // Extract SKUs for batch lookup
    const skus = rawData.map(row => String(row[skuIndex] || '').trim()).filter(Boolean);
    
    // Lookup products by SKU
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, sku_interno')
      .in('sku_interno', skus);

    const skuToProduct = new Map(
      (existingProducts || []).map(p => [p.sku_interno, p.id])
    );

    // Validate each row
    const results: ValidationResult[] = rawData.map((row, index) => {
      const sku = String(row[skuIndex] || '').trim();
      const weightRaw = row[weightIndex];
      const weight = typeof weightRaw === 'number' ? weightRaw : parseFloat(String(weightRaw));
      
      const oversizeRaw = oversizeIndex !== null ? row[oversizeIndex] : null;
      const isOversize = oversizeRaw === true || 
        String(oversizeRaw).toLowerCase() === 'si' || 
        String(oversizeRaw).toLowerCase() === 'sí' ||
        String(oversizeRaw).toLowerCase() === 'yes' ||
        String(oversizeRaw).toLowerCase() === 'true' ||
        String(oversizeRaw) === '1';
      
      const modeRaw = modeIndex !== null ? String(row[modeIndex] || 'standard').toLowerCase() : 'standard';
      const shippingMode = ['standard', 'express', 'both'].includes(modeRaw) ? modeRaw : 'standard';
      
      const length = lengthIndex !== null ? parseFloat(String(row[lengthIndex])) || null : null;
      const width = widthIndex !== null ? parseFloat(String(row[widthIndex])) || null : null;
      const height = heightIndex !== null ? parseFloat(String(row[heightIndex])) || null : null;

      const productId = skuToProduct.get(sku);

      const importRow: ImportRow = {
        sku,
        weight_kg: isNaN(weight) ? null : weight,
        is_oversize: isOversize,
        shipping_mode: shippingMode,
        length_cm: length,
        width_cm: width,
        height_cm: height,
      };

      if (!sku) {
        return {
          row: index + 2,
          sku: '-',
          status: 'error' as const,
          message: 'SKU vacío',
          data: importRow,
        };
      }

      if (!productId) {
        return {
          row: index + 2,
          sku,
          status: 'error' as const,
          message: 'Producto no encontrado',
          data: importRow,
        };
      }

      if (isNaN(weight) || weight <= 0) {
        return {
          row: index + 2,
          sku,
          status: 'warning' as const,
          message: 'Peso inválido o vacío',
          productId,
          data: importRow,
        };
      }

      if (isOversize && (!length || !width || !height)) {
        return {
          row: index + 2,
          sku,
          status: 'warning' as const,
          message: 'Oversize sin dimensiones completas',
          productId,
          data: importRow,
        };
      }

      return {
        row: index + 2,
        sku,
        status: 'valid' as const,
        message: 'OK',
        productId,
        data: importRow,
      };
    });

    setValidationResults(results);
    setStep('preview');
  }, [rawData, columnMapping]);

  // Execute import
  const handleImport = useCallback(async () => {
    const validRows = validationResults.filter(r => r.status !== 'error' && r.productId);
    
    if (validRows.length === 0) {
      toast.error('No hay filas válidas para importar');
      return;
    }

    setStep('importing');
    setImportProgress(0);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    const batchSize = 50;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      
      const updates = batch.map(r => ({
        id: r.productId!,
        weight_kg: r.data.weight_kg,
        is_oversize: r.data.is_oversize,
        shipping_mode: r.data.shipping_mode,
        length_cm: r.data.length_cm,
        width_cm: r.data.width_cm,
        height_cm: r.data.height_cm,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({
            weight_kg: update.weight_kg,
            is_oversize: update.is_oversize,
            shipping_mode: update.shipping_mode,
            length_cm: update.length_cm,
            width_cm: update.width_cm,
            height_cm: update.height_cm,
          })
          .eq('id', update.id);

        if (error) {
          failed++;
          errors.push(`SKU ${batch.find(b => b.productId === update.id)?.sku}: ${error.message}`);
        } else {
          success++;
        }
      }

      setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImportResults({ success, failed, errors: errors.slice(0, 10) });
    setStep('complete');
    queryClient.invalidateQueries({ queryKey: ['products-logistics'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [validationResults, queryClient]);

  // Download template
  const downloadTemplate = () => {
    const template = [
      ['SKU', 'Peso (kg)', 'Oversize', 'Modo Envío', 'Largo (cm)', 'Ancho (cm)', 'Alto (cm)'],
      ['SKU-001', 0.5, 'No', 'standard', '', '', ''],
      ['SKU-002', 2.3, 'Sí', 'both', 50, 30, 20],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_logistica_productos.xlsx');
  };

  // Stats for preview
  const previewStats = useMemo(() => {
    const valid = validationResults.filter(r => r.status === 'valid').length;
    const warnings = validationResults.filter(r => r.status === 'warning').length;
    const errors = validationResults.filter(r => r.status === 'error').length;
    return { valid, warnings, errors, total: validationResults.length };
  }, [validationResults]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Datos Logísticos
          </DialogTitle>
          <DialogDescription>
            Actualiza peso, dimensiones y configuración de envío para múltiples productos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Sube un archivo Excel o CSV con los datos logísticos. El archivo debe incluir al menos SKU y Peso.
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">Seleccionar archivo</span>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: Excel (.xlsx, .xls), CSV
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Mapea las columnas de tu archivo a los campos correspondientes
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                {COLUMN_OPTIONS.map(col => (
                  <div key={col.key} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {col.label}
                      {col.required && <Badge variant="destructive" className="text-[10px]">Requerido</Badge>}
                    </Label>
                    <Select
                      value={columnMapping[col.key] || ''}
                      onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [col.key]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No mapear</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {header || `Columna ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {rawData.length} filas de datos encontradas
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  {previewStats.valid} válidos
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {previewStats.warnings} advertencias
                </Badge>
                <Badge variant="destructive">
                  <X className="h-3 w-3 mr-1" />
                  {previewStats.errors} errores
                </Badge>
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-16">Fila</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Oversize</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Mensaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result, index) => (
                      <TableRow 
                        key={index}
                        className={
                          result.status === 'error' ? 'bg-red-50' :
                          result.status === 'warning' ? 'bg-amber-50' : ''
                        }
                      >
                        <TableCell>{result.row}</TableCell>
                        <TableCell>
                          {result.status === 'valid' && <Check className="h-4 w-4 text-green-600" />}
                          {result.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                          {result.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{result.sku}</TableCell>
                        <TableCell>{result.data.weight_kg ?? '-'}</TableCell>
                        <TableCell>{result.data.is_oversize ? 'Sí' : 'No'}</TableCell>
                        <TableCell>{result.data.shipping_mode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{result.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-8 space-y-4 text-center">
              <div className="text-lg font-medium">Importando datos...</div>
              <Progress value={importProgress} className="w-full" />
              <div className="text-muted-foreground">{importProgress}% completado</div>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="py-8 space-y-4">
              <div className="text-center space-y-2">
                <Check className="h-12 w-12 mx-auto text-green-600" />
                <div className="text-lg font-medium">Importación completada</div>
              </div>

              <div className="flex justify-center gap-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-base py-2 px-4">
                  {importResults.success} actualizados
                </Badge>
                {importResults.failed > 0 && (
                  <Badge variant="destructive" className="text-base py-2 px-4">
                    {importResults.failed} fallidos
                  </Badge>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-medium mb-2">Errores:</div>
                    <ul className="list-disc list-inside text-sm">
                      {importResults.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
              <Button onClick={handleValidate}>
                Validar y Previsualizar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>Atrás</Button>
              <Button 
                onClick={handleImport}
                disabled={previewStats.valid === 0 && previewStats.warnings === 0}
              >
                Importar {previewStats.valid + previewStats.warnings} productos
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogisticsImportDialog;
