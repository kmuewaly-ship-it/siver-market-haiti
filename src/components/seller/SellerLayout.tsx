import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/seller/SellerSidebar";

interface SellerLayoutProps {
  children: ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex w-full">
        <SellerSidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
