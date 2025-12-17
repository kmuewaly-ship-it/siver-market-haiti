import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MarginAlertProps {
  precioVenta: number;
  precioCosto: number;
  className?: string;
}

export function MarginAlert({ precioVenta, precioCosto, className }: MarginAlertProps) {
  const margin = precioCosto > 0 ? ((precioVenta - precioCosto) / precioCosto) * 100 : 0;
  const isLoss = precioVenta < precioCosto;
  const isLowMargin = margin > 0 && margin < 10;

  if (!isLoss && !isLowMargin) return null;

  return (
    <Alert 
      variant={isLoss ? "destructive" : "default"} 
      className={className}
    >
      {isLoss ? (
        <TrendingDown className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
      )}
      <AlertDescription className={isLoss ? "" : "text-yellow-700"}>
        {isLoss ? (
          <>
            <strong>Alerta de pérdida:</strong> El precio de venta (${precioVenta.toFixed(2)}) es menor 
            que el costo (${precioCosto.toFixed(2)}). Perderás ${(precioCosto - precioVenta).toFixed(2)} por unidad.
          </>
        ) : (
          <>
            <strong>Margen bajo:</strong> Tu margen actual es solo del {margin.toFixed(1)}%. 
            Considera aumentar el precio para mayor rentabilidad.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
