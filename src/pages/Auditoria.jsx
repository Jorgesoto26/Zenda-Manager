import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  Building2,
  User,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { getAuditoriaLogs } from '@/services/auditoriaService';
import { useSupport } from '@/context/SupportContext';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function Auditoria() {
  const { selectedOrgId } = useSupport();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduloFilter, setModuloFilter] = useState('todos');

  // Modal para ver detalle JSON de la auditoría
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditoriaLogs({
        organizacionId: selectedOrgId,
        modulo: moduloFilter,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      toast.error('Error cargando registros de auditoría', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, moduloFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registro de Auditoría</h1>
        <p className="text-sm text-slate-500 mt-1">
          Trazabilidad completa de operaciones administrativas, cambios de parámetros y suspensiones
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filtrar por Módulo:
            </span>
            <select
              value={moduloFilter}
              onChange={(e) => setModuloFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los módulos</option>
              <option value="organizaciones">Organizaciones</option>
              <option value="administradores">Administradores</option>
              <option value="usuarios">Usuarios</option>
              <option value="parametrizacion">Parametrización</option>
            </select>
          </div>
          <span className="text-xs text-slate-400">Mostrando últimos 100 eventos</span>
        </CardContent>
      </Card>

      {/* Tabla de Auditoría */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Consultando eventos de auditoría...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No hay eventos de auditoría registrados para este filtro.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Módulo</th>
                  <th className="px-6 py-3.5">Operación / Acción</th>
                  <th className="px-6 py-3.5">Organización Afectada</th>
                  <th className="px-6 py-3.5">Operador de Soporte</th>
                  <th className="px-6 py-3.5">Motivo / Descripción</th>
                  <th className="px-6 py-3.5 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize text-xs font-medium">
                        {log.modulo}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-800 text-xs capitalize">
                      {log.accion}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-700">
                      {log.organizacion?.nombre || (
                        <span className="text-slate-400 italic">Global / Sin Org</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {log.usuario?.nombre || 'Soporte Central'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {log.motivo || '—'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleViewDetail(log)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Ver</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Detalle de Auditoría */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detalle del Evento de Auditoría"
        description={`Registro ID: ${selectedLog?.id}`}
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Operación</span>
                <span className="font-bold text-slate-800 capitalize">
                  {selectedLog.modulo} — {selectedLog.accion}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Fecha y Hora</span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(selectedLog.created_at)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Organización</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.organizacion?.nombre || 'Global'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Operador</span>
                <span className="font-semibold text-slate-800">
                  {selectedLog.usuario?.nombre || 'Soporte Central'} ({selectedLog.usuario?.email || 'N/A'})
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Motivo</span>
                <span className="font-medium text-slate-700">
                  {selectedLog.motivo || 'Sin motivo registrado'}
                </span>
              </div>
            </div>

            {/* Comparativa de datos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Valores Previos</span>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono h-48 border border-slate-800">
                  {selectedLog.datos_previos
                    ? JSON.stringify(selectedLog.datos_previos, null, 2)
                    : '// No hay datos previos (registro nuevo)'}
                </pre>
              </div>
              <div>
                <span className="font-bold text-slate-700 block mb-1">Valores Posteriores</span>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto text-[11px] font-mono h-48 border border-slate-800">
                  {selectedLog.datos_posteriores
                    ? JSON.stringify(selectedLog.datos_posteriores, null, 2)
                    : '// Sin datos posteriores'}
                </pre>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

