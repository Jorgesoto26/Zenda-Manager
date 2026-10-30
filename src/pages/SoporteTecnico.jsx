import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  AlertTriangle,
  Clock,
  HardDrive,
  Database,
  CheckCircle2,
  RefreshCw,
  Building2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  getDiagnosticoCajas,
  getDiagnosticoEvidencias,
} from '@/services/soporteTecnicoService';
import { useSupport } from '@/context/SupportContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function SoporteTecnico() {
  const { selectedOrgId } = useSupport();
  const [cajas, setCajas] = useState([]);
  const [evidencias, setEvidencias] = useState({ total: 0, sincronizadas: 0, pendientes: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cajasData, evidenciasData] = await Promise.all([
        getDiagnosticoCajas({ organizacionId: selectedOrgId }),
        getDiagnosticoEvidencias(),
      ]);
      setCajas(cajasData);
      setEvidencias(evidenciasData);
    } catch (err) {
      toast.error('Error cargando diagnóstico', { description: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const cajasCriticas = cajas.filter((c) => c.requiereAtencion);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Soporte Técnico</h1>
          <p className="text-sm text-slate-500 mt-1">
            Diagnóstico operativo, sincronización de evidencias y supervisión de cajas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          loading={refreshing}
          className="gap-2 bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Ejecutar Diagnóstico</span>
        </Button>
      </div>

      {/* Grid de Estado del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Backend Supabase */}
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estado Backend Supabase
            </CardTitle>
            <Database className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-lg font-bold text-slate-900">Operativo</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Conexión activa con PostgreSQL y Edge Functions
            </p>
          </CardContent>
        </Card>

        {/* Alertas de Caja */}
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cajas con Atención Requerida
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{cajasCriticas.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Turnos abiertos continuos por más de 24 horas
            </p>
          </CardContent>
        </Card>

        {/* Storage Evidencias */}
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Multimedia Storage ('Evidencias')
            </CardTitle>
            <HardDrive className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {evidencias.sincronizadas} / {evidencias.total}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Archivos sincronizados en bucket privado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Panel de Cajas Abiertas en Diagnóstico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Cajas Actualmente Abiertas
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de turnos operativos en campo
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total abiertas: {cajas.length}
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Diagnosticando cajas activas...
            </div>
          ) : cajas.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No hay cajas abiertas en este momento.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Usuario / Vendedor</th>
                  <th className="px-6 py-3.5">Organización</th>
                  <th className="px-6 py-3.5">Fecha Apertura</th>
                  <th className="px-6 py-3.5">Tiempo Abierta</th>
                  <th className="px-6 py-3.5">Saldo Inicial</th>
                  <th className="px-6 py-3.5">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cajas.map((caja) => (
                  <tr key={caja.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {caja.usuario?.nombre} {caja.usuario?.apellido || ''}
                      </div>
                      <div className="text-xs text-slate-400">{caja.usuario?.email}</div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {caja.usuario?.organizacion?.nombre || 'Sin Organización'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {formatDateTime(caja.fecha_apertura)}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium">
                      <span
                        className={
                          caja.requiereAtencion
                            ? 'text-red-600 font-bold'
                            : 'text-slate-700'
                        }
                      >
                        {caja.horasAbierta} horas
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-slate-900">
                      {formatCurrency(caja.saldo_inicial)}
                    </td>

                    <td className="px-6 py-4">
                      {caja.requiereAtencion ? (
                        <Badge variant="warning" className="text-xs gap-1 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Turno Prolongado (&gt;24h)</span>
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs font-medium">
                          Operación Normal
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Guía y Políticas de Seguridad de Soporte */}
      <Card className="bg-slate-900 text-white border-0">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4" />
            <span>Protocolo de Integridad Financiera</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Reglas de Soporte Técnico en Zenda Manager
          </h3>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong>Inmutabilidad Contable:</strong> Ninguna acción administrativa desde la web
                debe alterar directamente saldos de facturas o movimientos de caja sin una auditoría
                y motivo explícito.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong>Aislamiento de Organizaciones:</strong> Los administradores móviles nunca
                deben tener acceso al portal de soporte central. Cada franquicia debe mantener sus
                datos completamente aislados.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong>Cierre de Turnos:</strong> Si un turno supera las 48 horas sin cerrar, el
                administrador de la organización debe solicitar el arqueo al vendedor antes de forzar
                un cierre.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

