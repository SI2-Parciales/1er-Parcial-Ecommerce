# BITÁCORA OFICIAL: MÓDULO DE REPORTES Y ANALÍTICA CON INTELIGENCIA ARTIFICIAL

**Proyecto:** 1er Parcial - E-commerce Retail Multi-Sucursal  
**Asignatura:** Sistemas de Información II (SI2)  
**Fecha de Validación:** Septiembre 2026  
**Estado:** 100% Funcional y Conectado a Base de Datos Real (Cero Mock Data)

---

## 1. RESUMEN EJECUTIVO Y ARQUITECTURA

El sistema implementa un ecosistema de analítica avanzada que conecta consultas en lenguaje natural (texto y voz) con la base de datos relacional PostgreSQL de la cadena de tiendas.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENTES (FRONTEND)                  │
│  - Web Admin / Encargado: React + Vite (Puerto 5173)   │
│  - App Móvil Clientes: React Native / Expo (Puerto 8081)│
└───────────────────────────┬────────────────────────────┘
                            │ Authorization: Bearer <JWT>
                            ▼
┌────────────────────────────────────────────────────────┐
│               AI SERVICE (FastAPI - Puerto 8000)       │
│  - Agente LLM: Google Gemini (gemini-3.5-flash-lite)  │
│  - STT: Faster-Whisper (Modelo small, int8 CPU local)  │
│  - Control CORS, validación Pydantic y Tool Calling   │
└───────────────────────────┬────────────────────────────┘
                            │ Forwarding Authorization: Bearer <JWT>
                            ▼
┌────────────────────────────────────────────────────────┐
│             CORE BACKEND (NestJS - Puerto 1234)        │
│  - Endpoint Interno: POST /internal/reports/query     │
│  - Seguridad RBAC: @MinRole(ENCARGADO_SUCURSAL)       │
│  - Aislamiento de Sucursal (Tenant Scoping)            │
│  - Prisma ORM con agregaciones SQL nativas             │
└───────────────────────────┬────────────────────────────┘
                            │ SQL Queries
                            ▼
