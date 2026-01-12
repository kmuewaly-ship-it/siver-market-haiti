import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, QrCode, Package } from 'lucide-react';

interface ShippingLabelData {
  hybridTrackingId: string;
  customerName: string;
  customerPhone: string;
  departmentName: string;
  communeName: string;
  unitCount: number;
  weightGrams: number;
  status: string;
  securityPin?: string; // PIN de 4 dígitos para validación física
  customerQrCode?: string; // QR de 6 dígitos del cliente
}

interface ShippingLabelPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelData: ShippingLabelData | null;
  onPrintComplete?: () => void;
}

export const ShippingLabelPrinter: React.FC<ShippingLabelPrinterProps> = ({
  open,
  onOpenChange,
  labelData,
  onPrintComplete,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiqueta de Envío</title>
            <style>
              @page {
                size: 4in 6in;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 8px;
                font-family: 'Arial', sans-serif;
                width: 4in;
                height: 6in;
                box-sizing: border-box;
              }
              .label-container {
                width: 100%;
                height: 100%;
                border: 2px solid #000;
                padding: 12px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 8px;
                margin-bottom: 8px;
              }
              .tracking-id {
                font-size: 18px;
                font-weight: bold;
                letter-spacing: 1px;
                word-break: break-all;
              }
              .qr-section {
                display: flex;
                justify-content: center;
                padding: 16px 0;
                border-bottom: 1px dashed #000;
              }
              .qr-code {
                width: 120px;
                height: 120px;
                border: 1px solid #000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
              }
              .customer-info {
                flex: 1;
                padding: 12px 0;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 14px;
              }
              .info-label {
                font-weight: bold;
              }
              .destination {
                text-align: center;
                background: #000;
                color: #fff;
                padding: 12px;
                margin-top: auto;
                font-size: 16px;
                font-weight: bold;
              }
              .units-badge {
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                padding: 8px;
                border: 2px solid #000;
                margin: 8px 0;
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        onPrintComplete?.();
      }, 250);
    }
  };

  if (!labelData) return null;

  // Generate a simple barcode representation using the tracking ID
  const barcodeLines = labelData.hybridTrackingId.split('').map((char, i) => {
    const width = char.charCodeAt(0) % 3 + 1;
    return `<div style="display:inline-block;width:${width}px;height:50px;background:${i % 2 === 0 ? '#000' : '#fff'};"></div>`;
  }).join('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Etiqueta Logística
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-white" ref={printRef}>
          <div className="label-container" style={{ border: '2px solid #000', padding: '12px' }}>
            {/* Header with tracking ID */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
              <div className="text-xs text-muted-foreground mb-1">ID DE SEGUIMIENTO</div>
              <div className="tracking-id text-lg font-bold tracking-wide break-all">
                {labelData.hybridTrackingId}
              </div>
            </div>

            {/* Barcode section */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', borderBottom: '1px dashed #000' }}>
              <div className="text-center">
                <div 
                  style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}
                  dangerouslySetInnerHTML={{ __html: barcodeLines }}
                />
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="text-xs mt-1">{labelData.hybridTrackingId}</div>
              </div>
            </div>

            {/* Units badge + Security PIN */}
            <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
              <div style={{ flex: 1, fontSize: '20px', fontWeight: 'bold', textAlign: 'center', padding: '8px', border: '2px solid #000' }}>
                <Package className="h-5 w-5 inline mr-1" />
                {labelData.unitCount} UNID.
              </div>
              {labelData.securityPin && (
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', border: '2px solid #000', background: '#f5f5f5' }}>
                  <div className="text-xs text-muted-foreground">PIN SEGURIDAD</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '4px', fontFamily: 'monospace' }}>
                    {labelData.securityPin}
                  </div>
                </div>
              )}
            </div>

            {/* Customer info */}
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontWeight: 'bold' }}>Cliente:</span>
                <span>{labelData.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontWeight: 'bold' }}>Teléfono:</span>
                <span>{labelData.customerPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontWeight: 'bold' }}>Peso:</span>
                <span>{labelData.weightGrams}g ({(labelData.weightGrams * 0.00220462).toFixed(2)} lb)</span>
              </div>
            </div>

            {/* Destination */}
            <div style={{ textAlign: 'center', background: '#000', color: '#fff', padding: '12px', marginTop: 'auto' }}>
              <div className="text-sm">DESTINO</div>
              <div className="text-lg font-bold">
                {labelData.communeName}, {labelData.departmentName}
              </div>
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir (4x6")
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
