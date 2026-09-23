import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormData } from '../esquemas/login.schema';
import { authService } from '../servicios/auth.service';
import { useAuthStore } from '../almacen/auth.store';
import { handleApiError } from '@core/http/error-handler';
import {
  Loader2,
  ShoppingBag,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Store,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
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

  const handleQuickLogin = (email: string, password = 'Admin123,') => {
    setValue('email', email);
    setValue('password', password);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      const response = await authService.login(data);
      setAuth(response.user, response.tokens);

      switch (response.user.role) {
        case 'ADMIN':
          navigate('/');
          break;
        case 'BRANCH_MANAGER':
          navigate('/reservations');
          break;
        case 'CASHIER':
          navigate('/pos');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/50 p-3 sm:p-4 select-none">
      {/* Fondo decorativo geométrico de puntos */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      {/* Orbes luminosos sutiles de fondo */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -right-28 w-88 h-88 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 left-1/4 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Badges decorativos flotantes de contexto */}
      <div className="hidden lg:flex items-center gap-2 absolute top-5 left-6 px-3 py-1 bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-full shadow-xs text-xs font-semibold text-gray-700">
        <Store className="w-3.5 h-3.5 text-blue-600" />
        <span>FashionStore Retail Suite</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span className="text-[11px] text-gray-400 font-mono">v2026</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-5 left-6 px-3 py-1 bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-full shadow-xs text-xs text-gray-600">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>Probadores Virtuales & Asistente IA</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute top-5 right-6 px-3 py-1 bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-full shadow-xs text-xs font-medium text-gray-600">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Autenticación Multi-Rol Segura</span>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute bottom-5 right-6 px-3 py-1 bg-white/85 backdrop-blur-md border border-gray-200/80 rounded-full shadow-xs text-xs text-gray-600">
        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
        <span>Punto de Venta POS & Facturación</span>
      </div>

      {/* Tarjeta Principal de Login en Modo Claro (Ajuste a pantalla sin scroll) */}
      <div className="relative w-full max-w-[400px] bg-white border border-gray-200 shadow-xl shadow-slate-200/60 rounded-2xl p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Cabecera de Marca */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 mb-0.5">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            FashionStore
          </h1>
          <p className="text-xs font-medium text-gray-500">
            Plataforma Backoffice & Terminal POS
          </p>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Modo Claro Oficial
          </div>
        </div>

        {/* Formulario de Login */}
        <form className="mt-3.5 space-y-3" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 bg-gray-50/80 border rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 transition-all",
                    errors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                  placeholder="admin@fashionstore.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-0.5 text-[11px] text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className={cn(
                    "block w-full pl-9 pr-3 py-2 bg-gray-50/80 border rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 transition-all",
                    errors.password
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  )}
                  placeholder="••••••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="mt-0.5 text-[11px] text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Botón Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 border border-transparent text-xs sm:text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Accesos Rápidos de Roles de Prueba (Con Iconos Minimalistas) */}
          <div className="pt-3 mt-1.5 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Acceso rápido por rol:
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Modo Demo</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@example.com', 'Admin123,')}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/80 hover:bg-blue-50/70 border border-gray-200/80 hover:border-blue-200 text-gray-700 hover:text-blue-700 transition-all cursor-pointer group"
                title="Administrador Global"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Admin</span>
                <span className="text-[9px] text-gray-400 group-hover:text-blue-600">Global</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('encargado@example.com', 'Encargado123,')}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/80 hover:bg-indigo-50/70 border border-gray-200/80 hover:border-indigo-200 text-gray-700 hover:text-indigo-700 transition-all cursor-pointer group"
                title="Encargado de Sucursal"
              >
                <Store className="w-4 h-4 text-indigo-600 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Encargado</span>
                <span className="text-[9px] text-gray-400 group-hover:text-indigo-600">Sucursal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cajero@example.com', 'Cajero123,')}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/80 hover:bg-emerald-50/70 border border-gray-200/80 hover:border-emerald-200 text-gray-700 hover:text-emerald-700 transition-all cursor-pointer group"
                title="Cajero Punto de Venta"
              >
                <CreditCard className="w-4 h-4 text-emerald-600 mb-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Cajero</span>
                <span className="text-[9px] text-gray-400 group-hover:text-emerald-600">POS</span>
              </button>
            </div>
          </div>

          {/* Pie de seguridad sutil */}
          <div className="pt-1 text-center">
            <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Base de Datos y Modelos Sincronizados</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
