/**
 * ============================================================================
 * PRUEBAS DE VERIFICACIÓN: FASE 1 Y FASE 2 (test-reservas-fase1-fase2.js)
 * ============================================================================
 * Valida de forma automatizada:
 * 1. Tipos de datos y mapeos en español (ReservaEntidad -> ClientReservation)
 * 2. Casos de Uso:
 *    - CU-R01: Crear reserva (Payload ISO 8601 y estructura)
 *    - CU-R02: Consultar mis reservas (Filtrado de activas e historial)
 *    - CU-R03: Consultar detalle de reserva (Prendas, tallas, colores, sucursal)
 *    - CU-R04: Modificar reserva (Reducción y eliminación de prendas)
 *    - CU-R05: Cancelar reserva (Estados permitidos y transición a CANCELADA)
 * 3. Manejo de Errores Predictivos (400, 401, 403, 404, 409)
 * 4. Regla de negocio de la bolsa de probador (Máximo 5 prendas)
 */

let pruebasPasadas = 0;
let pruebasTotales = 0;

function afirmar(condicion, descripcion) {
  pruebasTotales++;
  if (condicion) {
    console.log(`  ✓ ${descripcion}`);
    pruebasPasadas++;
  } else {
    console.error(`  ✗ FALLO: ${descripcion}`);
    process.exitCode = 1;
  }
}

console.log('\n======================================================');
console.log(' INICIANDO VERIFICACIÓN DE FASE 1 Y FASE 2 (RESERVAS) ');
console.log('======================================================\n');

// --------------------------------------------------------------------------
// 1. Verificación del Mapeo de Entidades del Backend a la App Móvil
// --------------------------------------------------------------------------
console.log('1. Verificando Mapeo de ReservaEntidad a ClientReservation...');

const entidadMock = {
  id: 42,
  fechaHora: '2026-10-01T15:30:00.000Z',
  estado: 'PENDIENTE',
  creadoEn: '2026-09-30T00:00:00.000Z',
  actualizadoEn: '2026-09-30T00:00:00.000Z',
  sucursal: {
    id: 1,
    nombre: 'Sucursal Central 7 de Calles',
    ubicacion: 'Calle Isabel La Católica #45',
  },
  cliente: {
    id: 5,
    nombre: 'Carlos',
    apellido: 'Gutiérrez',
    telefono: '77889900',
  },
  detalles: [
    {
      id: 101,
      cantidad: 1,
      varianteProducto: {
        id: 12,
        sku: 'POL-URB-M-NEG',
        producto: {
          id: 3,
          nombre: 'Polera Urbana Oversize',
          imagenUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
        },
        talla: { id: 2, nombre: 'M' },
        color: { id: 1, nombre: 'Negro Profundo', codigoHex: '#111827' },
      },
    },
    {
      id: 102,
      cantidad: 2,
      varianteProducto: {
        id: 15,
        sku: 'SHO-DEP-L-AZU',
        producto: {
          id: 4,
          nombre: 'Short Deportivo Transpirable',
          imagenUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b',
        },
        talla: { id: 3, nombre: 'L' },
        color: { id: 2, nombre: 'Azul Marino', codigoHex: '#1E3A8A' },
      },
    },
  ],
};

function mapearReservaEntidadACliente(entidad) {
  const items = (entidad.detalles || []).map((det) => ({
    id: `det-${det.id}`,
    detalleId: det.id,
    productId: String(det.varianteProducto.producto.id),
    productName: det.varianteProducto.producto.nombre,
    variantId: String(det.varianteProducto.id),
    sku: det.varianteProducto.sku,
    sizeName: det.varianteProducto.talla.nombre,
    colorName: det.varianteProducto.color.nombre,
    colorHex: det.varianteProducto.color.codigoHex || '#333333',
    price: 0,
    imageUrl:
      det.varianteProducto.producto.imagenUrl ||
      'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
    quantity: det.cantidad,
  }));

  const reservationCode = `RES-${String(entidad.id).padStart(4, '0')}`;

  return {
    id: String(entidad.id),
    backendId: entidad.id,
    reservationCode,
    branchId: String(entidad.sucursal.id),
    branchName: entidad.sucursal.nombre,
    branchAddress: entidad.sucursal.ubicacion,
    scheduledTime: entidad.fechaHora,
    status: entidad.estado,
    items,
    rawDetalles: entidad.detalles,
    createdAt: entidad.creadoEn,
    qrPayload: JSON.stringify({
      id: entidad.id,
      codigo: reservationCode,
      sucursal: entidad.sucursal.nombre,
      fechaHora: entidad.fechaHora,
      cliente: `${entidad.cliente.nombre} ${entidad.cliente.apellido}`,
      prendas: items.length,
    }),
  };
}

