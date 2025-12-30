import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Palette, 
  Ruler, 
  Calendar,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useNormalizeProducts } from '@/hooks/useNormalizeProducts';

interface ProductNormalizationToolProps {
  onComplete?: () => void;
}

export function ProductNormalizationTool({ onComplete }: ProductNormalizationToolProps) {
  const { 
    isLoading, 
    previewData, 
    migrationResult, 
    fetchPreview, 
    executeMigration,
    reset 
  } = useNormalizeProducts();
  
  const [step, setStep] = useState<'initial' | 'preview' | 'confirm' | 'migrating' | 'complete'>('initial');

  const handleFetchPreview = async () => {
    const result = await fetchPreview();
    if (result) {
      setStep('preview');
    }
  };

  const handleExecuteMigration = async () => {
    setStep('migrating');
    const result = await executeMigration(false);
    if (result) {
      setStep('complete');
      onComplete?.();
    } else {
      setStep('preview');
    }
  };

  const handleReset = () => {
    reset();
    setStep('initial');
  };

  // Initial state - show button to analyze
  if (step === 'initial') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Normalización de Productos
          </CardTitle>
          <CardDescription>
            Esta herramienta analiza los productos actuales y migra las variantes (color, talla, edad) 
            al modelo EAV normalizado para un mejor rendimiento y gestión.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Información Importante</AlertTitle>
            <AlertDescription>
              Los productos con variantes en el SKU (ej: 1005005691868544-3-4t-110-champagne) 
              serán convertidos a un producto padre con variantes vinculadas.
            </AlertDescription>
          </Alert>
          
          <Button onClick={handleFetchPreview} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                Analizar Productos
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Preview state - show analysis results
  if (step === 'preview' && previewData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vista Previa de Migración
          </CardTitle>
          <CardDescription>
            Se detectaron {previewData.totalProducts} productos que representan {previewData.uniqueParentSkus} productos únicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">{previewData.totalProducts}</div>
              <div className="text-sm text-muted-foreground">Productos Actuales</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{previewData.uniqueParentSkus}</div>
              <div className="text-sm text-muted-foreground">Productos Padre</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">
                {previewData.totalProducts - previewData.uniqueParentSkus}
              </div>
              <div className="text-sm text-muted-foreground">Variantes a Crear</div>
            </Card>
          </div>

          {/* Product groups */}
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-4">
              {previewData.details.map((detail) => (
                <Card key={detail.parentSku} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{detail.sampleName}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {detail.parentSku}</p>
                    </div>
                    <Badge variant="outline">{detail.variantCount} variantes</Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {detail.colorsFound.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        {detail.colorsFound.map((color) => (
                          <Badge key={color} variant="secondary" className="text-xs">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {detail.sizesFound.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        {detail.sizesFound.map((size) => (
                          <Badge key={size} variant="secondary" className="text-xs">
                            {size}cm
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {detail.agesFound.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {detail.agesFound.map((age) => (
                          <Badge key={age} variant="secondary" className="text-xs">
                            {age}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Stock total: {detail.totalStock} unidades
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Antes de continuar</AlertTitle>
            <AlertDescription>
              Esta operación es irreversible. Los productos originales serán desactivados 
              y se crearán las variantes normalizadas. Se recomienda hacer un respaldo primero.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
            <Button onClick={handleExecuteMigration} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  Ejecutar Migración
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Migrating state
  if (step === 'migrating') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Migrando Productos...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={undefined} className="w-full" />
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Por favor espere mientras se procesan los productos...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Complete state
  if (step === 'complete' && migrationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Migración Completada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {migrationResult.parentProductsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Productos Padre</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {migrationResult.variantsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Variantes Creadas</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {migrationResult.attributeOptionsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Opciones de Atributo</div>
            </Card>
          </div>

          {migrationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errores durante la migración</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2">
                  {migrationResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleReset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Realizar otra migración
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
