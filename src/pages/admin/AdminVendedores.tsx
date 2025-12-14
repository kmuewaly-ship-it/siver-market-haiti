import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  is_verified: boolean | null;
  created_at: string;
  user_id: string | null;
}

const AdminVendedores = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionSeller, setActionSeller] = useState<Seller | null>(null);
  const [actionType, setActionType] = useState<"verify" | "unverify" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSellers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Error al cargar vendedores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleVerifyAction = async () => {
    if (!actionSeller || !actionType) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sellers")
        .update({ is_verified: actionType === "verify" })
        .eq("id", actionSeller.id);

      if (error) throw error;

      toast.success(
        actionType === "verify"
          ? `Vendedor ${actionSeller.name} verificado exitosamente`
          : `Vendedor ${actionSeller.name} desverificado`
      );

      // Update local state
      setSellers((prev) =>
        prev.map((s) =>
          s.id === actionSeller.id
            ? { ...s, is_verified: actionType === "verify" }
            : s
        )
      );
    } catch (error) {
      console.error("Error updating seller:", error);
      toast.error("Error al actualizar vendedor");
    } finally {
      setIsProcessing(false);
      setActionSeller(null);
      setActionType(null);
    }
  };

  const filteredSellers = sellers.filter(
    (seller) =>
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingSellers = filteredSellers.filter((s) => !s.is_verified);
  const verifiedSellers = filteredSellers.filter((s) => s.is_verified);

  return (
    <AdminLayout title="Gestión de Vendedores" subtitle="Verifica y gestiona las cuentas de vendedores">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={fetchSellers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, email o negocio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-2xl font-bold">{sellers.length}</div>
            <div className="text-muted-foreground text-sm">Total Vendedores</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-700">
              {sellers.filter((s) => !s.is_verified).length}
            </div>
            <div className="text-yellow-600 text-sm">Pendientes de Verificación</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700">
              {sellers.filter((s) => s.is_verified).length}
            </div>
            <div className="text-green-600 text-sm">Verificados</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Pending Verification */}
            {pendingSellers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserX className="w-5 h-5 text-yellow-500" />
                  Pendientes de Verificación ({pendingSellers.length})
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Fecha Registro</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingSellers.map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{seller.name}</div>
                              {seller.business_name && (
                                <div className="text-sm text-muted-foreground">
                                  {seller.business_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{seller.email}</TableCell>
                          <TableCell>{seller.phone || "-"}</TableCell>
                          <TableCell>
                            {new Date(seller.created_at).toLocaleDateString("es")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              Pendiente
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setActionSeller(seller);
                                setActionType("verify");
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verificar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Verified Sellers */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Vendedores Verificados ({verifiedSellers.length})
              </h2>
              {verifiedSellers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay vendedores verificados
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Fecha Registro</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verifiedSellers.map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{seller.name}</div>
                              {seller.business_name && (
                                <div className="text-sm text-muted-foreground">
                                  {seller.business_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{seller.email}</TableCell>
                          <TableCell>{seller.phone || "-"}</TableCell>
                          <TableCell>
                            {new Date(seller.created_at).toLocaleDateString("es")}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              Verificado
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActionSeller(seller);
                                setActionType("unverify");
                              }}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Revocar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!actionSeller && !!actionType}
        onOpenChange={() => {
          setActionSeller(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "verify" ? "Verificar Vendedor" : "Revocar Verificación"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "verify" ? (
                <>
                  ¿Confirmas que deseas verificar a <strong>{actionSeller?.name}</strong>?
                  <br />
                  Una vez verificado, el vendedor podrá publicar productos en la plataforma.
                </>
              ) : (
                <>
                  ¿Confirmas que deseas revocar la verificación de{" "}
                  <strong>{actionSeller?.name}</strong>?
                  <br />
                  El vendedor no podrá publicar nuevos productos hasta ser verificado nuevamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyAction}
              disabled={isProcessing}
              className={
                actionType === "verify"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {actionType === "verify" ? "Verificar" : "Revocar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminVendedores;
