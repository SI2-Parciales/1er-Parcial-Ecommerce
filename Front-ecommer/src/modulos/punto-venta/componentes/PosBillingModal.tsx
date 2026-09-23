import { useState, useEffect } from 'react';
import { usePosStore } from '../almacen/pos.store';
import { X, UserCheck, ShieldCheck } from 'lucide-react';

interface PosBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PosBillingModal({ isOpen, onClose }: PosBillingModalProps) {
  const customer = usePosStore((state) => state.customer);
  const setCustomer = usePosStore((state) => state.setCustomer);
  const resetCustomer = usePosStore((state) => state.resetCustomer);

  const [taxId, setTaxId] = useState(customer.taxId || '0');
  const [businessName, setBusinessName] = useState(customer.businessName || 'Sin Nombre');
  const [email, setEmail] = useState(customer.email || '');

  useEffect(() => {
    if (isOpen) {
      setTaxId(customer.taxId || '0');
      setBusinessName(customer.businessName || 'Sin Nombre');
      setEmail(customer.email || '');
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomer({
      taxId: taxId.trim() || '0',
      businessName: businessName.trim() || 'Sin Nombre',
      email: email.trim() || undefined,
    });
    onClose();
  };

  const handleSetAnonymous = () => {
    resetCustomer();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-gray-900">
              Datos de Facturación (F4)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              NIT / C.I. del Cliente
            </label>
            <input
              type="text"
              autoFocus
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Ej: 1028394021 o 0 para Sin Nombre"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Razón Social / Nombre Completo
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Juan Pérez o Empresa S.R.L."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Correo Electrónico (Opcional - Envío de factura digital)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSetAnonymous}
              className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              Sin Nombre (NIT: 0)
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Guardar Datos
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
