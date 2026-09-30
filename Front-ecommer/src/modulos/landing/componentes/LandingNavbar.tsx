import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { authService } from '@modulos/autenticacion/servicios/auth.service';
import { 
  ShieldCheck, 
  LogOut, 
  Store, 
  ChevronDown, 
  Sparkles, 
  LogIn, 
  Menu, 
  X,
  CreditCard,
  PackagePlus,
  ShoppingBag
} from 'lucide-react';
import logoClean from '@assets/logo-clean.png';

interface LandingNavbarProps {
  onOpenLogin: () => void;
  onOpenArModal: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onOpenLogin,
  onOpenArModal,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar error de red en logout
    } finally {
      clearAuth();
      setProfileDropdownOpen(false);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador Global';
      case 'BRANCH_MANAGER':
        return 'Gerente de Sucursal';
      case 'CASHIER':
        return 'Cajero POS';
      case 'SUPPLIER':
        return 'Proveedor';
      default:
        return 'Cliente';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Marca y Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
            <img src={logoClean} alt="FashionStore" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-gray-900 tracking-tight">FashionStore</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Retail 2026
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
              Moda Exclusiva & Probador Virtual 3D
            </p>
          </div>
        </div>

        {/* Enlaces de Navegación de Escritorio */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-600">
          <button 
            onClick={() => scrollToSection('colecciones')} 
            className="hover:text-blue-600 transition cursor-pointer"
          >
            Colecciones
          </button>
          <button 
            onClick={onOpenArModal} 
            className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1"
          >
            <span>Probador RA</span>
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] rounded-md font-bold">3D</span>
          </button>
          <button 
            onClick={() => scrollToSection('asistente-ia')} 
            className="hover:text-blue-600 transition cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Asistente IA</span>
          </button>
          <button 
            onClick={() => scrollToSection('sucursales')} 
            className="hover:text-blue-600 transition cursor-pointer"
          >
            Sucursales Físicas
          </button>
          <button 
            onClick={() => scrollToSection('tecnologia')} 
            className="hover:text-blue-600 transition cursor-pointer"
          >
            Tecnología Retail
          </button>
        </nav>

        {/* Acciones de la Derecha: Perfil / Login */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* Botón Acceso Rápido al Módulo Admin (visible si es ADMIN) */}
              {user.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/25 transition cursor-pointer"
                  title="Ir directamente al Panel de Control de Administración"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  <span>Módulo Admin</span>
                </button>
              )}

              {/* Botón de Perfil con Menú Desplegable */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer shadow-2xs"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <p className="text-[10px] font-medium text-gray-500">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown del Perfil del Usuario */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Encabezado del Perfil */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/60 rounded-t-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-gray-900 truncate">{user.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wider">
                            {getRoleDisplayName(user.role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN CRÍTICA: Acceso al Módulo Admin si el usuario es Admin */}
                    <div className="p-2 space-y-1">
                      {user.role === 'ADMIN' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/dashboard');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-200" />
                            <span>Entrar al Módulo Admin</span>
                          </div>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
                            Admin →
                          </span>
                        </button>
                      ) : user.role === 'BRANCH_MANAGER' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/branch-dashboard');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            <span>Panel de Sucursal</span>
                          </div>
                          <span className="text-[10px] font-mono">Ir →</span>
                        </button>
                      ) : user.role === 'CASHIER' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/pos');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span>Terminal Punto de Venta</span>
                          </div>
                          <span className="text-[10px] font-mono">POS →</span>
                        </button>
                      ) : user.role === 'SUPPLIER' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/supplier-portal');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <PackagePlus className="w-4 h-4" />
                            <span>Portal Proveedor</span>
                          </div>
                          <span className="text-[10px] font-mono">Ir →</span>
                        </button>
                      ) : null}

                      {/* Enlace al Catálogo de Prendas */}
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          scrollToSection('colecciones');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 text-xs font-medium transition cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-gray-500" />
                        <span>Ver Colecciones en Tienda</span>
                      </button>

                      {/* Enlace al Asistente IA */}
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          if (user.role === 'ADMIN' || user.role === 'BRANCH_MANAGER') {
                            navigate('/ai-assistant');
                          } else {
                            scrollToSection('asistente-ia');
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-100 text-xs font-medium transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>Consultar Asistente IA Gemini</span>
                      </button>
                    </div>

                    <div className="my-1 border-t border-gray-100" />

                    {/* Cerrar Sesión */}
                    <div className="px-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Botón de Iniciar Sesión para Visitantes */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          )}

          {/* Botón Menú Móvil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition"
            title="Abrir menú de navegación"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col space-y-2 text-sm font-semibold text-gray-700">
            <button
              onClick={() => scrollToSection('colecciones')}
              className="text-left py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Colecciones
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenArModal();
              }}
              className="text-left py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center justify-between cursor-pointer"
            >
              <span>Probador Virtual RA</span>
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-bold">3D</span>
            </button>
            <button
              onClick={() => scrollToSection('asistente-ia')}
              className="text-left py-2 px-3 rounded-lg hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Asistente IA</span>
            </button>
            <button
              onClick={() => scrollToSection('sucursales')}
              className="text-left py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Sucursales Físicas
            </button>
            <button
              onClick={() => scrollToSection('tecnologia')}
              className="text-left py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Tecnología Retail
            </button>

            {/* Si es Admin en móvil, botón destacado para entrar al módulo */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/dashboard');
                }}
                className="mt-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar al Módulo Admin</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
