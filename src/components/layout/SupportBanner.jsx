import React from 'react';
import { Building2, X } from 'lucide-react';
import { useSupport } from '@/context/SupportContext';

export function SupportBanner() {
  const { selectedOrg, clearSelectedOrg, isOrgSelected } = useSupport();

  if (!isOrgSelected || !selectedOrg) return null;

  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-2 flex items-center justify-between text-xs font-medium shadow-inner z-20">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-blue-200" />
        <span>
          Modo Supervisión Activo:{' '}
          <strong className="font-semibold text-white tracking-wide">
            {selectedOrg.nombre}
          </strong>{' '}
          {selectedOrg.nit && <span className="text-blue-200">(NIT: {selectedOrg.nit})</span>}
        </span>
        <span className="hidden md:inline text-blue-200 ml-2">
          — Todas las consultas, métricas y parámetros están filtrados para esta empresa.
        </span>
      </div>
      <button
        onClick={clearSelectedOrg}
        className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:bg-white/30 px-2.5 py-1 rounded-lg text-white transition-colors cursor-pointer"
        title="Quitar filtro de organización"
      >
        <span>Ver todas</span>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

