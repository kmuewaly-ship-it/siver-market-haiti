import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Package,
  KeyRound,
  Loader2 
} from 'lucide-react';
import { useDeliveryValidation } from '@/hooks/useDeliveryValidation';

interface DeliveryValidationScannerProps {
  pickupPointId?: string;
  mode?: 'courier' | 'pickup_point' | 'both';
  onValidationSuccess?: (result: any) => void;
}

export const DeliveryValidationScanner: React.FC<DeliveryValidationScannerProps> = ({
  pickupPointId,
  mode = 'both',
  onValidationSuccess,
}) => {
  const {
    isValidating,
    validationResult,
    validateCourierDelivery,
    confirmPickupPointDelivery,
    clearResult,
  } = useDeliveryValidation();

  const [qrCode, setQrCode] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [activeTab, setActiveTab] = useState<'courier' | 'pickup_point'>(
    mode === 'pickup_point' ? 'pickup_point' : 'courier'
  );

  const handleCourierValidation = async () => {
    if (!qrCode || !securityPin) return;
    
    const result = await validateCourierDelivery(qrCode, securityPin);
    if (result.success && onValidationSuccess) {
      onValidationSuccess(result);
    }
  };

  const handlePickupValidation = async () => {
    if (!qrCode || !securityPin) return;
    
    const result = await confirmPickupPointDelivery(qrCode, securityPin);
    if (result.success && onValidationSuccess) {
      onValidationSuccess(result);
    }
  };

  const resetForm = () => {
    setQrCode('');
    setSecurityPin('');
    clearResult();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Validación de Entrega
        </CardTitle>
        <CardDescription>
          Escanee el código QR del cliente e ingrese el PIN de seguridad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'both' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="courier" className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Courier
              </TabsTrigger>
              <TabsTrigger value="pickup_point" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Punto Oficial
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* QR Code Input */}
        <div className="space-y-2">
          <Label htmlFor="qr-code" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Código QR del Cliente (6 dígitos)
          </Label>
          <Input
            id="qr-code"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            className="text-center text-2xl font-mono tracking-widest"
          />
        </div>

        {/* Security PIN Input */}
        <div className="space-y-2">
          <Label htmlFor="security-pin" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {activeTab === 'courier' 
              ? 'PIN del Manifiesto (4 dígitos)' 
              : 'PIN de la Caja Física (4 dígitos)'}
          </Label>
          <Input
            id="security-pin"
            type="text"
            value={securityPin}
            onChange={(e) => setSecurityPin(e.target.value.slice(0, 4))}
            placeholder="••••"
            maxLength={4}
            className="text-center text-2xl font-mono tracking-widest"
          />
          {activeTab === 'pickup_point' && (
            <p className="text-xs text-muted-foreground">
              El PIN está impreso en la etiqueta de la caja
            </p>
          )}
        </div>

        {/* Validation Result */}
        {validationResult && (
          <Alert variant={validationResult.success ? 'default' : 'destructive'}>
            {validationResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {validationResult.success ? 'Validación Exitosa' : 'Validación Fallida'}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{validationResult.message}</p>
              {validationResult.success && validationResult.hybrid_tracking_id && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium">ID de Seguimiento:</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-sm">
                    {validationResult.hybrid_tracking_id}
                  </Badge>
                </div>
              )}
              {validationResult.success && validationResult.escrow_release_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Fondos se liberarán: {new Date(validationResult.escrow_release_at).toLocaleString()}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={isValidating}
            className="flex-1"
          >
            Limpiar
          </Button>
          <Button
            onClick={activeTab === 'courier' ? handleCourierValidation : handlePickupValidation}
            disabled={isValidating || !qrCode || !securityPin || qrCode.length < 6 || securityPin.length < 4}
            className="flex-1"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : activeTab === 'courier' ? (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Revelar Tracking
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Entrega
              </>
            )}
          </Button>
        </div>

        {/* Mode Description */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
          {activeTab === 'courier' ? (
            <div className="space-y-1">
              <p className="font-medium">🚚 Modo Courier Externo (Triple Ciego):</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Escanea el QR del cliente</li>
                <li>Ingresa el PIN del manifiesto</li>
                <li>El sistema revela el ID de seguimiento para localizar la caja</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">📍 Modo Punto de Entrega Oficial:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Escanea el QR del cliente</li>
                <li>Lee el PIN impreso en la etiqueta física de la caja</li>
                <li>Ingresa el PIN para confirmar que tienes el paquete correcto</li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
