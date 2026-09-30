import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '@modulos/autenticacion/esquemas/login.schema';
import { authService } from '@modulos/autenticacion/servicios/auth.service';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { handleApiError } from '@core/http/error-handler';
import { 
  X, 
  Mail, 
  Lock, 
  Loader2, 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import logoClean from '@assets/logo-clean.png';

interface LandingLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRedirect?: (role: string) => void;
}

export const LandingLoginModal: React.FC<LandingLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccessRedirect,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@example.com',
      password: 'Admin123,',
    },
  });

  if (!isOpen) return null;

  const handleQuickLogin = (email: string, password = 'Admin123,') => {
    setValue('email', email);
    setValue('password', password);
    setError(null);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const response = await authService.login(data);
      setAuth(response.user, response.tokens);
      setSuccessRole(response.user.role);

      setTimeout(() => {
        onClose();
        if (onSuccessRedirect) {
          onSuccessRedirect(response.user.role);
        } else if (response.user.role === 'ADMIN') {
          navigate('/dashboard');
        } else if (response.user.role === 'BRANCH_MANAGER') {
          navigate('/reservations');
        } else if (response.user.role === 'CASHIER') {
          navigate('/pos');
        }
      }, 700);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado con Logo */}
        <div className="text-center space-y-1.5 mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-md shadow-slate-100 p-2 mx-auto mb-1">
            <img src={logoClean} alt="FashionStore Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            Acceso a la Plataforma
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Inicia sesión para gestionar la tienda o explorar el perfil de usuario.
          </p>
        </div>

        {/* Notificación de Éxito */}
        {successRole && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Bienvenido! Sesión iniciada como {successRole}. Redirigiendo...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                {...register('email')}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="ejemplo@correo.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                {...register('password')}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Cuentas de Acceso Rápido */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
            Cuentas Demo del Sistema
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@example.com', 'Admin123,')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-blue-600 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Admin</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">Total Control</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager1@example.com', 'Manager123,')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-indigo-600 mb-0.5">
                <Store className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Gerente</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">Sucursales</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cajero1@example.com', 'Cajero123,')}
              className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Cajero</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate">POS Venta</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
