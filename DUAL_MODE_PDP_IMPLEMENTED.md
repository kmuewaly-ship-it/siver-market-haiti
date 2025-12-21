# Dual Mode Product Page Implementation

## Overview
The Product Detail Page (`ProductPage.tsx`) has been completely rewritten to support a "Dual Mode" experience for B2C (End Users) and B2B (Sellers/Merchants).

## Key Features

### 1. Role-Based Rendering
- **Detection**: Uses `useAuth` to check if `user.role === 'seller'`.
- **Data Source**:
  - **B2C**: Uses `seller_catalog` data (Retail Price, Standard Stock).
  - **B2B**: Uses `source_product` data (Wholesale Price, Physical Stock, MOQ).

### 2. B2B Specific UI (Seller Mode)
- **Price Display**:
  - Primary: Wholesale Cost (Blue/Green).
  - Secondary: Suggested PVP (Strikethrough/Reference).
  - Badge: "Ganas $X" (Profit per unit).
- **Investment Calculator (Sticky Footer)**:
  - Real-time calculation based on quantity.
  - Shows: "Inversión Total" and "Tu Ganancia".
  - Button: "Comprar B2B".
- **MOQ Enforcement**:
  - Quantity selector starts at `moq`.
  - Warning banner if `moq > 1`.

### 3. B2C Specific UI (Client Mode)
- **Price Display**: Standard Retail Price.
- **Sticky Footer**:
  - Simple "Total" calculation.
  - Standard "Agregar al Carrito" button.
- **Trust Badges**: Shipping, Warranty, Security.

### 4. Mobile Optimization
- **Sticky Footers**: Custom fixed bottom bars for both modes with `safe-area-bottom` support.
- **Gallery**: Swipeable image gallery with touch controls.
- **Layout**: Single column on mobile, split column on desktop.

## Technical Details
- **File**: `src/pages/ProductPage.tsx`
- **Hooks Used**: `useSellerProduct`, `useCart`, `useCartB2B`, `useIsMobile`.
- **Styling**: Tailwind CSS with custom gradients for B2B differentiation.
