import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Palette, Ruler, Zap, Package, ImageIcon, CheckCircle2, Tag, List, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export interface AttributeConfig {
  id: string;
  nameType: 'manual' | 'column';
  nameValue: string;
  valueColumn: string;
  imageColumn?: string; // Kept for compatibility but now auto-mapped
}

interface AttributeConfigCardProps {
  config: AttributeConfig;
  index: number;
  availableColumns: string[];
  rawData: string[][];
  headers: string[];
  imageColumnName?: string; // The main image column from mapping
  onUpdate: (id: string, updates: Partial<AttributeConfig>) => void;
  onRemove: (id: string) => void;
}

// Valid image extensions and CDN domains
const VALID_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
const KNOWN_IMAGE_CDNS = ['alicdn.com', 'aliexpress.com', 'cbu01.alicdn.com', '1688.com', 'cloudinary.com', 'imgur.com', 'unsplash.com'];

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;
  
  // Check if it's a valid URL structure (starts with http or https)
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(trimmedUrl);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // If it's from a known image CDN, consider it valid
    if (KNOWN_IMAGE_CDNS.some(cdn => hostname.includes(cdn))) {
      return true;
    }
    
    // Check if pathname contains image-related paths
    if (pathname.includes('/img/') || pathname.includes('/image/') || pathname.includes('/images/') || pathname.includes('/ibank/')) {
      return true;
    }
    
    // Check for valid image extensions
    const cleanPathname = pathname.split('?')[0]; // Remove query string
    if (VALID_IMAGE_EXTENSIONS.some(ext => cleanPathname.endsWith(`.${ext}`))) {
      return true;
    }
    
    return false;
  } catch {
    // If URL parsing fails, check for image extensions in the string
    const lowerUrl = trimmedUrl.toLowerCase();
    return VALID_IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(`.${ext}`));
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
  imageColumnName,
  onUpdate,
  onRemove,
}: AttributeConfigCardProps) => {
  // Get unique values with their corresponding image URLs from the same row
  const valueImagePairs = useMemo(() => {
    if (!config.valueColumn) return [];
    const valueColIndex = headers.indexOf(config.valueColumn);
    const imageColIndex = imageColumnName ? headers.indexOf(imageColumnName) : -1;
    
    if (valueColIndex === -1) return [];
    
    // Map: value -> first image found for that value
    const valueToImage = new Map<string, string>();
    
    rawData.forEach((row) => {
      const val = row[valueColIndex]?.trim();
      if (val && val !== '' && val.toLowerCase() !== 'n/a') {
        // Only set image if we haven't seen this value before (first occurrence wins)
        if (!valueToImage.has(val)) {
          if (imageColIndex !== -1) {
            const imgUrl = row[imageColIndex]?.trim();
            
            if (imgUrl && isValidImageUrl(imgUrl)) {
              valueToImage.set(val, imgUrl);
            } else {
              valueToImage.set(val, ''); // Mark as seen but no valid image
            }
          } else {
            valueToImage.set(val, '');
          }
        }
      }
    });
    
    return Array.from(valueToImage.entries()).map(([value, imageUrl]) => ({
      value,
      imageUrl,
    }));
  }, [config.valueColumn, headers, rawData, imageColumnName]);

  const uniqueValues = valueImagePairs.map(p => p.value);
  const valuesWithImages = valueImagePairs.filter(p => p.imageUrl).length;

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
        </div>

        {/* SECTION 3: Auto-mapped Images Preview */}
        {config.valueColumn && valueImagePairs.length > 0 && (
          <div className="space-y-3 p-3 border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-green-600" />
                <Label className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                  Imágenes Asociadas Automáticamente
                </Label>
              </div>
              {valuesWithImages > 0 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {valuesWithImages} de {uniqueValues.length} con imagen
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Cada valor se asocia con la imagen de su fila en el Excel 
              {imageColumnName && <span className="font-medium"> (columna: {imageColumnName})</span>}
            </p>

            {/* Preview grid of values with their images */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {valueImagePairs.slice(0, 8).map(({ value, imageUrl }) => (
                <div 
                  key={value} 
                  className="flex items-center gap-2 p-2 rounded-md bg-background border"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={value}
                      className="w-8 h-8 rounded object-cover border shadow-sm flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-xs font-medium truncate">{value}</span>
                </div>
              ))}
            </div>
            
            {valueImagePairs.length > 8 && (
              <p className="text-xs text-muted-foreground text-center">
                +{valueImagePairs.length - 8} valores más...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttributeConfigCard;
