import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Types for PDF data
interface OrderItem {
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  color?: string;
  size?: string;
  image?: string;
}

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  department?: string;
  commune?: string;
  items: OrderItem[];
  total_amount: number;
  payment_method?: string;
  created_at: string;
  hybrid_tracking_id?: string;
}

interface ConsolidationData {
  consolidation_number: string;
  supplier_name?: string;
  items: {
    sku: string;
    product_name: string;
    color?: string;
    size?: string;
    quantity_to_order: number;
    unit_cost: number;
    total_cost: number;
  }[];
  total_quantity: number;
  estimated_cost: number;
  created_at: string;
}

interface ManifestItem {
  hybrid_tracking_id: string;
  customer_name: string;
  commune: string;
  department: string;
  unit_count: number;
  has_owner: boolean;
}

// Utility to open print window
const openPrintWindow = (content: string, title: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Common styles
const baseStyles = `
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
  .logo { font-size: 24px; font-weight: bold; }
  .subtitle { color: #666; font-size: 12px; }
  .section { margin-bottom: 20px; }
  .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
  th { background-color: #f5f5f5; font-weight: bold; }
  .total-row { font-weight: bold; background-color: #f0f0f0; }
  .signature-area { margin-top: 40px; border-top: 1px solid #000; padding-top: 10px; }
  .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
  @media print { body { margin: 0; } }
`;

// PDF: Purchase Order for China supplier
export const generatePurchaseOrderPDF = (data: ConsolidationData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Orden de Compra - ${data.consolidation_number}</title>
      <style>
        ${baseStyles}
        .po-number { font-size: 18px; font-weight: bold; color: #071d7f; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">SIVER MARKET 509</div>
        <div class="subtitle">Purchase Order / Orden de Compra</div>
        <div class="po-number">${data.consolidation_number}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Order Details / Detalles del Pedido</div>
        <p><strong>Date:</strong> ${format(new Date(data.created_at), 'PPP', { locale: es })}</p>
        <p><strong>Supplier:</strong> ${data.supplier_name || 'N/A'}</p>
        <p><strong>Total Items:</strong> ${data.items.length}</p>
        <p><strong>Total Quantity:</strong> ${data.total_quantity} units</p>
      </div>
      
      <div class="section">
        <div class="section-title">Items to Order / Artículos a Pedir</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Color</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.sku}</td>
                <td>${item.product_name}</td>
                <td>${item.color || '-'}</td>
                <td>${item.size || '-'}</td>
                <td style="text-align: center;">${item.quantity_to_order}</td>
                <td style="text-align: right;">$${item.unit_cost.toFixed(2)}</td>
                <td style="text-align: right;">$${item.total_cost.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5">TOTAL</td>
              <td style="text-align: center;">${data.total_quantity}</td>
              <td></td>
              <td style="text-align: right;">$${data.estimated_cost.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <p>SIVER MARKET 509 - Puerto Príncipe, Haití</p>
        <p>Documento generado el ${format(new Date(), 'PPP p', { locale: es })}</p>
      </div>
    </body>
    </html>
  `;
  
  openPrintWindow(html, `Orden de Compra - ${data.consolidation_number}`);
};

// PDF: Arrival Manifest for Haiti staff
export const generateArrivalManifestPDF = (items: ManifestItem[], containerInfo: { tracking: string; arrival_date: string }) => {
  const withOwner = items.filter(i => i.has_owner);
  const toStock = items.filter(i => !i.has_owner);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manifiesto de Llegada - ${containerInfo.tracking}</title>
      <style>
        ${baseStyles}
        .has-owner { background-color: #e8f5e9; }
        .to-stock { background-color: #fff3e0; }
        .legend { display: flex; gap: 20px; margin-bottom: 15px; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; }
        .legend-color { width: 20px; height: 20px; border: 1px solid #ccc; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">MANIFIESTO DE LLEGADA</div>
        <div class="subtitle">SIVER MARKET 509 - Almacén Haití</div>
      </div>
      
      <div class="section">
        <div class="section-title">Información del Contenedor</div>
        <p><strong>Tracking:</strong> ${containerInfo.tracking}</p>
        <p><strong>Fecha de Llegada:</strong> ${format(new Date(containerInfo.arrival_date), 'PPP', { locale: es })}</p>
        <p><strong>Total Paquetes:</strong> ${items.length}</p>
      </div>
      
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color has-owner"></div>
          <span>Con Dueño (${withOwner.length})</span>
        </div>
        <div class="legend-item">
          <div class="legend-color to-stock"></div>
          <span>A Stock (${toStock.length})</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Paquetes con Dueño Asignado</div>
        <table>
          <thead>
            <tr>
              <th>ID Híbrido</th>
              <th>Cliente</th>
              <th>Comuna</th>
              <th>Departamento</th>
              <th>Unidades</th>
            </tr>
          </thead>
          <tbody>
            ${withOwner.map(item => `
              <tr class="has-owner">
                <td><strong>${item.hybrid_tracking_id}</strong></td>
                <td>${item.customer_name}</td>
                <td>${item.commune}</td>
                <td>${item.department}</td>
                <td style="text-align: center;">${item.unit_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      ${toStock.length > 0 ? `
        <div class="section">
          <div class="section-title">Paquetes a Stock (Sin Dueño)</div>
          <table>
            <thead>
              <tr>
                <th>ID Híbrido</th>
                <th>Destino Sugerido</th>
                <th>Unidades</th>
              </tr>
            </thead>
            <tbody>
              ${toStock.map(item => `
                <tr class="to-stock">
                  <td><strong>${item.hybrid_tracking_id}</strong></td>
                  <td>Almacén General</td>
                  <td style="text-align: center;">${item.unit_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      <div class="signature-area">
        <p>Recibido por: ___________________________ Fecha: _______________</p>
        <p>Verificado por: _________________________ Fecha: _______________</p>
      </div>
      
      <div class="footer">
        <p>Documento generado el ${format(new Date(), 'PPP p', { locale: es })}</p>
      </div>
    </body>
    </html>
  `;
  
  openPrintWindow(html, `Manifiesto - ${containerInfo.tracking}`);
};

// PDF: Invoice/Delivery Guide with product images
export const generateInvoicePDF = (order: OrderData) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factura - ${order.order_number}</title>
      <style>
        ${baseStyles}
        .product-row { display: flex; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid #eee; }
        .product-image { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
        .product-info { flex: 1; }
        .product-variant { color: #666; font-size: 11px; }
        .amounts { text-align: right; }
        .customer-info { background: #f9f9f9; padding: 15px; border-radius: 8px; }
        .tracking-id { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">SIVER MARKET 509</div>
        <div class="subtitle">Factura / Guía de Entrega</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <p><strong>Factura #:</strong> ${order.order_number}</p>
          <p><strong>Fecha:</strong> ${format(new Date(order.created_at), 'PPP', { locale: es })}</p>
          <p><strong>Método de Pago:</strong> ${order.payment_method || 'N/A'}</p>
        </div>
        ${order.hybrid_tracking_id ? `
          <div style="text-align: right;">
            <p><strong>ID de Seguimiento:</strong></p>
            <p class="tracking-id">${order.hybrid_tracking_id}</p>
          </div>
        ` : ''}
      </div>
      
      <div class="customer-info">
        <div class="section-title">Datos del Cliente</div>
        <p><strong>Nombre:</strong> ${order.customer_name}</p>
        <p><strong>Teléfono:</strong> ${order.customer_phone}</p>
        ${order.customer_address ? `<p><strong>Dirección:</strong> ${order.customer_address}</p>` : ''}
        ${order.commune && order.department ? `<p><strong>Ubicación:</strong> ${order.commune}, ${order.department}</p>` : ''}
      </div>
      
      <div class="section" style="margin-top: 20px;">
        <div class="section-title">Productos</div>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Imagen</th>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>
                  ${item.image ? `<img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />` : '-'}
                </td>
                <td>
                  <strong>${item.nombre}</strong>
                  ${item.color || item.size ? `<br/><span style="color: #666; font-size: 11px;">${item.color || ''} ${item.size || ''}</span>` : ''}
                </td>
                <td>${item.sku}</td>
                <td style="text-align: center;">${item.cantidad}</td>
                <td style="text-align: right;">$${item.precio_unitario.toFixed(2)}</td>
                <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">TOTAL</td>
              <td style="text-align: right;">$${order.total_amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="signature-area">
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 45%;">
            <p style="margin-bottom: 30px;">Firma del Cliente:</p>
            <div style="border-bottom: 1px solid #000;"></div>
            <p style="font-size: 10px; color: #666;">Recibido Conforme</p>
          </div>
          <div style="width: 45%;">
            <p style="margin-bottom: 30px;">Fecha de Recepción:</p>
            <div style="border-bottom: 1px solid #000;"></div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p>¡Gracias por su compra! - SIVER MARKET 509</p>
        <p>Documento generado el ${format(new Date(), 'PPP p', { locale: es })}</p>
      </div>
    </body>
    </html>
  `;
  
  openPrintWindow(html, `Factura - ${order.order_number}`);
};

// PDF: Thermal Label (4x6)
export const generateThermalLabelPDF = (labelData: {
  hybridTrackingId: string;
  customerName: string;
  customerPhone: string;
  commune: string;
  department: string;
  unitCount: number;
  trackingUrl?: string;
}) => {
  const qrUrl = labelData.trackingUrl || `https://siver.market/tracking/${labelData.hybridTrackingId}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Etiqueta - ${labelData.hybridTrackingId}</title>
      <style>
        @page { size: 4in 6in; margin: 0; }
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
          border: 3px solid #000;
          padding: 12px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .tracking-header {
          text-align: center;
          border-bottom: 3px solid #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .tracking-label { font-size: 10px; color: #666; }
        .tracking-id { 
          font-size: 22px; 
          font-weight: bold; 
          letter-spacing: 2px;
          word-break: break-all;
          font-family: monospace;
        }
        .qr-section {
          display: flex;
          justify-content: center;
          padding: 15px 0;
          border-bottom: 2px dashed #000;
        }
        .units-badge {
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          padding: 10px;
          border: 3px solid #000;
          margin: 10px 0;
          background: #f0f0f0;
        }
        .customer-info {
          flex: 1;
          padding: 10px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 14px;
        }
        .info-label { font-weight: bold; }
        .destination {
          text-align: center;
          background: #000;
          color: #fff;
          padding: 15px;
          margin-top: auto;
        }
        .destination-title { font-size: 12px; }
        .destination-value { font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="tracking-header">
          <div class="tracking-label">ID DE SEGUIMIENTO</div>
          <div class="tracking-id">${labelData.hybridTrackingId}</div>
        </div>
        
        <div class="qr-section">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}" 
               alt="QR Code" style="width: 120px; height: 120px;" />
        </div>
        
        <div class="units-badge">
          📦 ${labelData.unitCount} UNIDAD${labelData.unitCount > 1 ? 'ES' : ''}
        </div>
        
        <div class="customer-info">
          <div class="info-row">
            <span class="info-label">Cliente:</span>
            <span>${labelData.customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span>${labelData.customerPhone}</span>
          </div>
        </div>
        
        <div class="destination">
          <div class="destination-title">DESTINO</div>
          <div class="destination-value">${labelData.commune}, ${labelData.department}</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  openPrintWindow(html, `Etiqueta - ${labelData.hybridTrackingId}`);
};

// Batch print labels by department
export const generateBatchLabelsPDF = (labels: Array<{
  hybridTrackingId: string;
  customerName: string;
  customerPhone: string;
  commune: string;
  department: string;
  unitCount: number;
}>) => {
  const labelsHtml = labels.map(label => `
    <div class="label-page">
      <div class="label-container">
        <div class="tracking-header">
          <div class="tracking-label">ID DE SEGUIMIENTO</div>
          <div class="tracking-id">${label.hybridTrackingId}</div>
        </div>
        <div class="qr-section">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://siver.market/tracking/${label.hybridTrackingId}`)}" 
               alt="QR" style="width: 100px; height: 100px;" />
        </div>
        <div class="units-badge">📦 ${label.unitCount}</div>
        <div class="customer-info">
          <div class="info-row"><span class="info-label">Cliente:</span><span>${label.customerName}</span></div>
          <div class="info-row"><span class="info-label">Tel:</span><span>${label.customerPhone}</span></div>
        </div>
        <div class="destination">
          <div class="destination-title">DESTINO</div>
          <div class="destination-value">${label.commune}, ${label.department}</div>
        </div>
      </div>
    </div>
  `).join('');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lote de Etiquetas</title>
      <style>
        @page { size: 4in 6in; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; }
        .label-page { 
          width: 4in; 
          height: 6in; 
          padding: 8px;
          box-sizing: border-box;
          page-break-after: always;
        }
        .label-container { width: 100%; height: 100%; border: 3px solid #000; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; }
        .tracking-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
        .tracking-label { font-size: 9px; color: #666; }
        .tracking-id { font-size: 16px; font-weight: bold; font-family: monospace; word-break: break-all; }
        .qr-section { display: flex; justify-content: center; padding: 10px 0; border-bottom: 1px dashed #000; }
        .units-badge { font-size: 24px; font-weight: bold; text-align: center; padding: 8px; border: 2px solid #000; margin: 8px 0; background: #f0f0f0; }
        .customer-info { flex: 1; padding: 8px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
        .info-label { font-weight: bold; }
        .destination { text-align: center; background: #000; color: #fff; padding: 10px; margin-top: auto; }
        .destination-title { font-size: 10px; }
        .destination-value { font-size: 14px; font-weight: bold; }
      </style>
    </head>
    <body>
      ${labelsHtml}
    </body>
    </html>
  `;
  
  openPrintWindow(html, `Lote de ${labels.length} Etiquetas`);
};

export const PDFGenerators = {
  generatePurchaseOrderPDF,
  generateArrivalManifestPDF,
  generateInvoicePDF,
  generateThermalLabelPDF,
  generateBatchLabelsPDF,
};
