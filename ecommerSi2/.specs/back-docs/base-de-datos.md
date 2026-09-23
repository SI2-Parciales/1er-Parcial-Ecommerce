@startuml
skinparam linetype ortho
skinparam roundcorner 5
skinparam classAttributeIconSize 0
hide empty methods

' ==========================================
' Módulo: Usuarios y autenticación
' ==========================================
class roles {
    + id : UUID <<PK>>
    + nombre : String
    + descripcion : String
    + creado_en : DateTime
}

class usuarios {
    + id : UUID <<PK>>
    + nombre : String
    + apellido : String
    + email : String <<unique>>
    + password_hash : String
    + rol_id : UUID <<FK>>
    + estado : String
    + foto_url : String
    + creado_en : DateTime
    + actualizado_en : DateTime
}

' ==========================================
' Módulo: Direcciones
' ==========================================
class direcciones {
    + id : UUID <<PK>>
    + usuario_id : UUID <<FK>>
    + nombre : String
    + direccion : String
    + ciudad : String
    + estado : String
    + codigo_postal : String
    + pais : String
    + es_principal : Boolean
    + creado_en : DateTime
}

' ==========================================
' Módulo: Catálogo (productos)
' ==========================================
class categorias {
    + id : UUID <<PK>>
    + nombre : String
    + descripcion : String
    + imagen_url : String
    + categoria_padre_id : UUID <<FK>> <<nullable>>
    + creado_en : DateTime
}

class productos {
    + id : UUID <<PK>>
    + nombre : String
    + descripcion : String
    + precio : Decimal
    + stock : Integer
    + categoria_id : UUID <<FK>>
    + imagen_url : String
    + estado : String
    + creado_en : DateTime
    + actualizado_en : DateTime
}

class imagenes_productos {
    + id : UUID <<PK>>
    + producto_id : UUID <<FK>>
    + url : String
    + es_principal : Boolean
    + orden : Integer
    + creado_en : DateTime
}

' ==========================================
' Módulo: Carrito de compras
' ==========================================
class carritos {
    + id : UUID <<PK>>
    + usuario_id : UUID <<FK>>
    + estado : String
    + creado_en : DateTime
    + actualizado_en : DateTime
}

class carrito_items {
    + id : UUID <<PK>>
    + carrito_id : UUID <<FK>>
    + producto_id : UUID <<FK>>
    + cantidad : Integer
    + precio_unitario : Decimal
    + creado_en : DateTime
}

' ==========================================
' Módulo: Órdenes y pagos
' ==========================================
class ordenes {
    + id : UUID <<PK>>
    + usuario_id : UUID <<FK>>
    + direccion_id : UUID <<FK>>
    + estado : String
    + subtotal : Decimal
    + impuestos : Decimal
    + total : Decimal
    + metodo_pago : String
    + referencia_pago : String <<nullable>>
    + creado_en : DateTime
    + actualizado_en : DateTime
}

class orden_items {
    + id : UUID <<PK>>
    + orden_id : UUID <<FK>>
    + producto_id : UUID <<FK>>
    + cantidad : Integer
    + precio_unitario : Decimal
    + subtotal : Decimal
}

class pagos {
    + id : UUID <<PK>>
    + orden_id : UUID <<FK>>
    + proveedor : String
    + monto : Decimal
    + estado : String
    + referencia : String
    + metadata : JSONB <<nullable>>
    + creado_en : DateTime
}

' ==========================================
' Módulo: IA (FastAPI)
' ==========================================
class interacciones_ia {
    + id : UUID <<PK>>
    + usuario_id : UUID <<FK>> <<nullable>>
    + tipo : String
    + entrada : Text
    + respuesta : Text
    + modelo : String
    + tokens : Integer <<nullable>>
    + created_at : DateTime
}

class feedback_ia {
    + id : UUID <<PK>>
    + interaccion_id : UUID <<FK>>
    + valoracion : Integer
    + comentario : String <<nullable>>
    + creado_en : DateTime
}

' ==========================================
' Relaciones y Cardinalidades
' ==========================================
roles "1" -- "N" usuarios
usuarios "1" -- "N" direcciones
usuarios "1" -- "1" carritos
carritos "1" -- "N" ordenes

carritos "1" -- "N" carrito_items
productos "1" -- "N" carrito_items

categorias "0..1" -- "N" categorias : Subcategorías
categorias "1" -- "N" productos
productos "1" -- "N" imagenes_productos

ordenes "1" -- "N" orden_items
productos "1" -- "N" orden_items

pagos "0..1" -- "1" ordenes

ordenes "1" -- "N" interacciones_ia
interacciones_ia "1" -- "N" feedback_ia

@enduml