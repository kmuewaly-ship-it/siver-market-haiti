import { SellerLayout } from "@/components/seller/SellerLayout";
import { SellerAnalyticsDashboard } from "@/components/seller/SellerAnalyticsDashboard";

const SellerAnalyticsPage = () => {
  return (
    <SellerLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <SellerAnalyticsDashboard />
      </div>
    </SellerLayout>
  );
};

export default SellerAnalyticsPage;
