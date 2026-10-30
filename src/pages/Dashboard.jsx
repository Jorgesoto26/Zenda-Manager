import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  ShieldCheck,
  UserCheck,
  Archive,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getDashboardMetrics, getRecentActivity } from '@/services/metricsService';
import { useSupport } from '@/context/SupportContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function Dashboard() {
  const { selectedOrgId, selectedOrg } = useSupport();
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [metricsData, activityData] = await Promise.all([
        getDashboardMetrics(selectedOrgId),
        getRecentActivity(8),
      ]);
      setMetrics(metricsData);
      setActivity(activityData);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard General</h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedOrgId ? (
              <span>
                Visualizando métricas consolidadas de la organización:{' '}
                <strong className="text-slate-800">{selectedOrg?.nombre || 'Seleccionada'}</strong>
              </span>
            ) : (
              'Monitoreo y supervisión consolidada de toda la plataforma Zenda'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            className="gap-2 text-slate-600 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar datos</span>
          </Button>
          <Link to="/organizaciones">
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Building2 className="h-4 w-4" />
              <span>Ver Organizaciones</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Organizaciones */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Organizaciones
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : metrics?.orgs_activas ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="text-emerald-600 font-medium">
                {metrics?.orgs_activas ?? 0} activas
              </span>
              <span>·</span>
              <span className="text-amber-600 font-medium">
                {metrics?.orgs_suspendidas ?? 0} suspendidas
              </span>
              <span>·</span>
              <span>{metrics?.orgs_total ?? 0} total</span>
            </div>
          </CardContent>
        </Card>

        {/* Card: Administradores */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Administradores
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : metrics?.total_admins ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Responsables de franquicias y equipos
            </p>
          </CardContent>
        </Card>

        {/* Card: Vendedores */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vendedores Activos
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : metrics?.total_vendedores ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rutas y cobros en campo
            </p>
          </CardContent>
        </Card>

        {/* Card: Clientes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Clientes Registrados
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : metrics?.total_clientes ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Titulares de cartera y créditos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Financiero y Operativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cartera Total en Circulación */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cartera Total Activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : formatCurrency(metrics?.cartera_total ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saldo pendiente de cobro en créditos vigentes
            </p>
          </CardContent>
        </Card>

        {/* Saldo Vencido / En Mora */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Vencido (Mora)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '—' : formatCurrency(metrics?.saldo_vencido ?? 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cuotas con fecha de vencimiento anterior a hoy
            </p>
          </CardContent>
        </Card>

        {/* Cajas Abiertas */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cajas Abiertas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '—' : metrics?.cajas_abiertas ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Turnos de cobro y ventas actualmente operando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido Secundario: Actividad Reciente y Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad Reciente */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Últimas Transacciones Registradas
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Movimientos de caja reportados por las organizaciones
              </p>
            </div>
            <Link
              to="/auditoria"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver auditoría completa</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            {activity.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No hay movimientos registrados recientemente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activity.map((mov) => {
                  const usuario = mov.caja?.usuario;
                  const org = usuario?.organizacion;
                  const isIngreso = ['ingreso', 'pago'].includes(mov.tipo);
                  return (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isIngreso
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isIngreso ? '+' : '-'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {mov.descripcion || `Movimiento de tipo ${mov.tipo}`}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>
                              {usuario?.nombre || 'Usuario'} ({usuario?.rol || 'vendedor'})
                            </span>
                            {org?.nombre && (
                              <>
                                <span>·</span>
                                <span className="text-blue-600 font-medium">{org.nombre}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{formatDateTime(mov.fecha)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            isIngreso ? 'text-emerald-600' : 'text-slate-800'
                          }`}
                        >
                          {isIngreso ? '+' : '-'} {formatCurrency(mov.monto)}
                        </span>
                        <Badge variant="secondary" className="block mt-1 text-[10px] w-fit ml-auto">
                          {mov.tipo}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de Soporte Rápido y Diagnóstico */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Diagnóstico Operativo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-slate-800">Apertura de Cajas</p>
                  <p className="text-slate-500 mt-0.5">
                    Modo configurado predominantemente: <strong>Admin Masivo</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Layers className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-slate-800">Parámetros Globales</p>
                  <p className="text-slate-500 mt-0.5">
                    Catálogo unificado para intereses, plazos y conceptos de gastos.
                  </p>
                </div>
              </div>

              <Link to="/soporte" className="block pt-2">
                <Button variant="outline" className="w-full text-xs justify-between">
                  <span>Ir a Centro de Soporte Técnico</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900 to-slate-900 text-white border-0">
            <CardContent className="p-5 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">
                Buenas Prácticas
              </span>
              <h4 className="text-sm font-bold text-white">Integridad de Cartera</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Recuerda que suspender una organización previene la emisión de nuevos créditos, pero
                preserva el historial contable y los saldos para su recuperación.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