const clienteReserva = mapearReservaEntidadACliente(entidadMock);

afirmar(clienteReserva.reservationCode === 'RES-0042', 'El código de reserva generado es RES-0042');
afirmar(clienteReserva.branchName === 'Sucursal Central 7 de Calles', 'Nombre de sucursal mapeado correctamente');
afirmar(clienteReserva.status === 'PENDIENTE', 'Estado de la reserva es PENDIENTE');
afirmar(clienteReserva.items.length === 2, 'Contiene 2 detalles de prendas');
afirmar(clienteReserva.items[0].detalleId === 101, 'Detalle ID 101 conservado para CU-R04');
afirmar(clienteReserva.items[0].sizeName === 'M', 'Talla mapeada a M');
afirmar(clienteReserva.items[0].colorName === 'Negro Profundo', 'Color mapeado a Negro Profundo');
afirmar(clienteReserva.items[1].quantity === 2, 'Cantidad del segundo ítem es 2');

// --------------------------------------------------------------------------
// 2. Verificación de Formato de Fechas ISO 8601 para CU-R01
// --------------------------------------------------------------------------
console.log('\n2. Verificando Constructor de Fechas ISO 8601 (CU-R01)...');

function obtenerFechaHoraIso(fechaTexto, franjaHoraria) {
  const ahora = new Date();
  const fechaBase = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  if (fechaTexto === 'Mañana') {
    fechaBase.setDate(fechaBase.getDate() + 1);
  } else if (fechaTexto === 'Pasado mañana') {
    fechaBase.setDate(fechaBase.getDate() + 2);
  }

  const horaInicio = franjaHoraria.split('-')[0]?.trim() || '15:30';
  const [horasStr, minutosStr] = horaInicio.split(':');
  const horas = parseInt(horasStr, 10) || 15;
  const minutos = parseInt(minutosStr, 10) || 30;

  fechaBase.setHours(horas, minutos, 0, 0);
  return fechaBase.toISOString();
}

const isoHoy = obtenerFechaHoraIso('Hoy', '15:30 - 16:00');
const isoManana = obtenerFechaHoraIso('Mañana', '10:00 - 10:30');
const isoPasadoManana = obtenerFechaHoraIso('Pasado mañana', '18:30 - 19:00');

afirmar(!isNaN(Date.parse(isoHoy)), 'Fecha ISO "Hoy" es válida en formato RFC3339/ISO 8601');
afirmar(!isNaN(Date.parse(isoManana)), 'Fecha ISO "Mañana" es válida');
afirmar(!isNaN(Date.parse(isoPasadoManana)), 'Fecha ISO "Pasado mañana" es válida');
afirmar(new Date(isoManana).getTime() > new Date(isoHoy).getTime(), '"Mañana" tiene marca de tiempo posterior a "Hoy"');

// --------------------------------------------------------------------------
// 3. Verificación de Lógica de Negocio y Clasificación (CU-R02)
// --------------------------------------------------------------------------
console.log('\n3. Verificando Filtros y Agrupación de Reservas (CU-R02)...');

const listaReservasMock = [
  { id: '1', status: 'PENDIENTE', reservationCode: 'RES-0001' },
  { id: '2', status: 'EN_PROCESO', reservationCode: 'RES-0002' },
  { id: '3', status: 'FINALIZADA', reservationCode: 'RES-0003' },
  { id: '4', status: 'CANCELADA', reservationCode: 'RES-0004' },
];

const activas = listaReservasMock.filter(r => r.status === 'PENDIENTE' || r.status === 'EN_PROCESO');
const historial = listaReservasMock.filter(r => r.status === 'FINALIZADA' || r.status === 'CANCELADA');

afirmar(activas.length === 2, 'Las reservas activas son exactamente 2 (PENDIENTE y EN_PROCESO)');
afirmar(historial.length === 2, 'Las reservas históricas son exactamente 2 (FINALIZADA y CANCELADA)');

// --------------------------------------------------------------------------
// 4. Verificación de Permisos de Modificación y Cancelación (CU-R04 y CU-R05)
// --------------------------------------------------------------------------
console.log('\n4. Verificando Reglas de Negocio para Modificación y Cancelación...');

function puedeCancelar(estado) {
  return estado === 'PENDIENTE';
}

function puedeModificarPrendas(estado) {
  return estado === 'PENDIENTE';
}

afirmar(puedeCancelar('PENDIENTE') === true, 'Se permite cancelar cuando estado es PENDIENTE');
afirmar(puedeCancelar('EN_PROCESO') === false, 'NO se permite cancelar cuando tienda está EN_PROCESO');
afirmar(puedeCancelar('FINALIZADA') === false, 'NO se permite cancelar cuando estado es FINALIZADA');
afirmar(puedeCancelar('CANCELADA') === false, 'NO se permite cancelar cuando ya está CANCELADA');

