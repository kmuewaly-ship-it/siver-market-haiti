import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Palette, Ruler, Zap, Package, ImageIcon, CheckCircle2, XCircle, Tag, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export interface AttributeConfig {
  id: string;
  nameType: 'manual' | 'column';
  nameValue: string;
  valueColumn: string;
  imageColumn?: string;
}

interface AttributeConfigCardProps {
  config: AttributeConfig;
  index: number;
  availableColumns: string[];
  rawData: string[][];
  headers: string[];
  onUpdate: (id: string, updates: Partial<AttributeConfig>) => void;
  onRemove: (id: string) => void;
}

// Valid image extensions
const VALID_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    // Check if it's a valid URL with image extension
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return VALID_IMAGE_EXTENSIONS.some(ext => pathname.endsWith(`.${ext}`));
  } catch {
    // If not a valid URL, check extension directly
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    return VALID_IMAGE_EXTENSIONS.includes(extension || '');
  }
};

const getAttributeIcon = (type: string) => {
  const lower = (type || '').toLowerCase();
  if (lower.includes('color') || lower.includes('colour')) return <Palette className="h-4 w-4 text-pink-500" />;
  if (lower.includes('size') || lower.includes('talla')) return <Ruler className="h-4 w-4 text-blue-500" />;
  if (lower.includes('volt') || lower.includes('watt') || lower.includes('power')) return <Zap className="h-4 w-4 text-yellow-500" />;
  return <Package className="h-4 w-4 text-muted-foreground" />;
};

const getIconBgColor = (type: string) => {
  const lower = (type || '').toLowerCase();
  if (lower.includes('color') || lower.includes('colour')) return 'bg-pink-100 dark:bg-pink-900/30';
  if (lower.includes('size') || lower.includes('talla')) return 'bg-blue-100 dark:bg-blue-900/30';
  if (lower.includes('volt') || lower.includes('watt') || lower.includes('power')) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-muted';
};

