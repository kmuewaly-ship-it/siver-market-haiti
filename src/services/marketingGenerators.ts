import { supabase } from '@/integrations/supabase/client';

interface CatalogProduct {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  images: string[];
  variants?: Array<{
    id: string;
    sku: string;
    color?: string;
    size?: string;
    image?: string;
  }>;
  store_slug: string;
  store_name: string;
}

interface PDFGeneratorOptions {
  products: CatalogProduct[];
  storeId: string;
  storeName: string;
  storeLogo?: string;
  storeSlug: string;
  primaryColor?: string;
  showQR?: boolean;
  trackingEnabled?: boolean;
}

// Generate tracking URL for product
const getProductLink = (product: CatalogProduct, storeSlug: string, variantId?: string) => {
  const baseUrl = window.location.origin;
  let url = `${baseUrl}/tienda/${storeSlug}/producto/${product.id}`;
  if (variantId) {
    url += `?variant=${variantId}`;
  }
  return url;
};

// Generate QR code as data URL using QR Server API
const generateQRCode = async (url: string, size: number = 150): Promise<string> => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  return qrUrl;
};

// Format currency for display
const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

// Generate Interactive PDF Catalog
export const generatePDFCatalog = async (options: PDFGeneratorOptions): Promise<string> => {
  const { products, storeId, storeName, storeLogo, storeSlug, primaryColor = '#8B5CF6', showQR = true, trackingEnabled = true } = options;
  
  const trackingBaseUrl = trackingEnabled 
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-catalog-click`
    : null;

  // Generate HTML content for PDF
  let productsHtml = '';
  
  for (const product of products) {
    const mainImage = product.images[0] || '/placeholder.svg';
    const productLink = getProductLink(product, storeSlug);
    const qrUrl = showQR ? await generateQRCode(productLink) : null;
    
    // Generate variant thumbnails HTML
    let variantThumbnails = '';
    if (product.variants && product.variants.length > 1) {
      variantThumbnails = `
        <div class="variants-row">
          ${product.variants.slice(0, 6).map((v, idx) => `
            <div class="variant-thumb" data-variant-idx="${idx}" data-variant-image="${v.image || mainImage}">
              <img src="${v.image || mainImage}" alt="${v.color || v.size || 'Variante'}" />
              <span class="variant-label">${v.color || v.size || ''}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Tracking pixel (1x1 transparent gif)
    const trackingPixel = trackingBaseUrl 
      ? `<img src="${trackingBaseUrl}?sid=${storeId}&pid=${product.id}&src=pdf_catalog" width="1" height="1" style="position:absolute;opacity:0;" />`
      : '';

    productsHtml += `
      <div class="product-card" data-product-id="${product.id}">
        ${trackingPixel}
        <div class="product-image-container">
          <img class="main-image" src="${mainImage}" alt="${product.nombre}" />
        </div>
        ${variantThumbnails}
        <div class="product-info">
          <h3 class="product-name">${product.nombre}</h3>
          <div class="product-price">${formatPrice(product.precio_venta)}</div>
          ${product.descripcion ? `<p class="product-desc">${product.descripcion.substring(0, 100)}${product.descripcion.length > 100 ? '...' : ''}</p>` : ''}
        </div>
        ${qrUrl ? `
          <div class="qr-container">
            <img src="${qrUrl}" alt="QR Code" class="qr-code" />
            <span class="qr-label">Escanea para comprar</span>
          </div>
        ` : ''}
        <a href="${productLink}" class="buy-link" target="_blank">Ver Producto →</a>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Catálogo - ${storeName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          line-height: 1.5;
        }
        
        .catalog-header {
          background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
          color: white;
          padding: 40px 20px;
          text-align: center;
          margin-bottom: 30px;
        }
        
        .store-logo {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: white;
          object-fit: cover;
          margin-bottom: 16px;
        }
        
        .store-name {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .catalog-title {
          font-size: 18px;
          opacity: 0.9;
        }
        
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          padding: 0 20px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .product-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15);
        }
        
        .product-image-container {
          aspect-ratio: 1;
          overflow: hidden;
          background: #f1f5f9;
        }
        
        .main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        
        .product-card:hover .main-image {
          transform: scale(1.05);
        }
        
        .variants-row {
          display: flex;
          gap: 8px;
          padding: 12px;
          overflow-x: auto;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .variant-thumb {
          flex-shrink: 0;
          width: 48px;
          text-align: center;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        
        .variant-thumb:hover, .variant-thumb.active {
          opacity: 1;
        }
        
        .variant-thumb img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid transparent;
        }
        
        .variant-thumb.active img {
          border-color: ${primaryColor};
        }
        
        .variant-label {
          font-size: 10px;
          color: #64748b;
          display: block;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .product-info {
          padding: 16px;
        }
        
        .product-name {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .product-price {
          font-size: 24px;
          font-weight: 700;
          color: ${primaryColor};
          margin-bottom: 8px;
        }
        
        .product-desc {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 12px;
        }
        
        .qr-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        
        .qr-code {
          width: 60px;
          height: 60px;
        }
        
        .qr-label {
          font-size: 12px;
          color: #64748b;
        }
        
        .buy-link {
          display: block;
          text-align: center;
          padding: 14px;
          background: ${primaryColor};
          color: white;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s;
        }
        
        .buy-link:hover {
          background: ${primaryColor}dd;
        }
        
        @media print {
          .product-card { break-inside: avoid; }
          .buy-link { display: none; }
        }
      </style>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.variant-thumb').forEach(thumb => {
            thumb.addEventListener('click', function() {
              const card = this.closest('.product-card');
              const mainImg = card.querySelector('.main-image');
              const newSrc = this.dataset.variantImage;
              
              card.querySelectorAll('.variant-thumb').forEach(t => t.classList.remove('active'));
              this.classList.add('active');
              
              mainImg.style.opacity = '0';
              setTimeout(() => {
                mainImg.src = newSrc;
                mainImg.style.opacity = '1';
              }, 150);
            });
          });
        });
      </script>
    </head>
    <body>
      <header class="catalog-header">
        ${storeLogo ? `<img src="${storeLogo}" alt="${storeName}" class="store-logo" />` : ''}
        <h1 class="store-name">${storeName}</h1>
        <p class="catalog-title">Catálogo de Productos</p>
      </header>
      
      <main class="products-grid">
        ${productsHtml}
      </main>
    </body>
    </html>
  `;

  return htmlContent;
};

// Open PDF catalog in new window for printing
export const openPDFCatalog = async (options: PDFGeneratorOptions) => {
  const htmlContent = await generatePDFCatalog(options);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
  
  return htmlContent;
};

// Generate WhatsApp Status image (9:16 aspect ratio)
export interface WhatsAppStatusOptions {
  product: CatalogProduct;
  storeId: string;
  storeName: string;
  storeLogo?: string;
  storeSlug: string;
  variantIndex?: number;
  primaryColor?: string;
  showQR?: boolean;
}

export const generateWhatsAppStatusImage = async (options: WhatsAppStatusOptions): Promise<HTMLCanvasElement> => {
  const { product, storeId, storeName, storeSlug, variantIndex = 0, primaryColor = '#8B5CF6', showQR = true } = options;
  
  // WhatsApp Status dimensions (9:16)
  const width = 1080;
  const height = 1920;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e1e2e');
  gradient.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Load and draw product image
  const variant = product.variants?.[variantIndex];
  const imageUrl = variant?.image || product.images[0] || '/placeholder.svg';
  
  try {
    const img = await loadImage(imageUrl);
    
    // Draw product image (centered, covering top portion)
    const imgSize = 900;
    const imgX = (width - imgSize) / 2;
    const imgY = 180;
    
    // Add subtle rounded corners effect
    ctx.save();
    roundedRect(ctx, imgX, imgY, imgSize, imgSize, 24);
    ctx.clip();
    
    // Calculate cover dimensions
    const scale = Math.max(imgSize / img.width, imgSize / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (imgSize - scaledWidth) / 2;
    const offsetY = (imgSize - scaledHeight) / 2;
    
    ctx.drawImage(img, imgX + offsetX, imgY + offsetY, scaledWidth, scaledHeight);
    ctx.restore();
    
    // Add subtle shadow/glow under image
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
  } catch (e) {
    // Draw placeholder
    ctx.fillStyle = '#374151';
    roundedRect(ctx, 90, 180, 900, 900, 24);
    ctx.fill();
  }
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Store name at top
  ctx.font = 'bold 42px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(storeName.toUpperCase(), width / 2, 100);
  
  // Product info section
  const infoY = 1150;
  
  // Product name
  ctx.font = 'bold 56px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  
  const productName = product.nombre.length > 35 
    ? product.nombre.substring(0, 35) + '...' 
    : product.nombre;
  ctx.fillText(productName, width / 2, infoY);
  
  // Variant info if applicable
  if (variant?.color || variant?.size) {
    ctx.font = '36px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    const variantText = [variant.color, variant.size].filter(Boolean).join(' • ');
    ctx.fillText(variantText, width / 2, infoY + 60);
  }
  
  // Price (large and prominent)
  ctx.font = 'bold 96px Inter, system-ui, sans-serif';
  ctx.fillStyle = primaryColor;
  ctx.fillText(formatPrice(product.precio_venta), width / 2, infoY + 180);
  
  // QR Code
  if (showQR) {
    const productLink = getProductLink(product, storeSlug, variant?.id);
    const trackingUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-catalog-click?sid=${storeId}&pid=${product.id}&src=whatsapp_status&redirect=${encodeURIComponent(productLink)}`;
    
    try {
      const qrImg = await loadImage(await generateQRCode(trackingUrl, 200));
      const qrSize = 180;
      const qrX = (width - qrSize) / 2;
      const qrY = 1420;
      
      // White background for QR
      ctx.fillStyle = '#ffffff';
      roundedRect(ctx, qrX - 15, qrY - 15, qrSize + 30, qrSize + 30, 16);
      ctx.fill();
      
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      
      // CTA text
      ctx.font = 'bold 32px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Escanea para comprar', width / 2, qrY + qrSize + 60);
    } catch (e) {
      console.error('Error loading QR:', e);
    }
  }
  
  // Swipe up indicator
  ctx.font = '28px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('↑ Desliza para más', width / 2, height - 60);
  
  return canvas;
};

// Helper: Load image as promise
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Helper: Draw rounded rectangle
const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Download single WhatsApp status image
export const downloadWhatsAppStatusImage = async (options: WhatsAppStatusOptions): Promise<void> => {
  const canvas = await generateWhatsAppStatusImage(options);
  
  const link = document.createElement('a');
  link.download = `${options.product.sku}_whatsapp_status.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// Generate multiple WhatsApp status images and download as ZIP
export const downloadWhatsAppStatusBulk = async (
  products: CatalogProduct[],
  storeInfo: { storeId: string; storeName: string; storeLogo?: string; storeSlug: string },
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  // Dynamic import of JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const total = products.length;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    onProgress?.(i + 1, total);
    
    const canvas = await generateWhatsAppStatusImage({
      product,
      ...storeInfo,
    });
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    // Add to zip
    zip.file(`${product.sku.replace(/[^a-zA-Z0-9]/g, '_')}_status.png`, blob);
  }
  
  // Generate and download zip
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.download = `${storeInfo.storeName.replace(/\s+/g, '_')}_whatsapp_status.zip`;
  link.href = URL.createObjectURL(zipBlob);
  link.click();
  URL.revokeObjectURL(link.href);
};
