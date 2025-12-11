import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCatalog } from '@/hooks/useCatalog';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  sku_interno: string;
  nombre: string;
  descripcion_corta?: string;
  precio_mayorista: number;
  moq: number;
  stock_fisico: number;
  url_imagen?: string;
  errors: string[];
  isValid: boolean;
}

interface ColumnMapping {
  sku_interno: string;
  nombre: string;
  descripcion_corta: string;
  precio_mayorista: string;
  moq: string;
  stock_fisico: string;
  url_imagen: string;
}

const TEMPLATE_COLUMNS = [
  'SKU_Interno',
  'Nombre',
  'Descripcion_Corta',
  'Precio_Mayorista',
  'MOQ_Cantidad_Minima',
  'Stock_Fisico',
  'URL_Imagen_Principal'
];

const DEFAULT_MAPPING: ColumnMapping = {
  sku_interno: 'SKU_Interno',
  nombre: 'Nombre',
  descripcion_corta: 'Descripcion_Corta',
  precio_mayorista: 'Precio_Mayorista',
  moq: 'MOQ_Cantidad_Minima',
  stock_fisico: 'Stock_Fisico',
  url_imagen: 'URL_Imagen_Principal'
};

const BulkImportDialog = ({ open, onOpenChange }: BulkImportDialogProps) => {
  const { bulkImportProducts } = useCatalog();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplate = () => {
    const csvContent = TEMPLATE_COLUMNS.join(',') + '\n' +
      'SKU-001,Producto Ejemplo,Descripción del producto,25.99,10,100,https://ejemplo.com/imagen.jpg';
    
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
        // Handle CSV with quotes
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
        
        // Auto-detect mapping
        const autoMapping = { ...DEFAULT_MAPPING };
        parsed[0].forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('sku') || lowerHeader.includes('codigo')) {
            autoMapping.sku_interno = header;
          } else if (lowerHeader.includes('nombre') || lowerHeader.includes('name') || lowerHeader.includes('title')) {
            autoMapping.nombre = header;
          } else if (lowerHeader.includes('desc')) {
            autoMapping.descripcion_corta = header;
          } else if (lowerHeader.includes('precio') || lowerHeader.includes('price') || lowerHeader.includes('mayorista')) {
            autoMapping.precio_mayorista = header;
          } else if (lowerHeader.includes('moq') || lowerHeader.includes('minimo') || lowerHeader.includes('min')) {
            autoMapping.moq = header;
          } else if (lowerHeader.includes('stock') || lowerHeader.includes('cantidad') || lowerHeader.includes('qty')) {
            autoMapping.stock_fisico = header;
          } else if (lowerHeader.includes('imagen') || lowerHeader.includes('image') || lowerHeader.includes('url') || lowerHeader.includes('foto')) {
            autoMapping.url_imagen = header;
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
    const parsed: ParsedRow[] = rawData.map((row, rowIndex) => {
      const errors: string[] = [];
      
      const skuIndex = getColumnIndex(mapping.sku_interno);
      const nombreIndex = getColumnIndex(mapping.nombre);
      const descIndex = getColumnIndex(mapping.descripcion_corta);
      const precioIndex = getColumnIndex(mapping.precio_mayorista);
      const moqIndex = getColumnIndex(mapping.moq);
      const stockIndex = getColumnIndex(mapping.stock_fisico);
      const imagenIndex = getColumnIndex(mapping.url_imagen);

      const sku = skuIndex >= 0 ? row[skuIndex]?.trim() : '';
      const nombre = nombreIndex >= 0 ? row[nombreIndex]?.trim() : '';
      const descripcion = descIndex >= 0 ? row[descIndex]?.trim() : '';
      const precioStr = precioIndex >= 0 ? row[precioIndex]?.trim() : '0';
      const moqStr = moqIndex >= 0 ? row[moqIndex]?.trim() : '1';
      const stockStr = stockIndex >= 0 ? row[stockIndex]?.trim() : '0';
      const imagen = imagenIndex >= 0 ? row[imagenIndex]?.trim() : '';

      // Validations
      if (!sku) errors.push('SKU requerido');
      if (!nombre) errors.push('Nombre requerido');
      
      const precio = parseFloat(precioStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(precio) || precio < 0) errors.push('Precio inválido');
      
      const moq = parseInt(moqStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(moq) || moq < 1) errors.push('MOQ debe ser >= 1');
      
      const stock = parseInt(stockStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(stock) || stock < 0) errors.push('Stock inválido');

      return {
        sku_interno: sku,
        nombre,
        descripcion_corta: descripcion || undefined,
        precio_mayorista: isNaN(precio) ? 0 : precio,
        moq: isNaN(moq) ? 1 : moq,
        stock_fisico: isNaN(stock) ? 0 : stock,
        url_imagen: imagen || undefined,
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
        precio_mayorista: row.precio_mayorista,
        moq: row.moq,
        stock_fisico: row.stock_fisico,
        imagen_principal: row.url_imagen,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Carga Masiva de Productos
          </DialogTitle>
          <DialogDescription>
            Importe productos desde un archivo CSV o Excel
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
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
                <li><span className="font-mono text-xs bg-background px-1 rounded">Precio_Mayorista</span> - Precio B2B en USD</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">MOQ_Cantidad_Minima</span> - Mínimo de pedido</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">Stock_Fisico</span> - Unidades disponibles</li>
                <li><span className="font-mono text-xs bg-background px-1 rounded">URL_Imagen_Principal</span> - URL de la imagen</li>
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Atrás</Button>
              <Button onClick={validateAndParse}>Validar y Previsualizar</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
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
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, index) => (
                    <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.sku_interno}</TableCell>
                      <TableCell>{row.nombre}</TableCell>
                      <TableCell>${row.precio_mayorista.toFixed(2)}</TableCell>
                      <TableCell>{row.moq}</TableCell>
                      <TableCell>{row.stock_fisico}</TableCell>
                      <TableCell className="text-destructive text-xs">
                        {row.errors.join(', ')}
                      </TableCell>
                    </TableRow>
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
