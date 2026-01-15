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

// Generate Interactive PDF Catalog - Ultra-Minimalist Design
// ONLY includes: Main Image, Variant Thumbnails, Price, Buy Button
// NO title, NO description as per design specs
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
    const qrUrl = showQR ? await generateQRCode(productLink, 80) : null;
    
    // Generate variant thumbnails HTML - circular mini thumbnails
    let variantThumbnails = '';
    if (product.variants && product.variants.length > 1) {
      variantThumbnails = `
        <div class="variants-row">
          ${product.variants.slice(0, 8).map((v, idx) => `
            <button class="variant-thumb ${idx === 0 ? 'active' : ''}" 
                    data-variant-idx="${idx}" 
                    data-variant-image="${v.image || mainImage}"
                    data-variant-id="${v.id}"
                    onclick="switchVariant(this, '${productLink}${v.id ? `?variant=${v.id}` : ''}')"
                    title="${v.color || v.size || 'Variante'}">
              <img src="${v.image || mainImage}" alt="" />
            </button>
          `).join('')}
        </div>
      `;
    }

    // Tracking pixel (1x1 transparent gif)
    const trackingPixel = trackingBaseUrl 
      ? `<img src="${trackingBaseUrl}?sid=${storeId}&pid=${product.id}&src=pdf_catalog" width="1" height="1" style="position:absolute;opacity:0;" />`
      : '';

    // Ultra-minimalist product card: Image + Variants + Price + Buy Button ONLY
    productsHtml += `
      <div class="product-card" data-product-id="${product.id}">
        ${trackingPixel}
        <a href="${productLink}" class="image-link" target="_blank">
          <div class="product-image-container">
            <img class="main-image" src="${mainImage}" alt="" />
          </div>
        </a>
        ${variantThumbnails}
        <div class="product-footer">
          <div class="price-qr-row">
            <span class="product-price">${formatPrice(product.precio_venta)}</span>
            ${qrUrl ? `<img src="${qrUrl}" alt="" class="mini-qr" />` : ''}
          </div>
          <a href="${productLink}" class="buy-button" target="_blank">COMPRAR</a>
        </div>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${storeName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Inter', sans-serif;
          background: #ffffff;
          color: #0a0a0a;
        }
        
        .catalog-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 24px 20px;
          border-bottom: 1px solid #e5e5e5;
        }
        
        .store-logo {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .store-name {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
          padding: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        
        .product-card {
          background: #fafafa;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .image-link {
          display: block;
          text-decoration: none;
        }
        
        .product-image-container {
          aspect-ratio: 1;
          overflow: hidden;
          background: #f0f0f0;
        }
        
        .main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.2s ease;
        }
        
        /* Variant Thumbnails - Circular mini swatches */
        .variants-row {
          display: flex;
          gap: 6px;
          padding: 10px 12px;
          background: #ffffff;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .variant-thumb {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          background: none;
          transition: all 0.15s ease;
        }
        
        .variant-thumb:hover {
          transform: scale(1.1);
        }
        
        .variant-thumb.active {
          border-color: ${primaryColor};
          box-shadow: 0 0 0 2px ${primaryColor}33;
        }
        
        .variant-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        
        /* Footer: Price + QR + Buy Button */
        .product-footer {
          padding: 12px;
          background: #ffffff;
        }
        
        .price-qr-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .product-price {
          font-size: 28px;
          font-weight: 800;
          color: ${primaryColor};
          letter-spacing: -1px;
        }
        
        .mini-qr {
          width: 48px;
          height: 48px;
          border-radius: 6px;
        }
        
        .buy-button {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px;
          background: ${primaryColor};
          color: white;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.5px;
          border-radius: 8px;
          transition: background 0.2s, transform 0.1s;
        }
        
        .buy-button:hover {
          background: ${primaryColor}dd;
          transform: scale(1.02);
        }
        
        .buy-button:active {
          transform: scale(0.98);
        }
        
        @media print {
          .product-card { break-inside: avoid; page-break-inside: avoid; }
          .buy-button { background: ${primaryColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .product-price { color: ${primaryColor} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        
        @page {
          margin: 0.5cm;
        }
      </style>
      <script>
        function switchVariant(thumb, link) {
          const card = thumb.closest('.product-card');
          const mainImg = card.querySelector('.main-image');
          const imageLink = card.querySelector('.image-link');
          const buyButton = card.querySelector('.buy-button');
          const newSrc = thumb.dataset.variantImage;
          
          // Update active state
          card.querySelectorAll('.variant-thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          
          // Smooth image transition
          mainImg.style.opacity = '0.5';
          setTimeout(() => {
            mainImg.src = newSrc;
            mainImg.style.opacity = '1';
          }, 100);
          
          // Update links to include variant
          imageLink.href = link;
          buyButton.href = link;
        }
      </script>
    </head>
    <body>
      <header class="catalog-header">
        ${storeLogo ? `<img src="${storeLogo}" alt="" class="store-logo" />` : ''}
        <h1 class="store-name">${storeName}</h1>
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

// Generate WhatsApp Status image (9:16 aspect ratio) - Ultra-Minimalist
// ONLY includes: Full-screen product image, Price overlay, QR code at bottom
// NO title, NO description - image speaks for itself
export const generateWhatsAppStatusImage = async (options: WhatsAppStatusOptions): Promise<HTMLCanvasElement> => {
  const { product, storeId, storeName, storeSlug, variantIndex = 0, primaryColor = '#8B5CF6', showQR = true } = options;
  
  // WhatsApp Status dimensions (9:16)
  const width = 1080;
  const height = 1920;
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Load and draw product image FULL SCREEN
  const variant = product.variants?.[variantIndex];
  const imageUrl = variant?.image || product.images[0] || '/placeholder.svg';
  
  try {
    const img = await loadImage(imageUrl);
    
    // Draw product image covering the entire canvas
    const scale = Math.max(width / img.width, height / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;
    
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  } catch (e) {
    // Draw solid background if image fails
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
  }
  
  // Create elegant gradient overlay at bottom for price/QR
  const overlayHeight = 480;
  const bottomGradient = ctx.createLinearGradient(0, height - overlayHeight, 0, height);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, height - overlayHeight, width, overlayHeight);
  
  // Price - Large, prominent, bottom section
  const priceY = height - 280;
  ctx.font = 'bold 120px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  ctx.fillText(formatPrice(product.precio_venta), width / 2, priceY);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // QR Code - positioned elegantly at bottom right
  if (showQR) {
    const productLink = getProductLink(product, storeSlug, variant?.id);
    const trackingUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-catalog-click?sid=${storeId}&pid=${product.id}&src=whatsapp_status&redirect=${encodeURIComponent(productLink)}`;
    
    try {
      const qrImg = await loadImage(await generateQRCode(trackingUrl, 180));
      const qrSize = 140;
      const qrX = width - qrSize - 40;
      const qrY = height - qrSize - 40;
      
      // White background for QR with rounded corners
      ctx.fillStyle = '#ffffff';
      roundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
      ctx.fill();
      
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.error('Error loading QR:', e);
    }
  }
  
  // Minimal store watermark at top (small, subtle)
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(storeName, 40, 60);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
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