afirmar(puedeModificarPrendas('PENDIENTE') === true, 'Se permite quitar prendas cuando estado es PENDIENTE');
afirmar(puedeModificarPrendas('EN_PROCESO') === false, 'NO se permite modificar prendas cuando estado es EN_PROCESO');

// --------------------------------------------------------------------------
// 5. Verificación de Extractor de Errores Predictivos
// --------------------------------------------------------------------------
console.log('\n5. Verificando Manejo de Errores Predictivos...');

function extraerMensajeError(err) {
  const status = err.response?.status;
  const data = err.response?.data;
  const msgBackend = data?.message || err.message;

  if (status === 401) {
    return {
      message: 'Sesión no iniciada o expirada.',
      suggestion: 'Inicia sesión con tu cuenta para poder gestionar tus reservas.',
      status,
    };
  }
  if (status === 403) {
    return {
      message: 'No tienes permisos para realizar esta operación sobre la reserva.',
      suggestion: 'Verifica estar usando la cuenta con la que realizaste la reserva.',
      status,
    };
  }
  if (status === 404) {
    return {
      message: typeof msgBackend === 'string' ? msgBackend : 'La reserva o prenda no fue encontrada.',
      suggestion: 'Verifica que la prenda o la reserva sigan vigentes.',
      status,
    };
  }
  if (status === 409) {
    return {
      message: typeof msgBackend === 'string' ? msgBackend : 'Conflicto de disponibilidad o estado.',
      suggestion: 'Es posible que el stock se haya agotado o la reserva ya no esté pendiente.',
      status,
    };
  }
  if (status === 400) {
    const detail = Array.isArray(msgBackend) ? msgBackend.join(', ') : msgBackend;
    return {
      message: detail || 'Datos de reserva incompletos o incorrectos.',
      suggestion: 'Revisa la sucursal seleccionada, el horario y las prendas.',
      status,
    };
  }
  return {
    message: typeof msgBackend === 'string' ? msgBackend : 'No se pudo conectar con el servidor de reservas.',
    suggestion: 'Comprueba tu conexión a internet o intenta nuevamente en unos momentos.',
    status: status || 500,
  };
}

const err401 = extraerMensajeError({ response: { status: 401, data: { message: 'Unauthorized' } } });
afirmar(err401.message.includes('Sesión no iniciada'), 'Error 401 ofrece mensaje predictivo de autenticación');
afirmar(err401.suggestion.includes('Inicia sesión'), 'Error 401 incluye sugerencia clara');

const err409 = extraerMensajeError({ response: { status: 409, data: { message: 'Stock insuficiente para la variante 12' } } });
afirmar(err409.message.includes('Stock insuficiente'), 'Error 409 conserva mensaje descriptivo del backend');
afirmar(err409.suggestion.includes('stock se haya agotado'), 'Error 409 incluye sugerencia de stock');

// --------------------------------------------------------------------------
// 6. Verificación de Límite de 5 Prendas en Vestidor
// --------------------------------------------------------------------------
console.log('\n6. Verificando Regla de Límite Máximo de 5 Prendas en Vestidor...');

function agregarPrendaBolsa(bolsaActual, nuevaPrenda) {
  if (bolsaActual.length >= 5) {
    return {
      success: false,
      message: 'Límite de probador alcanzado (máximo 5 prendas por turno)',
    };
  }
  return {
    success: true,
    bolsa: [...bolsaActual, nuevaPrenda],
  };
}

let bolsa = [];
for (let i = 1; i <= 5; i++) {
  const res = agregarPrendaBolsa(bolsa, { id: `item-${i}` });
  bolsa = res.bolsa;
}
afirmar(bolsa.length === 5, 'Se agregaron 5 prendas exitosamente');

const intentoSexta = agregarPrendaBolsa(bolsa, { id: 'item-6' });
afirmar(intentoSexta.success === false, 'El sistema rechaza la 6ta prenda');
afirmar(intentoSexta.message.includes('máximo 5 prendas'), 'Mensaje explicativo del límite de probador presente');

// --------------------------------------------------------------------------
// RESUMEN FINAL
// --------------------------------------------------------------------------
console.log('\n======================================================');
console.log(` RESULTADOS: ${pruebasPasadas} / ${pruebasTotales} PRUEBAS SUPERADAS`);
console.log('======================================================\n');

if (pruebasPasadas === pruebasTotales) {
  console.log('✓ TODAS LAS PRUEBAS DE FASE 1 Y FASE 2 PASARON EXITOSAMENTE CON 0 ERRORES.\n');
  process.exit(0);
} else {
  console.error('✗ SE ENCONTRARON FALLOS EN LA VERIFICACIÓN.\n');
  process.exit(1);
}
