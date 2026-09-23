# SPEC-07: Asistente Inteligente de Estilo por Voz e IA

## 1. Identificación y Metadatos
- **ID:** SPEC-07
- **Archivo:** `.specs/07-ai-style-assistant-and-voice.md`
- **Módulo:** Asistente Conversacional Inteligente y Recomendaciones
- **Objetivo:** Implementar un asistente de moda conversacional por texto y comandos de voz (dictado continuo), integrado con el catálogo de prendas disponibles en la sucursal activa, renderizando tarjetas interactivas de productos dentro de la conversación.

---

## 2. Dependencias Requeridas
```bash
npm install @react-native-voice/voice@^3.2.4
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/ai-assistant/
├── api/
│   └── aiAssistant.service.ts
├── components/
│   ├── ChatBubble.tsx
│   ├── RecommendedProductCard.tsx
│   ├── SuggestedPromptsBar.tsx
│   └── VoiceRecordingButton.tsx
├── hooks/
│   ├── useAIChat.ts
│   └── useVoiceInput.ts
├── screens/
│   └── AIAssistantScreen.tsx
└── types/
    └── ai.types.ts
```

---

## 4. Contratos de Datos (`ai.types.ts`)

```typescript
export interface SuggestedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  availableSizes: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedProducts?: SuggestedProduct[];
}

export interface AIQueryPayload {
  message: string;
  branchId: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIChatResponse {
  replyText: string;
  suggestedProducts?: SuggestedProduct[];
}
```

---

## 5. Servicio de Red (`aiAssistant.service.ts`)

```typescript
import { apiClient } from '../../../shared/api/apiClient';
import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { AIQueryPayload, AIChatResponse } from '../types/ai.types';

export const aiAssistantService = {
  sendMessage: async (payload: AIQueryPayload): Promise<AIChatResponse> => {
    const { data } = await apiClient.post<AIChatResponse>(
      API_ENDPOINTS.AI.ASSISTANT_CHAT,
      payload
    );
    return data;
  },
};
```

---

## 6. Entrada de Voz y Componentes

### 6.1. Hook de Reconocimiento de Voz (`useVoiceInput.ts`)
- Utiliza `@react-native-voice/voice` en español (`es-ES` / `es-419`).
- Expone `isListening`, `transcript`, `startListening()` y `stopListening()`.
- Inserta el texto transcrito directamente en la caja de entrada del chat.

### 6.2. Componentes Visuales
- `ChatBubble.tsx`: Renderiza mensajes del usuario a la derecha y del asistente a la izquierda. Si el mensaje contiene `suggestedProducts`, monta un carrusel horizontal con `RecommendedProductCard`.
- `RecommendedProductCard.tsx`: Tarjeta con imagen, nombre, precio y dos botones directos:
  - **"Ver en AR"** $\rightarrow$ Abre el vestidor virtual.
  - **"Reservar"** $\rightarrow$ Añade a la bolsa de probador físico.
- `VoiceRecordingButton.tsx`: Botón con microinteracción de onda expansiva mientras escucha el dictado.
- `SuggestedPromptsBar.tsx`: Fila deslizable con sugerencias de 1 toque (ej. *"Outfit para cena formal"*, *"Ropa fresca para verano"*).

---

## 7. Pantalla Principal (`AIAssistantScreen.tsx`)
- Lista invertida o con scroll automático al último mensaje.
- Barra superior indicando que las recomendaciones consideran el stock de la sucursal física activa.
- Barra inferior con entrada de texto, botón de micrófono y botón de envío.

---

## 8. Criterios de Aceptación
- [ ] El dictado por voz transcribe con precisión el texto en el campo de entrada.
- [ ] Las consultas envían el `branchId` activo para sugerir solo prendas con existencias locales.
- [ ] Las tarjetas de prendas dentro del chat permiten probarlas en AR o reservarlas directamente.