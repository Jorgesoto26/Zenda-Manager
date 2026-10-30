import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Building2,
  Mail,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import {
  getAdministradores,
  createAdministrador,
  updateAdministrador,
  toggleAdministradorEstado,
} from '@/services/administradoresService';
import { getOrganizaciones } from '@/services/organizacionesService';
import { useSupport } from '@/context/SupportContext';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function Administradores() {
  const { selectedOrgId } = useSupport();
  const [administradores, setAdministradores] = useState([]);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Crear Admin
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    organizacionId: selectedOrgId || '',
    dineroMaxCaja: '1000000',
    dineroMaxVenta: '500000',
    dineroMaxGasto: '200000',
    maxCuotas: '60',
    permiteBorrarVenta: true,
    permiteModificarPagos: true,
  });
  const [creating, setCreating] = useState(false);

  // Modal Editar Permisos
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminsData, orgsData] = await Promise.all([
        getAdministradores(selectedOrgId),
        getOrganizaciones(),
      ]);
      setAdministradores(adminsData);
      setOrganizaciones(orgsData);
    } catch (err) {
      toast.error('Error cargando administradores', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let list = [...administradores];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.nombre?.toLowerCase().includes(q) ||
          a.apellido?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.organizacion?.nombre?.toLowerCase().includes(q)
      );
    }
    setFilteredAdmins(list);
  }, [administradores, search]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim() || !formData.nombre.trim()) {
      toast.error('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      await createAdministrador(formData);
      toast.success('Administrador creado con éxito');
      setCreateModalOpen(false);
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        password: '',
        organizacionId: selectedOrgId || '',
        dineroMaxCaja: '1000000',
        dineroMaxVenta: '500000',
        dineroMaxGasto: '200000',
        maxCuotas: '60',
        permiteBorrarVenta: true,
        permiteModificarPagos: true,
      });
      loadData();
    } catch (err) {
      toast.error('Error al crear administrador', { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (admin) => {
    setEditingAdmin(admin);
    setEditFormData({
      nombre: admin.nombre || '',
      apellido: admin.apellido || '',
      organizacion_id: admin.organizacion_id || '',
      dinero_max_caja: admin.dinero_max_caja || 0,
      dinero_max_venta: admin.dinero_max_venta || 0,
      dinero_max_gasto: admin.dinero_max_gasto || 0,
      max_cuotas: admin.max_cuotas || 60,
      permite_borrar_venta: !!admin.permite_borrar_venta,
      permite_modificar_pagos: !!admin.permite_modificar_pagos,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setSaving(true);
    try {
      await updateAdministrador(editingAdmin.id, editFormData);
      toast.success('Permisos actualizados con éxito');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar permisos', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (admin) => {
    const nuevoEstado = admin.activo === false;
    try {
      await toggleAdministradorEstado(admin.id, nuevoEstado);
      toast.success(
        `Administrador ${nuevoEstado ? 'habilitado' : 'inhabilitado'} correctamente`
      );
      loadData();
    } catch (err) {
      toast.error('Error al actualizar estado', { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Administradores de Organización
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de credenciales, límites financieros y permisos para los líderes de franquicia
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Administrador</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar administrador por nombre, apellido, correo u organización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Administradores */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Cargando administradores...
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No se encontraron administradores registrados.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Administrador</th>
                  <th className="px-6 py-3.5">Organización</th>
                  <th className="px-6 py-3.5">Límites Financieros</th>
                  <th className="px-6 py-3.5">Permisos Especiales</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Admin Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {admin.nombre?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {admin.nombre} {admin.apellido || ''}
                          </p>
                          <p className="text-xs text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Organización */}
                    <td className="px-6 py-4">
                      {admin.organizacion?.nombre ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{admin.organizacion.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>

                    {/* Límites */}
                    <td className="px-6 py-4 text-xs space-y-0.5 text-slate-600">
                      <div>
                        <span className="text-slate-400">Máx Caja:</span>{' '}
                        <strong>{formatCurrency(admin.dinero_max_caja)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Máx Venta:</span>{' '}
                        <strong>{formatCurrency(admin.dinero_max_venta)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Máx Cuotas:</span>{' '}
                        <strong>{admin.max_cuotas || 30}</strong>
                      </div>
                    </td>

                    {/* Permisos */}
                    <td className="px-6 py-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            admin.permite_borrar_venta ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-slate-600">Anular ventas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            admin.permite_modificar_pagos ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-slate-600">Modificar pagos</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <Badge
                        variant={admin.activo !== false ? 'success' : 'destructive'}
                        className="text-xs"
                      >
                        {admin.activo !== false ? 'Habilitado' : 'Inhabilitado'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-white"
                        onClick={() => handleEditClick(admin)}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        <span>Permisos</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 text-xs ${
                          admin.activo !== false
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        onClick={() => handleToggleEstado(admin)}
                      >
                        {admin.activo !== false ? 'Inhabilitar' : 'Habilitar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Crear Administrador */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Crear Nuevo Administrador"
        description="Registra un usuario administrador para gestionar una organización en Zenda."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
              <Input
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Carlos"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido</label>
              <Input
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                placeholder="Ej. Gómez"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico *
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@empresa.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña Inicial *
              </label>
              <Input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organización Asignada
            </label>
            <select
              value={formData.organizacionId}
              onChange={(e) => setFormData({ ...formData, organizacionId: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona una organización</option>
              {organizaciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} ({o.nit || 'Sin NIT'})
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Límites y Permisos Sugeridos
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Dinero Máx Caja</label>
                <Input
                  type="number"
                  value={formData.dineroMaxCaja}
                  onChange={(e) => setFormData({ ...formData, dineroMaxCaja: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Dinero Máx Venta</label>
                <Input
                  type="number"
                  value={formData.dineroMaxVenta}
                  onChange={(e) => setFormData({ ...formData, dineroMaxVenta: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Administrador
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Permisos y Límites */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Permisos y Límites"
        description={`Configuración de operación para ${editingAdmin?.nombre} ${editingAdmin?.apellido || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
              <Input
                value={editFormData.nombre || ''}
                onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido</label>
              <Input
                value={editFormData.apellido || ''}
                onChange={(e) => setEditFormData({ ...editFormData, apellido: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Caja</label>
              <Input
                type="number"
                value={editFormData.dinero_max_caja || 0}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, dinero_max_caja: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Venta</label>
              <Input
                type="number"
                value={editFormData.dinero_max_venta || 0}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, dinero_max_venta: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Gasto</label>
              <Input
                type="number"
                value={editFormData.dinero_max_gasto || 0}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, dinero_max_gasto: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Permitir Anular Ventas</p>
                <p className="text-[11px] text-slate-500">
                  Habilita la reversión de créditos que no tengan abonos registrados.
                </p>
              </div>
              <Switch
                checked={!!editFormData.permite_borrar_venta}
                onChange={(val) =>
                  setEditFormData({ ...editFormData, permite_borrar_venta: val })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Permitir Modificar Pagos</p>
                <p className="text-[11px] text-slate-500">
                  Permite editar abonos y convertir pagos a no-pagos en cajas abiertas.
                </p>
              </div>
              <Switch
                checked={!!editFormData.permite_modificar_pagos}
                onChange={(val) =>
                  setEditFormData({ ...editFormData, permite_modificar_pagos: val })
                }
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar Permisos
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

