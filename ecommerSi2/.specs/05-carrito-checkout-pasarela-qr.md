# SPEC-05: Carrito Digital y Motor de Checkout Dual (Pasarela Bancaria y QR Estático)

## 1. Identificación y Metadatos
- **ID:** SPEC-05
- **Archivo:** `.specs/05-cart-and-checkout-engine.md`
- **Módulo:** Carrito de Compras, Checkout y Pasarelas de Pago
- **Objetivo:** Desarrollar el carrito de compras digital, cálculo de impuestos/totales y un sistema de pago dual: (A) Pasarela bancaria directa y (B) Pago con código QR estático institucional subido por administración, con descarga de imagen, copiado de cuentas y subida de comprobante comprimido en cliente.

---

## 2. Dependencias Requeridas
```bash
npm install react-native-image-picker@^7.1.0 react-native-image-resizer@^1.4.5 @react-native-clipboard/clipboard@^1.14.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/
├── cart/
│   ├── components/
│   │   ├── CartItemCard.tsx
│   │   └── OrderSummaryCard.tsx
│   ├── hooks/
│   │   └── useCart.ts
│   ├── screens/
│   │   └── CartScreen.tsx
│   └── store/
│       └── cart.store.ts
└── checkout/
    ├── api/
    │   └── checkout.service.ts
    ├── components/
    │   ├── BankGatewaySection.tsx
    │   ├── FileUploadZone.tsx
    │   ├── StaticQrPaymentSection.tsx
    │   └── ZoomableQrModal.tsx
    ├── screens/
    │   ├── CheckoutScreen.tsx
    │   └── OrderSuccessScreen.tsx
    └── types/
        └── checkout.types.ts
```

---

## 4. Contratos de Datos (`checkout.types.ts`)

```typescript
export type DeliveryMethod = 'STORE_PICKUP' | 'HOME_DELIVERY';
export type PaymentMethod = 'BANK_GATEWAY' | 'STATIC_QR';

export interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  colorName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export interface StaticQrInfo {
  qrImageUrl: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  nationalTaxId: string; // NIT / CI
  accountType: string;
}

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: 'PAID' | 'PENDING_MANUAL_VERIFICATION';
  createdAt: string;
}
```

---

## 5. Servicio de Red (`checkout.service.ts`)

```typescript
import { apiClient } from '../../../shared/api/apiClient';
import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { StaticQrInfo, OrderConfirmation } from './types/checkout.types';

export const checkoutService = {
  getStaticQrInfo: async (): Promise<StaticQrInfo> => {
    const { data } = await apiClient.get<StaticQrInfo>(API_ENDPOINTS.PAYMENTS.STATIC_QR_INFO);
    return data;
  },

  checkoutGateway: async (payload: any): Promise<OrderConfirmation> => {
    const { data } = await apiClient.post<OrderConfirmation>(
      API_ENDPOINTS.ORDERS.CHECKOUT_GATEWAY,
      payload
    );
    return data;
  },

  checkoutStaticQr: async (formData: FormData): Promise<OrderConfirmation> => {
    const { data } = await apiClient.post<OrderConfirmation>(
      API_ENDPOINTS.ORDERS.CHECKOUT_STATIC_QR,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};
```

---

## 6. Store del Carrito (`cart.store.ts`)

- **Persistencia en MMKV:** `cart_items`.
- **Acciones:**
  - `addItem(item)`: Si ya existe, incrementa `quantity` validando no superar `maxStock`.
  - `updateQuantity(variantId, delta)`: Incrementa o decrementa; si llega a 0, elimina el ítem.
  - `removeItem(variantId)`: Remueve el ítem.
  - `clearCart()`: Limpia los artículos tras compra exitosa.
  - `getTotals()`: Retorna `{ subtotal, shipping, total }` reactivamente.

---

## 7. Componentes y Pantallas

### 7.1. Componentes Clave
- `StaticQrPaymentSection.tsx`: Muestra el QR provisto por FastAPI, datos bancarios (banco, titular, NIT) y botón para copiar cuenta con `@react-native-clipboard/clipboard`.
- `ZoomableQrModal.tsx`: Modal para ver el QR en pantalla completa y guardarlo en la galería.
- `FileUploadZone.tsx`: Permite tomar foto o elegir de galería. Comprime automáticamente con `ImageResizer.createResizedImage` a máx. 1200px, JPEG 80% (<1.5 MB) y muestra vista previa.
- `BankGatewaySection.tsx`: Formulario para tokenización de tarjeta en entorno de prueba.

### 7.2. Pantallas
- `CartScreen.tsx`: Lista de prendas, selector de tipo de entrega (Recojo / Envío) y botón hacia checkout.
- `CheckoutScreen.tsx`: Selector segmentado entre *"Tarjeta Bancaria"* y *"Pago QR Institucional"*.
- `OrderSuccessScreen.tsx`: Pantalla verde para órdenes `PAID` o pantalla ámbar informativa para órdenes `PENDING_MANUAL_VERIFICATION`.

---

## 8. Criterios de Aceptación
- [ ] No permite superar el stock máximo al cambiar cantidades en el carrito.
- [ ] El número de cuenta bancaria se copia al portapapeles con confirmación visual.
- [ ] Las imágenes de comprobante se comprimen en cliente antes de ser enviadas a la API.
- [ ] Al pagar con QR, la orden se registra con estado `PENDING_MANUAL_VERIFICATION` y limpia el carrito.