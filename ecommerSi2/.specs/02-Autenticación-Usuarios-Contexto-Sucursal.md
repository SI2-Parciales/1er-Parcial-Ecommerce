# SPEC-02: Autenticación de Usuarios y Contexto de Sucursal Física

## 1. Identificación y Metadatos
- **ID:** SPEC-02
- **Archivo:** `.specs/02-auth-and-branch-context.md`
- **Módulo:** Autenticación, Sesión y Contexto Global de Tienda
- **Objetivo:** Implementar registro e inicio de sesión de clientes con JWT, formularios validados con Zod, y un gestor global persistente de Ciudad y Sucursal física activa para la consulta de stock local.

---

## 2. Dependencias Requeridas
```bash
npm install zustand@^4.5.0 react-hook-form@^7.50.0 @hookform/resolvers@^3.3.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/
├── auth/
│   ├── api/
│   │   └── auth.service.ts
│   ├── schemas/
│   │   └── auth.schema.ts
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── store/
│   │   └── auth.store.ts
│   └── types/
│       └── auth.types.ts
└── branch-context/
    ├── api/
    │   └── branch.service.ts
    ├── components/
    │   ├── BranchHeaderSelector.tsx
    │   └── BranchSelectionModal.tsx
    ├── store/
    │   └── branch.store.ts
    └── types/
        └── branch.types.ts
```

---

## 4. Contratos de Datos y Esquemas

### 4.1. Modelos de Dominio
```typescript
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  preferredCity?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  isActive: boolean;
}

export interface CitySummary {
  name: string;
  branchesCount: number;
}
```

### 4.2. Esquemas de Validación Zod (`auth.schema.ts`)
- **`loginSchema`:**
  - `email`: obligatorio, formato email válido.
  - `password`: mínimo 6 caracteres.
- **`registerSchema`:**
  - `fullName`: mínimo 3 caracteres.
  - `email`: obligatorio, formato email válido.
  - `phone`: opcional, formato numérico internacional.
  - `password`: mínimo 6 caracteres.
  - `confirmPassword`: validación de coincidencia exacta con `password`.

---

## 5. Servicios de Red

### 5.1. `auth.service.ts`
- `login(email, password)`: Realiza `POST` a `/api/v1/auth/login` con cuerpo `x-www-form-urlencoded` (`username`, `password`). Retorna `AuthResponse`.
- `register(payload)`: Realiza `POST` a `/api/v1/auth/register` con payload JSON (`fullName`, `email`, `password`, `phone`). Retorna `AuthResponse`.
- `getCurrentUser()`: Realiza `GET` a `/api/v1/auth/me`. Retorna `User`.

### 5.2. `branch.service.ts`
- `getCities()`: `GET` a `/api/v1/branches/cities`. Retorna `CitySummary[]`.
- `getBranchesByCity(city)`: `GET` a `/api/v1/branches?city={city}`. Retorna `Branch[]`.
- `getBranchById(id)`: `GET` a `/api/v1/branches/{id}`. Retorna `Branch`.

---

## 6. Estado Global (Zustand Stores)

### 6.1. `auth.store.ts`
- **Estado:** `user: User | null`, `isAuthenticated: boolean`, `isLoading: boolean`.
- **Acciones:**
  - `setSession(user, accessToken, refreshToken)`: Escribe en MMKV (`access_token`, `refresh_token`, `auth_user`) y actualiza el estado a autenticado.
  - `logout()`: Purga llaves en MMKV y resetea estado a `null` / `false`.
  - `hydrateAuth()`: Lee tokens y usuario de MMKV al iniciar la app y restaura la sesión.

### 6.2. `branch.store.ts`
- **Estado:** `selectedCity: string | null`, `selectedBranch: Branch | null`, `isModalOpen: boolean`.
- **Acciones:**
  - `setBranch(branch)`: Guarda en MMKV (`selected_branch`, `selected_city`), actualiza estado y cierra el modal.
  - `setCity(city)`: Actualiza ciudad activa y guarda en MMKV.
  - `setModalOpen(isOpen)`: Abre o cierra el modal de selección.
  - `hydrateBranchContext()`: Lee datos de MMKV. Si no hay sucursal guardada, establece `isModalOpen: true` forzando la selección inicial.

---

## 7. Componentes y Vistas

### 7.1. Selector de Cabecera (`BranchHeaderSelector.tsx`)
- Botón tipo píldora para la cabecera superior.
- Muestra icono `MapPin`, nombre de la sucursal seleccionada (o "Seleccionar Tienda") y ciudad.
- Al hacer clic, ejecuta `setModalOpen(true)`.

### 7.2. Modal de Selección Obligatoria (`BranchSelectionModal.tsx`)
- Modal presentado desde la parte inferior con fondo bloqueante.
- Si no hay sucursal activa seleccionada, no se puede descartar pulsando fuera del modal.
- Controles:
  - Selector horizontal de ciudades (obtenidas con `branchService.getCities`).
  - Lista de sucursales según la ciudad activa con dirección, horario de atención e icono de check si está seleccionada.
  - Al pulsar una sucursal, se invoca `setBranch(branch)` y se cierra el modal.

### 7.3. Pantallas de Autenticación
- `LoginScreen.tsx`: Formulario con `useForm` y `zodResolver`. Campos para correo y contraseña, botón de envío con estado de carga, alerta de error y enlace hacia `RegisterModal`.
- `RegisterScreen.tsx`: Formulario con validación de coincidencia de contraseñas. Al completar el registro, guarda la sesión y redirige automáticamente.

### 7.4. Inicialización en `App.tsx`
- En un `useEffect` raíz, disparar `hydrateAuth()` y `hydrateBranchContext()`.
- Montar `<BranchSelectionModal />` a nivel raíz para que sea accesible en cualquier pantalla.

---

## 8. Criterios de Aceptación
- [ ] Si la app inicia sin sucursal previa, el modal de selección se abre automáticamente y no permite cerrarse sin elegir una sucursal física.
- [ ] La sucursal y la sesión persisten en MMKV y sobreviven al reinicio de la aplicación.
- [ ] Formularios de login y registro impiden envíos inválidos mostrando errores de validación de Zod.
- [ ] Errores del backend (`400`, `401`, `409`) se presentan en un banner visual claro dentro del formulario.
- [ ] El cambio de sucursal en `BranchHeaderSelector` actualiza el contexto global de inmediato.