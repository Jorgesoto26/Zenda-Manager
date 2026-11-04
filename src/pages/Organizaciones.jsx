import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Archive,
  ChevronRight,
  MoreVertical,
  ExternalLink,
  Shield,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AlertDialog } from '@/components/ui/AlertDialog';
import {
  getOrganizaciones,
  createOrganizacion,
  toggleOrganizacionEstado,
  assignAdminToOrganizacion,
} from '@/services/organizacionesService';
import { getAdministradores } from '@/services/administradoresService';
import { useSupport } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { ESTADOS_ORGANIZACION, ESTADO_BADGES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function Organizaciones() {
  const [organizaciones, setOrganizaciones] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modal Crear Organización
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    direccion: '',
    emailContacto: '',
    modoApertura: 'admin_masivo',
    adminId: '',
  });
  const [creating, setCreating] = useState(false);
  const [availableAdmins, setAvailableAdmins] = useState([]);

  // Modal Asignar Administrador
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrgForAssign, setSelectedOrgForAssign] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  // Modal Cambiar Estado (Suspender/Activar)
  const [statusAlertOpen, setStatusAlertOpen] = useState(false);
  const [selectedOrgForStatus, setSelectedOrgForStatus] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [processingStatus, setProcessingStatus] = useState(false);

  const { setSelectedOrgId, selectedOrgId } = useSupport();
  const { isSuperAdmin, rolSoporte } = useAuth();

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const [data, admins] = await Promise.all([
        getOrganizaciones(),
        getAdministradores().catch(() => []),
      ]);
      setOrganizaciones(data || []);
      setAvailableAdmins(admins || []);
    } catch (err) {
      toast.error('Error al cargar organizaciones', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  // Filtros
  useEffect(() => {
    let list = [...organizaciones];

    if (statusFilter !== 'todos') {
      list = list.filter((o) => (o.estado || 'activa') === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.nombre?.toLowerCase().includes(q) ||
          o.nit?.toLowerCase().includes(q) ||
          o.email_contacto?.toLowerCase().includes(q) ||
          o.admin?.nombre?.toLowerCase().includes(q)
      );
    }

    setFilteredOrgs(list);
  }, [organizaciones, search, statusFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la organización es obligatorio');
      return;
    }

    if (!isSuperAdmin) {
      toast.error('Permiso denegado', {
        description: `Tu cuenta tiene rol "${rolSoporte || 'desconocido'}". La creación de organizaciones está reservada exclusivamente para Superadministradores de Soporte Central.`,
      });
      return;
    }

    setCreating(true);
    try {
      await createOrganizacion(formData);
      toast.success('Organización creada con éxito');
      setCreateModalOpen(false);
      setFormData({
        nombre: '',
        nit: '',
        telefono: '',
        direccion: '',
        emailContacto: '',
        modoApertura: 'admin_masivo',
        adminId: '',
      });
      loadOrgs();
    } catch (err) {
      toast.error('Error al crear organización', { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssignAdmin = (org) => {
    setSelectedOrgForAssign(org);
    setSelectedAdminId(org.admin?.id || '');
    setAssignModalOpen(true);
  };

  const handleConfirmAssignAdmin = async (e) => {
    e.preventDefault();
    if (!selectedOrgForAssign || !selectedAdminId) {
      toast.error('Debe seleccionar un administrador');
      return;
    }

    setAssigningAdmin(true);
    try {
      await assignAdminToOrganizacion({
        organizacionId: selectedOrgForAssign.id,
        adminId: selectedAdminId,
      });
      toast.success(`Administrador asignado a ${selectedOrgForAssign.nombre}`);
      setAssignModalOpen(false);
      setSelectedOrgForAssign(null);
      setSelectedAdminId('');
      loadOrgs();
    } catch (err) {
      toast.error('Error al asignar administrador', { description: err.message });
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleStatusChangeClick = (org) => {
    setSelectedOrgForStatus(org);
    setSuspensionReason('');
    setStatusAlertOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedOrgForStatus) return;

    const actual = selectedOrgForStatus.estado || 'activa';
    const nuevo = actual === 'activa' ? 'suspendida' : 'activa';

    setProcessingStatus(true);
    try {
      await toggleOrganizacionEstado(selectedOrgForStatus.id, nuevo, suspensionReason);
      toast.success(
        `Organización ${nuevo === 'activa' ? 'activada' : 'suspendida'} correctamente`
      );
      setStatusAlertOpen(false);
      loadOrgs();
    } catch (err) {
      toast.error('Error al cambiar estado', { description: err.message });
    } finally {
      setProcessingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Organizaciones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración central de empresas, franquicias y configuraciones de Zenda
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          disabled={!isSuperAdmin}
          title={!isSuperAdmin ? `Solo Superadministradores pueden crear organizaciones (Rol actual: ${rolSoporte || 'técnico'})` : ''}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Organización</span>
        </Button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, NIT, email o administrador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">Solo activas</option>
              <option value="suspendida">Solo suspendidas</option>
              <option value="archivada">Archivadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Organizaciones */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Cargando organizaciones registradas...
        </div>
      ) : filteredOrgs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              No se encontraron organizaciones
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No existen organizaciones que coincidan con los filtros de búsqueda seleccionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrgs.map((org) => {
            const estadoKey = org.estado || 'activa';
            const badgeConfig = ESTADO_BADGES[estadoKey] || ESTADO_BADGES.activa;
            const isSelected = selectedOrgId === org.id;

            return (
              <Card
                key={org.id}
                className={`flex flex-col justify-between transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-blue-600 bg-blue-50/20' : ''
                }`}
              >
                <div>
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg uppercase shrink-0">
                        {org.nombre?.[0] || 'O'}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold text-slate-900 truncate">
                          {org.nombre}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          NIT: {org.nit || 'No registrado'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeConfig.bg}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${badgeConfig.dot}`} />
                      {badgeConfig.label}
                    </span>
                  </CardHeader>

                  <CardContent className="space-y-2.5 text-xs text-slate-600 pt-1">
                    {/* Admin Asignado */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Administrador Principal
                        </span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {org.admin?.nombre
                            ? `${org.admin.nombre} ${org.admin.apellido || ''}`
                            : 'Sin administrador asignado'}
                        </span>
                      </div>
                      {isSuperAdmin && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-[11px] h-6 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 shrink-0 font-medium"
                          onClick={() => handleOpenAssignAdmin(org)}
                        >
                          {org.admin ? 'Cambiar' : 'Asignar'}
                        </Button>
                      )}
                    </div>

                    {/* Datos de contacto */}
                    <div className="space-y-1 pt-1">
                      {org.telefono && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{org.telefono}</span>
                        </div>
                      )}
                      {org.direccion && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{org.direccion}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      className="text-xs h-8"
                      onClick={() =>
                        setSelectedOrgId(isSelected ? null : org.id)
                      }
                    >
                      {isSelected ? 'Filtrado' : 'Supervisar'}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className={`text-xs h-8 ${
                        estadoKey === 'activa'
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      onClick={() => handleStatusChangeClick(org)}
                    >
                      {estadoKey === 'activa' ? 'Suspender' : 'Activar'}
                    </Button>
                  </div>

                  <Link to={`/organizaciones/${org.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8 gap-1 text-slate-600 hover:text-slate-900"
                    >
                      <span>Detalles</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Organización */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nueva Organización"
        description="Registra una nueva empresa o franquicia en la plataforma Zenda."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Organización *
            </label>
            <Input
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Inversiones La Floresta S.A.S."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIT / Identificación
              </label>
              <Input
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                placeholder="900.123.456-7"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="300 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dirección Principal
            </label>
            <Input
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Calle 45 # 12 - 34, Oficina 201"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Electrónico de Contacto
            </label>
            <Input
              type="email"
              value={formData.emailContacto}
              onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
              placeholder="contacto@organizacion.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Modalidad de Apertura de Caja
            </label>
            <select
              value={formData.modoApertura}
              onChange={(e) => setFormData({ ...formData, modoApertura: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin_masivo">Apertura Masiva por Administrador</option>
              <option value="vendedor_dia">Auto-apertura por Vendedor al Cambiar Día</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Determina si los vendedores requieren que el admin les abra caja o si se auto-habilita
              al iniciar jornada.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Administrador Principal (Opcional)
            </label>
            <select
              value={formData.adminId || ''}
              onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin asignar (asignar después) --</option>
              {availableAdmins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.nombre} {adm.apellido || ''} {!adm.organizacion_id ? '(🟢 Disponible / Sin organización)' : `(Asignado a: ${adm.organizacion?.nombre || 'otra org'})`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Puedes seleccionar a un administrador existente en la plataforma para que lidere esta organización.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Organización
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Asignar Administrador Existente */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedOrgForAssign(null);
          setSelectedAdminId('');
        }}
        title="Asignar Administrador Principal"
        description={`Vincula un administrador existente a la organización "${selectedOrgForAssign?.nombre}".`}
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
                const isCurrent = adm.id === selectedOrgForAssign?.admin?.id;
                const isFree = !adm.organizacion_id;
                return (
                  <option key={adm.id} value={adm.id}>
                    {adm.nombre} {adm.apellido || ''} {isCurrent ? '(Actual)' : isFree ? '(🟢 Sin organización / Disponible)' : `(Asignado a: ${adm.organizacion?.nombre || 'otra org'})`}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Los administradores marcados con <strong className="text-emerald-700">🟢 Sin organización</strong> serán asociados de inmediato a esta empresa.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignModalOpen(false);
                setSelectedOrgForAssign(null);
                setSelectedAdminId('');
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={assigningAdmin}>
              Asignar Administrador
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación: Suspender / Activar */}
      <AlertDialog
        isOpen={statusAlertOpen}
        onClose={() => setStatusAlertOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={
          selectedOrgForStatus?.estado === 'activa'
            ? `¿Suspender la organización ${selectedOrgForStatus?.nombre}?`
            : `¿Activar la organización ${selectedOrgForStatus?.nombre}?`
        }
        description={
          selectedOrgForStatus?.estado === 'activa'
            ? 'Al suspender la organización, los vendedores y administradores no podrán emitir nuevos créditos ni aperturar cajas. Los registros financieros y saldos se mantendrán intactos para cobranza.'
            : 'La organización recuperará acceso normal a la plataforma móvil y sus administradores podrán reanudar operaciones de cobro y crédito.'
        }
        confirmText={
          selectedOrgForStatus?.estado === 'activa' ? 'Suspender Organización' : 'Activar'
        }
        variant={selectedOrgForStatus?.estado === 'activa' ? 'destructive' : 'default'}
        loading={processingStatus}
      />
    </div>
  );
}

