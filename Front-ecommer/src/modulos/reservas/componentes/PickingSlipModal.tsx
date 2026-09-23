import type { FittingRoomReservation } from '../tipos/reservation.types';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reservation: FittingRoomReservation;
}

export function PickingSlipModal({ isOpen, onClose, reservation }: Props) {
  if (!isOpen) return null;

  const handlePrint = () => {
    // Para simplificar, usamos window.print. En producción se usaría un iframe o nueva ventana con solo el print content.
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0">
      
      {/* Controles del Modal (Ocultos en impresión) */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] print:hidden border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Picking List (Recolección)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">Imprime este ticket para ir a bodega y buscar las prendas.</p>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>

        {/* Preview Container */}
        <div className="p-4 overflow-y-auto flex justify-center bg-gray-100">
          <div className="bg-white text-black p-4 w-72 shadow-md rounded-lg border border-gray-200">
             {/* Contenido a imprimir re-utilizado para preview */}
             <PrintContent reservation={reservation} />
          </div>
        </div>
      </div>

      {/* Contenido Real a Imprimir (Visible solo en impresión) */}
      <div className="hidden print:block w-full max-w-[80mm] text-black bg-white m-0 p-2 text-[12px] font-mono leading-tight">
        <PrintContent reservation={reservation} />
      </div>

    </div>
  );
}

function PrintContent({ reservation }: { reservation: FittingRoomReservation }) {
  return (
    <div className="w-full">
      <div className="text-center mb-4 border-b-2 border-black border-dashed pb-2">
        <h1 className="font-bold text-lg leading-none mb-1">PICKING SLIP</h1>
        <p className="text-sm font-bold">{reservation.reservationCode}</p>
        <p className="text-xs">{format(new Date(reservation.createdAt), 'dd/MM/yyyy HH:mm')}</p>
      </div>

      <div className="mb-4 text-xs">
        <p><span className="font-bold">CLIENTE:</span> {reservation.clientName}</p>
        <p><span className="font-bold">CITA:</span> {format(new Date(reservation.scheduledTime), 'HH:mm', { locale: es })}</p>
        <p><span className="font-bold">SUCURSAL:</span> {reservation.branchName}</p>
      </div>

      <table className="w-full text-xs text-left mb-4">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1">CANT</th>
            <th className="py-1">DESCRIPCIÓN / SKU</th>
          </tr>
        </thead>
        <tbody>
          {reservation.items.map(item => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-2 font-bold align-top">1x</td>
              <td className="py-2">
                <p className="font-bold truncate max-w-[180px]">{item.garmentName}</p>
                <p>Talla: {item.sizeName} | Color: {item.colorName}</p>
                <p className="font-mono text-[10px] mt-1">{item.sku}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center text-xs border-t-2 border-black border-dashed pt-2 mt-4">
        <p>TALLA DE PRENDAS: {reservation.items.length}</p>
        <p className="mt-2 text-[10px]">Preparado por: ___________________</p>
        <p className="mt-4 text-[10px]">- FIN DE RECIBO -</p>
      </div>
    </div>
  );
}
