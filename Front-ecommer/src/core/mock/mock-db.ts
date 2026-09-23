import initialData from './initial-data.json';
import type { 
  GarmentProduct, 
  GarmentSize, 
  GarmentColor, 
  BranchStockItem, 
  StockTransfer, 
  StockTransferPayload, 
  UserSession, 
  LoginResponse, 
  RefreshResponse,
  PaginatedResponse,
  CatalogFilterParams,
  Branch,
  CategoryItem,
  SeasonItem,
  ProviderItem,
  PromotionItem,
  DashboardKpiSummary,
  City,
  RoleEntity,
  UsuarioEntity,
  DireccionEntity,
  CategoriaEntity,
  ProductoEntity,
  ImagenProductoEntity,
  CarritoEntity,
  CarritoItemEntity,
  OrdenEntity,
  OrdenItemEntity,
  PagoEntity,
  InteraccionIaEntity,
  FeedbackIaEntity,
  CompleteDatabaseSchema
} from '@core/types';
import type { FittingRoomReservation, UpdateReservationStatusPayload } from '@modulos/reservas/tipos/reservation.types';
import type { ProductFormValues } from '@modulos/catalogo/esquemas/product.schema';
import type { StockAdjustmentValues } from '@modulos/inventario/esquemas/inventory.schema';
import type { LoginFormData } from '@modulos/autenticacion/esquemas/login.schema';
import type { 
  PosCartItem, 
  PosCatalogProduct, 
  ProcessSalePayload, 
  SaleReceipt 
} from '@modulos/punto-venta/tipos/pos.types';

interface MockDatabaseSchema {
  // 13 Tablas Normalizadas del Modelo de Dominio (.specs/back-docs)
  roles: RoleEntity[];
  usuarios: UsuarioEntity[];
  direcciones: DireccionEntity[];
  categorias: CategoriaEntity[];
  productos: ProductoEntity[];
  imagenes_productos: ImagenProductoEntity[];
  carritos: CarritoEntity[];
  carrito_items: CarritoItemEntity[];
  ordenes: OrdenEntity[];
  orden_items: OrdenItemEntity[];
  pagos: PagoEntity[];
  interacciones_ia: InteraccionIaEntity[];
  feedback_ia: FeedbackIaEntity[];

  // Estructuras de Operación / UI
  users: Array<UserSession & { password?: string }>;
  branches: Array<Branch>;
  cities: Array<City>;
  sizes: GarmentSize[];
  colors: GarmentColor[];
  providers: Array<ProviderItem>;
  categories: Array<CategoryItem>;
  seasons: Array<SeasonItem>;
  promotions: Array<PromotionItem>;
  products: GarmentProduct[];
  inventory: BranchStockItem[];
  transfers: StockTransfer[];
  reservations: FittingRoomReservation[];
  sales: SaleReceipt[];
}

const STORAGE_KEY = 'FASHIONSTORE_MOCK_DB';

const DEFAULT_CITIES: City[] = [
  { id: 'city-1', name: 'Santa Cruz de la Sierra', department: 'Santa Cruz' },
  { id: 'city-2', name: 'La Paz', department: 'La Paz' },
  { id: 'city-3', name: 'Cochabamba', department: 'Cochabamba' },
];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Camisas & Blusas', code: 'SHIRTS', description: 'Prendas superiores formales e informales', isActive: true },
  { id: 'cat-2', name: 'Pantalones & Jeans', code: 'PANTS', description: 'Pantalones de mezclilla, chinos y de vestir', isActive: true },
  { id: 'cat-3', name: 'Vestidos', code: 'DRESSES', description: 'Vestidos de gala, fiesta y casuales', isActive: true },
  { id: 'cat-4', name: 'Chaquetas & Abrigos', code: 'JACKETS', description: 'Prendas de abrigo para media estación e invierno', isActive: true },
  { id: 'cat-5', name: 'Calzado', code: 'FOOTWEAR', description: 'Zapatos, zapatillas y tacones', isActive: true },
  { id: 'cat-6', name: 'Accesorios', code: 'ACCESSORIES', description: 'Bolsos, cinturones y bufandas', isActive: true },
];

const DEFAULT_SEASONS: SeasonItem[] = [
  { id: 'season-1', name: 'Primavera - Verano 2026', code: 'SPRING_SUMMER', startDate: '2026-01-01', endDate: '2026-05-31', isActive: true },
  { id: 'season-2', name: 'Otoño - Invierno 2026', code: 'AUTUMN_WINTER', startDate: '2026-06-01', endDate: '2026-09-30', isActive: true },
  { id: 'season-3', name: 'Regreso a Clases 2026', code: 'BACK_TO_SCHOOL', startDate: '2026-01-15', endDate: '2026-03-15', isActive: false },
  { id: 'season-4', name: 'Campaña Especial / Black Season', code: 'SPECIAL_PROMO', startDate: '2026-10-01', endDate: '2026-12-31', isActive: false },
];

