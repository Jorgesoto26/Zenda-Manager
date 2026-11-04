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
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%`
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

export async function updateUsuario(id, updates) {
  const { data: previa } = await supabase.from('profiles').select('*').eq('id', id).single();

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      organizacion:organizaciones(id, nombre, nit, estado),
      superior:profiles!profiles_superior_id_fkey(id, nombre, apellido, rol)
    `)
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'usuarios',
    accion: 'editar_usuario',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo: updates.motivo || 'Modificación integral de usuario desde Zenda Manager',
  });

  return data;
}

export async function updateUsuarioPermisos(id, permisos) {
  return updateUsuario(id, permisos);
}

export async function updateUsuarioPassword({ userId, newPassword, motivo }) {
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manager-update-password', {
      body: {
        userId,
        newPassword,
        motivo: motivo || 'Actualización administrativa de contraseña desde Zenda Manager',
      },
    });

    if (edgeError) {
      let errorMsg = edgeData?.error;
      if (!errorMsg && edgeError.context) {
        try {
          if (typeof edgeError.context.text === 'function') {
            const rawText = await edgeError.context.text();
            try {
              const parsed = JSON.parse(rawText);
              errorMsg = parsed?.error || parsed?.message;
            } catch {
              if (rawText && rawText.length < 500) errorMsg = rawText;
            }
          }
        } catch {}
      }
      if (!errorMsg) {
        errorMsg = edgeError.message || 'Error al actualizar la contraseña del usuario';
      }
      throw new Error(errorMsg, { cause: edgeError });
    }

    if (!edgeData?.success) {
      throw new Error(edgeData?.error || 'No se pudo actualizar la contraseña');
    }

    return edgeData;
  } catch (err) {
    throw new Error(err.message || 'Error al cambiar contraseña del usuario', { cause: err });
  }
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

