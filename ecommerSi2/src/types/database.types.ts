/**
 * Database Schema Entities (PostgreSQL / Azure Database)
 * Directly matching .specs/back-docs/base-de-datos.md and "Diagrma de Clases 1er parcial.png"
 * Mobile Client Contract - Version 1.0 Normalized Domain Model
 */

// 1. Módulo: Usuarios y autenticación - roles
export interface RoleEntity {
  id: string; // UUID <<PK>>
  nombre: string;
  descripcion: string;
  creado_en: string; // DateTime
}

// 2. Módulo: Usuarios y autenticación - usuarios
export interface UsuarioEntity {
  id: string; // UUID <<PK>>
  nombre: string;
  apellido: string;
  email: string; // <<unique>>
  password_hash: string;
  rol_id: string; // UUID <<FK>> -> roles.id
  estado: string; // ej: "ACTIVO", "INACTIVO"
  foto_url: string;
  creado_en: string; // DateTime
  actualizado_en: string; // DateTime
}

// 3. Módulo: Direcciones - direcciones
export interface DireccionEntity {
  id: string; // UUID <<PK>>
  usuario_id: string; // UUID <<FK>> -> usuarios.id
  nombre: string; // ej: "Casa", "Sucursal Central"
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  pais: string;
  es_principal: boolean;
  creado_en: string; // DateTime
}

// 4. Módulo: Catálogo (productos) - categorias
export interface CategoriaEntity {
  id: string; // UUID <<PK>>
  nombre: string;
  descripcion: string;
  imagen_url: string;
  categoria_padre_id: string | null; // UUID <<FK>> <<nullable>> -> categorias.id (Subcategorías)
  creado_en: string; // DateTime
}

// 5. Módulo: Catálogo (productos) - productos
export interface ProductoEntity {
  id: string; // UUID <<PK>>
  nombre: string;
  descripcion: string;
  precio: number; // Decimal
  stock: number; // Integer
  categoria_id: string; // UUID <<FK>> -> categorias.id
  imagen_url: string;
  estado: string; // ej: "ACTIVO", "INACTIVO", "AGOTADO"
  creado_en: string; // DateTime
  actualizado_en: string; // DateTime
}

// 6. Módulo: Catálogo (productos) - imagenes_productos
export interface ImagenProductoEntity {
  id: string; // UUID <<PK>>
  producto_id: string; // UUID <<FK>> -> productos.id
  url: string;
  es_principal: boolean;
  orden: number; // Integer
  creado_en: string; // DateTime
}

// 7. Módulo: Carrito de compras - carritos
export interface CarritoEntity {
  id: string; // UUID <<PK>>
  usuario_id: string; // UUID <<FK>> -> usuarios.id
  estado: string; // ej: "ACTIVO", "PROCESADO", "ABANDONADO"
  creado_en: string; // DateTime
  actualizado_en: string; // DateTime
}

// 8. Módulo: Carrito de compras - carrito_items
export interface CarritoItemEntity {
  id: string; // UUID <<PK>>
  carrito_id: string; // UUID <<FK>> -> carritos.id
  producto_id: string; // UUID <<FK>> -> productos.id
  cantidad: number; // Integer
  precio_unitario: number; // Decimal
  creado_en: string; // DateTime
}

// 9. Módulo: Órdenes y pagos - ordenes
export interface OrdenEntity {
  id: string; // UUID <<PK>>
  usuario_id: string; // UUID <<FK>> -> usuarios.id
  direccion_id: string; // UUID <<FK>> -> direcciones.id
  estado: string; // ej: "PENDIENTE", "PAGADO", "ENVIADO", "ENTREGADO", "CANCELADO"
  subtotal: number; // Decimal
  impuestos: number; // Decimal
  total: number; // Decimal
  metodo_pago: string; // ej: "TARJETA", "QR", "EFECTIVO"
  referencia_pago: string | null; // String <<nullable>>
  creado_en: string; // DateTime
  actualizado_en: string; // DateTime
}

// 10. Módulo: Órdenes y pagos - orden_items
export interface OrdenItemEntity {
  id: string; // UUID <<PK>>
  orden_id: string; // UUID <<FK>> -> ordenes.id
  producto_id: string; // UUID <<FK>> -> productos.id
  cantidad: number; // Integer
  precio_unitario: number; // Decimal
  subtotal: number; // Decimal
}

// 11. Módulo: Órdenes y pagos - pagos
export interface PagoEntity {
  id: string; // UUID <<PK>>
  orden_id: string; // UUID <<FK>> -> ordenes.id
  proveedor: string; // ej: "STRIPE", "QR_SIMPLE", "CYBERSOURCE", "EFECTIVO"
  monto: number; // Decimal
  estado: string; // ej: "EXITOSO", "PENDIENTE", "FALLIDO"
  referencia: string;
  metadata: Record<string, unknown> | null; // JSONB <<nullable>>
  creado_en: string; // DateTime
}

// 12. Módulo: IA (FastAPI) - interacciones_ia
export interface InteraccionIaEntity {
  id: string; // UUID <<PK>>
  usuario_id: string | null; // UUID <<FK>> <<nullable>> -> usuarios.id
  tipo: string; // ej: "CHAT", "RECOMENDACION", "PROBADOR_VIRTUAL"
  entrada: string; // Text
  respuesta: string; // Text
  modelo: string; // ej: "gemini-1.5-flash", "gemini-pro"
  tokens: number | null; // Integer <<nullable>>
  created_at: string; // DateTime
}

// 13. Módulo: IA (FastAPI) - feedback_ia
export interface FeedbackIaEntity {
  id: string; // UUID <<PK>>
  interaccion_id: string; // UUID <<FK>> -> interacciones_ia.id
  valoracion: number; // Integer (1..5)
  comentario: string | null; // String <<nullable>>
  creado_en: string; // DateTime
}
