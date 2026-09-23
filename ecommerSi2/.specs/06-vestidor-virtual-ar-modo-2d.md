# SPEC-06: Vestidor Virtual con Realidad Aumentada (AR) y Fallback 2D

## 1. Identificación y Metadatos
- **ID:** SPEC-06
- **Archivo:** `.specs/06-virtual-try-on-ar.md`
- **Módulo:** Vestidor Virtual y Experiencia Aumentada
- **Objetivo:** Implementar la prueba virtual de prendas usando la cámara del dispositivo móvil con detección de puntos de referencia anatómicos y superposición gráfica en tiempo real (Skia), incluyendo un modo alternativo 2D por fotografía con controles manuales para dispositivos sin soporte AR.

---

## 2. Dependencias Requeridas
```bash
npm install react-native-vision-camera@^4.0.0 @shopify/react-native-skia@^1.0.0 react-native-image-picker@^7.1.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/virtual-fitting/
├── components/
│   ├── ARCameraView.tsx
│   ├── BodyGuidesOverlay.tsx
│   ├── Fallback2DFittingView.tsx
│   ├── FittingControlsBar.tsx
│   └── SizeCalibrationSlider.tsx
├── hooks/
│   ├── useCameraPermissions.ts
│   └── usePoseFitting.ts
├── screens/
│   └── VirtualTryOnScreen.tsx
└── utils/
    └── landmarkCalculations.ts
```

---

## 4. Contratos y Tipos (`landmarkCalculations.ts`)

```typescript
export interface LandmarkPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface TorsoLandmarks {
  leftShoulder: LandmarkPoint;
  rightShoulder: LandmarkPoint;
  leftHip: LandmarkPoint;
  rightHip: LandmarkPoint;
  neckCenter: LandmarkPoint;
}

export interface CalibrationValues {
  shoulderScale: number; // Factor 0.8 a 1.5
  verticalOffset: number;
  rotationAngle: number;
}
```

---

## 5. Arquitectura del Vestidor Virtual

```text
               [VirtualTryOnScreen]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  [Modo AR en Vivo]           [Modo Fallback 2D]
  - ARCameraView (Frontal)    - Fallback2DFittingView
  - Skia Canvas Overlay       - Foto estática de cuerpo
  - BodyGuidesOverlay         - SizeCalibrationSlider
         │                             │
         └──────────────┬──────────────┘
                        ▼
              [FittingControlsBar]
        (Talla, Color, Botón "Reservar")
```

---

## 6. Especificación de Componentes

### 6.1. Modo AR en Vivo (`ARCameraView.tsx` & `BodyGuidesOverlay.tsx`)
- Inicializa `react-native-vision-camera` con `device="front"` a 60 FPS.
- Carga la textura transparente de la prenda (`product.arTextureUrl`).
- Renderiza un `<Canvas>` de Skia sobre la cámara calculando el ancho entre hombros para escalar la textura.
- `BodyGuidesOverlay.tsx`: Renderiza una silueta translúcida con instrucciones visuales ("Ubica tu torso dentro del marco").

### 6.2. Modo Fallback 2D por Foto (`Fallback2DFittingView.tsx`)
- Se activa manualmente o si el usuario no otorga permisos de cámara.
- Permite subir o tomar una fotografía de cuerpo entero frente al espejo.
- Superpone la prenda seleccionada permitiendo arrastrarla y calibrarla con `SizeCalibrationSlider.tsx` (ancho de hombros, posición vertical y escala).

### 6.3. Barra de Control Inferior (`FittingControlsBar.tsx`)
- Selector de tallas (XS, S, M, L, XL) que reescala visualmente la prenda.
- Selector de colores disponibles.
- Botón directo: **"Añadir a Reserva de Tienda"** (transfiere la prenda y talla a la bolsa de probador físico).

---

## 7. Pantalla Principal (`VirtualTryOnScreen.tsx`)
- Cabecera con botón de retorno y switch para alternar entre *"Modo AR en Vivo"* y *"Modo Foto 2D"*.
- Contenedor interactivo según el modo activo.
- Barra inferior persistente `FittingControlsBar`.

---

## 8. Criterios de Aceptación
- [ ] Solicita permisos de cámara frontal de manera segura con fallback inmediato si se rechazan.
- [ ] En AR en vivo, la textura de la prenda escala según la distancia del usuario frente al dispositivo.
- [ ] En modo 2D, permite cargar una foto y calibrar manualmente la escala y posición de la prenda.
- [ ] Permite añadir la combinación probada a la bolsa de reserva física con un solo toque.