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
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import {
  getUsuarios,
  toggleUsuarioActivo,
  updateUsuario,
  updateUsuarioPassword,
} from '@/services/usuariosService';
import { useSupport } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function Usuarios() {
  const { selectedOrgId } = useSupport();
  const { isSuperAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');

  // Modal: Editar Usuario Integral
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    apellido: '',
    rol: 'vendedor',
    superior_id: '',
    modo_apertura_caja: 'admin_masivo',
    dinero_max_caja: 0,
    dinero_max_venta: 0,
    dinero_max_gasto: 0,
    max_cuotas: 30,
    permite_borrar_venta: false,
    permite_modificar_pagos: false,
    motivo: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: Gestión de Contraseña
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  // Abrir Modal de Edición Completo
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      rol: user.rol || 'vendedor',
      superior_id: user.superior_id || '',
      modo_apertura_caja: user.modo_apertura_caja || 'admin_masivo',
      dinero_max_caja: user.dinero_max_caja || 0,
      dinero_max_venta: user.dinero_max_venta || 0,
      dinero_max_gasto: user.dinero_max_gasto || 0,
      max_cuotas: user.max_cuotas || 30,
      permite_borrar_venta: !!user.permite_borrar_venta,
      permite_modificar_pagos: !!user.permite_modificar_pagos,
      motivo: '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSavingEdit(true);
    try {
      await updateUsuario(editingUser.id, {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        rol: editForm.rol,
        superior_id: editForm.superior_id || null,
        modo_apertura_caja: editForm.modo_apertura_caja,
        dinero_max_caja: Number(editForm.dinero_max_caja) || 0,
        dinero_max_venta: Number(editForm.dinero_max_venta) || 0,
        dinero_max_gasto: Number(editForm.dinero_max_gasto) || 0,
        max_cuotas: Number(editForm.max_cuotas) || 30,
        permite_borrar_venta: Boolean(editForm.permite_borrar_venta),
        permite_modificar_pagos: Boolean(editForm.permite_modificar_pagos),
        motivo: editForm.motivo.trim() || 'Modificación de perfil y permisos desde Zenda Manager',
      });
      toast.success('Usuario actualizado con éxito');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar usuario', { description: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  // Abrir Modal de Contraseña
  const handleOpenPasswordModal = (user) => {
    setPasswordUser(user);
    setNewPassword('');
    setShowPassword(false);
    setCopiedPassword(false);
    setPasswordModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let res = 'Zenda*';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
    setShowPassword(true);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    toast.success('Contraseña copiada al portapapeles');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      await updateUsuarioPassword({
        userId: passwordUser.id,
        newPassword,
        motivo: `Restablecimiento de contraseña para ${passwordUser.nombre} ${passwordUser.apellido || ''}`.trim(),
      });
      toast.success('Contraseña actualizada con éxito');
      setPasswordModalOpen(false);
    } catch (err) {
      toast.error('Error al cambiar contraseña', { description: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  // Lista de posibles superiores en la misma organización para el dropdown
  const posiblesSuperiores = usuarios.filter(
    (u) =>
      u.id !== editingUser?.id &&
      (u.rol === 'admin' || u.rol === 'supervisor') &&
      (!editingUser?.organizacion_id || u.organizacion_id === editingUser?.organizacion_id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Directorio de Usuarios</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta de perfiles, edición de información, límites operativos y restablecimiento seguro de contraseñas
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o apellido..."
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
              <option value="supervisor">Supervisores</option>
              <option value="cobrador">Cobradores</option>
              <option value="cliente">Clientes</option>
            </select>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inhabilitados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Usuarios */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Cargando usuarios...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">No se encontraron usuarios</p>
              <p className="text-xs text-slate-400 mt-1">
                Ajusta los filtros o comprueba la organización seleccionada
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Rol</th>
                  <th className="px-6 py-3.5">Organización</th>
                  <th className="px-6 py-3.5">Líder / Superior</th>
                  <th className="px-6 py-3.5">Límites Clave</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const isActivo = u.activo !== false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                            {u.nombre?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {u.nombre} {u.apellido || ''}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {u.id.substring(0, 8)}...
                            </div>
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
                              : u.rol === 'supervisor'
                              ? 'warning'
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

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Editar Usuario */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-white text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(u)}
                            title="Editar información y permisos del usuario"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            <span>Editar</span>
                          </Button>

                          {/* Botón Gestionar Contraseña */}
                          {isSuperAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-white text-slate-700 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => handleOpenPasswordModal(u)}
                              title="Restablecer o asignar nueva contraseña"
                            >
                              <Key className="h-3.5 w-3.5 mr-1 text-amber-500" />
                              <span>Clave</span>
                            </Button>
                          )}

                          {/* Botón Inhabilitar/Habilitar */}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Editar Usuario Completo */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Usuario"
        description={`Modifica datos personales, rol operativo y límites para ${editingUser?.nombre} ${editingUser?.apellido || ''}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
              <Input
                required
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido</label>
              <Input
                value={editForm.apellido}
                onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })}
                placeholder="Apellido"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rol Operativo</label>
              <select
                value={editForm.rol}
                onChange={(e) => setEditForm({ ...editForm, rol: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vendedor">Vendedor</option>
                <option value="supervisor">Supervisor</option>
                <option value="cobrador">Cobrador</option>
                <option value="admin">Administrador</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Superior Jerárquico</label>
              <select
                value={editForm.superior_id}
                onChange={(e) => setEditForm({ ...editForm, superior_id: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin superior (Raíz)</option>
                {posiblesSuperiores.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.nombre} {sup.apellido || ''} ({sup.rol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Modo de Apertura de Caja
            </label>
            <select
              value={editForm.modo_apertura_caja}
              onChange={(e) => setEditForm({ ...editForm, modo_apertura_caja: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin_masivo">Apertura Masiva por Administrador</option>
              <option value="vendedor_dia">Auto-apertura Diaria por Vendedor</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Límites Financieros
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Dinero Máx en Caja</label>
                <Input
                  type="number"
                  value={editForm.dinero_max_caja}
                  onChange={(e) => setEditForm({ ...editForm, dinero_max_caja: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Dinero Máx Venta/Préstamo</label>
                <Input
                  type="number"
                  value={editForm.dinero_max_venta}
                  onChange={(e) => setEditForm({ ...editForm, dinero_max_venta: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Dinero Máx Gasto</label>
                <Input
                  type="number"
                  value={editForm.dinero_max_gasto}
                  onChange={(e) => setEditForm({ ...editForm, dinero_max_gasto: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Máx Cuotas Permitidas</label>
                <Input
                  type="number"
                  value={editForm.max_cuotas}
                  onChange={(e) => setEditForm({ ...editForm, max_cuotas: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Permisos Operativos Especiales
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Permite Borrar Ventas</span>
                  <span className="text-[11px] text-slate-500">Autorización para anular facturas registradas</span>
                </div>
                <Switch
                  checked={editForm.permite_borrar_venta}
                  onCheckedChange={(val) => setEditForm({ ...editForm, permite_borrar_venta: val })}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Permite Modificar Pagos</span>
                  <span className="text-[11px] text-slate-500">Autorización para rectificar abonos y comprobantes</span>
                </div>
                <Switch
                  checked={editForm.permite_modificar_pagos}
                  onCheckedChange={(val) => setEditForm({ ...editForm, permite_modificar_pagos: val })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo del Cambio (Auditoría)
            </label>
            <Input
              value={editForm.motivo}
              onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
              placeholder="Ej: Ajuste de límites por ascenso o nueva política"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={savingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Gestión de Contraseña y Recuperación Segura */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Gestionar Contraseña de Usuario"
        description={`Restablece o genera una nueva credencial para ${passwordUser?.nombre} ${passwordUser?.apellido || ''}`}
      >
        <form onSubmit={handleSavePassword} className="space-y-4">
          {/* Banner explicativo de seguridad criptográfica */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 text-xs">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">¿Por qué no es posible "ver" la contraseña anterior?</p>
              <p className="text-amber-800 leading-relaxed">
                Por estrictas directrices de seguridad de <strong>Supabase Auth (GoTrue)</strong> y el estándar de la industria, las contraseñas se almacenan mediante <strong>hashes criptográficos irreversibles (bcrypt)</strong>. Nadie (ni la base de datos ni los administradores) puede desencriptar la contraseña existente.
              </p>
              <p className="text-amber-800 font-medium mt-1.5">
                Para solucionar de inmediato el olvido del usuario, genera o ingresa una contraseña temporal a continuación y cópiala con un clic para enviársela.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Contraseña para el Usuario *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-20 font-mono text-sm"
              />
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Copiar contraseña"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateRandomPassword}
              className="text-xs gap-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Generar contraseña temporal segura</span>
            </Button>
            {newPassword && (
              <span className="text-[11px] text-emerald-600 font-medium">
                {copiedPassword ? '¡Copiada!' : 'Lista para copiar'}
              </span>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={savingPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
            >
              Establecer Nueva Contraseña
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
