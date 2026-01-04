import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Palette, Ruler, Zap, Package, ImageIcon, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
  return VALID_IMAGE_EXTENSIONS.includes(extension || '');
};

const getAttributeIcon = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes('color') || lower.includes('colour')) return <Palette className="h-4 w-4 text-pink-500" />;
  if (lower.includes('size') || lower.includes('talla')) return <Ruler className="h-4 w-4 text-blue-500" />;
  if (lower.includes('volt') || lower.includes('watt') || lower.includes('power')) return <Zap className="h-4 w-4 text-yellow-500" />;
  return <Package className="h-4 w-4 text-muted-foreground" />;
};

const getIconBgColor = (type: string) => {
  const lower = type.toLowerCase();
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
  const getUniqueValues = () => {
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
  };

  // Get image URLs for the selected image column
  const getImageStats = () => {
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
  };

  const uniqueValues = getUniqueValues();
  const imageStats = getImageStats();
  const displayName = config.nameType === 'manual' ? config.nameValue : config.valueColumn;

  return (
    <Card className="border-2 border-dashed hover:border-solid transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              getIconBgColor(displayName || config.valueColumn)
            )}>
              {getAttributeIcon(displayName || config.valueColumn)}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                Atributo {index + 1}: {displayName || 'Sin nombre'}
              </CardTitle>
              {uniqueValues.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {uniqueValues.length} valores únicos
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
      
      <CardContent className="space-y-4">
        {/* Name Type Selection */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nombre del Atributo
          </Label>
          <RadioGroup
            value={config.nameType}
            onValueChange={(value: 'manual' | 'column') => 
              onUpdate(config.id, { nameType: value, nameValue: value === 'column' ? config.valueColumn : config.nameValue })
            }
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="manual" id={`manual-${config.id}`} />
              <Label htmlFor={`manual-${config.id}`} className="text-sm font-normal flex-1">
                Nombre manual
              </Label>
              {config.nameType === 'manual' && (
                <Input
                  value={config.nameValue}
                  onChange={(e) => onUpdate(config.id, { nameValue: e.target.value })}
                  placeholder="Ej: Color, Talla Europea..."
                  className="h-8 w-48"
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="column" id={`column-${config.id}`} />
              <Label htmlFor={`column-${config.id}`} className="text-sm font-normal">
                Usar nombre de columna
              </Label>
              {config.nameType === 'column' && config.valueColumn && (
                <Badge variant="secondary" className="text-xs">
                  {config.valueColumn}
                </Badge>
              )}
            </div>
          </RadioGroup>
        </div>

        {/* Value Column Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Columna de Valores
          </Label>
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
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Seleccionar columna..." />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map(col => (
                <SelectItem key={col} value={col}>
                  <span className="flex items-center gap-2">
                    {getAttributeIcon(col)}
                    {col}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unique Values Preview */}
        {uniqueValues.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Vista Previa de Valores
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {uniqueValues.slice(0, 8).map(val => (
                <Badge key={val} variant="outline" className="text-xs">
                  {val}
                </Badge>
              ))}
              {uniqueValues.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{uniqueValues.length - 8} más
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Image Column Selection (Optional) */}
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ImageIcon className="h-3 w-3" />
            Columna de Imagen (Opcional)
          </Label>
          <Select
            value={config.imageColumn || '__none__'}
            onValueChange={(value) => onUpdate(config.id, { imageColumn: value === '__none__' ? undefined : value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sin imagen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin imagen</SelectItem>
              {availableColumns.map(col => (
                <SelectItem key={col} value={col}>
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-3 w-3" />
                    {col}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Asigna una columna de imagen para mostrar miniaturas en el selector de variantes
          </p>
        </div>

        {/* Image Preview & Validation */}
        {config.imageColumn && imageStats.total > 0 && (
          <div className="space-y-2 bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                {imageStats.valid} válidas
              </div>
              {imageStats.invalid > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3 w-3" />
                  {imageStats.invalid} inválidas
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
                    className="w-10 h-10 rounded object-cover border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Formatos válidos: JPG, JPEG, PNG, WebP, GIF
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttributeConfigCard;
