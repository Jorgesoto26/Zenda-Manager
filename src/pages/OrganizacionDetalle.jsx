import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Shield,
  Users,
  Briefcase,
  History,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  AlertTriangle,
  Layers,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import {
  getOrganizacionById,
  updateOrganizacion,
  assignAdminToOrganizacion,
} from '@/services/organizacionesService';
import { getAdministradores } from '@/services/administradoresService';
import { getUsuarios } from '@/services/usuariosService';
import { getAuditoriaLogs } from '@/services/auditoriaService';
import { useSupport } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_BADGES } from '@/lib/constants';
import { formatDate, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function OrganizacionDetalle() {
  const { id } = useParams();
  const { setSelectedOrgId, selectedOrgId } = useSupport();
  const { isSuperAdmin } = useAuth();

  const [org, setOrg] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'equipo' | 'auditoria'
  const [availableAdmins, setAvailableAdmins] = useState([]);

  // Modal Asignar Administrador
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orgData, usersData, logsData, adminsData] = await Promise.all([
        getOrganizacionById(id),
        getUsuarios({ organizacionId: id }),
        getAuditoriaLogs({ organizacionId: id, limit: 20 }),
        getAdministradores().catch(() => []),
      ]);
      setOrg(orgData);
      setUsuarios(usersData || []);
      setAuditLogs(logsData || []);
      setAvailableAdmins(adminsData || []);

      if (orgData) {
        setEditData({
          nombre: orgData.nombre || '',
          nit: orgData.nit || '',
          telefono: orgData.telefono || '',
          direccion: orgData.direccion || '',
          email_contacto: orgData.email_contacto || '',
          modo_apertura_caja: orgData.modo_apertura_caja || 'admin_masivo',
          admin_id: orgData.admin_id || '',
        });
      }
    } catch (err) {
      toast.error('Error al cargar datos de la organización', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleConfirmAssignAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdminId) {
      toast.error('Debe seleccionar un administrador');
      return;
    }

    setAssigningAdmin(true);
    try {
      await assignAdminToOrganizacion({
        organizacionId: id,
        adminId: selectedAdminId,
      });
      toast.success('Administrador asignado correctamente');
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al asignar administrador', { description: err.message });
    } finally {
      setAssigningAdmin(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrganizacion(id, editData);
      toast.success('Organización actualizada con éxito');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar organización', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-400">Cargando organización...</div>;
  }

  if (!org) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-lg font-bold text-slate-800">Organización no encontrada</h3>
        <Link to="/organizaciones" className="text-sm text-blue-600 mt-2 inline-block">
          Volver a lista de organizaciones
        </Link>
      </div>
    );
  }

  const estadoKey = org.estado || 'activa';
  const badgeConfig = ESTADO_BADGES[estadoKey] || ESTADO_BADGES.activa;
  const isSelected = selectedOrgId === org.id;

  const vendedores = usuarios.filter((u) => u.rol === 'vendedor');
  const admins = usuarios.filter((u) => u.rol === 'admin');

  return (
    <div className="space-y-6">
      {/* Barra superior con navegación */}
      <div className="flex items-center gap-3">
        <Link
          to="/organizaciones"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 truncate tracking-tight">
              {org.nombre}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeConfig.bg}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${badgeConfig.dot}`} />
              {badgeConfig.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ID: <span className="font-mono text-slate-600">{org.id}</span> · Creada el{' '}
            {formatDate(org.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedOrgId(isSelected ? null : org.id)}
            className="text-xs"
          >
            {isSelected ? 'Filtro Activo' : 'Supervisar Esta Org'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="gap-1.5 text-xs bg-white"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Editar</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Información General & Identidad
        </button>
        <button
          onClick={() => setActiveTab('equipo')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'equipo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Administrador & Equipo ({usuarios.length})
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'auditoria'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Historial de Auditoría ({auditLogs.length})
        </button>
      </div>

      {/* Tab: Información General */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 space-y-4 p-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Datos Principales de la Organización
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Razón Social / Nombre</span>
                <span className="font-semibold text-slate-800">{org.nombre}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">NIT / Identificación</span>
                <span className="font-semibold text-slate-800">{org.nit || 'No registrado'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Teléfono de Contacto</span>
                <span className="font-semibold text-slate-800">{org.telefono || 'No registrado'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Correo de Soporte / Contacto</span>
                <span className="font-semibold text-slate-800">{org.email_contacto || 'No registrado'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-400 block font-medium">Dirección</span>
                <span className="font-semibold text-slate-800">{org.direccion || 'No registrada'}</span>
              </div>
            </div>

            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 pt-4">
              Configuraciones Operativas de Caja
            </h4>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Modalidad de Apertura de Caja:{' '}
                  <span className="text-blue-700">
                    {org.modo_apertura_caja === 'vendedor_dia'
                      ? 'Auto-apertura por Vendedor al Cambiar Día'
                      : 'Apertura Masiva por Administrador'}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {org.modo_apertura_caja === 'vendedor_dia'
                    ? 'Los vendedores abren turno automáticamente si la fecha actual es posterior al último cierre.'
                    : 'El administrador debe abrir explícitamente los turnos diarios desde el panel móvil.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Tarjeta Lateral: Administrador Principal */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Administrador Principal</span>
            </h3>

            {org.admin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {org.admin.nombre?.[0] || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {org.admin.nombre} {org.admin.apellido || ''}
                    </p>
                    <p className="text-xs text-slate-500">{org.admin.email}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <p>
                    <strong className="text-slate-700">Estado:</strong>{' '}
                    {org.admin.activo !== false ? (
                      <span className="text-emerald-600 font-semibold">Habilitado</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Inhabilitado</span>
                    )}
                  </p>
                  <p>
                    <strong className="text-slate-700">Teléfono:</strong>{' '}
                    {org.admin.telefono || 'No registrado'}
                  </p>
                </div>

                {isSuperAdmin && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1.5 text-slate-700 bg-white hover:bg-slate-50"
                      onClick={() => {
                        setSelectedAdminId(org.admin?.id || '');
                        setAssignModalOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3 text-slate-500" />
                      <span>Reasignar Administrador</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-slate-400">
                  Esta organización no tiene un administrador principal asignado.
                </p>
                {isSuperAdmin && (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    onClick={() => {
                      setSelectedAdminId('');
                      setAssignModalOpen(true);
                    }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Asignar Administrador Existente</span>
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Equipo (Vendedores y Administradores) */}
      {activeTab === 'equipo' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Usuarios Asociados a la Organización
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {admins.length} administradores y {vendedores.length} vendedores registrados
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {usuarios.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No hay usuarios vinculados a esta organización todavía.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                        {u.nombre?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {u.nombre} {u.apellido || ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          {u.email} · Rol:{' '}
                          <span className="font-semibold text-slate-700 capitalize">
                            {u.rol}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <Badge
                        variant={u.activo !== false ? 'success' : 'destructive'}
                        className="text-[10px]"
                      >
                        {u.activo !== false ? 'Habilitado' : 'Inhabilitado'}
                      </Badge>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Máx Caja: ${u.dinero_max_caja || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Auditoría */}
      {activeTab === 'auditoria' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Registro Histórico de Acciones Administrativas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No hay registros de auditoría para esta organización.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm capitalize">
                        {log.modulo} — {log.accion}
                      </p>
                      <p className="text-slate-500 mt-1">{log.motivo || 'Sin observaciones'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Operador: {log.usuario?.nombre || 'Soporte Central'}
                      </p>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal: Editar Organización */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Organización"
        description="Modifica los datos generales y parámetros de la organización."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Organización *
            </label>
            <Input
              required
              value={editData.nombre || ''}
              onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIT / Identificación
              </label>
              <Input
                value={editData.nit || ''}
                onChange={(e) => setEditData({ ...editData, nit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <Input
                value={editData.telefono || ''}
                onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección Principal
            </label>
            <Input
              value={editData.direccion || ''}
              onChange={(e) => setEditData({ ...editData, direccion: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico de Contacto
            </label>
            <Input
              type="email"
              value={editData.email_contacto || ''}
              onChange={(e) => setEditData({ ...editData, email_contacto: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Modalidad de Apertura de Caja
            </label>
            <select
              value={editData.modo_apertura_caja || 'admin_masivo'}
              onChange={(e) =>
                setEditData({ ...editData, modo_apertura_caja: e.target.value })
              }
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin_masivo">Apertura Masiva por Administrador</option>
              <option value="vendedor_dia">Auto-apertura por Vendedor al Cambiar Día</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Administrador Principal
            </label>
            <select
              value={editData.admin_id || ''}
              onChange={(e) => setEditData({ ...editData, admin_id: e.target.value || null })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin administrador asignado --</option>
              {availableAdmins.map((adm) => {
                const isCurrent = adm.id === org?.admin_id;
                const isFree = !adm.organizacion_id;
                return (
                  <option key={adm.id} value={adm.id}>
                    {adm.nombre} {adm.apellido || ''} {isCurrent ? '(Actual)' : isFree ? '(🟢 Sin organización / Disponible)' : `(Asignado a: ${adm.organizacion?.nombre || 'otra org'})`}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Permite asociar a un administrador existente en la plataforma.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Asignar / Cambiar Administrador */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedAdminId('');
        }}
        title="Asignar Administrador Principal"
        description={`Selecciona un administrador existente para vincularlo a la organización "${org?.nombre}".`}
      >
        <form onSubmit={handleConfirmAssignAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seleccionar Administrador *
            </label>
            <select
              required
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Selecciona un administrador existente --</option>
              {availableAdmins.map((adm) => {
                const isCurrent = adm.id === org?.admin_id;
                const isFree = !adm.organizacion_id;
                return (
                  <option key={adm.id} value={adm.id}>
                    {adm.nombre} {adm.apellido || ''} {isCurrent ? '(Actual)' : isFree ? '(🟢 Sin organización / Disponible)' : `(Asignado a: ${adm.organizacion?.nombre || 'otra org'})`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Los administradores marcados con <strong className="text-emerald-700">🟢 Sin organización</strong> serán vinculados de inmediato a esta empresa.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedAdminId('');
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={assigningAdmin}>
              Confirmar Asignación
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

