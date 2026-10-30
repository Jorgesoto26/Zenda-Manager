import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Building2,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  Edit2,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { getUsuarios, toggleUsuarioActivo, updateUsuarioPermisos } from '@/services/usuariosService';
import { useSupport } from '@/context/SupportContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function Usuarios() {
  const { selectedOrgId } = useSupport();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');

  // Edit Permissions Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [permisosForm, setPermisosForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsuarios({
        organizacionId: selectedOrgId,
        rol: rolFilter,
        estado: estadoFilter,
        search,
      });
      setUsuarios(data);
    } catch (err) {
      toast.error('Error cargando usuarios', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, rolFilter, estadoFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleToggleActivo = async (user) => {
    const nuevo = user.activo === false;
    try {
      await toggleUsuarioActivo(user.id, nuevo);
      toast.success(`Usuario ${nuevo ? 'habilitado' : 'inhabilitado'} con éxito`);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar estado', { description: err.message });
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setPermisosForm({
      dinero_max_caja: user.dinero_max_caja || 0,
      dinero_max_venta: user.dinero_max_venta || 0,
      dinero_max_gasto: user.dinero_max_gasto || 0,
      max_cuotas: user.max_cuotas || 30,
      permite_borrar_venta: !!user.permite_borrar_venta,
      permite_modificar_pagos: !!user.permite_modificar_pagos,
    });
    setEditModalOpen(true);
  };

  const handleSavePermisos = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUsuarioPermisos(editingUser.id, permisosForm);
      toast.success('Permisos actualizados');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar permisos', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio de Usuarios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta global de perfiles, relaciones jerárquicas y permisos de operación en Zenda
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, apellido, correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="vendedor">Vendedores</option>
              <option value="cliente">Clientes</option>
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Habilitados</option>
              <option value="inactivos">Inhabilitados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Cargando directorio...</div>
          ) : usuarios.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No se encontraron usuarios para los criterios seleccionados.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Rol</th>
                  <th className="px-6 py-3.5">Organización</th>
                  <th className="px-6 py-3.5">Superior Directo</th>
                  <th className="px-6 py-3.5">Límites / Permisos</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const isActivo = u.activo !== false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              u.rol === 'admin'
                                ? 'bg-indigo-100 text-indigo-700'
                                : u.rol === 'vendedor'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.nombre?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {u.nombre} {u.apellido || ''}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            u.rol === 'admin'
                              ? 'default'
                              : u.rol === 'vendedor'
                              ? 'success'
                              : 'secondary'
                          }
                          className="capitalize text-xs font-semibold"
                        >
                          {u.rol}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        {u.organizacion?.nombre || (
                          <span className="text-slate-400 italic">Global / Sin Org</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        {u.superior ? (
                          <span>
                            {u.superior.nombre} ({u.superior.rol})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Raíz (Sin superior)</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        {u.rol === 'cliente' ? (
                          <span className="text-slate-400 italic">N/A (Cliente)</span>
                        ) : (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-slate-400">Máx Venta:</span>{' '}
                              <strong>{formatCurrency(u.dinero_max_venta)}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Cuotas:</span>{' '}
                              <strong>{u.max_cuotas || 30}</strong>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={isActivo ? 'success' : 'destructive'}
                          className="text-xs"
                        >
                          {isActivo ? 'Habilitado' : 'Inhabilitado'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {u.rol !== 'cliente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-white"
                            onClick={() => handleEditClick(u)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            <span>Límites</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 text-xs ${
                            isActivo
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          onClick={() => handleToggleActivo(u)}
                        >
                          {isActivo ? 'Inhabilitar' : 'Habilitar'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Ajustar Límites y Permisos */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Límites de Operación y Permisos"
        description={`Ajustes de control para ${editingUser?.nombre} (${editingUser?.rol})`}
      >
        <form onSubmit={handleSavePermisos} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Caja</label>
              <Input
                type="number"
                value={permisosForm.dinero_max_caja || 0}
                onChange={(e) =>
                  setPermisosForm({
                    ...permisosForm,
                    dinero_max_caja: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Venta</label>
              <Input
                type="number"
                value={permisosForm.dinero_max_venta || 0}
                onChange={(e) =>
                  setPermisosForm({
                    ...permisosForm,
                    dinero_max_venta: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Máx Gasto</label>
              <Input
                type="number"
                value={permisosForm.dinero_max_gasto || 0}
                onChange={(e) =>
                  setPermisosForm({
                    ...permisosForm,
                    dinero_max_gasto: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Máximo de Cuotas Permitidas
            </label>
            <Input
              type="number"
              value={permisosForm.max_cuotas || 30}
              onChange={(e) =>
                setPermisosForm({
                  ...permisosForm,
                  max_cuotas: parseInt(e.target.value, 10) || 30,
                })
              }
            />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Permitir Anular Ventas</p>
                <p className="text-[11px] text-slate-500">
                  Permite anular ventas en la app móvil si no tienen abonos.
                </p>
              </div>
              <Switch
                checked={!!permisosForm.permite_borrar_venta}
                onChange={(val) =>
                  setPermisosForm({ ...permisosForm, permite_borrar_venta: val })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Permitir Modificar Pagos</p>
                <p className="text-[11px] text-slate-500">
                  Permite ajustar valor de pagos en turnos abiertos.
                </p>
              </div>
              <Switch
                checked={!!permisosForm.permite_modificar_pagos}
                onChange={(val) =>
                  setPermisosForm({ ...permisosForm, permite_modificar_pagos: val })
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

