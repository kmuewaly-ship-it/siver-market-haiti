import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MarginAlert } from "./MarginAlert";
import { SellerCatalogItem } from "@/hooks/useSellerCatalog";

interface PublicacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SellerCatalogItem | null;
  onSave: (itemId: string, precioVenta: number, isActive: boolean) => Promise<boolean>;
}

export function PublicacionDialog({ 
  open, 
  onOpenChange, 
  item, 
  onSave 
}: PublicacionDialogProps) {
  const [precioVenta, setPrecioVenta] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setPrecioVenta(item.precioVenta.toString());
      setIsActive(item.isActive);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    
    const precio = parseFloat(precioVenta);
    if (isNaN(precio) || precio < 0) {
      return;
    }

    setIsSaving(true);
    const success = await onSave(item.id, precio, isActive);
    setIsSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  if (!item) return null;

  const precioNumerico = parseFloat(precioVenta) || 0;
  const margin = item.precioCosto > 0 
    ? ((precioNumerico - item.precioCosto) / item.precioCosto) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Publicación B2C</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="flex gap-4 p-3 bg-muted rounded-lg">
            {item.images[0] && (
              <img 
                src={item.images[0]} 
                alt={item.nombre}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{item.nombre}</h4>
              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
              <p className="text-sm text-muted-foreground">Stock: {item.stock} unidades</p>
            </div>
          </div>

          {/* Cost Reference */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Precio de Costo (B2B):</strong> ${item.precioCosto.toFixed(2)}
            </p>
          </div>

          {/* Sale Price Input */}
          <div className="space-y-2">
            <Label htmlFor="precioVenta">Precio de Venta B2C</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="precioVenta"
                type="number"
                step="0.01"
                min="0"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Margin Display */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-muted-foreground">Margen de Ganancia:</span>
            <span className={`font-semibold ${margin < 0 ? 'text-red-600' : margin < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
              {margin.toFixed(1)}%
              {precioNumerico > item.precioCosto && (
                <span className="text-muted-foreground ml-2">
                  (+${(precioNumerico - item.precioCosto).toFixed(2)}/unidad)
                </span>
              )}
            </span>
          </div>

          {/* Margin Alert */}
          <MarginAlert 
            precioVenta={precioNumerico} 
            precioCosto={item.precioCosto} 
          />

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="isActive" className="font-medium">Publicar en tienda</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? "Visible para clientes B2C" : "Oculto de la tienda pública"}
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
