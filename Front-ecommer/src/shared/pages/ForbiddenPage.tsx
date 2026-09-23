import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-foreground mb-2">Acceso Denegado</h1>
      <p className="text-gray-500 text-center mb-8 max-w-md">
        No tienes los permisos necesarios para acceder a esta sección. Si crees que esto es un error, contacta al administrador.
      </p>
      <Link 
        to="/" 
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
