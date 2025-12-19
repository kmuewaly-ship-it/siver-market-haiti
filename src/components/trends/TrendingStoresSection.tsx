import { useTrendingStores } from "@/hooks/useTrendingStores";
import TrendingStoreCard from "./TrendingStoreCard";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

const TrendingStoresSection = () => {
  const { data: stores, isLoading } = useTrendingStores(6);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-full">
            <TrendingUp className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tiendas en Tendencia</h2>
            <p className="text-muted-foreground text-sm">Las tiendas más populares del momento</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j}>
                    <Skeleton className="aspect-[3/4] rounded-sm" />
                    <Skeleton className="h-4 w-16 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!stores || stores.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-full">
          <TrendingUp className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tiendas en Tendencia</h2>
          <p className="text-muted-foreground text-sm">Las tiendas más populares del momento</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {stores.map((store) => (
          <TrendingStoreCard key={store.id} store={store} />
        ))}
      </div>
    </section>
  );
};

export default TrendingStoresSection;