const DEFAULT_PROMOTIONS: PromotionItem[] = [
  { id: 'promo-1', code: 'SUMMER2026', title: 'Descuento Temporada Verano', description: '20% de descuento en vestidos y calzado', discountPercentage: 20, startDate: '2026-01-01', endDate: '2026-04-30', isActive: true },
  { id: 'promo-2', code: 'BIENVENIDA10', title: 'Cupón Primera Compra', description: '10% de descuento en la primera compra web o móvil', discountPercentage: 10, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
  { id: 'promo-3', code: 'VIPFASHION', title: 'Beneficio Clientes Frecuentes', description: '15% de descuento en prendas seleccionadas', discountPercentage: 15, startDate: '2026-02-01', endDate: '2026-11-30', isActive: true },
];

function getDefaultSales(): SaleReceipt[] {
  const todayIso = new Date().toISOString().split('T')[0];
  return [
    {
      saleId: 'sale-001',
      invoiceNumber: 'FAC-SUC01-004819',
      branchCode: 'SUC-01',
      branchName: 'Sucursal Central (La Paz)',
      branchAddress: 'Av. 16 de Julio (El Prado) # 1480, La Paz',
      branchPhone: '+591 2 2441234',
      cashierName: 'admin poderoso',
      issuedAt: `${todayIso}T09:40:00.000Z`,
      customer: { taxId: '4928103012', businessName: 'Camila Villarroel Mendoza', email: 'camila.v@gmail.com' },
      items: [
        {
          variantId: 'var-1',
          sku: 'TOP-SUM-XS-WHT',
          barcode: '7771234567011',
          garmentName: 'Crop Top Ribbed Estival',
          sizeName: 'S',
          colorName: 'Blanco',
          unitPrice: 120,
          quantity: 2,
          subtotal: 240,
          maxAvailableStock: 15,
          isFromReservation: false,
        },
        {
          variantId: 'var-3',
          sku: 'JEAN-MOM-M-BLU',
          barcode: '7771234567035',
          garmentName: 'Pantalón Denim Mom Fit',
          sizeName: 'M',
          colorName: 'Azul Marino',
          unitPrice: 280,
          quantity: 2,
          subtotal: 560,
          maxAvailableStock: 8,
          isFromReservation: false,
        }
      ],
      subtotal: 800,
      taxAmount: 104,
      totalAmount: 800,
      paymentMethod: 'CASH',
      amountTendered: 800,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048192&numero=FAC-SUC01-004819&monto=800',
    },
    {
      saleId: 'sale-002',
      invoiceNumber: 'FAC-SUC02-003192',
      branchCode: 'SUC-02',
      branchName: 'Sucursal Equipetrol (Santa Cruz)',
      branchAddress: 'Av. San Martín esq. Calle 5 Este, Santa Cruz',
      branchPhone: '+591 3 3425678',
      cashierName: 'Santiago Cajero',
      issuedAt: `${todayIso}T10:25:00.000Z`,
      customer: { taxId: '1029384019', businessName: 'Mariana Suarez Justiniano', email: 'mariana.s@hotmail.com' },
      items: [
        {
          variantId: 'var-4',
          sku: 'BLZ-OVS-L-BG',
          barcode: '7771234567042',
          garmentName: 'Blazer Oversize Sastrería',
          sizeName: 'M',
          colorName: 'Beige',
          unitPrice: 450,
          quantity: 2,
          subtotal: 900,
          maxAvailableStock: 10,
          isFromReservation: false,
        },
        {
          variantId: 'var-5',
          sku: 'VES-NOCH-S-BLK',
          barcode: '7771234567059',
          garmentName: 'Vestido Satinado Fiesta',
          sizeName: 'S',
          colorName: 'Negro',
          unitPrice: 480,
          quantity: 1,
          subtotal: 480,
          maxAvailableStock: 5,
          isFromReservation: true,
        }
      ],
      subtotal: 1380,
      taxAmount: 179.4,
      totalAmount: 1380,
      paymentMethod: 'CREDIT_CARD',
      amountTendered: 1380,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048193&numero=FAC-SUC02-003192&monto=1380',
    },
    {
      saleId: 'sale-003',
      invoiceNumber: 'FAC-SUC01-004820',
      branchCode: 'SUC-01',
      branchName: 'Sucursal Central (La Paz)',
      branchAddress: 'Av. 16 de Julio (El Prado) # 1480, La Paz',
      branchPhone: '+591 2 2441234',
      cashierName: 'admin poderoso',
      issuedAt: `${todayIso}T11:15:00.000Z`,
      customer: { taxId: '7829104011', businessName: 'Alejandro Gómez', email: 'alejandro.g@gmail.com' },
      items: [
        {
          variantId: 'var-2',
          sku: 'SHORT-LIN-S-BG',
          barcode: '7771234567028',
          garmentName: 'Short Lino Cintura Alta',
          sizeName: 'M',
          colorName: 'Beige',
          unitPrice: 190,
          quantity: 2,
          subtotal: 380,
          maxAvailableStock: 12,
          isFromReservation: true,
        },
        {
          variantId: 'var-1',
          sku: 'TOP-SUM-XS-WHT',
          barcode: '7771234567011',
          garmentName: 'Crop Top Ribbed Estival',
          sizeName: 'M',
          colorName: 'Blanco',
          unitPrice: 120,
          quantity: 2,
          subtotal: 240,
          maxAvailableStock: 15,
          isFromReservation: false,
        }
      ],
      subtotal: 620,
      taxAmount: 80.6,
      totalAmount: 620,
      paymentMethod: 'QR_TRANSFER',
      amountTendered: 620,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048194&numero=FAC-SUC01-004820&monto=620',
    },
    {
      saleId: 'sale-004',
      invoiceNumber: 'FAC-SUC03-001094',
      branchCode: 'SUC-03',
      branchName: 'Sucursal Calacoto (Zona Sur)',
      branchAddress: 'Av. Ballivián e/ Calles 18 y 19, Calacoto, La Paz',
      branchPhone: '+591 2 2798765',
      cashierName: 'Mateo Fernández',
      issuedAt: `${todayIso}T12:05:00.000Z`,
      customer: { taxId: '5910293018', businessName: 'Sofia Rodríguez Torrez', email: 'sofia.r@live.com' },
      items: [
        {
          variantId: 'var-6',
          sku: 'CARD-OVS-M-GRN',
          barcode: '7771234567066',
          garmentName: 'Cardigan Tejido Suave',
          sizeName: 'M',
          colorName: 'Verde Oliva',
          unitPrice: 320,
          quantity: 2,
          subtotal: 640,
          maxAvailableStock: 9,
          isFromReservation: false,
        },
        {
          variantId: 'var-3',
          sku: 'JEAN-MOM-M-BLU',
          barcode: '7771234567035',
          garmentName: 'Pantalón Denim Mom Fit',
          sizeName: 'L',
          colorName: 'Azul Marino',
          unitPrice: 280,
          quantity: 1,
          subtotal: 280,
          maxAvailableStock: 8,
          isFromReservation: false,
        }
      ],
      subtotal: 920,
      taxAmount: 119.6,
      totalAmount: 920,
      paymentMethod: 'DEBIT_CARD',
      amountTendered: 920,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048195&numero=FAC-SUC03-001094&monto=920',
    },
    {
      saleId: 'sale-005',
      invoiceNumber: 'FAC-SUC02-003193',
      branchCode: 'SUC-02',
      branchName: 'Sucursal Equipetrol (Santa Cruz)',
      branchAddress: 'Av. San Martín esq. Calle 5 Este, Santa Cruz',
      branchPhone: '+591 3 3425678',
      cashierName: 'Santiago Cajero',
      issuedAt: `${todayIso}T13:40:00.000Z`,
      customer: { taxId: '9018274013', businessName: 'Luciana Roca Peinado', email: 'luciana.roca@gmail.com' },
      items: [
        {
          variantId: 'var-1',
          sku: 'TOP-SUM-XS-WHT',
          barcode: '7771234567011',
          garmentName: 'Crop Top Ribbed Estival',
          sizeName: 'M',
          colorName: 'Blanco',
          unitPrice: 120,
          quantity: 2,
          subtotal: 240,
          maxAvailableStock: 15,
          isFromReservation: false,
        },
        {
          variantId: 'var-7',
          sku: 'BOT-PIEL-38-BLK',
          barcode: '7771234567073',
          garmentName: 'Botines de Cuero Genuino',
          sizeName: '38',
          colorName: 'Negro',
          unitPrice: 580,
          quantity: 2,
          subtotal: 1160,
          maxAvailableStock: 6,
          isFromReservation: false,
        }
      ],
      subtotal: 1400,
      taxAmount: 182,
      totalAmount: 1400,
      paymentMethod: 'QR_TRANSFER',
      amountTendered: 1400,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048196&numero=FAC-SUC02-003193&monto=1400',
    },
    {
      saleId: 'sale-006',
      invoiceNumber: 'FAC-SUC01-004821',
      branchCode: 'SUC-01',
      branchName: 'Sucursal Central (La Paz)',
      branchAddress: 'Av. 16 de Julio (El Prado) # 1480, La Paz',
      branchPhone: '+591 2 2441234',
      cashierName: 'admin poderoso',
      issuedAt: `${todayIso}T14:15:00.000Z`,
      customer: { taxId: '6829104015', businessName: 'Valeria Morales Barrientos', email: 'valeria.m@gmail.com' },
      items: [
        {
          variantId: 'var-4',
          sku: 'BLZ-OVS-L-BG',
          barcode: '7771234567042',
          garmentName: 'Blazer Oversize Sastrería',
          sizeName: 'S',
          colorName: 'Negro',
          unitPrice: 450,
          quantity: 3,
          subtotal: 1350,
          maxAvailableStock: 10,
          isFromReservation: false,
        },
        {
          variantId: 'var-5',
          sku: 'VES-NOCH-S-BLK',
          barcode: '7771234567059',
          garmentName: 'Vestido Satinado Fiesta',
          sizeName: 'M',
          colorName: 'Rojo Rubí',
          unitPrice: 480,
          quantity: 2,
          subtotal: 960,
          maxAvailableStock: 5,
          isFromReservation: true,
        }
      ],
      subtotal: 2310,
      taxAmount: 300.3,
      totalAmount: 2310,
      paymentMethod: 'CREDIT_CARD',
      amountTendered: 2310,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048197&numero=FAC-SUC01-004821&monto=2310',
    },
    {
      saleId: 'sale-007',
      invoiceNumber: 'FAC-SUC03-001095',
      branchCode: 'SUC-03',
      branchName: 'Sucursal Calacoto (Zona Sur)',
      branchAddress: 'Av. Ballivián e/ Calles 18 y 19, Calacoto, La Paz',
      branchPhone: '+591 2 2798765',
      cashierName: 'Mateo Fernández',
      issuedAt: `${todayIso}T15:30:00.000Z`,
      customer: { taxId: '3819204012', businessName: 'Rodrigo Torrico Claure', email: 'rodrigo.t@yahoo.com' },
      items: [
        {
          variantId: 'var-3',
          sku: 'JEAN-MOM-M-BLU',
          barcode: '7771234567035',
          garmentName: 'Pantalón Denim Mom Fit',
          sizeName: 'M',
          colorName: 'Azul Marino',
          unitPrice: 280,
          quantity: 3,
          subtotal: 840,
          maxAvailableStock: 8,
          isFromReservation: false,
        },
        {
          variantId: 'var-2',
          sku: 'SHORT-LIN-S-BG',
          barcode: '7771234567028',
          garmentName: 'Short Lino Cintura Alta',
          sizeName: 'S',
          colorName: 'Beige',
          unitPrice: 190,
          quantity: 2,
          subtotal: 380,
          maxAvailableStock: 12,
          isFromReservation: false,
        }
      ],
      subtotal: 1220,
      taxAmount: 158.6,
      totalAmount: 1220,
      paymentMethod: 'CASH',
      amountTendered: 1300,
      changeDue: 80,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048198&numero=FAC-SUC03-001095&monto=1220',
    },
    {
      saleId: 'sale-008',
      invoiceNumber: 'FAC-SUC01-004822',
      branchCode: 'SUC-01',
      branchName: 'Sucursal Central (La Paz)',
      branchAddress: 'Av. 16 de Julio (El Prado) # 1480, La Paz',
      branchPhone: '+591 2 2441234',
      cashierName: 'admin poderoso',
      issuedAt: `${todayIso}T16:45:00.000Z`,
      customer: { taxId: '7728103019', businessName: 'Daniela Alarcón Paz', email: 'daniela.a@gmail.com' },
      items: [
        {
          variantId: 'var-1',
          sku: 'TOP-SUM-XS-WHT',
          barcode: '7771234567011',
          garmentName: 'Crop Top Ribbed Estival',
          sizeName: 'L',
          colorName: 'Blanco',
          unitPrice: 120,
          quantity: 3,
          subtotal: 360,
          maxAvailableStock: 15,
          isFromReservation: false,
        },
        {
          variantId: 'var-6',
          sku: 'CARD-OVS-M-GRN',
          barcode: '7771234567066',
          garmentName: 'Cardigan Tejido Suave',
          sizeName: 'L',
          colorName: 'Verde Oliva',
          unitPrice: 320,
          quantity: 2,
          subtotal: 640,
          maxAvailableStock: 9,
          isFromReservation: false,
        }
      ],
      subtotal: 1000,
      taxAmount: 130,
      totalAmount: 1000,
      paymentMethod: 'QR_TRANSFER',
      amountTendered: 1000,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048199&numero=FAC-SUC01-004822&monto=1000',
    },
    {
      saleId: 'sale-009',
      invoiceNumber: 'FAC-SUC02-003194',
      branchCode: 'SUC-02',
      branchName: 'Sucursal Equipetrol (Santa Cruz)',
      branchAddress: 'Av. San Martín esq. Calle 5 Este, Santa Cruz',
      branchPhone: '+591 3 3425678',
      cashierName: 'Santiago Cajero',
      issuedAt: `${todayIso}T17:30:00.000Z`,
      customer: { taxId: '4491028301', businessName: 'Esteban Méndez Hurtado', email: 'esteban.m@gmail.com' },
      items: [
        {
          variantId: 'var-7',
          sku: 'BOT-PIEL-38-BLK',
          barcode: '7771234567073',
          garmentName: 'Botines de Cuero Genuino',
          sizeName: '39',
          colorName: 'Negro',
          unitPrice: 580,
          quantity: 2,
          subtotal: 1160,
          maxAvailableStock: 6,
          isFromReservation: false,
        }
      ],
      subtotal: 1160,
      taxAmount: 150.8,
      totalAmount: 1160,
      paymentMethod: 'CASH',
      amountTendered: 1200,
      changeDue: 40,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048200&numero=FAC-SUC02-003194&monto=1160',
    },
    {
      saleId: 'sale-010',
      invoiceNumber: 'FAC-SUC01-004823',
      branchCode: 'SUC-01',
      branchName: 'Sucursal Central (La Paz)',
      branchAddress: 'Av. 16 de Julio (El Prado) # 1480, La Paz',
      branchPhone: '+591 2 2441234',
      cashierName: 'admin poderoso',
      issuedAt: `${todayIso}T18:50:00.000Z`,
      customer: { taxId: '8910293810', businessName: 'Patricia Quiroga Arce', email: 'patricia.q@gmail.com' },
      items: [
        {
          variantId: 'var-4',
          sku: 'BLZ-OVS-L-BG',
          barcode: '7771234567042',
          garmentName: 'Blazer Oversize Sastrería',
          sizeName: 'M',
          colorName: 'Beige',
          unitPrice: 450,
          quantity: 2,
          subtotal: 900,
          maxAvailableStock: 10,
          isFromReservation: false,
        },
        {
          variantId: 'var-2',
          sku: 'SHORT-LIN-S-BG',
          barcode: '7771234567028',
          garmentName: 'Short Lino Cintura Alta',
          sizeName: 'M',
          colorName: 'Beige',
          unitPrice: 190,
          quantity: 3,
          subtotal: 570,
          maxAvailableStock: 12,
          isFromReservation: false,
        },
        {
          variantId: 'var-3',
          sku: 'JEAN-MOM-M-BLU',
          barcode: '7771234567035',
          garmentName: 'Pantalón Denim Mom Fit',
          sizeName: 'M',
          colorName: 'Azul Marino',
          unitPrice: 280,
          quantity: 3,
          subtotal: 840,
          maxAvailableStock: 8,
          isFromReservation: false,
        },
        {
          variantId: 'var-1',
          sku: 'TOP-SUM-XS-WHT',
          barcode: '7771234567011',
          garmentName: 'Crop Top Ribbed Estival',
          sizeName: 'M',
          colorName: 'Blanco',
          unitPrice: 120,
          quantity: 3,
          subtotal: 360,
          maxAvailableStock: 15,
          isFromReservation: false,
        },
        {
          variantId: 'var-6',
          sku: 'CARD-OVS-M-GRN',
          barcode: '7771234567066',
          garmentName: 'Cardigan Tejido Suave',
          sizeName: 'M',
          colorName: 'Verde Oliva',
          unitPrice: 320,
          quantity: 1,
          subtotal: 320,
          maxAvailableStock: 9,
          isFromReservation: false,
        }
      ],
      subtotal: 2990,
      taxAmount: 388.7,
      totalAmount: 2990,
      paymentMethod: 'DEBIT_CARD',
      amountTendered: 2990,
      changeDue: 0,
      qrSecurityCode: 'https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=891048201&numero=FAC-SUC01-004823&monto=2990',
    }
  ];
}

export function matchBranchId(b1: string | undefined | null, b2: string | undefined | null): boolean {
  if (!b1 || !b2) return false;
  if (b1 === b2) return true;
  const s1 = String(b1).toLowerCase().replace(/^branch-/, '').replace(/^suc-?0?/, '').trim();
  const s2 = String(b2).toLowerCase().replace(/^branch-/, '').replace(/^suc-?0?/, '').trim();
  if (s1 === s2) return true;
  if (String(b1).toLowerCase().includes('central') && String(b2).toLowerCase().includes('central')) return true;
  if (String(b1).toLowerCase().includes('equipetrol') && String(b2).toLowerCase().includes('equipetrol')) return true;
  if (String(b1).toLowerCase().includes('calacoto') && String(b2).toLowerCase().includes('calacoto')) return true;
  return false;
}

function getDefaultInventory(products: GarmentProduct[]): BranchStockItem[] {
  const branches = [
    { id: 'branch-1', name: 'Sucursal Central (La Paz)' },
    { id: 'branch-2', name: 'Sucursal Equipetrol (Santa Cruz)' },
    { id: 'branch-3', name: 'Sucursal Calacoto (Zona Sur)' },
  ];

  const inventory: BranchStockItem[] = [];

  branches.forEach((b, bIdx) => {
    products.forEach((p) => {
      p.variants.forEach((v, vIdx) => {
        const baseQty = (bIdx === 0 ? 18 : bIdx === 1 ? 14 : 10) + (vIdx % 3) * 4;
        const reserved = (vIdx % 2 === 0) ? 1 : 0;
        inventory.push({
          id: `stk-${b.id}-${v.id}`,
          branchId: b.id,
          branchName: b.name,
          variantId: v.id,
          sku: v.sku,
          barcode: v.barcode,
          garmentName: p.name,
          sizeName: v.size.name,
          colorName: v.color.name,
          category: p.category,
          availableStock: baseQty,
          reservedStock: reserved,
          totalStock: baseQty + reserved,
          minAlertThreshold: 4,
        });
      });
    });
  });

  return inventory;
}

function getDefaultReservations(): FittingRoomReservation[] {
  const todayIso = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'res-1',
      reservationCode: 'RES-1042',
      clientId: 'cli-1',
      clientName: 'Valentina Morales',
      clientPhone: '+591 71234567',
      branchId: 'branch-1',
      branchName: 'Sucursal Central (La Paz)',
      scheduledTime: `${todayIso}T16:30:00Z`,
      status: 'PENDING',
      items: [
        {
          id: 'item-1',
          variantId: 'var-1',
          sku: 'VES-NEG-M',
          barcode: '77010001001',
          garmentName: 'Vestido de Gala Satinado',
          sizeName: 'M',
          colorName: 'Negro',
          price: 89.99,
          imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60'
        },
        {
          id: 'item-2',
          variantId: 'var-4',
          sku: 'BLU-BLA-S',
          barcode: '77020002001',
          garmentName: 'Blusa Satinada Elegante',
          sizeName: 'S',
          colorName: 'Blanco',
          price: 48.00,
          imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Cliente solicita probar con accesorios dorados.',
      createdAt: `${todayIso}T14:15:00Z`,
      updatedAt: `${todayIso}T14:15:00Z`
    },
    {
      id: 'res-2',
      reservationCode: 'RES-1039',
      clientId: 'cli-2',
      clientName: 'Mateo Fernández',
      clientPhone: '+591 72345678',
      branchId: 'branch-1',
      branchName: 'Sucursal Central (La Paz)',
      scheduledTime: `${todayIso}T15:45:00Z`,
      status: 'PREPARING',
      items: [
        {
          id: 'item-3',
          variantId: 'var-7',
          sku: 'BLZ-NEG-M',
          barcode: '77030003001',
          garmentName: 'Blazer Entallado Mujer',
          sizeName: 'M',
          colorName: 'Negro',
          price: 119.50,
          imageUrl: 'https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Revisar entalle de mangas.',
      createdAt: `${todayIso}T13:00:00Z`,
      updatedAt: `${todayIso}T13:10:00Z`
    },
    {
      id: 'res-3',
      reservationCode: 'RES-1035',
      clientId: 'cli-3',
      clientName: 'Sofía Rodríguez',
      clientPhone: '+591 73456789',
      branchId: 'branch-1',
      branchName: 'Sucursal Central (La Paz)',
      scheduledTime: `${todayIso}T15:15:00Z`,
      status: 'READY',
      items: [
        {
          id: 'item-4',
          variantId: 'var-9',
          sku: 'PAL-BEI-M',
          barcode: '77040004001',
          garmentName: 'Pantalón Palazzo Tiro Alto Mujer',
          sizeName: 'M',
          colorName: 'Beige',
          price: 56.00,
          imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Prenda planchada lista en vestidor 2.',
      createdAt: `${todayIso}T12:00:00Z`,
      updatedAt: `${todayIso}T12:20:00Z`
    },
    {
      id: 'res-4',
      reservationCode: 'RES-1028',
      clientId: 'cli-4',
      clientName: 'Alejandro Gómez',
      clientPhone: '+591 74567890',
      branchId: 'branch-1',
      branchName: 'Sucursal Central (La Paz)',
      scheduledTime: `${todayIso}T15:00:00Z`,
      status: 'CLIENT_PRESENT',
      items: [
        {
          id: 'item-5',
          variantId: 'var-3',
          sku: 'VES-ROJ-S',
          barcode: '77010001003',
          garmentName: 'Vestido de Gala Satinado',
          sizeName: 'S',
          colorName: 'Rojo Rubí',
          price: 94.99,
          imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Cliente probándose en vestidor 1.',
      createdAt: `${todayIso}T11:00:00Z`,
      updatedAt: `${todayIso}T14:55:00Z`
    },
    {
      id: 'res-5',
      reservationCode: 'RES-2011',
      clientId: 'cli-5',
      clientName: 'Mariana Paz',
      clientPhone: '+591 75678901',
      branchId: 'branch-2',
      branchName: 'Sucursal Equipetrol (Santa Cruz)',
      scheduledTime: `${todayIso}T17:00:00Z`,
      status: 'PENDING',
      items: [
        {
          id: 'item-6',
          variantId: 'var-1',
          sku: 'VES-NEG-M',
          barcode: '77010001001',
          garmentName: 'Vestido de Gala Satinado',
          sizeName: 'M',
          colorName: 'Negro',
          price: 89.99,
          imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Cliente pide probador amplio.',
      createdAt: `${todayIso}T14:00:00Z`,
      updatedAt: `${todayIso}T14:00:00Z`
    },
    {
      id: 'res-6',
      reservationCode: 'RES-3015',
      clientId: 'cli-6',
      clientName: 'Daniel Arce',
      clientPhone: '+591 76789012',
      branchId: 'branch-3',
      branchName: 'Sucursal Calacoto (Zona Sur)',
      scheduledTime: `${todayIso}T16:00:00Z`,
      status: 'READY',
      items: [
        {
          id: 'item-7',
          variantId: 'var-7',
          sku: 'BLZ-NEG-M',
          barcode: '77030003001',
          garmentName: 'Blazer Entallado Mujer',
          sizeName: 'M',
          colorName: 'Negro',
          price: 119.50,
          imageUrl: 'https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?w=500&auto=format&fit=crop&q=60'
        }
      ],
      notes: 'Listo en vestidor VIP.',
      createdAt: `${todayIso}T13:30:00Z`,
      updatedAt: `${todayIso}T13:45:00Z`
    }
  ];
}

function loadDatabase(): MockDatabaseSchema {
  let db: MockDatabaseSchema;
  if (typeof window === 'undefined') {
    db = initialData as unknown as MockDatabaseSchema;
  } else {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        db = initialData as unknown as MockDatabaseSchema;
      } else {
        db = JSON.parse(raw) as MockDatabaseSchema;
      }
    } catch (e) {
      console.error('Error loading mock database from localStorage, falling back to initial data', e);
      db = initialData as unknown as MockDatabaseSchema;
    }
  }

  // Asegurar compatibilidad y retroalimentación de campos requeridos
  if (!db.cities || !db.cities.length) db.cities = [...DEFAULT_CITIES];
  if (!db.categories || !db.categories.length) db.categories = [...DEFAULT_CATEGORIES];
  if (!db.seasons || !db.seasons.length) db.seasons = [...DEFAULT_SEASONS];
  if (!db.promotions || !db.promotions.length) db.promotions = [...DEFAULT_PROMOTIONS];
  if (!db.sales || !Array.isArray(db.sales) || db.sales.length === 0) {
    db.sales = getDefaultSales();
  }
  if (!db.products || !db.products.length) {
    db.products = (initialData as any).products || [];
  }
  if (!db.inventory || !Array.isArray(db.inventory) || db.inventory.length === 0 || !db.inventory.some(i => matchBranchId(i.branchId, 'branch-2'))) {
    db.inventory = getDefaultInventory(db.products);
  }
  if (!db.reservations || !Array.isArray(db.reservations) || db.reservations.length === 0 || !db.reservations.some(r => matchBranchId(r.branchId, 'branch-1'))) {
    db.reservations = getDefaultReservations();
  }

  // Tablas del modelo de dominio normalizado (.specs/back-docs)
  const initDb = initialData as any;
  if (!db.roles || !db.roles.length) db.roles = initDb.roles || [];
  if (!db.usuarios || !db.usuarios.length) db.usuarios = initDb.usuarios || [];
  if (!db.direcciones || !db.direcciones.length) db.direcciones = initDb.direcciones || [];
  if (!db.categorias || !db.categorias.length) db.categorias = initDb.categorias || [];
  if (!db.productos || !db.productos.length) db.productos = initDb.productos || [];
  if (!db.imagenes_productos || !db.imagenes_productos.length) db.imagenes_productos = initDb.imagenes_productos || [];
  if (!db.carritos || !db.carritos.length) db.carritos = initDb.carritos || [];
  if (!db.carrito_items || !db.carrito_items.length) db.carrito_items = initDb.carrito_items || [];
  if (!db.ordenes || !db.ordenes.length) db.ordenes = initDb.ordenes || [];
  if (!db.orden_items || !db.orden_items.length) db.orden_items = initDb.orden_items || [];
  if (!db.pagos || !db.pagos.length) db.pagos = initDb.pagos || [];
  if (!db.interacciones_ia || !db.interacciones_ia.length) db.interacciones_ia = initDb.interacciones_ia || [];
  if (!db.feedback_ia || !db.feedback_ia.length) db.feedback_ia = initDb.feedback_ia || [];

  // Enriquecer sucursales si les faltan campos o normalizar nombres
  db.branches = db.branches.map((b, idx) => {
    let name = b.name;
    let city = (b as any).city || 'La Paz';
    if (b.id === 'branch-1' || name === 'Sucursal Central') {
      name = 'Sucursal Central (La Paz)';
      city = 'La Paz';
    } else if (b.id === 'branch-2' || name === 'Sucursal Norte') {
      name = 'Sucursal Equipetrol (Santa Cruz)';
      city = 'Santa Cruz de la Sierra';
    } else if (b.id === 'branch-3' || name === 'Sucursal Sur') {
      name = 'Sucursal Calacoto (Zona Sur)';
      city = 'La Paz';
    }
    return {
      id: b.id,
      name,
      code: (b as any).code || `SUC-0${idx + 1}`,
      address: (b as any).address || 'Av. Principal # 100',
      phone: (b as any).phone || '+591 70011223',
      city,
      fittingRooms: (b as any).fittingRooms || 4,
      isActive: (b as any).isActive !== false,
    };
  });

  // Enriquecer proveedores
  db.providers = db.providers.map((p, idx) => ({
    id: p.id,
    name: p.name,
    code: (p as any).code || `PRV-0${idx + 1}`,
    contactName: (p as any).contactName || `Contacto ${p.name}`,
    email: (p as any).email || `contacto@${p.id}.com`,
    phone: (p as any).phone || `+591 700${idx + 1}0000`,
    address: (p as any).address || 'Zona Industrial Parque Tecnológico',
    isActive: (p as any).isActive !== false,
  }));

  return db;
}


function saveDatabase(data: MockDatabaseSchema) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to mock database in localStorage', e);
    }
  }
}

export const mockDb = {
  // Reset database to initial state
  reset() {
    saveDatabase(initialData as unknown as MockDatabaseSchema);
  },

  // ---------------- AUTH ----------------
  async login(data: LoginFormData): Promise<LoginResponse> {
    const db = loadDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === data.email.toLowerCase()) || db.users[0];

    const tokens = {
      accessToken: 'mock_jwt_access_token_' + Date.now(),
      refreshToken: 'mock_jwt_refresh_token_' + Date.now(),
      expiresIn: 3600,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assignedBranchId: user.assignedBranchId,
        assignedBranchName: user.assignedBranchName,
        isActive: user.isActive,
      },
      tokens,
    };
  },

  async refreshToken(_refreshToken: string): Promise<RefreshResponse> {
    return {
      accessToken: 'mock_jwt_access_refreshed_' + Date.now(),
      expiresIn: 3600,
    };
  },

  async me(): Promise<UserSession> {
    const db = loadDatabase();
    return db.users[0];
  },

  // ---------------- CATALOG ----------------
  async getProducts(params?: CatalogFilterParams): Promise<PaginatedResponse<GarmentProduct>> {
    const db = loadDatabase();
    let items = [...db.products];

    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.variants.some(v => v.sku.toLowerCase().includes(q) || v.barcode.includes(q))
      );
    }

    if (params?.category) {
      items = items.filter(p => p.category === params.category);
    }

    if (params?.season) {
      items = items.filter(p => p.season === params.season);
    }

    if (params?.providerId) {
      items = items.filter(p => p.providerId === params.providerId);
    }

    const currentPage = params?.page || 1;
    const itemsPerPage = params?.pageSize || 20;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage,
        totalPages,
        currentPage,
      }
    };
  },

  async getProductById(id: string): Promise<GarmentProduct> {
    const db = loadDatabase();
    const product = db.products.find(p => p.id === id);
    if (!product) {
      throw new Error(`Producto no encontrado con id: ${id}`);
    }
    return product;
  },

  async createProduct(payload: ProductFormValues): Promise<GarmentProduct> {
    const db = loadDatabase();
    const newId = `prod-${Date.now()}`;
    const provider = db.providers.find(pr => pr.id === payload.providerId);
    
    const newProduct: GarmentProduct = {
      id: newId,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      collection: payload.collection,
      season: payload.season,
      providerId: payload.providerId,
      providerName: provider?.name || 'Proveedor General',
      basePrice: payload.basePrice,
      images: payload.images?.length ? payload.images : ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60'],
      asset3D: payload.asset3D ? {
        id: `asset-${Date.now()}`,
        modelUrl: payload.asset3D.modelUrl,
        fileSizeBytes: payload.asset3D.fileSizeBytes,
        scaleFactor: payload.asset3D.scaleFactor,
        uploadedAt: new Date().toISOString(),
      } : undefined,
      variants: payload.variants.map((v, index) => {
        const sizeObj = db.sizes.find(s => s.id === v.sizeId) || { id: v.sizeId, name: 'Talla', orderIndex: index };
        const colorObj = db.colors.find(c => c.id === v.colorId) || { id: v.colorId, name: 'Color', hexCode: '#000000' };
        
        return {
          id: `var-${Date.now()}-${index}`,
          garmentId: newId,
          sku: v.sku,
          barcode: v.barcode,
          size: sizeObj,
          color: colorObj,
          price: v.price,
          costPrice: v.costPrice,
          isActive: v.isActive,
        };
      }),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);

    // Also register inventory items for default branch
    newProduct.variants.forEach(v => {
      db.inventory.push({
        id: `stk-${Date.now()}-${v.id}`,
        branchId: 'branch-1',
        branchName: 'Sucursal Central',
        variantId: v.id,
        sku: v.sku,
        barcode: v.barcode,
        garmentName: newProduct.name,
        sizeName: v.size.name,
        colorName: v.color.name,
        category: newProduct.category,
        availableStock: 10,
        reservedStock: 0,
        totalStock: 10,
        minAlertThreshold: 3,
      });
    });

    saveDatabase(db);
    return newProduct;
  },

  async updateProduct(id: string, payload: ProductFormValues): Promise<GarmentProduct> {
    const db = loadDatabase();
    const index = db.products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Producto no encontrado con id: ${id}`);
    }

    const existing = db.products[index];
    const provider = db.providers.find(pr => pr.id === payload.providerId);

    const updatedProduct: GarmentProduct = {
      ...existing,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      collection: payload.collection,
      season: payload.season,
      providerId: payload.providerId,
      providerName: provider?.name || existing.providerName,
      basePrice: payload.basePrice,
      images: payload.images,
      asset3D: payload.asset3D ? {
        id: existing.asset3D?.id || `asset-${Date.now()}`,
        modelUrl: payload.asset3D.modelUrl,
        fileSizeBytes: payload.asset3D.fileSizeBytes,
        scaleFactor: payload.asset3D.scaleFactor,
        uploadedAt: new Date().toISOString(),
      } : undefined,
      variants: payload.variants.map((v, i) => {
        const sizeObj = db.sizes.find(s => s.id === v.sizeId) || { id: v.sizeId, name: 'Talla', orderIndex: i };
        const colorObj = db.colors.find(c => c.id === v.colorId) || { id: v.colorId, name: 'Color', hexCode: '#000000' };
        return {
          id: existing.variants[i]?.id || `var-${Date.now()}-${i}`,
          garmentId: id,
          sku: v.sku,
          barcode: v.barcode,
          size: sizeObj,
          color: colorObj,
          price: v.price,
          costPrice: v.costPrice,
          isActive: v.isActive,
        };
      }),
      isActive: existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    db.products[index] = updatedProduct;
    saveDatabase(db);
    return updatedProduct;
  },

  async uploadAsset(file: File): Promise<{ url: string; fileSizeBytes: number }> {
    const objectUrl = URL.createObjectURL(file);
    return {
      url: objectUrl,
      fileSizeBytes: file.size,
    };
  },

  async getSizes(): Promise<GarmentSize[]> {
    const db = loadDatabase();
    return db.sizes;
  },

  async getColors(): Promise<GarmentColor[]> {
    const db = loadDatabase();
    return db.colors;
  },

  async getProviders(): Promise<Array<{ id: string; name: string }>> {
    const db = loadDatabase();
    return db.providers;
  },

  // ---------------- INVENTORY ----------------
  async getStock(branchId: string, params?: Record<string, unknown>): Promise<PaginatedResponse<BranchStockItem>> {
    const db = loadDatabase();
    let items = db.inventory.filter(item => matchBranchId(item.branchId, branchId));

    if (params?.search && typeof params.search === 'string') {
      const q = params.search.toLowerCase();
      items = items.filter(item => 
        item.garmentName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q)
      );
    }

    if (params?.category && typeof params.category === 'string') {
      items = items.filter(item => item.category === params.category);
    }

    const currentPage = Number(params?.page) || 1;
    const itemsPerPage = Number(params?.pageSize) || 20;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage,
        totalPages,
        currentPage,
      }
    };
  },

  async createAdjustment(payload: StockAdjustmentValues): Promise<BranchStockItem> {
    const db = loadDatabase();
    const item = db.inventory.find(i => matchBranchId(i.branchId, payload.branchId) && i.variantId === payload.variantId);
    if (!item) {
      throw new Error('Ítem de inventario no encontrado');
    }

    item.availableStock = payload.newQuantity;
    item.totalStock = item.availableStock + item.reservedStock;
    saveDatabase(db);
    return item;
  },

  async createTransfer(payload: StockTransferPayload): Promise<StockTransfer> {
    const db = loadDatabase();
    const origin = db.branches.find(b => b.id === payload.originBranchId);
    const dest = db.branches.find(b => b.id === payload.destinationBranchId);

    const newTransfer: StockTransfer = {
      id: `trf-${Date.now()}`,
      transferCode: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      originBranchName: origin?.name || 'Sucursal Origen',
      destinationBranchName: dest?.name || 'Sucursal Destino',
      status: 'IN_TRANSIT',
      itemsCount: payload.items.reduce((acc, it) => acc + it.quantity, 0),
      createdAt: new Date().toISOString(),
    };

    // Deduct stock from origin branch
    payload.items.forEach(it => {
      const stock = db.inventory.find(s => s.branchId === payload.originBranchId && s.variantId === it.variantId);
      if (stock) {
        stock.availableStock = Math.max(0, stock.availableStock - it.quantity);
        stock.totalStock = stock.availableStock + stock.reservedStock;
      }
    });

    db.transfers.unshift(newTransfer);
    saveDatabase(db);
    return newTransfer;
  },

  async getTransfers(_branchId?: string): Promise<StockTransfer[]> {
    const db = loadDatabase();
    return db.transfers;
  },

  async receiveTransfer(transferId: string): Promise<void> {
    const db = loadDatabase();
    const transfer = db.transfers.find(t => t.id === transferId);
    if (transfer) {
      transfer.status = 'RECEIVED';
      transfer.receivedAt = new Date().toISOString();
      saveDatabase(db);
    }
  },

  // ---------------- RESERVATIONS ----------------
  async getReservations(branchId: string, _date?: string): Promise<PaginatedResponse<FittingRoomReservation>> {
    const db = loadDatabase();
    const items = db.reservations.filter(r => matchBranchId(r.branchId, branchId));

    return {
      data: items,
      meta: {
        totalItems: items.length,
        itemCount: items.length,
        itemsPerPage: 50,
        totalPages: 1,
        currentPage: 1,
      }
    };
  },

  async getReservationByCode(branchId: string, code: string): Promise<FittingRoomReservation> {
    const db = loadDatabase();
    const res = db.reservations.find(r => matchBranchId(r.branchId, branchId) && r.reservationCode.toLowerCase() === code.toLowerCase());
    if (!res) {
      throw new Error(`Reserva no encontrada con código ${code}`);
    }
    return res;
  },

  async updateReservationStatus(reservationId: string, payload: UpdateReservationStatusPayload): Promise<FittingRoomReservation> {
    const db = loadDatabase();
    const res = db.reservations.find(r => r.id === reservationId);
    if (!res) {
      throw new Error(`Reserva no encontrada con id ${reservationId}`);
    }

    res.status = payload.status;
    if (payload.notes) {
      res.notes = payload.notes;
    }
    res.updatedAt = new Date().toISOString();

    saveDatabase(db);

    // Disparar evento para componentes locales
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('MOCK_RESERVATION_UPDATE', { detail: res }));
    }

    return res;
  },

  // ---------------- POS / SALES ----------------
  async lookupBarcode(barcode: string, branchId: string): Promise<PosCartItem> {
    const db = loadDatabase();
    const cleanCode = barcode.trim().toLowerCase();
    
    // Buscar variante que coincida por código de barras o SKU
    let matchedProduct: GarmentProduct | undefined;
    let matchedVariant: GarmentProduct['variants'][0] | undefined;

    for (const p of db.products) {
      const v = p.variants.find(
        (variant) => variant.barcode.toLowerCase() === cleanCode || variant.sku.toLowerCase() === cleanCode
      );
      if (v) {
        matchedProduct = p;
        matchedVariant = v;
        break;
      }
    }

    if (!matchedProduct || !matchedVariant) {
      throw new Error(`Artículo no encontrado con código de barras o SKU: ${barcode}`);
    }

    // Consultar stock en la sucursal activa
    const stockItem = db.inventory.find(
      (s) => matchBranchId(s.branchId, branchId) && s.variantId === matchedVariant!.id
    );
    const available = stockItem ? stockItem.availableStock : 0;

    return {
      variantId: matchedVariant.id,
      sku: matchedVariant.sku,
      barcode: matchedVariant.barcode,
      garmentName: matchedProduct.name,
      sizeName: matchedVariant.size.name,
      colorName: matchedVariant.color.name,
      unitPrice: matchedVariant.price,
      quantity: 1,
      subtotal: matchedVariant.price,
      maxAvailableStock: available,
      isFromReservation: false,
    };
  },

  async getQuickCatalog(branchId: string, search?: string): Promise<PosCatalogProduct[]> {
    const db = loadDatabase();
    let prods = [...db.products].filter(p => p.isActive);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      prods = prods.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.variants.some(v => v.sku.toLowerCase().includes(q) || v.barcode.includes(q))
      );
    }

    return prods.map(p => {
      let totalStock = 0;
      const variantsWithStock = p.variants.map(v => {
        const stk = db.inventory.find(s => matchBranchId(s.branchId, branchId) && s.variantId === v.id);
        const avail = stk ? stk.availableStock : 0;
        totalStock += avail;
        return {
          variantId: v.id,
          sku: v.sku,
          barcode: v.barcode,
          sizeName: v.size.name,
          colorName: v.color.name,
          price: v.price,
          availableStock: avail,
        };
      });

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        basePrice: p.basePrice,
        imageUrl: p.images[0] || '',
        totalStockInBranch: totalStock,
        variants: variantsWithStock,
      };
    });
  },

  async processSale(payload: ProcessSalePayload): Promise<SaleReceipt> {
    const db = loadDatabase();
    const branch = db.branches.find(b => matchBranchId(b.id, payload.branchId)) || db.branches[0];
    const user = db.users.find(u => u.id === payload.cashierId) || db.users[0];

    // Deducir stock por cada prenda vendida
    payload.items.forEach(sold => {
      const stock = db.inventory.find(s => matchBranchId(s.branchId, payload.branchId) && s.variantId === sold.variantId);
      if (stock) {
        if (sold.isFromReservation) {
          stock.reservedStock = Math.max(0, stock.reservedStock - sold.quantity);
        } else {
          stock.availableStock = Math.max(0, stock.availableStock - sold.quantity);
        }
        stock.totalStock = stock.availableStock + stock.reservedStock;
      }
    });

    // Si viene de una reserva, actualizar estado a COMPLETED
    if (payload.reservationId) {
      const res = db.reservations.find(r => r.id === payload.reservationId);
      if (res) {
        res.status = 'COMPLETED';
        res.updatedAt = new Date().toISOString();
      }
    }

    // Convertir items para el recibo
    const receiptItems: PosCartItem[] = payload.items.map(it => {
      let garmentName = 'Prenda';
      let sku = '';
      let barcode = '';
      let sizeName = '';
      let colorName = '';

      for (const p of db.products) {
        const v = p.variants.find(varItem => varItem.id === it.variantId);
        if (v) {
          garmentName = p.name;
          sku = v.sku;
          barcode = v.barcode;
          sizeName = v.size.name;
          colorName = v.color.name;
          break;
        }
      }

      return {
        variantId: it.variantId,
        sku,
        barcode,
        garmentName,
        sizeName,
        colorName,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: Math.round(it.quantity * it.unitPrice * 100) / 100,
        maxAvailableStock: 0,
        isFromReservation: it.isFromReservation,
      };
    });

    const saleId = `sale-${Date.now()}`;
    const invoiceNum = `FAC-${branch.code || 'SUC01'}-${Math.floor(100000 + Math.random() * 900000)}`;

    const receipt: SaleReceipt = {
      saleId,
      invoiceNumber: invoiceNum,
      branchCode: branch.code || 'SUC-01',
      branchName: branch.name,
      branchAddress: branch.address,
      branchPhone: branch.phone,
      cashierName: user.name,
      issuedAt: new Date().toISOString(),
      customer: payload.customer,
      items: receiptItems,
      subtotal: payload.subtotal,
      taxAmount: payload.taxAmount,
      totalAmount: payload.totalAmount,
      paymentMethod: payload.paymentMethod,
      amountTendered: payload.amountTendered,
      changeDue: payload.changeDue,
      qrSecurityCode: `https://siat.impuestos.gob.bo/consulta/QR?nit=1023456023&cuf=${Date.now()}&numero=${invoiceNum}&monto=${payload.totalAmount}`,
    };

    if (!db.sales) {
      db.sales = [];
    }
    db.sales.unshift(receipt);
    saveDatabase(db);

    return receipt;
  },

  async getSaleReceipt(saleId: string): Promise<SaleReceipt> {
    const db = loadDatabase();
    const receipt = db.sales?.find(s => s.saleId === saleId);
    if (!receipt) {
      throw new Error(`Comprobante no encontrado con id: ${saleId}`);
    }
    return receipt;
  },

  async getAllSales(params?: { branchId?: string; search?: string }): Promise<SaleReceipt[]> {
    const db = loadDatabase();
    let sales = db.sales || [];
    if (params?.branchId) {
      sales = sales.filter(s => s.branchCode.toLowerCase() === params.branchId?.toLowerCase() || s.branchName.toLowerCase().includes(params.branchId?.toLowerCase() || ''));
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      sales = sales.filter(s =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q) ||
        (s.customer?.businessName && s.customer.businessName.toLowerCase().includes(q)) ||
        (s.customer?.taxId && s.customer.taxId.includes(q))
      );
    }
    return sales;
  },

  async getDashboardKpis(branchId?: string): Promise<DashboardKpiSummary> {
    const db = loadDatabase();
    const allSales = db.sales || [];
    const salesFiltered = branchId ? allSales.filter(s => s.branchCode === branchId || s.branchName.includes(branchId)) : allSales;
    const reservationsFiltered = branchId ? db.reservations.filter(r => r.branchId === branchId) : db.reservations;
    const inventoryFiltered = branchId ? db.inventory.filter(i => i.branchId === branchId) : db.inventory;

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = salesFiltered.filter(s => s.issuedAt.startsWith(todayStr));
    const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

    const activeReservations = reservationsFiltered.filter(r => ['PENDING', 'PREPARING', 'READY', 'CLIENT_PRESENT'].includes(r.status));
    const lowStockItems = inventoryFiltered.filter(i => i.availableStock <= i.minAlertThreshold);

    // Inicializar mapa con todas las sucursales físicas activas
    const physicalBranches = (db.branches && db.branches.length > 0) ? db.branches : [
      { id: 'branch-1', name: 'Sucursal Central (La Paz)', code: 'SUC-01' },
      { id: 'branch-2', name: 'Sucursal Equipetrol (Santa Cruz)', code: 'SUC-02' },
      { id: 'branch-3', name: 'Sucursal Calacoto (Zona Sur)', code: 'SUC-03' },
    ];

    const salesByBranchMap: Record<string, { branchId: string; branchName: string; branchCode: string; totalRevenue: number; salesCount: number }> = {};
    physicalBranches.forEach((b) => {
      let bName = b.name;
      if (bName === 'Sucursal Central') bName = 'Sucursal Central (La Paz)';
      if (bName === 'Sucursal Norte') bName = 'Sucursal Equipetrol (Santa Cruz)';
      if (bName === 'Sucursal Sur') bName = 'Sucursal Calacoto (Zona Sur)';
      salesByBranchMap[bName] = {
        branchId: b.id,
        branchName: bName,
        branchCode: (b as any).code || 'SUC-01',
        totalRevenue: 0,
        salesCount: 0,
      };
    });

    allSales.forEach(s => {
      let name = s.branchName || 'Sucursal Central (La Paz)';
      if (name === 'Sucursal Central') name = 'Sucursal Central (La Paz)';
      if (name === 'Sucursal Norte') name = 'Sucursal Equipetrol (Santa Cruz)';
      if (name === 'Sucursal Sur') name = 'Sucursal Calacoto (Zona Sur)';

      if (!salesByBranchMap[name]) {
        salesByBranchMap[name] = {
          branchId: s.branchCode || 'branch-1',
          branchName: name,
          branchCode: s.branchCode || 'SUC-01',
          totalRevenue: 0,
          salesCount: 0,
        };
      }
      salesByBranchMap[name].totalRevenue += s.totalAmount;
      salesByBranchMap[name].salesCount += 1;
    });

    const totalAggregatedRev = Object.values(salesByBranchMap).reduce((acc, b) => acc + b.totalRevenue, 0);
    // Si no hubiera ventas registradas en el mapa, asegurar distribución base consistente
    if (totalAggregatedRev === 0) {
      if (salesByBranchMap['Sucursal Central (La Paz)']) {
        salesByBranchMap['Sucursal Central (La Paz)'].totalRevenue = 7720.00;
        salesByBranchMap['Sucursal Central (La Paz)'].salesCount = 20;
      }
      if (salesByBranchMap['Sucursal Equipetrol (Santa Cruz)']) {
        salesByBranchMap['Sucursal Equipetrol (Santa Cruz)'].totalRevenue = 3940.00;
        salesByBranchMap['Sucursal Equipetrol (Santa Cruz)'].salesCount = 12;
      }
      if (salesByBranchMap['Sucursal Calacoto (Zona Sur)']) {
        salesByBranchMap['Sucursal Calacoto (Zona Sur)'].totalRevenue = 2140.00;
        salesByBranchMap['Sucursal Calacoto (Zona Sur)'].salesCount = 6;
      }
    }

    const calculatedTotal = Object.values(salesByBranchMap).reduce((acc, b) => acc + b.totalRevenue, 0) || 1;

    const salesByBranch = Object.values(salesByBranchMap)
      .map(stats => ({
        branchId: stats.branchId,
        branchName: stats.branchName,
        branchCode: stats.branchCode,
        totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
        salesCount: stats.salesCount,
        percentage: Math.round((stats.totalRevenue / calculatedTotal) * 100),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const calculatedDailyRev = todayRevenue > 0 ? todayRevenue : totalAggregatedRev || 13800.00;
    const calculatedDailySales = todaySales.length > 0 ? todaySales.length : (allSales.length || 38);

    return {
      todayRevenue: Math.round(calculatedDailyRev * 100) / 100,
      todaySalesCount: calculatedDailySales,
      activeReservationsCount: activeReservations.length,
      lowStockItemsCount: lowStockItems.length,
      totalProductsCount: db.products.length,
      salesByBranch,
      recentSales: allSales.slice(0, 8).map(s => ({
        id: s.saleId,
        invoiceNumber: s.invoiceNumber,
        branchName: s.branchName,
        cashierName: s.cashierName,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        issuedAt: s.issuedAt,
      })),
      recentReservations: db.reservations.slice(0, 5).map(r => ({
        id: r.id,
        code: r.reservationCode,
        clientName: r.clientName,
        branchName: r.branchName,
        status: r.status,
        scheduledTime: r.scheduledTime,
      })),
    };
  },

  // ---------------- USERS (CU17) ----------------
  async getUsers(): Promise<UserSession[]> {
    const db = loadDatabase();
    return db.users.map(({ password: _, ...u }) => u);
  },

  async createUser(payload: Omit<UserSession, 'id'> & { password?: string }): Promise<UserSession> {
    const db = loadDatabase();
    const newUser: UserSession & { password?: string } = {
      id: `user-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      assignedBranchId: payload.assignedBranchId,
      assignedBranchName: payload.assignedBranchName,
      isActive: payload.isActive ?? true,
      password: payload.password || 'password123',
    };
    db.users.push(newUser);
    saveDatabase(db);
    const { password: _, ...clean } = newUser;
    return clean;
  },

  async updateUser(id: string, payload: Partial<UserSession & { password?: string }>): Promise<UserSession> {
    const db = loadDatabase();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');
    db.users[idx] = { ...db.users[idx], ...payload };
    saveDatabase(db);
    const { password: _, ...clean } = db.users[idx];
    return clean;
  },

  async deleteUser(id: string): Promise<void> {
    const db = loadDatabase();
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase(db);
  },

  // ---------------- BRANCHES & CITIES (CU18) ----------------
  async getBranches(): Promise<Branch[]> {
    const db = loadDatabase();
    return db.branches;
  },

  async getCities(): Promise<City[]> {
    const db = loadDatabase();
    return db.cities;
  },

  async createBranch(payload: Omit<Branch, 'id'>): Promise<Branch> {
    const db = loadDatabase();
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: payload.name,
      code: payload.code,
      address: payload.address,
      phone: payload.phone,
      city: payload.city,
      fittingRooms: payload.fittingRooms,
      isActive: payload.isActive ?? true,
    };
    db.branches.push(newBranch);
    saveDatabase(db);
    return newBranch;
  },

  async updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
    const db = loadDatabase();
    const idx = db.branches.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Sucursal no encontrada');
    db.branches[idx] = { ...db.branches[idx], ...payload };
    saveDatabase(db);
    return db.branches[idx];
  },

  async deleteBranch(id: string): Promise<void> {
    const db = loadDatabase();
    db.branches = db.branches.filter(b => b.id !== id);
    saveDatabase(db);
  },

  // ---------------- CATEGORIES, SIZES, COLORS (CU20) ----------------
  async getCategories(): Promise<CategoryItem[]> {
    const db = loadDatabase();
    return db.categories;
  },

  async createCategory(payload: Omit<CategoryItem, 'id'>): Promise<CategoryItem> {
    const db = loadDatabase();
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: payload.name,
      code: payload.code.toUpperCase(),
      description: payload.description,
      parentId: payload.parentId,
      isActive: payload.isActive ?? true,
    };
    db.categories.push(newCat);
    saveDatabase(db);
    return newCat;
  },

  async updateCategory(id: string, payload: Partial<CategoryItem>): Promise<CategoryItem> {
    const db = loadDatabase();
    const idx = db.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Categoría no encontrada');
    db.categories[idx] = { ...db.categories[idx], ...payload };
    saveDatabase(db);
    return db.categories[idx];
  },

  async deleteCategory(id: string): Promise<void> {
    const db = loadDatabase();
    db.categories = db.categories.filter(c => c.id !== id);
    saveDatabase(db);
  },

  async createSize(payload: Omit<GarmentSize, 'id'>): Promise<GarmentSize> {
    const db = loadDatabase();
    const newSize: GarmentSize = {
      id: `size-${Date.now()}`,
      name: payload.name,
      orderIndex: payload.orderIndex || db.sizes.length + 1,
    };
    db.sizes.push(newSize);
    saveDatabase(db);
    return newSize;
  },

  async deleteSize(id: string): Promise<void> {
    const db = loadDatabase();
    db.sizes = db.sizes.filter(s => s.id !== id);
    saveDatabase(db);
  },

  async createColor(payload: Omit<GarmentColor, 'id'>): Promise<GarmentColor> {
    const db = loadDatabase();
    const newColor: GarmentColor = {
      id: `col-${Date.now()}`,
      name: payload.name,
      hexCode: payload.hexCode,
    };
    db.colors.push(newColor);
    saveDatabase(db);
    return newColor;
  },

  async deleteColor(id: string): Promise<void> {
    const db = loadDatabase();
    db.colors = db.colors.filter(c => c.id !== id);
    saveDatabase(db);
  },

  // ---------------- SEASONS & COLLECTIONS (CU21) ----------------
  async getSeasons(): Promise<SeasonItem[]> {
    const db = loadDatabase();
    return db.seasons;
  },

  async createSeason(payload: Omit<SeasonItem, 'id'>): Promise<SeasonItem> {
    const db = loadDatabase();
    const newSeason: SeasonItem = {
      id: `season-${Date.now()}`,
      name: payload.name,
      code: payload.code.toUpperCase(),
      startDate: payload.startDate,
      endDate: payload.endDate,
      isActive: payload.isActive ?? true,
    };
    db.seasons.push(newSeason);
    saveDatabase(db);
    return newSeason;
  },

  async updateSeason(id: string, payload: Partial<SeasonItem>): Promise<SeasonItem> {
    const db = loadDatabase();
    const idx = db.seasons.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Temporada no encontrada');
    db.seasons[idx] = { ...db.seasons[idx], ...payload };
    saveDatabase(db);
    return db.seasons[idx];
  },

  async deleteSeason(id: string): Promise<void> {
    const db = loadDatabase();
    db.seasons = db.seasons.filter(s => s.id !== id);
    saveDatabase(db);
  },

  // ---------------- PROVIDERS (CU22) ----------------
  async getProvidersDetailed(): Promise<ProviderItem[]> {
    const db = loadDatabase();
    return db.providers;
  },

  async createProvider(payload: Omit<ProviderItem, 'id'>): Promise<ProviderItem> {
    const db = loadDatabase();
    const newProv: ProviderItem = {
      id: `prov-${Date.now()}`,
      name: payload.name,
      code: payload.code,
      contactName: payload.contactName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      isActive: payload.isActive ?? true,
    };
    db.providers.push(newProv);
    saveDatabase(db);
    return newProv;
  },

  async updateProvider(id: string, payload: Partial<ProviderItem>): Promise<ProviderItem> {
    const db = loadDatabase();
    const idx = db.providers.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Proveedor no encontrado');
    db.providers[idx] = { ...db.providers[idx], ...payload };
    saveDatabase(db);
    return db.providers[idx];
  },

  async deleteProvider(id: string): Promise<void> {
    const db = loadDatabase();
    db.providers = db.providers.filter(p => p.id !== id);
    saveDatabase(db);
  },

  // ---------------- PROMOTIONS (CU23) ----------------
  async getPromotions(): Promise<PromotionItem[]> {
    const db = loadDatabase();
    return db.promotions;
  },

  async createPromotion(payload: Omit<PromotionItem, 'id'>): Promise<PromotionItem> {
    const db = loadDatabase();
    const newPromo: PromotionItem = {
      id: `promo-${Date.now()}`,
      code: payload.code.toUpperCase(),
      title: payload.title,
      description: payload.description,
      discountPercentage: payload.discountPercentage,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isActive: payload.isActive ?? true,
    };
    db.promotions.push(newPromo);
    saveDatabase(db);
    return newPromo;
  },

  async updatePromotion(id: string, payload: Partial<PromotionItem>): Promise<PromotionItem> {
    const db = loadDatabase();
    const idx = db.promotions.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Promoción no encontrada');
    db.promotions[idx] = { ...db.promotions[idx], ...payload };
    saveDatabase(db);
    return db.promotions[idx];
  },

  async deletePromotion(id: string): Promise<void> {
    const db = loadDatabase();
    db.promotions = db.promotions.filter(p => p.id !== id);
    saveDatabase(db);
  },

  // ---------------- SUPPLIER (CU38, CU39, CU40) ----------------
  async getSupplierProducts(providerId: string): Promise<GarmentProduct[]> {
    const db = loadDatabase();
    return db.products.filter(p => p.providerId === providerId);
  },

  // ==========================================
  // MODELO DE DOMINIO - 13 TABLAS BASE DE DATOS
  // (.specs/back-docs/base-de-datos.md)
  // ==========================================
  async getDbRoles(): Promise<RoleEntity[]> {
    const db = loadDatabase();
    return db.roles || [];
  },

  async getDbUsuarios(): Promise<UsuarioEntity[]> {
    const db = loadDatabase();
    return db.usuarios || [];
  },

  async getDbDirecciones(): Promise<DireccionEntity[]> {
    const db = loadDatabase();
    return db.direcciones || [];
  },

  async getDbCategorias(): Promise<CategoriaEntity[]> {
    const db = loadDatabase();
    return db.categorias || [];
  },

  async getDbProductos(): Promise<ProductoEntity[]> {
    const db = loadDatabase();
    return db.productos || [];
  },

  async getDbImagenesProductos(): Promise<ImagenProductoEntity[]> {
    const db = loadDatabase();
    return db.imagenes_productos || [];
  },

  async getDbCarritos(): Promise<CarritoEntity[]> {
    const db = loadDatabase();
    return db.carritos || [];
  },

  async getDbCarritoItems(): Promise<CarritoItemEntity[]> {
    const db = loadDatabase();
    return db.carrito_items || [];
  },

  async getDbOrdenes(): Promise<OrdenEntity[]> {
    const db = loadDatabase();
    return db.ordenes || [];
  },

  async getDbOrdenItems(): Promise<OrdenItemEntity[]> {
    const db = loadDatabase();
    return db.orden_items || [];
  },

  async getDbPagos(): Promise<PagoEntity[]> {
    const db = loadDatabase();
    return db.pagos || [];
  },

  async getDbInteraccionesIa(): Promise<InteraccionIaEntity[]> {
    const db = loadDatabase();
    return db.interacciones_ia || [];
  },

  async getDbFeedbackIa(): Promise<FeedbackIaEntity[]> {
    const db = loadDatabase();
    return db.feedback_ia || [];
  },

  async getCompleteDatabase(): Promise<CompleteDatabaseSchema> {
    const db = loadDatabase();
    return {
      roles: db.roles || [],
      usuarios: db.usuarios || [],
      direcciones: db.direcciones || [],
      categorias: db.categorias || [],
      productos: db.productos || [],
      imagenes_productos: db.imagenes_productos || [],
      carritos: db.carritos || [],
      carrito_items: db.carrito_items || [],
      ordenes: db.ordenes || [],
      orden_items: db.orden_items || [],
      pagos: db.pagos || [],
      interacciones_ia: db.interacciones_ia || [],
      feedback_ia: db.feedback_ia || [],
    };
  }
};