┌────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL Supabase)       │
│  - Tablas: ventas, detalles_venta, variantes,         │
│    productos, categorias, sucursales, inventarios      │
└────────────────────────────────────────────────────────┘
```

---

## 2. CONFIGURACIÓN DE VARIABLES DE ENTORNO (.env)

### 2.1. FastAPI (`ai-service/.env`)
```env
NESTJS_API_URL=http://localhost:1234
NESTJS_API_TIMEOUT_SECONDS=10
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006
GEMINI_API_KEY=tu_gemini_api_key_aqui
GEMINI_MODEL=gemini-3.5-flash-lite
APP_TIMEZONE=America/La_Paz
WHISPER_MODEL=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
```

### 2.2. Frontend Web (`Front-ecommer/.env`)
```env
VITE_API_URL=http://localhost:1234
VITE_AI_SERVICE_URL=http://localhost:8000
```

---

## 3. ESPECIFICACIÓN DE ENDPOINTS DEL SERVICIO DE IA

### 3.1. Endpoint de Consultas Estructuradas Directas
- **Ruta:** `POST /api/v1/reports/query`
- **Autenticación:** Requiere `Authorization: Bearer <token_jwt>` (Rol Encargado o Administrador).
- **Parámetros del Body (JSON):**
  - `metrics` (obligatorio, array de 1 a 5 elementos):
    - `revenue`: Ingresos monetarios en Bolivianos (suma de `Venta.total`).
    - `sales_count`: Cantidad de ventas pagadas (`COUNT(DISTINCT v.id)`).
    - `units_sold`: Cantidad de prendas vendidas (`SUM(detalle.cantidad)`).
    - `available_stock`: Existencias disponibles actuales en tienda.
    - `reserved_stock`: Existencias comprometidas en reservas activas.
  - `groupBy` (opcional, array de dimensiones):
    - `branch`: Agrupa por sucursal (`branchId`, `branch`).
    - `product`: Agrupa por prenda/producto (`productId`, `product`).
    - `category`: Agrupa por categoría (`categoryId`, `category`).
    - `day`: Agrupa por fecha diaria (`day` en zona horaria local `YYYY-MM-DD`).
    - `month`: Agrupa por mes calendario (`month`).
  - `dateFrom` / `dateTo` (opcional): Rango inclusivo en formato `YYYY-MM-DD`.
  - `filters` (opcional): `{ "branchId": number, "productId": number, "categoryId": number }`.
  - `order`: `"asc" | "desc"` (por defecto `"desc"`).
  - `limit`: Entero de 1 a 100 (por defecto 20).

**Ejemplo de Request:**
```json
{
  "metrics": ["revenue", "sales_count"],
  "groupBy": ["branch"],
  "dateFrom": "2026-09-01",
  "dateTo": "2026-09-30",
  "order": "desc",
  "limit": 10
}
```

**Ejemplo de Response (200 OK):**
```json
{
  "metrics": ["revenue", "sales_count"],
  "groupBy": ["branch"],
  "period": {
    "from": "2026-09-01",
    "to": "2026-09-30",
    "timeZone": "America/La_Paz"
  },
  "data": [
    {
      "branchId": 1,
      "branch": "Sucursal Central",
      "revenue": 14250.00,
      "salesCount": 42
    },
    {
      "branchId": 2,
      "branch": "Sucursal Equipetrol",
      "revenue": 9800.50,
      "salesCount": 28
    }
  ]
}
```

---

### 3.2. Endpoint de Consulta en Lenguaje Natural (Texto)
- **Ruta:** `POST /api/v1/reports/ask`
- **Autenticación:** Requiere `Authorization: Bearer <token_jwt>`.
- **Request Body:**
```json
{
  "query": "¿Cuáles fueron las prendas más vendidas este mes y cuánto recaudaron en total?"
}
```
- **Flujo de Ejecución:**
  1. El agente Gemini recibe la pregunta e interpreta la intención.
  2. Determina las métricas (`units_sold`, `revenue`) y la dimensión (`product`).
  3. Ejecuta la herramienta controlada `query_report` hacia NestJS reenviando el token Bearer.
  4. Recibe los datos reales de la base de datos PostgreSQL.
  5. Sintetiza una respuesta profesional en español citando únicamente los datos verificados.

**Ejemplo de Response (200 OK):**
```json
{
  "query": "¿Cuáles fueron las prendas más vendidas este mes y cuánto recaudaron en total?",
  "answer": "Durante el mes de septiembre de 2026, las prendas con mayor rotación fueron la 'Polera Oversize Algodón' con 34 unidades vendidas y el 'Jean Clásico Slim' con 21 unidades. El ingreso total generado por las ventas del período fue de Bs. 18,450.00.",
  "data": [
    {
      "reportQuery": {
        "metrics": ["units_sold"],
        "groupBy": ["product"],
        "dateFrom": "2026-09-01",
        "dateTo": "2026-09-30",
        "order": "desc",
        "limit": 10
      },
      "result": {
        "metrics": ["units_sold"],
        "groupBy": ["product"],
        "period": {
          "from": "2026-09-01",
          "to": "2026-09-30",
          "timeZone": "America/La_Paz"
        },
        "data": [
          { "productId": 1, "product": "Polera Oversize Algodón", "unitsSold": 34 },
          { "productId": 4, "product": "Jean Clásico Slim", "unitsSold": 21 }
        ]
      }
    }
  ]
}
```

---

### 3.3. Endpoint de Consulta por Voz (Audio a Reporte)
- **Ruta:** `POST /api/v1/reports/voice`
- **Content-Type:** `multipart/form-data`
- **Campo:** `file` (archivo de audio `.wav`, `.webm`, `.mp3`, `.ogg`, `.m4a`).
- **Autenticación:** Requiere `Authorization: Bearer <token_jwt>`.
- **Flujo Interno:**
  1. Recibe el archivo de audio grabado por el navegador mediante `MediaRecorder`.
  2. Inspecciona el contenedor multimedia mediante la librería `av` (PyAV).
  3. Transcribe el audio con el modelo `faster-whisper` (`small`, int8) en español.
  4. Envía el texto resultante al flujo del Agente Reportes (`process_report_query`).
  5. Retorna la transcripción, el análisis sintético y los datos tabulares oficiales.

**Ejemplo de Response (200 OK):**
```json
{
  "transcription": "Quiero ver los ingresos de este mes por sucursal",
  "answer": "En septiembre de 2026, la Sucursal Central lideró la recaudación con Bs. 14,250.00, seguida de Sucursal Equipetrol con Bs. 9,800.50.",
  "data": [
    {
      "reportQuery": {
        "metrics": ["revenue"],
        "groupBy": ["branch"],
        "dateFrom": "2026-09-01",
        "dateTo": "2026-09-30"
      },
      "result": { ... }
    }
  ]
}
```

---

## 4. CONTROL DE SEGURIDAD Y AISLAMIENTO MULTI-TENANT (RBAC)

El sistema aplica estrictas reglas de negocio en [report-query.service.ts](file:///c:/Users/hp/web/proyectos/proyecto%20U/examen1%20Si2-2-2026/1er-Parcial-Ecommerce/back-end/src/reportes/query/report-query.service.ts):

| Rol del Usuario | Permiso de Consulta | Ámbito y Aislamiento de Datos |
| :--- | :--- | :--- |
| **ADMINISTRADOR** | Total | Puede consultar datos consolidados globales o filtrar por cualquier `branchId`. |
| **ENCARGADO_SUCURSAL** | Restringido a su tienda | Su `branchId` se sobrescribe forzosamente con el asignado a su cuenta. Si intenta consultar otra sucursal, recibe **403 Forbidden**. |
| **CAJERO / CLIENTE** | Sin acceso | Rechazado con **403 Forbidden** por el decorador `@MinRole`. |
| **Sin Token / Expirado** | Denegado | Rechazado con **401 Unauthorized**. |

---

## 5. INTEGRACIÓN EN EL FRONTEND WEB (`Front-ecommer`)

Se reemplazó por completo el motor simulado anterior por el cliente oficial en [ai.service.ts](file:///c:/Users/hp/web/proyectos/proyecto%20U/examen1%20Si2-2-2026/1er-Parcial-Ecommerce/Front-ecommer/src/modulos/asistente-ia/servicios/ai.service.ts):

1. **Cliente HTTP con Interceptor:**
   Se configuró `aiApiClient` en [api-client.ts](file:///c:/Users/hp/web/proyectos/proyecto%20U/examen1%20Si2-2-2026/1er-Parcial-Ecommerce/Front-ecommer/src/core/http/api-client.ts) apuntando a `VITE_AI_SERVICE_URL=http://localhost:8000`, inyectando automáticamente la cabecera `Authorization: Bearer <accessToken>`.
