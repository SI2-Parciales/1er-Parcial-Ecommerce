# SPEC-08: Perfil, Historial, Sincronización Offline y Cierre de Sesión

## 1. Identificación y Metadatos
- **ID:** SPEC-08
- **Archivo:** `.specs/08-profile-orders-and-offline-sync.md`
- **Módulo:** Perfil de Cliente, Historial y Contingencia Offline
- **Objetivo:** Implementar la administración del perfil, historial de compras digitales con visualización de comprobantes, seguimiento de estado de reservas físicas y modo de contingencia offline con detección de red.

---

## 2. Dependencias Requeridas
```bash
npm install @react-native-community/netinfo@^11.3.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/profile/
├── api/
│   └── orders.service.ts
├── components/
│   ├── OfflineStatusBar.tsx
│   ├── OrderHistoryCard.tsx
│   └── ReservationStatusTimeline.tsx
├── hooks/
│   ├── useNetworkStatus.ts
│   └── useOrderHistory.ts
└── screens/
    ├── OrderDetailScreen.tsx
    ├── OrderHistoryScreen.tsx
    ├── ProfileScreen.tsx
    └── ReservationTrackingScreen.tsx
```

---

## 4. Contratos de Datos y Servicio de Red

```typescript
export interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  paymentMethod: 'BANK_GATEWAY' | 'STATIC_QR';
  status: 'PAID' | 'PENDING_MANUAL_VERIFICATION' | 'DELIVERED';
  receiptUrl?: string;
  itemsCount: number;
}
```

```typescript
import { apiClient } from '../../../shared/api/apiClient';
import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { OrderHistoryItem } from './types';

export const ordersService = {
  getMyOrders: async (): Promise<OrderHistoryItem[]> => {
    const { data } = await apiClient.get<OrderHistoryItem[]>(API_ENDPOINTS.ORDERS.MY_ORDERS);
    return data;
  },

  getOrderDetail: async (id: string): Promise<any> => {
    const { data } = await apiClient.get(API_ENDPOINTS.ORDERS.ORDER_DETAIL(id));
    return data;
  },
};
```

---

## 5. Componentes y Detección de Red

### 5.1. Detección Offline (`useNetworkStatus.ts` & `OfflineStatusBar.tsx`)
- Monitorea `@react-native-community/netinfo`.
- Si `isConnected === false`, renderiza una barra superior fija de advertencia: *"Sin conexión. Mostrando tus pases de reserva desde la memoria local"*.

### 5.2. Componentes de Seguimiento
- `OrderHistoryCard.tsx`: Muestra número de orden, fecha, método de pago e insignia de estado (`PAID` en verde, `PENDING_VERIFICATION` en ámbar).
- `ReservationStatusTimeline.tsx`: Línea de tiempo visual para turnos de probador:
  - `1. Solicitada` $\rightarrow$ `2. En Preparación` $\rightarrow$ `3. Lista en Vestidor` $\rightarrow$ `4. Atendida`.

---

## 6. Pantallas Principales

### 6.1. Perfil del Usuario (`ProfileScreen.tsx`)
- Muestra nombre completo, correo, teléfono y sucursal preferida.
- Accesos directos a:
  - **Mis Pases de Reserva** (abre `ReservationTrackingScreen`).
  - **Mis Compras Digitales** (abre `OrderHistoryScreen`).
  - **Cambiar de Tienda Física** (abre `BranchSelectionModal`).
- Botón de cierre de sesión: Purga tokens en MMKV, limpia el estado de Zustand y reinicia la navegación.

### 6.2. Detalle de Orden (`OrderDetailScreen.tsx`)
- Desglose de prendas adquiridas, dirección o sucursal de recojo y miniatura del comprobante subido si el pago se realizó mediante QR institucional.

---

## 7. Criterios de Aceptación
- [ ] La barra de estado offline se muestra inmediatamente al cortar internet.
- [ ] Los pases de reserva se pueden abrir y visualizar con su QR sin red activa.
- [ ] El estado de validación manual de pagos por QR se refleja con claridad en el historial.
- [ ] El botón de cerrar sesión elimina credenciales de MMKV y redirige al stack inicial.