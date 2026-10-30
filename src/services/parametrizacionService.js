import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

export async function getConceptos({ organizacionId = null, tipo = 'todos' } = {}) {
  let query = supabase
    .from('concepts')
    .select(`
      *,
      organizacion:organizaciones(id, nombre)
    `)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (organizacionId) {
    // Si se especifica una organización, traer los globales (null) Y los de esa organización
    query = query.or(`organizacion_id.is.null,organizacion_id.eq.${organizacionId}`);
  }

  if (tipo && tipo !== 'todos') {
    query = query.eq('tipo', tipo);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback simple
    let simpleQuery = supabase.from('concepts').select('*');
    if (tipo && tipo !== 'todos') simpleQuery = simpleQuery.eq('tipo', tipo);
    const { data: sData, error: sErr } = await simpleQuery;
    if (sErr) throw sErr;
    return sData || [];
  }

  return data || [];
}

export async function createConcepto({
  tipo,
  nombre,
  valor,
  tipoMovimiento,
  orden = 0,
  organizacionId = null,
}) {
  const payload = {
    tipo,
    nombre: nombre.trim(),
    valor: valor ? valor.trim() : nombre.trim(),
    tipo_movimiento: tipoMovimiento || tipo,
    orden: parseInt(orden, 10) || 0,
    activo: true,
    organizacion_id: organizacionId || null,
  };

  const { data, error } = await supabase.from('concepts').insert([payload]).select().single();
  if (error) throw error;

  await logAuditAction({
    organizacionId,
    modulo: 'parametrizacion',
    accion: 'crear_concepto',
    registroId: data.id,
    datosPosteriores: data,
    motivo: `Creación de parámetro (${tipo}: ${nombre})`,
  });

  return data;
}

export async function updateConcepto(id, updates) {
  const { data: previa } = await supabase.from('concepts').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('concepts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'parametrizacion',
    accion: 'modificar_concepto',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo: 'Modificación de parámetro de catálogo',
  });

  return data;
}

export async function toggleConceptoActivo(id, nuevoEstado) {
  const { data, error } = await supabase
    .from('concepts')
    .update({ activo: nuevoEstado })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'parametrizacion',
    accion: nuevoEstado ? 'activar_concepto' : 'desactivar_concepto',
    registroId: id,
    datosPosteriores: { activo: nuevoEstado },
    motivo: nuevoEstado ? 'Activación de concepto' : 'Desactivación segura de concepto para prevenir uso en nuevas ventas/cajas',
  });

  return data;
}