export const AttributeConfigCard = ({
  config,
  index,
  availableColumns,
  rawData,
  headers,
  onUpdate,
  onRemove,
}: AttributeConfigCardProps) => {
  // Get unique values for the selected value column
  const uniqueValues = useMemo(() => {
    if (!config.valueColumn) return [];
    const colIndex = headers.indexOf(config.valueColumn);
    if (colIndex === -1) return [];
    
    const values = new Set<string>();
    rawData.forEach(row => {
      const val = row[colIndex]?.trim();
      if (val && val !== '' && val.toLowerCase() !== 'n/a') {
        values.add(val);
      }
    });
    return Array.from(values);
  }, [config.valueColumn, headers, rawData]);

  // Detect columns that contain image URLs
  const imageColumns = useMemo(() => {
    return headers.filter(header => {
      const colIndex = headers.indexOf(header);
      if (colIndex === -1) return false;
      
      // Check first 5 rows to see if column contains image URLs
      let validCount = 0;
      const samplesToCheck = Math.min(5, rawData.length);
      
      for (let i = 0; i < samplesToCheck; i++) {
        const val = rawData[i]?.[colIndex]?.trim();
        if (val && isValidImageUrl(val)) {
          validCount++;
        }
      }
      
      // Consider it an image column if at least 2 valid URLs found
      return validCount >= 2;
    });
  }, [headers, rawData]);

  // Get image URLs for the selected image column
  const imageStats = useMemo(() => {
    if (!config.imageColumn) return { total: 0, valid: 0, invalid: 0, samples: [] as string[] };
    const colIndex = headers.indexOf(config.imageColumn);
    if (colIndex === -1) return { total: 0, valid: 0, invalid: 0, samples: [] as string[] };
    
    let valid = 0;
    let invalid = 0;
    const samples: string[] = [];
    
    rawData.forEach(row => {
      const url = row[colIndex]?.trim();
      if (url) {
        if (isValidImageUrl(url)) {
          valid++;
          if (samples.length < 4) samples.push(url);
        } else {
          invalid++;
        }
      }
    });
    
    return { total: valid + invalid, valid, invalid, samples };
  }, [config.imageColumn, headers, rawData]);

  const displayName = config.nameType === 'manual' ? config.nameValue : config.valueColumn;

  return (
    <Card className="border-2 border-dashed hover:border-solid transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              getIconBgColor(displayName || '')
            )}>
              {getAttributeIcon(displayName || '')}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                Atributo {index + 1}: {displayName || 'Sin configurar'}
              </CardTitle>
              {uniqueValues.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {uniqueValues.length} valores únicos encontrados
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(config.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* SECTION 1: Attribute Name Configuration */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <Label className="text-xs font-semibold uppercase tracking-wide">
              1. Nombre del Atributo
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Ej: "Color", "Talla", "Voltaje" - Es el nombre que verán los compradores
          </p>
          
          <RadioGroup
            value={config.nameType}
            onValueChange={(value: 'manual' | 'column') => 
              onUpdate(config.id, { 
                nameType: value, 
                nameValue: value === 'column' ? config.valueColumn : config.nameValue 
              })
            }
            className="space-y-3"
          >
            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="manual" id={`manual-${config.id}`} className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor={`manual-${config.id}`} className="text-sm font-normal cursor-pointer">
                  Escribir nombre manualmente
                </Label>
                {config.nameType === 'manual' && (
                  <Input
                    value={config.nameValue}
                    onChange={(e) => onUpdate(config.id, { nameValue: e.target.value })}
                    placeholder="Ej: Color, Talla Europea, Material..."
                    className="h-9"
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="column" id={`column-${config.id}`} className="mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor={`column-${config.id}`} className="text-sm font-normal cursor-pointer">
                  Usar nombre de columna del Excel
                </Label>
                {config.nameType === 'column' && config.valueColumn && (
                  <Badge variant="secondary" className="text-xs">
                    Nombre: "{config.valueColumn}"
                  </Badge>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* SECTION 2: Value Column Selection */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <Label className="text-xs font-semibold uppercase tracking-wide">
              2. Columna de Valores
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Selecciona la columna que contiene los valores: Rojo, Verde, S, M, L, etc.
          </p>
          
          <Select
            value={config.valueColumn}
            onValueChange={(value) => {
              const updates: Partial<AttributeConfig> = { valueColumn: value };
              if (config.nameType === 'column') {
                updates.nameValue = value;
              }
              onUpdate(config.id, updates);
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Seleccionar columna de valores..." />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map(col => (
                <SelectItem key={col} value={col}>
                  <span className="flex items-center gap-2">
                    {getAttributeIcon(col)}
                    <span className="font-medium">{col}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Unique Values Preview */}
          {uniqueValues.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs text-muted-foreground">
                Valores encontrados:
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {uniqueValues.slice(0, 10).map(val => (
                  <Badge key={val} variant="outline" className="text-xs font-normal">
                    {val}
                  </Badge>
                ))}
                {uniqueValues.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{uniqueValues.length - 10} más
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Image Column Selection (Optional) */}
        <div className="space-y-3 p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <Label className="text-xs font-semibold uppercase tracking-wide">
              3. Imagen del Valor (Opcional)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Asocia una imagen a cada valor del atributo (ej: foto del color rojo)
          </p>
          
          {imageColumns.length > 0 ? (
            <>
              <Select
                value={config.imageColumn || '__none__'}
                onValueChange={(value) => onUpdate(config.id, { 
                  imageColumn: value === '__none__' ? undefined : value 
                })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sin imagen asociada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Sin imagen asociada</span>
                  </SelectItem>
                  {imageColumns.map(col => (
                    <SelectItem key={col} value={col}>
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-3 w-3 text-green-600" />
                        <span className="font-medium">{col}</span>
                        <span className="text-xs text-muted-foreground">(contiene URLs)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Image Preview & Validation */}
              {config.imageColumn && imageStats.total > 0 && (
                <div className="space-y-2 bg-muted/50 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      {imageStats.valid} imágenes válidas
                    </div>
                    {imageStats.invalid > 0 && (
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3 w-3" />
                        {imageStats.invalid} URLs inválidas
                      </div>
                    )}
                  </div>
                  {imageStats.samples.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {imageStats.samples.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Preview ${i + 1}`}
                          className="w-12 h-12 rounded-md object-cover border shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="flex items-center gap-2">
                <XCircle className="h-3 w-3" />
                No se detectaron columnas con URLs de imágenes válidas
              </p>
              <p className="mt-1 text-[10px]">
                Formatos soportados: JPG, JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttributeConfigCard;
