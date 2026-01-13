import { SellerLayout } from "@/components/seller/SellerLayout";
import { SellerMarketingTools } from "@/components/seller/SellerMarketingTools";

const SellerMarketingPage = () => {
  return (
    <SellerLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <SellerMarketingTools />
      </div>
    </SellerLayout>
  );
};

export default SellerMarketingPage;