2. **Tablas Dinámicas y KPIs Reales:**
   La función `transformToAiReport()` calcula dinámicamente las columnas según `result.groupBy` y `result.metrics`, suma los totales numéricos reales y formatea montos en moneda boliviana (Bs.).
3. **Gráficos Dinámicos (Recharts):**
   Genera automáticamente gráficos de líneas o áreas para dimensiones temporales (`day`, `month`) y gráficos de barras comparativas para dimensiones estructurales (`branch`, `product`, `category`).
4. **Grabación de Audio en Navegador:**
   El hook [useSpeechToText.ts](file:///c:/Users/hp/web/proyectos/proyecto%20U/examen1%20Si2-2-2026/1er-Parcial-Ecommerce/Front-ecommer/src/modulos/asistente-ia/ganchos/useSpeechToText.ts) activa el micrófono mediante `navigator.mediaDevices.getUserMedia` y `MediaRecorder`, produciendo un Blob que se envía directamente a `/api/v1/reports/voice`.

---

## 6. CASOS DE PRUEBA OFICIALES PARA LA DEFENSA

### Caso 1: Consulta Directa de Ingresos por Sucursal
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/query`
- **Headers:** `Authorization: Bearer <TOKEN_ADMIN>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "metrics": ["revenue"],
    "groupBy": ["branch"],
    "dateFrom": "2026-09-01",
    "dateTo": "2026-09-30"
  }
  ```
- **Resultado Esperado:** Código HTTP `200 OK`. Retorna filas con `branchId`, `branch` y `revenue` calculados de la tabla `ventas` con estado `PAGADA`.

### Caso 2: Pregunta en Lenguaje Natural (Texto)
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/ask`
- **Headers:** `Authorization: Bearer <TOKEN_ENCARGADO>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "query": "¿Cuáles fueron los ingresos de hoy en mi sucursal?"
  }
  ```
