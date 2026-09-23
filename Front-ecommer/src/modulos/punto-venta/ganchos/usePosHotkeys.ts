import { useEffect } from 'react';

interface PosHotkeysOptions {
  onFocusSearch: () => void;
  onOpenBilling: () => void;
  onOpenCheckout: () => void;
  onCancel: () => void;
  canCheckout: boolean;
  isModalOpen?: boolean;
}

export function usePosHotkeys({
  onFocusSearch,
  onOpenBilling,
  onOpenCheckout,
  onCancel,
  canCheckout,
  isModalOpen = false,
}: PosHotkeysOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      // Escape: cancelar o cerrar modal siempre activo
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // F2: Enfocar buscador manual
      if (e.key === 'F2') {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // F4: Modal de NIT / Facturación
      if (e.key === 'F4') {
        e.preventDefault();
        onOpenBilling();
        return;
      }

      // F8: Abrir cobro
      if (e.key === 'F8') {
        e.preventDefault();
        if (canCheckout) {
          onOpenCheckout();
        }
        return;
      }

      // Espacio: Si no está enfocado ningún input ni modal abierto, abrir cobro
      if (e.key === ' ' && !isInputActive && !isModalOpen) {
        e.preventDefault();
        if (canCheckout) {
          onOpenCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onFocusSearch, onOpenBilling, onOpenCheckout, onCancel, canCheckout, isModalOpen]);
}
