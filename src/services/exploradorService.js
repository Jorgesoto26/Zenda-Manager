import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

/**
 * Metadatos y configuración de entidades administrables
 */
export const ENTIDADES_CONFIG = {
  cajas: {
    label: 'Cajas',
    table: 'cajas',
    icon: 'Box',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['id', 'estado'],
    editableColumns: [
      { name: 'estado', label: 'Estado', type: 'select', options: ['abierta', 'cerrada', 'bloqueada'] },
      { name: 'saldo_inicial', label: 'Saldo Inicial', type: 'number' },
      { name: 'saldo_final', label: 'Saldo Final', type: 'number' },
      { name: 'total_cobrado', label: 'Total Cobrado', type: 'number' },
      { name: 'total_prestado', label: 'Total Prestado', type: 'number' },
      { name: 'total_gastos', label: 'Total Gastos', type: 'number' },
    ],
  },
  cash_movements: {
    label: 'Movimientos de Caja',
    table: 'cash_movements',
    icon: 'ArrowLeftRight',
    primaryKey: 'id',
    orgColumn: null, // Derivado de caja o perfil
    searchColumns: ['id', 'tipo', 'concepto', 'descripcion'],
    editableColumns: [
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['ingreso', 'gasto', 'cobro', 'prestamo', 'apertura', 'cierre', 'ajuste'] },
      { name: 'monto', label: 'Monto', type: 'number' },
      { name: 'concepto', label: 'Concepto', type: 'text' },
      { name: 'descripcion', label: 'Descripción / Comentario', type: 'text' },
    ],
  },
  clients: {
    label: 'Clientes',
    table: 'clients',
    icon: 'Contact',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['nombre', 'documento', 'telefono', 'direccion'],
    editableColumns: [
      { name: 'nombre', label: 'Nombre Completo', type: 'text' },
      { name: 'documento', label: 'Documento / Cédula', type: 'text' },
      { name: 'telefono', label: 'Teléfono', type: 'text' },
      { name: 'direccion', label: 'Dirección', type: 'text' },
      { name: 'alias', label: 'Alias / Negocio', type: 'text' },
      { name: 'latitud', label: 'Latitud', type: 'number' },
      { name: 'longitud', label: 'Longitud', type: 'number' },
    ],
  },
  invoice: {
    label: 'Facturas / Créditos',
    table: 'invoice',
    icon: 'FileText',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['id', 'status'],
    editableColumns: [
      { name: 'status', label: 'Estado', type: 'select', options: ['pendiente', 'pagado', 'vencido', 'anulado'] },
      { name: 'monto', label: 'Monto Prestado', type: 'number' },
      { name: 'saldo', label: 'Saldo Pendiente', type: 'number' },
      { name: 'total', label: 'Total a Pagar', type: 'number' },
      { name: 'cuotas', label: 'Número de Cuotas', type: 'number' },
    ],
  },
  cuotas: {
    label: 'Cuotas',
    table: 'cuotas',
    icon: 'Calendar',
    primaryKey: 'id',
    orgColumn: null,
    searchColumns: ['id', 'status'],
    editableColumns: [
      { name: 'numero_cuota', label: 'Nº Cuota', type: 'number' },
      { name: 'valor', label: 'Valor de Cuota', type: 'number' },
      { name: 'saldo_cuota', label: 'Saldo Pendiente', type: 'number' },
      { name: 'status', label: 'Estado', type: 'select', options: ['pendiente', 'pagado', 'vencido'] },
      { name: 'fecha_vencimiento', label: 'Fecha Vencimiento', type: 'text' },
    ],
  },
  payments: {
    label: 'Pagos / Abonos',
    table: 'payments',
    icon: 'CreditCard',
    primaryKey: 'id',
    orgColumn: null,
    searchColumns: ['id', 'metodo_pago'],
    editableColumns: [
      { name: 'monto', label: 'Monto Abonado', type: 'number' },
      { name: 'metodo_pago', label: 'Método de Pago', type: 'text' },
      { name: 'nota', label: 'Nota / Comentario', type: 'text' },
    ],
  },
  profiles: {
    label: 'Perfiles',
    table: 'profiles',
    icon: 'Users',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['nombre', 'apellido', 'rol'],
    editableColumns: [
      { name: 'nombre', label: 'Nombre', type: 'text' },
      { name: 'apellido', label: 'Apellido', type: 'text' },
      { name: 'rol', label: 'Rol', type: 'select', options: ['admin', 'vendedor', 'supervisor', 'cobrador', 'cliente'] },
      { name: 'activo', label: 'Activo', type: 'boolean' },
      { name: 'dinero_max_caja', label: 'Dinero Máx Caja', type: 'number' },
      { name: 'dinero_max_venta', label: 'Dinero Máx Venta', type: 'number' },
      { name: 'dinero_max_gasto', label: 'Dinero Máx Gasto', type: 'number' },
      { name: 'max_cuotas', label: 'Máx Cuotas', type: 'number' },
      { name: 'permite_borrar_venta', label: 'Permite Borrar Venta', type: 'boolean' },
      { name: 'permite_modificar_pagos', label: 'Permite Modificar Pagos', type: 'boolean' },
    ],
  },
  multimedia_evidencias: {
    label: 'Evidencias (Storage)',
    table: 'multimedia_evidencias',
    icon: 'Image',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['file_path', 'tipo_evidencia', 'tabla_relacionada', 'registro_id'],
    editableColumns: [
      { name: 'tipo_evidencia', label: 'Tipo de Evidencia', type: 'select', options: ['documento_identidad', 'gasto', 'comprobante_pago', 'organizacion'] },
      { name: 'estado_sync', label: 'Estado Sync', type: 'select', options: ['sincronizado', 'pendiente', 'error'] },
    ],
  },
  concepts: {
    label: 'Conceptos de Caja',
    table: 'concepts',
    icon: 'Tag',
    primaryKey: 'id',
    orgColumn: 'organizacion_id',
    searchColumns: ['nombre', 'tipo'],
    editableColumns: [
      { name: 'nombre', label: 'Nombre Concepto', type: 'text' },
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['ingreso', 'gasto'] },
      { name: 'activo', label: 'Activo', type: 'boolean' },
    ],
  },
};