- **Resultado Esperado:** Código HTTP `200 OK`. El agente traduce "hoy" a la fecha actual (`2026-09-30`), llama a `query_report` con la sucursal del token y responde con el monto exacto.

### Caso 3: Consulta por Voz con Archivo de Audio
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/voice`
- **Headers:** `Authorization: Bearer <TOKEN_ADMIN>`
- **Body Form-Data:** `file=@audio.wav`
- **Resultado Esperado:** Código HTTP `200 OK`. Faster-Whisper transcribe el audio, el agente procesa la métrica solicitada y retorna el JSON con `transcription`, `answer` y `data`.

### Caso 4: Intento de Violación de Sucursal por Encargado
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/query`
- **Headers:** `Authorization: Bearer <TOKEN_ENCARGADO_SUCURSAL_1>`
- **Body:**
  ```json
  {
    "metrics": ["revenue"],
    "groupBy": ["branch"],
    "filters": { "branchId": 2 }
  }
  ```
- **Resultado Esperado:** Código HTTP `403 Forbidden`. Mensaje: `"Solo puedes consultar reportes de tu sucursal asignada."`.

### Caso 5: Pregunta Fuera de Alcance (Out-of-Scope)
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/ask`
- **Headers:** `Authorization: Bearer <TOKEN_ADMIN>`
- **Body:**
  ```json
  {
    "query": "¿Cuál es la capital de Francia y cómo preparar un pastel?"
  }
  ```
- **Resultado Esperado:** Código HTTP `200 OK`. `data: []`. El agente responde: `"Puedo ayudarte con reportes de ventas e inventario. Indícame qué quieres consultar, por ejemplo una métrica y un período."` sin realizar llamadas espurias a la base de datos.

### Caso 6: Validación de Combinaciones Prohibidas
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/query`
- **Body con error 1:** `{ "metrics": ["revenue"], "groupBy": ["product"] }`
  - **Resultado:** Código HTTP `400 Bad Request`. `"revenue no puede agruparse por producto o categoría porque debe usar Venta.total."`
- **Body con error 2:** `{ "metrics": ["available_stock"], "groupBy": ["day"] }`
  - **Resultado:** Código HTTP `400 Bad Request`. `"El inventario es actual y no admite agrupaciones temporales."`

### Caso 7: Petición sin Token de Autenticación
- **Método / URL:** `POST http://localhost:8000/api/v1/reports/query`
- **Headers:** Ninguno
- **Body:** `{ "metrics": ["revenue"] }`
- **Resultado Esperado:** Código HTTP `401 Unauthorized`. `"Se requiere un token Bearer válido."`

---

## 7. RESULTADOS DE SUITES DE PRUEBAS AUTOMATIZADAS

### 7.1. Pruebas Unitarias del Servicio de IA (`ai-service`)
- **Comando:** `python -m pytest`
- **Resultado:** **43 PASSED, 0 FAILED** (100% de éxito en 11.8 segundos).
  - `tests/test_cors.py`: 3 tests pasados.
  - `tests/test_report_agent.py`: 17 tests pasados.
  - `tests/test_reports.py`: 13 tests pasados.
  - `tests/test_reports_voice.py`: 10 tests pasados.

### 7.2. Pruebas Unitarias del Backend (`back-end`)
- **Comando:** `npm test -- src/reportes/query/report-query.service.spec.ts`
- **Resultado:** **24 PASSED, 0 FAILED** (100% de éxito).

### 7.3. Compilación de Producción del Frontend (`Front-ecommer`)
- **Comando:** `npm run build`
- **Resultado:** **0 errores**. Artefactos generados en `dist/` listos para despliegue.

---

## 8. GUÍA RÁPIDA PARA LEVANTAR EL ENTORNO COMPLETO

1. **Levantar Core Backend (NestJS):**
   ```powershell
   cd "back-end"
   npm run start:dev
   # Escuchando en http://localhost:1234
   ```

2. **Levantar AI Service (FastAPI):**
   ```powershell
   cd "ai-service"
   uvicorn app.main:app --port 8000 --reload
   # Escuchando en http://localhost:8000
   ```

3. **Levantar Frontend Web:**
   ```powershell
   cd "Front-ecommer"
   npm run dev
   # Disponible en http://localhost:5173
   ```
