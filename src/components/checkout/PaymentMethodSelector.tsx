import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Zap, Hand, Smartphone, CreditCard, Building2, Check } from 'lucide-react';
import { PaymentMethod } from '@/hooks/usePaymentMethods';

export type PaymentMode = 'manual' | 'automatic';

interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  method: PaymentMethod | null;
  // For MonCash/NatCash - what modes are available
  manualEnabled?: boolean;
  automaticEnabled?: boolean;
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethodOption[];
  selectedMethod: string;
  selectedMode: PaymentMode;
  paymentReference: string;
  onMethodChange: (method: string) => void;
  onModeChange: (mode: PaymentMode) => void;
  onReferenceChange: (reference: string) => void;
  storeName?: string;
  validationError?: string;
  referenceError?: string;
}

export function PaymentMethodSelector({
  methods,
  selectedMethod,
  selectedMode,
  paymentReference,
  onMethodChange,
  onModeChange,
  onReferenceChange,
  storeName = 'Vendedor',
  validationError,
  referenceError,
}: PaymentMethodSelectorProps) {
  const selectedMethodData = methods.find(m => m.id === selectedMethod);
  const showModeSelector = selectedMethodData && 
    (selectedMethodData.id === 'moncash' || selectedMethodData.id === 'natcash') &&
    selectedMethodData.manualEnabled && 
    selectedMethodData.automaticEnabled;

  // Helper to mask phone/account numbers
  const maskNumber = (num: string | undefined) => {
    if (!num) return '****';
    return num.length > 4 ? '****' + num.slice(-4) : num;
  };

  return (
    <div className="space-y-4">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <div
              key={method.id}
              onClick={() => onMethodChange(method.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#071d7f] bg-blue-50/50'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className={`p-2 rounded-lg ${method.bgColor}`}>
                <Icon className={`h-5 w-5 ${method.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{method.name}</p>
                <p className="text-sm text-muted-foreground">{method.description}</p>
                {/* Show available modes for MonCash/NatCash */}
                {(method.id === 'moncash' || method.id === 'natcash') && (
                  <div className="flex gap-2 mt-1">
                    {method.manualEnabled && (
                      <Badge variant="outline" className="text-xs">
                        <Hand className="h-3 w-3 mr-1" /> Manual
                      </Badge>
                    )}
                    {method.automaticEnabled && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                        <Zap className="h-3 w-3 mr-1" /> Automático
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 ${
                  isSelected ? 'border-[#071d7f] bg-[#071d7f]' : 'border-muted-foreground'
                }`}
              >
                {isSelected && <Check className="h-full w-full text-white p-0.5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mode Selector (when both modes available for MonCash/NatCash) */}
      {showModeSelector && (
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <Label className="font-medium">¿Cómo desea pagar?</Label>
          <RadioGroup
            value={selectedMode}
            onValueChange={(v) => onModeChange(v as PaymentMode)}
            className="grid gap-2"
          >
            <div 
              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${
                selectedMode === 'automatic' ? 'border-yellow-400 bg-yellow-50/50' : ''
              }`}
              onClick={() => onModeChange('automatic')}
            >
              <RadioGroupItem value="automatic" id="mode-automatic" />
              <Label htmlFor="mode-automatic" className="flex items-center gap-2 cursor-pointer flex-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <div>
                  <span className="font-medium">Pago Automático</span>
                  <p className="text-xs text-muted-foreground">
                    Pago instantáneo, confirmación automática
                  </p>
                </div>
              </Label>
            </div>
            <div 
              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${
                selectedMode === 'manual' ? 'border-gray-400 bg-gray-50/50' : ''
              }`}
              onClick={() => onModeChange('manual')}
            >
              <RadioGroupItem value="manual" id="mode-manual" />
              <Label htmlFor="mode-manual" className="flex items-center gap-2 cursor-pointer flex-1">
                <Hand className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Pago Manual</span>
                  <p className="text-xs text-muted-foreground">
                    Pague y proporcione el código de transacción
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Payment Details based on selected method and mode */}
      {selectedMethod === 'moncash' && selectedMethodData?.method && (
        <PaymentDetails
          type="moncash"
          mode={selectedMode}
          method={selectedMethodData.method}
          storeName={storeName}
          paymentReference={paymentReference}
          onReferenceChange={onReferenceChange}
          referenceError={referenceError}
          showManualDetails={!selectedMethodData.automaticEnabled || selectedMode === 'manual'}
        />
      )}

      {selectedMethod === 'natcash' && selectedMethodData?.method && (
        <PaymentDetails
          type="natcash"
          mode={selectedMode}
          method={selectedMethodData.method}
          storeName={storeName}
          paymentReference={paymentReference}
          onReferenceChange={onReferenceChange}
          referenceError={referenceError}
          showManualDetails={!selectedMethodData.automaticEnabled || selectedMode === 'manual'}
        />
      )}

      {selectedMethod === 'transfer' && selectedMethodData?.method && (
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Datos Bancarios - {storeName}</h4>
          <div className="space-y-1 text-sm text-green-700">
            <p><span className="font-medium">Banco:</span> {selectedMethodData.method.bank_name || 'No configurado'}</p>
            <p><span className="font-medium">Tipo:</span> {selectedMethodData.method.account_type || 'No configurado'}</p>
            <p><span className="font-medium">Cuenta:</span> {maskNumber(selectedMethodData.method.account_number || undefined)}</p>
            <p><span className="font-medium">Beneficiario:</span> {selectedMethodData.method.account_holder || 'No configurado'}</p>
          </div>
          <div className="mt-3">
            <Label>Referencia de Transferencia *</Label>
            <Input
              value={paymentReference}
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="Número de referencia"
              className={`mt-1 ${referenceError ? 'border-red-500' : ''}`}
            />
            {referenceError && (
              <p className="text-sm text-red-600 mt-1">{referenceError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PaymentDetailsProps {
  type: 'moncash' | 'natcash';
  mode: PaymentMode;
  method: PaymentMethod;
  storeName: string;
  paymentReference: string;
  onReferenceChange: (value: string) => void;
  referenceError?: string;
  showManualDetails: boolean;
}

function PaymentDetails({
  type,
  mode,
  method,
  storeName,
  paymentReference,
  onReferenceChange,
  referenceError,
  showManualDetails,
}: PaymentDetailsProps) {
  const isMoncash = type === 'moncash';
  const bgColor = isMoncash ? '#94111f20' : '#071d7f20';
  const textColor = isMoncash ? '#94111f' : '#071d7f';
  const title = isMoncash ? 'MonCash' : 'NatCash';

  if (mode === 'automatic') {
    return (
      <div className="p-4 rounded-lg border-2 border-yellow-300 bg-yellow-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h4 className="font-semibold text-yellow-800">Pago Automático {title}</h4>
        </div>
        <p className="text-sm text-yellow-700">
          Al confirmar, será redirigido a {title} para completar el pago de forma segura.
          La confirmación será automática una vez procesado.
        </p>
      </div>
    );
  }

  // Manual mode
  return (
    <div className="p-4 rounded-lg" style={{ backgroundColor: bgColor }}>
      <h4 className="font-semibold mb-2" style={{ color: textColor }}>
        Datos {title} - {storeName}
      </h4>
      <div className="space-y-1 text-sm" style={{ color: textColor }}>
        <p><span className="font-medium">Número:</span> {method.phone_number || 'No configurado'}</p>
        <p><span className="font-medium">Nombre:</span> {method.holder_name || 'No configurado'}</p>
      </div>
      <div className="mt-3">
        <Label>Código de Transacción *</Label>
        <Input
          value={paymentReference}
          onChange={(e) => onReferenceChange(e.target.value)}
          placeholder={`Código de transacción ${title}`}
          className={`mt-1 ${referenceError ? 'border-red-500' : ''}`}
        />
        {referenceError && (
          <p className="text-sm text-red-600 mt-1">{referenceError}</p>
        )}
      </div>
    </div>
  );
}

export default PaymentMethodSelector;