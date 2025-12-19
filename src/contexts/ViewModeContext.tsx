import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";

type ViewMode = "b2b" | "client";

interface ViewModeContextType {
  viewMode: ViewMode;
  toggleViewMode: () => void;
  isClientPreview: boolean;
  canToggle: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const ViewModeProvider = ({ children }: { children: ReactNode }) => {
  const { role } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("b2b");

  // Solo sellers y admins pueden alternar
  const canToggle = role === UserRole.SELLER || role === UserRole.ADMIN;

  // Reset to b2b when role changes or user logs out
  useEffect(() => {
    if (!canToggle) {
      setViewMode("b2b");
    }
  }, [canToggle]);

  const toggleViewMode = () => {
    if (canToggle) {
      setViewMode((prev) => (prev === "b2b" ? "client" : "b2b"));
    }
  };

  const isClientPreview = viewMode === "client";

  return (
    <ViewModeContext.Provider value={{ viewMode, toggleViewMode, isClientPreview, canToggle }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used within ViewModeProvider");
  }
  return context;
};
