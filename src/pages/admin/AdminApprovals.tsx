import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  CreditCard, 
  Gift, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  ExternalLink
} from "lucide-react";
import { useAdminApprovals, type ApprovalRequest } from "@/hooks/useAdminApprovals";
import { useAdminKYC } from "@/hooks/useKYC";
import { useAdminCredits } from "@/hooks/useSellerCredits";

const AdminApprovals = () => {
  const { stats, pendingRequests, approveRequest, rejectRequest } = useAdminApprovals();
  const { pendingVerifications, reviewKYC } = useAdminKYC();
  const { activateCredit } = useAdminCredits();
  
  const [selectedKYC, setSelectedKYC] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [comments, setComments] = useState("");
  const [creditLimit, setCreditLimit] = useState("500");
  const [maxCartPercent, setMaxCartPercent] = useState("50");

  const handleApproveKYC = async () => {
    if (!selectedKYC) return;
    await reviewKYC.mutateAsync({ 
      kycId: selectedKYC.id, 
      status: 'verified', 
      comments 
    });
    setSelectedKYC(null);
    setComments("");
  };

  const handleRejectKYC = async () => {
    if (!selectedKYC || !comments) return;
    await reviewKYC.mutateAsync({ 
      kycId: selectedKYC.id, 
      status: 'rejected', 
      comments 
    });
    setSelectedKYC(null);
    setComments("");
  };

  const handleActivateCredit = async (userId: string) => {
    await activateCredit.mutateAsync({
      userId,
      creditLimit: parseFloat(creditLimit),
      maxCartPercentage: parseInt(maxCartPercent),
    });
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    await approveRequest.mutateAsync({ requestId: selectedRequest.id, comments });
    setSelectedRequest(null);
    setComments("");
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !comments) return;
    await rejectRequest.mutateAsync({ requestId: selectedRequest.id, comments });
    setSelectedRequest(null);
    setComments("");
  };

  return (
    <AdminLayout title="Central de Aprobaciones" subtitle="Gestiona verificaciones, bonos y créditos">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Central de Aprobaciones</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pendientes</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalPending ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-300">
            <CardHeader className="pb-2">
              <CardDescription>KYC por Verificar</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats?.kycPending ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-300">
            <CardHeader className="pb-2">
              <CardDescription>Bonos Pendientes</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats?.bonusPending ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-300">
            <CardHeader className="pb-2">
              <CardDescription>Deuda Total Plataforma</CardDescription>
              <CardTitle className="text-3xl text-red-600">${stats?.totalDebt?.toFixed(2) ?? '0.00'}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="kyc" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kyc" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Verificación KYC
              {(stats?.kycPending ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1">{stats?.kycPending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Bonos por Referidos
              {(stats?.bonusPending ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1">{stats?.bonusPending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Créditos
              {(stats?.creditPending ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1">{stats?.creditPending}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle>Verificaciones de Identidad Pendientes</CardTitle>
                <CardDescription>
                  Revisa los documentos de identidad enviados por los sellers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingVerifications && pendingVerifications.length > 0 ? (
                  <div className="space-y-4">
                    {pendingVerifications.map((kyc: any) => (
                      <div key={kyc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{kyc.profiles?.full_name || 'Sin nombre'}</p>
                          <p className="text-sm text-muted-foreground">{kyc.profiles?.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Enviado: {new Date(kyc.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {kyc.id_front_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={kyc.id_front_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Frontal
                              </a>
                            </Button>
                          )}
                          {kyc.id_back_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={kyc.id_back_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Trasero
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => setSelectedKYC(kyc)}
                            style={{ backgroundColor: '#071d7f' }}
                          >
                            Revisar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay verificaciones pendientes
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bonuses">
            <Card>
              <CardHeader>
                <CardTitle>Bonos de Referidos Pendientes</CardTitle>
                <CardDescription>
                  Aprueba bonos de descuento para sellers que han referido nuevos compradores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests?.filter(r => r.request_type === 'referral_bonus').length ? (
                  <div className="space-y-4">
                    {pendingRequests
                      .filter(r => r.request_type === 'referral_bonus')
                      .map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{req.profiles?.full_name || 'Seller'}</p>
                            <p className="text-sm text-muted-foreground">{req.profiles?.email}</p>
                            <p className="text-sm">
                              Bono: <span className="font-bold text-green-600">${req.amount?.toFixed(2)}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedRequest(req)}
                            >
                              Revisar
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay bonos pendientes de aprobación
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de Crédito</CardTitle>
                <CardDescription>
                  Activa créditos y aprueba aumentos de límite
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests?.filter(r => 
                  r.request_type === 'credit_activation' || r.request_type === 'credit_limit_increase'
                ).length ? (
                  <div className="space-y-4">
                    {pendingRequests
                      .filter(r => r.request_type === 'credit_activation' || r.request_type === 'credit_limit_increase')
                      .map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{req.profiles?.full_name || 'Seller'}</p>
                            <p className="text-sm text-muted-foreground">{req.profiles?.email}</p>
                            <Badge variant="outline">
                              {req.request_type === 'credit_activation' ? 'Activación' : 'Aumento de Límite'}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(req)}
                          >
                            Revisar
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No hay solicitudes de crédito pendientes
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* KYC Review Dialog */}
        <Dialog open={!!selectedKYC} onOpenChange={() => setSelectedKYC(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Revisar Verificación KYC</DialogTitle>
              <DialogDescription>
                {selectedKYC?.profiles?.full_name} - {selectedKYC?.profiles?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 my-4">
              {selectedKYC?.id_front_url && (
                <div>
                  <Label>Documento Frontal</Label>
                  <img 
                    src={selectedKYC.id_front_url} 
                    alt="ID Frontal" 
                    className="w-full h-48 object-cover rounded-lg border mt-2"
                  />
                </div>
              )}
              {selectedKYC?.id_back_url && (
                <div>
                  <Label>Documento Trasero</Label>
                  <img 
                    src={selectedKYC.id_back_url} 
                    alt="ID Trasero" 
                    className="w-full h-48 object-cover rounded-lg border mt-2"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Límite de Crédito Inicial ($)</Label>
                  <Input 
                    type="number" 
                    value={creditLimit} 
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label>% Máximo del Carrito</Label>
                  <Input 
                    type="number" 
                    value={maxCartPercent} 
                    onChange={(e) => setMaxCartPercent(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div>
                <Label>Comentarios</Label>
                <Textarea 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Opcional para aprobación, requerido para rechazo"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="destructive" 
                onClick={handleRejectKYC}
                disabled={!comments}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button 
                onClick={async () => {
                  await handleApproveKYC();
                  if (selectedKYC) {
                    await handleActivateCredit(selectedKYC.user_id);
                  }
                }}
                style={{ backgroundColor: '#071d7f' }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar y Activar Crédito
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.request_type === 'referral_bonus' 
                  ? 'Aprobar Bono de Referido' 
                  : 'Solicitud de Crédito'}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.profiles?.full_name} - {selectedRequest?.profiles?.email}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest?.amount && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Monto del bono</p>
                <p className="text-3xl font-bold text-green-600">${selectedRequest.amount.toFixed(2)}</p>
              </div>
            )}

            <div>
              <Label>Comentarios</Label>
              <Textarea 
                value={comments} 
                onChange={(e) => setComments(e.target.value)}
                placeholder="Opcional para aprobación, requerido para rechazo"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="destructive" 
                onClick={handleRejectRequest}
                disabled={!comments}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button 
                onClick={handleApproveRequest}
                style={{ backgroundColor: '#071d7f' }}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovals;