/**
 * Consulta registros de una tabla con filtros, búsqueda y paginación
 */
export async function getTablaRegistros({
  entityKey,
  organizacionId = null,
  search = '',
  limit = 50,
  page = 1,
}) {
  const config = ENTIDADES_CONFIG[entityKey];
  if (!config) throw new Error(`Entidad desconocida: ${entityKey}`);

  let query = supabase.from(config.table).select('*', { count: 'exact' });

  // Filtro por organización si la tabla tiene columna organizacion_id
  if (organizacionId && config.orgColumn) {
    query = query.eq(config.orgColumn, organizacionId);
  }

  // Búsqueda por texto en columnas configuradas
  if (search.trim() && config.searchColumns?.length > 0) {
    const filterClauses = config.searchColumns
      .map((col) => `${col}.ilike.%${search.trim()}%`)
      .join(',');
    query = query.or(filterClauses);
  }

  // Paginación y ordenamiento
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Intentar ordenar por created_at si existe, o por la primaryKey
  try {
    query = query.order('created_at', { ascending: false });
  } catch {
    query = query.order(config.primaryKey, { ascending: false });
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    // Si falla por ordenamiento created_at, intentar sin orden explícito
    const retry = await supabase
      .from(config.table)
      .select('*', { count: 'exact' })
      .range(from, to);
    if (retry.error) throw retry.error;
    return { registros: retry.data || [], total: retry.count || 0 };
  }

  return { registros: data || [], total: count || 0 };
}

/**
 * Actualiza un registro de cualquier tabla con auditoría
 */
export async function updateTablaRegistro({
  entityKey,
  id,
  cambios,
  motivo = 'Modificación de registro desde Explorador de Datos de Zenda Manager',
}) {
  const config = ENTIDADES_CONFIG[entityKey];
  if (!config) throw new Error(`Entidad desconocida: ${entityKey}`);

  // 1. Obtener estado previo para auditoría
  const { data: previa } = await supabase
    .from(config.table)
    .select('*')
    .eq(config.primaryKey, id)
    .maybeSingle();

  // 2. Ejecutar actualización
  const { data, error } = await supabase
    .from(config.table)
    .update(cambios)
    .eq(config.primaryKey, id)
    .select()
    .single();

  if (error) throw error;

  // 3. Registrar auditoría
  await logAuditAction({
    organizacionId: data.organizacion_id || previa?.organizacion_id || null,
    modulo: `explorador_${entityKey}`,
    accion: 'modificar_registro',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo,
  });

  return data;
}

/**
 * Genera una URL firmada de Supabase Storage para previsualizar evidencias
 */
export async function getEvidenciaSignedUrl(filePath, bucket = 'Evidencias') {
  if (!filePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hora de validez
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('No se pudo generar URL firmada de Storage:', err.message);
    return null;
  }
}

