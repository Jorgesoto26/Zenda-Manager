import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Plus,
  Percent,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  Globe,
  Building2,
  CheckCircle2,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  getConceptos,
  createConcepto,
  updateConcepto,
  toggleConceptoActivo,
} from '@/services/parametrizacionService';
import { useSupport } from '@/context/SupportContext';
import { toast } from 'sonner';

const TABS = [
  { id: 'todos', label: 'Todos los Conceptos', icon: Sliders },
  { id: 'gasto', label: 'Conceptos de Gasto', icon: ArrowDownCircle },
  { id: 'ingreso', label: 'Conceptos de Ingreso', icon: ArrowUpCircle },
  { id: 'plazo', label: 'Plazos / Cuotas', icon: Calendar },
  { id: 'interes', label: 'Tasas de Interés', icon: Percent },
];

export default function Parametrizacion() {
  const { selectedOrgId, selectedOrg } = useSupport();
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');

  // Modal Crear/Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'gasto',
    nombre: '',
    valor: '',
    orden: 0,
    esGlobal: true,
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConceptos({
        organizacionId: selectedOrgId,
        tipo: activeTab,
      });
      setConceptos(data);
    } catch (err) {
      toast.error('Error cargando catálogo de conceptos', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingConcepto(null);
    setFormData({
      tipo: activeTab !== 'todos' ? activeTab : 'gasto',
      nombre: '',
      valor: '',
      orden: 0,
      esGlobal: !selectedOrgId,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (concepto) => {
    setEditingConcepto(concepto);
    setFormData({
      tipo: concepto.tipo,
      nombre: concepto.nombre || concepto.valor || '',
      valor: concepto.valor || '',
      orden: concepto.orden || 0,
      esGlobal: !concepto.organizacion_id,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error('El nombre del parámetro es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const orgIdToAssign = formData.esGlobal ? null : selectedOrgId;

      if (editingConcepto) {
        await updateConcepto(editingConcepto.id, {
          nombre: formData.nombre.trim(),
          valor: formData.valor ? formData.valor.trim() : formData.nombre.trim(),
          orden: parseInt(formData.orden, 10) || 0,
          organizacion_id: orgIdToAssign,
        });
        toast.success('Parámetro actualizado correctamente');
      } else {
        await createConcepto({
          tipo: formData.tipo,
          nombre: formData.nombre.trim(),
          valor: formData.valor ? formData.valor.trim() : formData.nombre.trim(),
          orden: parseInt(formData.orden, 10) || 0,
          organizacionId: orgIdToAssign,
        });
        toast.success('Parámetro creado exitosamente');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al guardar parámetro', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (concepto) => {
    const nuevo = concepto.activo === false;
    try {
      await toggleConceptoActivo(concepto.id, nuevo);
      toast.success(
        `Parámetro ${nuevo ? 'activado' : 'desactivado'} con éxito`
      );
      loadData();
    } catch (err) {
      toast.error('Error al cambiar estado', { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Centro de Parametrización
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración centralizada de conceptos de movimientos, plazos de crédito e intereses
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4" />
          <span>Nuevo Parámetro</span>
        </Button>
      </div>

      {/* Tabs por Tipo de Concepto */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tabla de Conceptos */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Cargando catálogo de parámetros...
            </div>
          ) : conceptos.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No hay parámetros registrados para esta categoría.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Parámetro / Concepto</th>
                  <th className="px-6 py-3.5">Categoría</th>
                  <th className="px-6 py-3.5">Valor Interno</th>
                  <th className="px-6 py-3.5">Ámbito</th>
                  <th className="px-6 py-3.5">Orden</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conceptos.map((c) => {
                  const isGlobal = !c.organizacion_id;
                  const isActivo = c.activo !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {c.nombre || c.valor}
                        </div>
                        <div className="text-xs text-slate-400">ID: {c.id}</div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs capitalize font-medium">
                          {c.tipo}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-slate-600">
                        {c.valor || '—'}
                      </td>

                      <td className="px-6 py-4">
                        {isGlobal ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <Globe className="h-3.5 w-3.5 text-blue-600" />
                            <span>Global (Plataforma)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-amber-600" />
                            <span>{c.organizacion?.nombre || 'Organización'}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">{c.orden || 0}</td>

                      <td className="px-6 py-4">
                        <Badge
                          variant={isActivo ? 'success' : 'secondary'}
                          className="text-xs font-semibold"
                        >
                          {isActivo ? 'Activo' : 'Desactivado'}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs bg-white"
                          onClick={() => handleOpenEdit(c)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          <span>Editar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 text-xs ${
                            isActivo
                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          onClick={() => handleToggle(c)}
                        >
                          {isActivo ? 'Desactivar' : 'Activar'}
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

      {/* Modal: Crear / Editar Parámetro */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingConcepto ? 'Editar Parámetro' : 'Nuevo Parámetro en Catálogo'}
        description="Define conceptos de gastos, plazos comerciales o tasas de interés disponibles en Zenda."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoría del Parámetro *
            </label>
            <select
              value={formData.tipo}
              disabled={!!editingConcepto}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              <option value="gasto">Gasto Operativo</option>
              <option value="ingreso">Ingreso de Caja</option>
              <option value="retiro">Retiro de Caja</option>
              <option value="plazo">Plazo / Frecuencia de Crédito</option>
              <option value="interes">Tasa de Interés</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Visible en la App *
            </label>
            <Input
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Combustible, 24 días, 20% mensual"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Interno / Numérico
              </label>
              <Input
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="Ej. 24, 0.20, Combustible"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Orden de Visualización
              </label>
              <Input
                type="number"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">Parámetro Global</p>
                <p className="text-[11px] text-slate-500">
                  Si está marcado, estará disponible para todas las organizaciones de la plataforma.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.esGlobal}
                onChange={(e) => setFormData({ ...formData, esGlobal: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editingConcepto ? 'Guardar Cambios' : 'Crear Parámetro'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

