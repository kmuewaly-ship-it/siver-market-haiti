import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Users, 
  Gift, 
  Copy, 
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { useKYC } from "@/hooks/useKYC";
import { useSellerCredits } from "@/hooks/useSellerCredits";
import { useReferrals } from "@/hooks/useReferrals";
import { toast } from "sonner";

export const CreditReferralDashboard = () => {
  const { isVerified, isUnverified, isPending } = useKYC();
  const { credit, movements, availableCredit, hasActiveCredit } = useSellerCredits();
  const { 
    referralLink, 
    myReferrals, 
    settings,
    totalReferrals, 
    completedReferrals, 
    totalEarned 
  } = useReferrals();

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success('Link copiado al portapapeles');
    }
  };

  if (!isVerified) {
    return (
      <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/30">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          {isPending 
            ? 'Tu verificación está en proceso. Una vez aprobada, podrás acceder al sistema de créditos y referidos.'
            : 'Debes verificar tu identidad para acceder al sistema de créditos y referidos.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs defaultValue="credit" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="credit" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Mi Crédito
        </TabsTrigger>
        <TabsTrigger value="referrals" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Referidos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="credit" className="space-y-4">
        {!hasActiveCredit ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Tu crédito aún no ha sido activado. Un administrador revisará tu solicitud pronto.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Límite de Crédito</CardDescription>
                  <CardTitle className="text-2xl">${credit?.credit_limit?.toFixed(2) ?? '0.00'}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Deuda Actual</CardDescription>
                  <CardTitle className="text-2xl text-red-600">${credit?.balance_debt?.toFixed(2) ?? '0.00'}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Crédito Disponible</CardDescription>
                  <CardTitle className="text-2xl text-green-600">${availableCredit.toFixed(2)}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso de Crédito</CardTitle>
                <CardDescription>
                  Puedes usar hasta el {credit?.max_cart_percentage ?? 0}% de tu carrito con crédito
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={credit?.credit_limit ? ((credit.balance_debt / credit.credit_limit) * 100) : 0} 
                  className="h-3"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {credit?.credit_limit ? ((credit.balance_debt / credit.credit_limit) * 100).toFixed(1) : 0}% utilizado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Historial de Movimientos
                </CardTitle>
                <CardDescription>
                  Detalle de todas las transacciones de crédito
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movements && movements.length > 0 ? (
                  <div className="space-y-3">
                    {movements.map((mov) => {
                      const isDebit = mov.amount > 0; // Uso de crédito (aumenta deuda)
                      const isCredit = mov.amount < 0; // Pago o bono (reduce deuda)
                      
                      const getTypeInfo = (type: string) => {
                        switch (type) {
                          case 'purchase':
                            return { label: 'Compra B2B', icon: CreditCard, color: 'text-orange-600 bg-orange-50' };
                          case 'payment':
                            return { label: 'Pago Recibido', icon: CheckCircle, color: 'text-green-600 bg-green-50' };
                          case 'referral_bonus':
                            return { label: 'Bono Referido', icon: Gift, color: 'text-blue-600 bg-blue-50' };
                          case 'adjustment':
                            return { label: 'Ajuste Admin', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' };
                          default:
                            return { label: type, icon: DollarSign, color: 'text-gray-600 bg-gray-50' };
                        }
                      };
                      
                      const typeInfo = getTypeInfo(mov.movement_type);
                      const TypeIcon = typeInfo.icon;
                      
                      return (
                        <div 
                          key={mov.id} 
                          className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-2 rounded-full ${typeInfo.color}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{typeInfo.label}</p>
                              <span className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                {isCredit ? '-' : '+'}${Math.abs(mov.amount).toFixed(2)}
                              </span>
                            </div>
                            
                            {mov.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                {mov.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(mov.created_at).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-muted-foreground/60">|</span>
                              <span>
                                Saldo: ${mov.balance_before.toFixed(2)} → ${mov.balance_after.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Sin movimientos de crédito</p>
                    <p className="text-sm">Tus transacciones aparecerán aquí</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="referrals" className="space-y-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              Tu Link de Referido
            </CardTitle>
            <CardDescription>
              Comparte este link y gana ${settings?.bonus_per_referral ?? 20} de descuento en tu deuda por cada referido que haga su primera compra
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referralLink ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded-lg text-sm truncate border">
                  {referralLink}
                </code>
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">Cargando tu link de referido...</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Referidos</CardDescription>
              <CardTitle className="text-2xl">{totalReferrals}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Con Compra</CardDescription>
              <CardTitle className="text-2xl text-green-600">{completedReferrals}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Meta para Aumento</CardDescription>
              <CardTitle className="text-2xl">{completedReferrals}/{settings?.referrals_for_credit_increase ?? 5}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Progress 
                value={(completedReferrals / (settings?.referrals_for_credit_increase ?? 5)) * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Ganado</CardDescription>
              <CardTitle className="text-2xl text-blue-600">${totalEarned.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mis Referidos</CardTitle>
          </CardHeader>
          <CardContent>
            {myReferrals && myReferrals.length > 0 ? (
              <div className="space-y-3">
                {myReferrals.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {ref.referred?.profiles?.full_name || ref.referred?.profiles?.email || 'Usuario'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Registrado: {new Date(ref.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {ref.first_purchase_completed ? (
                        ref.bonus_approved ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Bono Aplicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Bono Pendiente
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Sin compra</Badge>
                      )}
                      <span className="font-medium text-green-600">
                        ${ref.bonus_amount?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aún no tienes referidos</p>
                <p className="text-sm">Comparte tu link para empezar a ganar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
