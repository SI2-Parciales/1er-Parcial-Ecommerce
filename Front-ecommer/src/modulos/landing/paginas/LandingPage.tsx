import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { LandingNavbar } from '../componentes/LandingNavbar';
import { LandingHero } from '../componentes/LandingHero';
import { LandingCatalogPreview } from '../componentes/LandingCatalogPreview';
import { LandingFeatures } from '../componentes/LandingFeatures';
import { LandingBranches } from '../componentes/LandingBranches';
import { LandingArModal } from '../componentes/LandingArModal';
import { LandingLoginModal } from '../componentes/LandingLoginModal';
import { LandingFooter } from '../componentes/LandingFooter';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [arModalOpen, setArModalOpen] = useState(false);
  const [selectedArGarment, setSelectedArGarment] = useState<string | undefined>(undefined);

  const handleOpenAr = (garmentName?: string) => {
    setSelectedArGarment(garmentName);
    setArModalOpen(true);
  };

  const handleExploreCatalog = () => {
    const el = document.getElementById('colecciones');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenAssistant = () => {
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'BRANCH_MANAGER')) {
      navigate('/ai-assistant');
    } else {
      // Scroll to AI feature description or prompt login
      const el = document.getElementById('asistente-ia');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 selection:bg-blue-600 selection:text-white">
      {/* Barra de Navegación Principal con Perfil de Usuario */}
      <LandingNavbar
        onOpenLogin={() => setLoginModalOpen(true)}
        onOpenArModal={() => handleOpenAr()}
      />

      {/* Hero Principal con Acceso Rápido */}
      <main className="flex-1">
        <LandingHero
          onOpenLogin={() => setLoginModalOpen(true)}
          onOpenArModal={() => handleOpenAr()}
          onExploreCatalog={handleExploreCatalog}
        />

        {/* Muestra de Catálogo y Prendas */}
        <LandingCatalogPreview
          onOpenArModal={handleOpenAr}
          onOpenLogin={() => setLoginModalOpen(true)}
        />

        {/* Pilares Tecnológicos: AR, IA Gemini, Turnos QR, POS Offline */}
        <LandingFeatures
          onOpenArModal={() => handleOpenAr()}
          onOpenAssistant={handleOpenAssistant}
        />

        {/* Red de Sucursales Físicas */}
        <LandingBranches
          onOpenLogin={() => setLoginModalOpen(true)}
        />
      </main>

      {/* Pie de Página */}
      <LandingFooter />

      {/* Modal Interactivo de Realidad Aumentada 3D */}
      <LandingArModal
        isOpen={arModalOpen}
        onClose={() => setArModalOpen(false)}
        initialGarment={selectedArGarment}
      />

      {/* Modal de Inicio de Sesión Rápido */}
      <LandingLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccessRedirect={(role) => {
          if (role === 'ADMIN') {
            navigate('/dashboard');
          } else if (role === 'BRANCH_MANAGER') {
            navigate('/reservations');
          } else if (role === 'CASHIER') {
            navigate('/pos');
          }
        }}
      />
    </div>
  );
};
export default LandingPage;
