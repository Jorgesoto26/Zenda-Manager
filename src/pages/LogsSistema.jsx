import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  Square,
  RefreshCw,
  Activity,
  Layers,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  Filter,
  Eye,
  Database,
  Cpu,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { getProcesosLogs, testSupabaseHealth } from '@/services/logsService';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function LogsSistema() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [search, setSearch] = useState('');

  // Realtime live stream
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const channelRef = useRef(null);

  // Modal para ver detalle JSON del log
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [healthData, logsData] = await Promise.all([
        testSupabaseHealth(),
        getProcesosLogs({ limit: 100, tipo: filterTipo }),
      ]);
      setHealth(healthData);
      setLogs(logsData);
    } catch (err) {
      toast.error('Error al consultar logs', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = () => {
    setIsActive(true);
    fetchLogs();
    toast.success('Inspección de logs activada manualmente');
  };

  const handleStopInspection = () => {
    setIsActive(false);
    if (realtimeActive) {
      handleToggleRealtime(false);
    }
    toast.info('Inspección de logs pausada');
  };

  const handleToggleRealtime = (enable) => {
    if (enable) {
      setRealtimeActive(true);
      // Suscribir al canal de Postgres
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            const newEvent = {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date().toISOString(),
              event: payload.eventType,
              table: payload.table,
              schema: payload.schema,
              data: payload.new || payload.old,
            };
            setLiveEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
          }
        )
        .subscribe();

      channelRef.current = channel;
      toast.success('Canal en tiempo real conectado');
    } else {
      setRealtimeActive(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      toast.info('Canal en tiempo real desconectado');
    }
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.proceso?.toLowerCase().includes(q) ||
      l.origen?.toLowerCase().includes(q) ||
      l.autor?.toLowerCase().includes(q) ||
      l.organizacion?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Terminal className="h-6 w-6 text-slate-700" />
            <span>Logs de Procesos y Supabase</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspección bajo demanda de ejecuciones de RPCs, disparadores (triggers), auditoría y eventos en vivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              onClick={handleStartInspection}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Activar Inspección de Logs</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLogs}
                loading={loading}
                className="gap-1.5 bg-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopInspection}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 bg-white border-red-200"
              >
                <Square className="h-3.5 w-3.5 fill-red-600" />
                <span>Detener Monitoreo</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estado inactivo */}
      {!isActive && (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Monitoreo Manual en Reposo
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Para no consumir recursos en segundo plano ni saturar conexiones de base de datos, la lectura de logs está pausada. Pulsa el botón para ejecutar una consulta bajo demanda.
              </p>
            </div>
            <Button
              onClick={handleStartInspection}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Play className="h-4 w-4" />
              <span>Consultar Logs Ahora</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Panel de Monitoreo Activo */}
      {isActive && (
        <>
          {/* Métricas de Salud del Motor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado de Supabase
                  </div>
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{health?.status === 'healthy' ? 'Conectado / Saludable' : 'En línea'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Latencia Base de Datos
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {health ? `${health.latencyMs} ms` : 'Midiendo...'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Eventos en Vivo (Realtime)
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {realtimeActive ? 'Conectado al bus de cambios' : 'Desconectado'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={realtimeActive}
                  onCheckedChange={handleToggleRealtime}
                />
              </CardContent>
            </Card>
          </div>

          {/* Consola Realtime (si está activa) */}
          {realtimeActive && (
            <Card className="border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
              <CardHeader className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-slate-300 font-semibold">STREAM EN TIEMPO REAL: public.*</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {liveEvents.length} eventos capturados
                </span>
              </CardHeader>
              <CardContent className="p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5">
                {liveEvents.length === 0 ? (
                  <div className="text-slate-500 italic py-4 text-center">
                    Esperando mutaciones en la base de datos (INSERT / UPDATE / DELETE)...
                  </div>
                ) : (
                  liveEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-start gap-2 text-[11px]"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ev.event === 'INSERT'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ev.event === 'UPDATE'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}
                      >
                        {ev.event}
                      </span>
                      <span className="text-slate-400">[{ev.timestamp.split('T')[1].slice(0, 8)}]</span>
                      <span className="text-blue-400 font-semibold">{ev.table}</span>
                      <span className="text-slate-300 truncate flex-1">
                        {JSON.stringify(ev.data).substring(0, 100)}...
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Filtros de la Tabla de Logs */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar en logs por proceso, origen, autor u organización..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={filterTipo}
                  onChange={(e) => {
                    setFilterTipo(e.target.value);
                    setTimeout(fetchLogs, 50);
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos los procesos</option>
                  <option value="admin">Procesos de Gestión / Edge</option>
                  <option value="movil">Procesos Móviles / Cajas</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Logs */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Consultando registros de procesos...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Terminal className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-slate-600">No se encontraron registros de logs</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Comprueba los filtros seleccionados o realiza una acción en el sistema
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-3.5">Fecha / Hora</th>
                      <th className="px-6 py-3.5">Origen / Capa</th>
                      <th className="px-6 py-3.5">Proceso Ejecutado</th>
                      <th className="px-6 py-3.5">Autor / Operador</th>
                      <th className="px-6 py-3.5">Organización</th>
                      <th className="px-6 py-3.5 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors text-xs">
                        <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>

                        <td className="px-6 py-3.5">
                          <Badge
                            variant={log.categoria === 'Administración' ? 'default' : 'warning'}
                            className="text-[10px]"
                          >
                            {log.origen}
                          </Badge>
                        </td>

                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {log.proceso}
                        </td>

                        <td className="px-6 py-3.5 text-slate-600">
                          {log.autor}
                        </td>

                        <td className="px-6 py-3.5 text-slate-500">
                          {log.organizacion}
                        </td>

                        <td className="px-6 py-3.5 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[11px] bg-white gap-1"
                            onClick={() => {
                              setSelectedLog(log);
                              setModalOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 text-slate-400" />
                            <span>Payload</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de Detalle JSON */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Detalles de la Ejecución"
        description={selectedLog?.proceso}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Origen:</span>
              <strong className="text-slate-700">{selectedLog?.origen}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Fecha y Hora:</span>
              <strong className="text-slate-700">{selectedLog && formatDateTime(selectedLog.timestamp)}</strong>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Cuerpo / Parámetros del Evento (JSON):
            </label>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-72">
              {JSON.stringify(selectedLog?.detalles || {}, null, 2)}
            </pre>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

