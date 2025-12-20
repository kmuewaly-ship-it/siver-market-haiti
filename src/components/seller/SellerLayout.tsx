import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import Header from "@/components/layout/Header";
import SellerMobileHeader from "@/components/seller/SellerMobileHeader";
import SellerDesktopHeader from "@/components/seller/SellerDesktopHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface SellerLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerVariant?: 'public' | 'seller';
  selectedCategoryId?: string | null;
  onCategorySelect?: (categoryId: string | null) => void;
  onSearch?: (query: string) => void;
}

export function SellerLayout({ 
  children, 
  showHeader = true,
  headerVariant = 'public',
  selectedCategoryId = null,
  onCategorySelect = () => {},
  onSearch 
}: SellerLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <SellerSidebar />
        <main className="flex-1 w-full relative">
          {showHeader && (
            isMobile ? (
              <SellerMobileHeader 
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={onCategorySelect}
                onSearch={onSearch}
              />
            ) : (
              headerVariant === 'seller' ? <SellerDesktopHeader /> : <Header />
            )
          )}
          <div className="md:hidden fixed bottom-24 left-6 z-50">
            <SidebarTrigger className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl rounded-full w-12 h-12 border-2 border-white" />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
