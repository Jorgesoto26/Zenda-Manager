import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  Filter,
  Eye,
  Edit3,
  RefreshCw,
  Box,
  ArrowLeftRight,
  Contact,
  FileText,
  Calendar,
  CreditCard,
  Users,
  Image as ImageIcon,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import {
  ENTIDADES_CONFIG,
  getTablaRegistros,
  updateTablaRegistro,
  getEvidenciaSignedUrl,
} from '@/services/exploradorService';
import { useSupport } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const ENTITY_ICONS = {
  cajas: Box,
  cash_movements: ArrowLeftRight,
  clients: Contact,
  invoice: FileText,
  cuotas: Calendar,
  payments: CreditCard,
  profiles: Users,
  multimedia_evidencias: ImageIcon,
  concepts: Tag,
};

export default function ExploradorDatos() {
  const { selectedOrgId } = useSupport();
  const { isSuperAdmin } = useAuth();

  const [activeEntity, setActiveEntity] = useState('cajas');
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Modal Ver Detalle
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Modal Editar Registro
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editMotivo, setEditMotivo] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Previsualizar Imagen (Storage)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  const currentConfig = ENTIDADES_CONFIG[activeEntity];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { registros: data, total: count } = await getTablaRegistros({
        entityKey: activeEntity,
        organizacionId: selectedOrgId,
        search,
        page,
        limit,
      });
      setRegistros(data);
      setTotal(count);
    } catch (err) {
      toast.error('Error cargando registros de ' + currentConfig.label, {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [activeEntity, selectedOrgId, search, page, currentConfig.label]);

  useEffect(() => {
    setPage(1);
  }, [activeEntity, selectedOrgId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de Ver Detalle
  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalOpen(true);
  };

  // Manejo de Edición
  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    const initialForm = {};
    currentConfig.editableColumns.forEach((col) => {
      initialForm[col.name] = record[col.name] ?? '';
    });
    setEditForm(initialForm);
    setEditMotivo('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSavingEdit(true);

    try {
      // Formatear tipos según configuración
      const cleanPayload = {};
      currentConfig.editableColumns.forEach((col) => {
        if (col.type === 'number') {
          cleanPayload[col.name] = editForm[col.name] !== '' ? Number(editForm[col.name]) : null;
        } else if (col.type === 'boolean') {
          cleanPayload[col.name] = Boolean(editForm[col.name]);
        } else {
          cleanPayload[col.name] = editForm[col.name];
        }
      });

      await updateTablaRegistro({
        entityKey: activeEntity,
        id: selectedRecord[currentConfig.primaryKey],
        cambios: cleanPayload,
        motivo: editMotivo.trim() || 'Modificación manual desde Explorador de Datos',
      });

      toast.success('Registro actualizado exitosamente');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Error al actualizar registro', { description: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  // Manejo de Previsualización de Evidencias en Storage
  const handlePreviewImage = async (record) => {
    setImageLoading(true);
    setImageUrl(null);
    setImageModalOpen(true);
    try {
      const url = await getEvidenciaSignedUrl(record.file_path, record.bucket_id || 'Evidencias');
      if (!url) throw new Error('No se pudo generar el enlace firmado de descarga');
      setImageUrl(url);
    } catch (err) {
      toast.error('Error al cargar imagen', { description: err.message });
      setImageModalOpen(false);
    } finally {
      setImageLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Database className="h-6 w-6 text-blue-600" />
            <span>Explorador de Datos y Registros</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión completa estilo Supabase Studio de cajas, transacciones, clientes, créditos y evidencias
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          loading={loading}
          className="gap-1.5 bg-white shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar</span>
        </Button>
      </div>

      {/* Selector de Entidades (Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.entries(ENTIDADES_CONFIG).map(([key, cfg]) => {
          const Icon = ENTITY_ICONS[key] || Database;
          const isActive = activeEntity === key;
          return (
            <button
              key={key}
              onClick={() => setActiveEntity(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Buscar en ${currentConfig.label} por ${currentConfig.searchColumns.join(', ')}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>

          <div className="text-xs text-slate-500 whitespace-nowrap">
            Mostrando <strong>{registros.length}</strong> de <strong>{total}</strong> registros
          </div>
        </CardContent>
      </Card>

      {/* Tabla Dinámica de Registros */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Cargando datos de {currentConfig.label}...</span>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">No se encontraron registros</p>
              <p className="text-xs text-slate-400 mt-1">
                La tabla no contiene datos para el filtro u organización seleccionada
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">ID / Referencia</th>
                  {currentConfig.editableColumns.slice(0, 4).map((col) => (
                    <th key={col.name} className="px-5 py-3.5">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((row) => (
                  <tr key={row[currentConfig.primaryKey]} className="hover:bg-slate-50/60 transition-colors">
                    {/* ID */}
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                      {String(row[currentConfig.primaryKey]).substring(0, 8)}...
                    </td>

                    {/* Columnas principales configuradas */}
                    {currentConfig.editableColumns.slice(0, 4).map((col) => {
                      const val = row[col.name];
                      return (
                        <td key={col.name} className="px-5 py-3 text-slate-700">
                          {col.type === 'boolean' ? (
                            <Badge variant={val ? 'success' : 'secondary'} className="text-[10px]">
                              {val ? 'Sí' : 'No'}
                            </Badge>
                          ) : col.type === 'number' && (col.name.includes('saldo') || col.name.includes('total') || col.name.includes('monto') || col.name.includes('valor')) ? (
                            <strong className="font-semibold">{formatCurrency(val)}</strong>
                          ) : col.name === 'estado' || col.name === 'status' ? (
                            <Badge
                              variant={
                                val === 'activa' || val === 'abierta' || val === 'pagado' || val === 'sincronizado'
                                  ? 'success'
                                  : val === 'pendiente'
                                  ? 'warning'
                                  : 'destructive'
                              }
                              className="capitalize text-[10px]"
                            >
                              {val || 'N/A'}
                            </Badge>
                          ) : (
                            <span>{val !== null && val !== undefined ? String(val) : '-'}</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Fecha */}
                    <td className="px-5 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {row.created_at ? formatDateTime(row.created_at) : '-'}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botón Imagen si es evidencia */}
                        {activeEntity === 'multimedia_evidencias' && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[11px] bg-white text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                            onClick={() => handlePreviewImage(row)}
                            title="Ver imagen en Supabase Storage"
                          >
                            <ImageIcon className="h-3 w-3 mr-1" />
                            <span>Ver Foto</span>
                          </Button>
                        )}

                        {/* Botón Ver Detalle */}
                        <Button
                          size="xs"
                          variant="outline"
                          className="h-7 text-[11px] bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => handleOpenDetail(row)}
                          title="Ver todos los campos del registro"
                        >
                          <Eye className="h-3 w-3 mr-1 text-slate-400" />
                          <span>Detalle</span>
                        </Button>

                        {/* Botón Editar */}
                        {isSuperAdmin && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-7 text-[11px] bg-white text-blue-600 hover:bg-blue-50"
                            onClick={() => handleOpenEdit(row)}
                            title="Modificar campos de este registro"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            <span>Editar</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1 bg-white"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal 1: Ver Detalle Completo (Key-Value + JSON) */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detalle de Registro - ${currentConfig.label}`}
        description={`ID: ${selectedRecord?.[currentConfig.primaryKey] || ''}`}
      >
        <div className="space-y-4">
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {selectedRecord &&
                Object.entries(selectedRecord).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{k}</span>
                    <span className="text-slate-800 font-medium break-all">
                      {v !== null && v !== undefined ? String(v) : <span className="italic text-slate-400">null</span>}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Editar Registro Dinámico */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modificar Registro - ${currentConfig.label}`}
        description={`ID: ${selectedRecord?.[currentConfig.primaryKey] || ''}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {currentConfig.editableColumns.map((col) => (
              <div key={col.name}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {col.label}
                </label>
                {col.type === 'select' ? (
                  <select
                    value={editForm[col.name]}
                    onChange={(e) => setEditForm({ ...editForm, [col.name]: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {col.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : col.type === 'boolean' ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Habilitar / Activar</span>
                    <Switch
                      checked={Boolean(editForm[col.name])}
                      onCheckedChange={(val) => setEditForm({ ...editForm, [col.name]: val })}
                    />
                  </div>
                ) : (
                  <Input
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={editForm[col.name]}
                    onChange={(e) => setEditForm({ ...editForm, [col.name]: e.target.value })}
                  />
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo del Cambio (Auditoría) *
              </label>
              <Input
                required
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                placeholder="Indica la razón de esta rectificación..."
              />
            </div>
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

      {/* Modal 3: Previsualizador de Imagen de Storage */}
      <Modal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Evidencia Multimedia en Storage"
        description="Archivo alojado de forma segura en el bucket privado de Supabase"
      >
        <div className="space-y-3">
          {imageLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Generando enlace seguro...</span>
            </div>
          ) : imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center min-h-[300px]">
              <img
                src={imageUrl}
                alt="Evidencia"
                className="max-h-[480px] w-auto object-contain"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="text-xs text-slate-600">No se pudo obtener la imagen del archivo</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir en tamaño original</span>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => setImageModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

