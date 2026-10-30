import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

export async function getAdministradores(orgId = null) {
  // 1. Intentar primero con la RPC segura manager_get_administradores (que resuelve email de auth.users)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('manager_get_administradores', {
      p_organizacion_id: orgId || null,
    });
    if (!rpcError && rpcData) {
      // Mapear organización estructurada para compatibilidad con la vista
      return rpcData.map((admin) => ({
        ...admin,
        organizacion: admin.organizacion_id
          ? {
              id: admin.organizacion_id,
              nombre: admin.organizacion_nombre,
              estado: admin.organizacion_estado,
            }
          : null,
      }));
    }
  } catch {}

  // 2. Fallback mediante consulta a profiles si la RPC no ha sido aplicada
  let query = supabase
    .from('profiles')
    .select(`
      *,
      organizacion:organizaciones!profiles_organizacion_id_fkey(id, nombre, estado, nit)
    `)
    .eq('rol', 'admin')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('organizacion_id', orgId);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback simple
    let simpleQuery = supabase
      .from('profiles')
      .select('*')
      .eq('rol', 'admin')
      .order('nombre', { ascending: true });
    if (orgId) simpleQuery = simpleQuery.eq('organizacion_id', orgId);
    const { data: sData, error: sErr } = await simpleQuery;
    if (sErr) throw sErr;
    return sData || [];
  }

  return data || [];
}

export async function createAdministrador({
  email,
  password,
  nombre,
  apellido = '',
  organizacionId,
  telefono = null,
  motivo = 'Creación de nuevo administrador de organización desde Zenda Manager',
}) {
  try {
    // La creación de administradores se realiza EXCLUSIVAMENTE mediante la Supabase Edge Function oficial
    // que interactúa con GoTrue a través de Supabase Auth Admin API.
    // Se ha eliminado todo fallback a inserciones SQL directas en auth.users por seguridad y soporte oficial.
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manager-create-admin', {
      body: {
        email,
        password,
        nombre,
        apellido,
        organizacionId,
        telefono,
        motivo,
      },
    });

    if (edgeError) {
      // Si la Edge Function no está desplegada en el proyecto de Supabase
      if (
        edgeError.status === 404 ||
        edgeError.message?.includes('Failed to send') ||
        edgeError.message?.includes('404') ||
        edgeError.name === 'FunctionsFetchError'
      ) {
        throw new Error(
          'El servicio backend seguro (Edge Function "manager-create-admin") no está desplegado o no está accesible. ' +
          'Por estrictas razones de seguridad y compatibilidad con GoTrue, no se permite la creación directa en base de datos. ' +
          'Despliegue la Edge Function ejecutando: supabase functions deploy manager-create-admin',
          { cause: edgeError }
        );
      }

      // Errores de validación o permisos devueltos por la Edge Function
      const errorMsg = edgeData?.error || edgeError.message || 'Error en el servicio de creación de administradores';
      throw new Error(errorMsg, { cause: edgeError });
    }

    if (!edgeData?.success) {
      throw new Error(edgeData?.error || 'No se pudo completar la creación del administrador');
    }

    return edgeData;
  } catch (err) {
    throw new Error(err.message || 'Error al crear administrador', { cause: err });
  }
}

export async function updateAdministrador(id, updates) {
  const { data: previa } = await supabase.from('profiles').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'administradores',
    accion: 'modificar',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo: 'Actualización de permisos y límites de administrador',
  });

  return data;
}

export async function toggleAdministradorEstado(id, nuevoEstadoActivo) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ activo: nuevoEstadoActivo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAuditAction({
    organizacionId: data.organizacion_id,
    modulo: 'administradores',
    accion: nuevoEstadoActivo ? 'activar' : 'inhabilitar',
    registroId: id,
    datosPosteriores: { activo: nuevoEstadoActivo },
    motivo: nuevoEstadoActivo ? 'Habilitación de acceso' : 'Suspensión de credenciales de acceso',
  });

  return data;
}
