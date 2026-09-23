# SPEC-04: Reservas de Probador Físico (Pick & Try) y Pase Offline

## 1. Identificación y Metadatos
- **ID:** SPEC-04
- **Archivo:** `.specs/04-physical-reservations-pick-and-try.md`
- **Módulo:** Reservas Físicas Omnicanal
- **Objetivo:** Implementar la reserva de hasta 5 prendas para prueba en vestidores de la sucursal activa, agendamiento de turnos de 30 minutos y generación del Pase de Reserva con código QR generado localmente y persistido en MMKV para uso sin conexión a internet.

---

## 2. Dependencias Requeridas
```bash
npm install react-native-qrcode-svg@^6.3.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/reservations/
├── api/
│   └── reservation.service.ts
├── components/
│   ├── FittingBagItemCard.tsx
│   ├── LimitCounterBadge.tsx
│   ├── ReservationPassModal.tsx
│   └── TimeSlotPicker.tsx
├── hooks/
│   ├── useFittingBag.ts
│   └── useReservations.ts
├── screens/
│   ├── FittingBagScreen.tsx
│   └── ReservationListScreen.tsx
├── store/
│   └── fittingBag.store.ts
└── types/
    └── reservation.types.ts
```

---

## 4. Contratos de Datos (`reservation.types.ts`)

```typescript
export type ReservationStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'ATTENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface ReservationItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  colorName: string;
  imageUrl: string;
  price: number;
}

export interface Reservation {
  id: string;
  reservationCode: string; // ej. "RES-SCZ-1042"
  branchId: string;
  branchName: string;
  scheduledDate: string;   // YYYY-MM-DD
  timeSlot: string;        // "15:30 - 16:00"
  status: ReservationStatus;
  items: ReservationItem[];
  createdAt: string;
}

export interface CreateReservationPayload {
  branchId: string;
  scheduledDate: string;
  timeSlot: string;
  variantIds: string[];
}

export interface AvailableSlotsResponse {
  date: string;
  slots: Array<{ time: string; available: boolean }>;
}
```

---

## 5. Servicio de Red (`reservation.service.ts`)

```typescript
import { apiClient } from '../../../shared/api/apiClient';
import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { Reservation, CreateReservationPayload, AvailableSlotsResponse } from '../types/reservation.types';

export const reservationService = {
  getAvailableSlots: async (branchId: string, date: string): Promise<AvailableSlotsResponse> => {
    const { data } = await apiClient.get<AvailableSlotsResponse>(
      API_ENDPOINTS.RESERVATIONS.AVAILABLE_SLOTS,
      { params: { branchId, date } }
    );
    return data;
  },

  createReservation: async (payload: CreateReservationPayload): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>(
      API_ENDPOINTS.RESERVATIONS.CREATE,
      payload
    );
    return data;
  },

  getMyReservations: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>(
      API_ENDPOINTS.RESERVATIONS.MY_RESERVATIONS
    );
    return data;
  },

  cancelReservation: async (id: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.RESERVATIONS.CANCEL(id));
  },
};
```

---

## 6. Estado Global de la Bolsa de Reserva (`fittingBag.store.ts`)

- **Estado:** `items: ReservationItem[]`, `branchId: string | null`.
- **Regla Estricta:** Límite máximo de **5 prendas por turno**.
- **Acciones:**
  - `addItem(item, branchId)`: Si `items.length >= 5`, emitir alerta `"LIMIT_REACHED"`. Si el `branchId` difiere del actual, advertir al usuario para reiniciar la bolsa.
  - `removeItem(variantId)`: Elimina la prenda. Si queda vacía, resetea `branchId`.
  - `clearBag()`: Vacía la lista y persiste en MMKV (`fitting_bag_items`).

---

## 7. Componentes y Pantallas

### 7.1. Componentes
- `LimitCounterBadge.tsx`: Barra visual de progreso con etiqueta `Prendas: X / 5`. Si $X = 5$, se pinta en color `brand.warning`.
- `FittingBagItemCard.tsx`: Fila con imagen, nombre, variante (talla/color) y botón de eliminación.
- `TimeSlotPicker.tsx`: Selector horizontal de fecha (hoy y hasta +48h) y cuadrícula de chips para horarios de 30 min.
- `ReservationPassModal.tsx`: Credencial digital con código alfanumérico visible, datos de tienda y generación nativa con `<QRCode value={reservation.reservationCode} size={200} />`. Persiste la reserva activa en MMKV para apertura sin conexión.

### 7.2. Pantallas
- `FittingBagScreen.tsx`: Muestra `LimitCounterBadge`, la lista de prendas agregadas, el `TimeSlotPicker` y el botón `"Confirmar Reserva en Tienda"`. Al confirmar, redirige a `ReservationPassModal`.
- `ReservationListScreen.tsx`: Lista dividida en pestañas *"Activas"* e *"Historial"*, permitiendo ver el pase QR o cancelar turnos en estado `PENDING`.

---

## 8. Criterios de Aceptación
- [ ] La bolsa impide agregar una sexta prenda mostrando una alerta informativa.
- [ ] No permite confirmar reservas sin seleccionar sucursal, fecha y bloque de horario.
- [ ] El código QR se dibuja en el cliente con `react-native-qrcode-svg` a partir del código de reserva.
- [ ] El pase de reserva se guarda en MMKV y es accesible sin señal de internet.