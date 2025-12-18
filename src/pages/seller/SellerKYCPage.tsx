import { SellerLayout } from "@/components/seller/SellerLayout";
import { KYCUploadForm } from "@/components/seller/KYCUploadForm";
import { CreditReferralDashboard } from "@/components/seller/CreditReferralDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CreditCard } from "lucide-react";

const SellerKYCPage = () => {
  return (
    <SellerLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Seguridad y Créditos</h1>
        
        <Tabs defaultValue="verification" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verificación
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Créditos y Referidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verification">
            <KYCUploadForm />
          </TabsContent>

          <TabsContent value="credits">
            <CreditReferralDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
};

export default SellerKYCPage;
