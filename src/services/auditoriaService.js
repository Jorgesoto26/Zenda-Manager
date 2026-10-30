import { supabase } from '@/lib/supabase';

export async function logAuditAction({
  organizacionId = null,
  modulo,
  accion,
  registroId = null,
  datosPrevios = null,
  datosPosteriores = null,
  motivo = null,
  strict = false,
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Intentar RPC manager_log_audit
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('manager_log_audit', {
        p_organizacion_id: organizacionId,
        p_modulo: modulo,
        p_accion: accion,
        p_registro_id: registroId ? String(registroId) : null,
        p_datos_previos: datosPrevios ? datosPrevios : null,
        p_datos_posteriores: datosPosteriores ? datosPosteriores : null,
        p_motivo: motivo,
      });
      if (!rpcErr) return rpcRes;
      if (strict && rpcErr) throw rpcErr;
    } catch (rpcCatch) {
      if (strict) throw rpcCatch;
    }

    // 2. Fallback: Inserción directa en auditoria_admin
    const payload = {
      soporte_usuario_id: user?.id || null,
      organizacion_id: organizacionId,
      modulo,
      accion,
      registro_id: registroId ? String(registroId) : null,
      datos_previos: datosPrevios,
      datos_posteriores: datosPosteriores,
      motivo,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('auditoria_admin').insert([payload]);
    if (error && strict) throw error;
    if (!error) return data;
  } catch (err) {
    if (strict) {
      throw new Error(`Fallo crítico de auditoría: no se pudo registrar la acción (${err.message})`, { cause: err });
    }
    console.warn('Aviso: No se pudo registrar auditoría en backend:', err.message);
  }
}

export async function getAuditoriaLogs({ organizacionId = null, modulo = null, limit = 50 }) {
  try {
    let query = supabase
      .from('auditoria_admin')
      .select(`
        *,
        organizacion:organizaciones(id, nombre),
        usuario:soporte_usuarios(id, nombre, email, rol_soporte)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (organizacionId) {
      query = query.eq('organizacion_id', organizacionId);
    }
    if (modulo && modulo !== 'todos') {
      query = query.eq('modulo', modulo);
    }

    const { data, error } = await query;
    if (error) {
      // Fallback a consulta simple si los joins fallan
      let simpleQuery = supabase
        .from('auditoria_admin')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (organizacionId) simpleQuery = simpleQuery.eq('organizacion_id', organizacionId);
      if (modulo && modulo !== 'todos') simpleQuery = simpleQuery.eq('modulo', modulo);

      const { data: simpleData, error: sErr } = await simpleQuery;
      if (sErr) return [];
      return simpleData || [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error fetching auditoria logs:', err);
    return [];
  }
}

