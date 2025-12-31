import { SellerLayout } from "@/components/seller/SellerLayout";
import { CreditReferralDashboard } from "@/components/seller/CreditReferralDashboard";
import { useKYC } from "@/hooks/useKYC";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const SellerCreditPage = () => {
  const { isVerified, isLoading } = useKYC();

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="p-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#071d7f]" />
            <p className="text-gray-600">Cargando información de crédito...</p>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  if (!isVerified) {
    return (
      <SellerLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/30">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800 dark:text-orange-200">
              Verificación Requerida
            </AlertTitle>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              Debes completar tu verificación KYC en "Mi Cuenta" para acceder al sistema de créditos.
            </AlertDescription>
          </Alert>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Créditos y Referidos</h1>
        <CreditReferralDashboard />
      </div>
    </SellerLayout>
  );
};

export default SellerCreditPage;
