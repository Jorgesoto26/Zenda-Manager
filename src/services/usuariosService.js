import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

export async function getUsuarios({
  organizacionId = null,
  rol = 'todos',
  estado = 'todos',
  search = '',
  limit = 50,
} = {}) {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      organizacion:organizaciones(id, nombre, nit, estado),
      superior:profiles!profiles_superior_id_fkey(id, nombre, apellido, rol)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (organizacionId) {
    query = query.eq('organizacion_id', organizacionId);
  }
  if (rol && rol !== 'todos') {
    query = query.eq('rol', rol);
  }
  if (estado === 'activos') {
    query = query.eq('activo', true);
  } else if (estado === 'inactivos') {
    query = query.eq('activo', false);
  }
  if (search.trim()) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    // Fallback simple
    let simpleQuery = supabase
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true })
      .limit(limit);
    if (organizacionId) simpleQuery = simpleQuery.eq('organizacion_id', organizacionId);
    if (rol && rol !== 'todos') simpleQuery = simpleQuery.eq('rol', rol);
    if (estado === 'activos') simpleQuery = simpleQuery.eq('activo', true);
    if (estado === 'inactivos') simpleQuery = simpleQuery.eq('activo', false);

    const { data: sData, error: sErr } = await simpleQuery;
    if (sErr) throw sErr;
    return sData || [];
  }

  return data || [];
}

export async function updateUsuarioPermisos(id, permisos) {
  const { data: previa } = await supabase.from('profiles').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...permisos,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'usuarios',
    accion: 'modificar_permisos',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo: 'Modificación de límites y permisos operativos desde Soporte Central',
  });

  return data;
}

export async function toggleUsuarioActivo(id, nuevoEstado) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'usuarios',
    accion: nuevoEstado ? 'habilitar' : 'inhabilitar',
    registroId: id,
    datosPosteriores: { activo: nuevoEstado },
    motivo: nuevoEstado ? 'Reactivación de usuario' : 'Inhabilitación de cuenta por soporte',
  });

  return data;
}

