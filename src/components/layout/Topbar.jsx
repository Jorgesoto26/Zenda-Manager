import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe, RefreshCw } from 'lucide-react';
import { useSupport } from '@/context/SupportContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export function Topbar() {
  const { selectedOrgId, setSelectedOrgId, selectedOrg } = useSupport();
  const [orgs, setOrgs] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const fetchOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizaciones')
        .select('id, nombre, nit, estado')
        .order('nombre', { ascending: true });

      if (!error && data) {
        setOrgs(data);
      }
    } catch (err) {
      console.warn('Error fetching orgs in Topbar:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-30 shrink-0">
      {/* Selector de Organización */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-800"
        >
          {selectedOrgId ? (
            <>
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>{selectedOrg?.nombre || 'Cargando organización...'}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                Filtro activo
              </Badge>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 text-slate-500" />
              <span>Todas las Organizaciones</span>
              <span className="text-xs text-slate-400 font-normal">({orgs.length})</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
        </button>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200/80 p-2 z-50 animate-in fade-in-0 zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Seleccionar Ámbito
                </span>
                <button
                  onClick={fetchOrganizations}
                  title="Recargar"
                  className="text-slate-400 hover:text-slate-600"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingOrgs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Opción global */}
              <button
                onClick={() => {
                  setSelectedOrgId(null);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors text-left mt-1 ${
                  !selectedOrgId
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span>Todas las organizaciones</span>
                </div>
                {!selectedOrgId && <Check className="h-4 w-4 text-blue-600" />}
              </button>

              <div className="my-1 border-t border-slate-100" />

              {/* Lista de organizaciones */}
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {orgs.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-400">
                    No hay organizaciones registradas
                  </div>
                ) : (
                  orgs.map((org) => {
                    const isSelected = selectedOrgId === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setSelectedOrgId(org.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium">{org.nombre}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            NIT: {org.nit || 'Sin NIT'}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Indicadores del Sistema */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Supabase Conectado</span>
        </div>
      </div>
    </header>
  );
}

