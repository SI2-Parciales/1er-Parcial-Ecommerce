import type { SaleReceipt } from '../tipos/pos.types';

interface ThermalReceiptProps {
  receipt: SaleReceipt | null;
  paperWidth?: '80mm' | '58mm';
}

export function ThermalReceipt({ receipt, paperWidth = '80mm' }: ThermalReceiptProps) {
  if (!receipt) return null;

  const widthClass = paperWidth === '58mm' ? 'w-[58mm] max-w-[58mm]' : 'w-[80mm] max-w-[80mm]';

  return (
    <>
      <style>{`
        @media screen {
          .thermal-receipt-container {
            display: none;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .thermal-receipt-container,
          .thermal-receipt-container * {
            visibility: visible !important;
          }
          .thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      <div
        className={`thermal-receipt-container ${widthClass} text-black bg-white font-mono text-[11px] leading-tight p-2`}
      >
        {/* Encabezado Fiscal */}
        <div className="text-center mb-2">
          <h1 className="font-bold text-sm tracking-wider uppercase">FASHIONSTORE S.R.L.</h1>
          <p className="text-[9px] text-gray-700 uppercase">Casa Matriz / Sucursal {receipt.branchCode}</p>
          <p className="text-[10px] font-bold mt-1">NIT: 1023456023</p>
          <p className="text-[10px] font-bold">
            {receipt.isOffline ? 'COMPROBANTE LOCAL OFFLINE N°: ' : 'FACTURA N°: '}
            {receipt.invoiceNumber}
          </p>
        </div>

        {/* Banner de Estado Offline */}
        {receipt.isOffline && (
          <div className="border-2 border-black p-1 text-center my-1 font-bold text-[9px] uppercase tracking-wider bg-gray-100">
            ★ COMPROBANTE OFFLINE • GUARDADO EN BASE LOCAL ★
            <div className="text-[8px] font-normal normal-case">Transacción almacenada en IndexedDB (Caja #{receipt.branchCode})</div>
          </div>
        )}

        <div className="border-t border-b border-black border-dashed py-1.5 my-2 text-[10px] space-y-0.5">
          <p>
            <span className="font-bold">FECHA: </span>
            {new Date(receipt.issuedAt).toLocaleString('es-BO', {
              dateStyle: 'short',
              timeStyle: 'medium',
            })}
          </p>
          <p>
            <span className="font-bold">NIT / CI: </span>
            {receipt.customer.taxId}
          </p>
          <p>
            <span className="font-bold">SEÑOR(ES): </span>
            {receipt.customer.businessName.toUpperCase()}
          </p>
        </div>

        {/* Detalle de Productos */}
        <table className="w-full text-left text-[10px] my-2">
          <thead>
            <tr className="border-b border-black">
              <th className="py-0.5 w-8">CANT</th>
              <th className="py-0.5">DESCRIPCIÓN</th>
              <th className="py-0.5 text-right">P.UNIT</th>
              <th className="py-0.5 text-right">SUBT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {receipt.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 align-top font-bold">{item.quantity}</td>
                <td className="py-1">
                  <p className="font-semibold uppercase">{item.garmentName}</p>
                  <p className="text-[9px] text-gray-700">
                    {item.sizeName} / {item.colorName} ({item.sku})
                  </p>
                </td>
                <td className="py-1 align-top text-right font-mono">
                  {item.unitPrice.toFixed(2)}
                </td>
                <td className="py-1 align-top text-right font-bold font-mono">
                  {item.subtotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Resumen de Liquidación */}
        <div className="border-t-2 border-black border-dashed pt-1.5 my-2 text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>SUBTOTAL Bs.:</span>
            <span className="font-mono">{receipt.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>DESCUENTO Bs.:</span>
            <span className="font-mono">0.00</span>
          </div>
          <div className="flex justify-between text-xs font-bold border-t border-black pt-1">
            <span>TOTAL A PAGAR Bs.:</span>
            <span className="font-mono">{receipt.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span>IVA (13% discriminado) Bs.:</span>
            <span className="font-mono">{receipt.taxAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Desglose de Pago */}
        <div className="border-t border-black border-dashed py-1.5 my-1 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>MÉTODO DE PAGO:</span>
            <span className="font-bold">{receipt.paymentMethod}</span>
          </div>
          {receipt.paymentMethod === 'CASH' && (
            <>
              <div className="flex justify-between">
                <span>IMPORTE RECIBIDO Bs.:</span>
                <span className="font-mono">{receipt.amountTendered.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CAMBIO / VUELTO Bs.:</span>
                <span className="font-mono">{receipt.changeDue.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-[9px] text-gray-600 pt-0.5">
            <span>CAJERO:</span>
            <span>{receipt.cashierName}</span>
          </div>
        </div>

        {/* QR de Control Fiscal */}
        <div className="text-center my-3 flex flex-col items-center">
          {receipt.qrSecurityCode && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                receipt.qrSecurityCode
              )}`}
              alt="QR Control Fiscal"
              className="w-24 h-24 my-1"
            />
          )}
          <p className="text-[8px] font-mono">CÓDIGO DE CONTROL: 8B-3F-9A-02</p>
        </div>

        {/* Leyenda Fiscal Oficial */}
        <div className="text-center text-[8px] space-y-1 mt-2 border-t border-black border-dashed pt-2">
          <p className="font-bold">
            "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"
          </p>
          <p>
            Ley N° 453: El proveedor debe brindar atención sin discriminación, con respeto, calidez y cordialidad a los usuarios y consumidores.
          </p>
          <p className="font-bold pt-1">- GRACIAS POR SU PREFERENCIA -</p>
        </div>
      </div>
    </>
  );
}
