import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/30 mb-4 animate-pulse">
          Z
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Verificando credenciales de soporte central...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido a Superadministradores</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Esta sección requiere privilegios de Superadministrador de Soporte Central. Tu rol actual no tiene autorización para realizar esta operación.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Volver al Dashboard
        </a>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

