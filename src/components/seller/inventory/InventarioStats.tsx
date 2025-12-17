import { Package, PackageCheck, DollarSign, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface InventarioStatsProps {
  totalProducts: number;
  activeProducts: number;
  totalStock: number;
  totalValue: number;
  avgMargin: number;
}

export function InventarioStats({ 
  totalProducts, 
  activeProducts, 
  totalStock, 
  totalValue, 
  avgMargin 
}: InventarioStatsProps) {
  const stats = [
    {
      label: "Total Productos",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Publicados",
      value: activeProducts,
      icon: PackageCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Stock Total",
      value: totalStock,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Valor Inventario",
      value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Margen Promedio",
      value: `${avgMargin.toFixed(1)}%`,
      icon: Percent,
      color: avgMargin < 0 ? "text-red-600" : "text-emerald-600",
      bgColor: avgMargin < 0 ? "bg-red-50" : "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
