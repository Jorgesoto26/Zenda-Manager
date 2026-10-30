import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

export async function getOrganizaciones() {
  const { data, error } = await supabase
    .from('organizaciones')
    .select(`
      *,
      admin:profiles!organizaciones_admin_id_fkey(
        id,
        nombre,
        apellido,
        email,
        telefono,
        activo
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    // Si la relación foránea explícita falla, hacer consulta simple
    const { data: simpleData, error: simpleError } = await supabase
      .from('organizaciones')
      .select('*')
      .order('created_at', { ascending: false });
    if (simpleError) throw simpleError;
    return simpleData || [];
  }

  return data || [];
}

export async function getOrganizacionById(id) {
  const { data, error } = await supabase
    .from('organizaciones')
    .select(`
      *,
      admin:profiles!organizaciones_admin_id_fkey(
        id,
        nombre,
        apellido,
        email,
        telefono,
        activo
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    const { data: simpleData, error: simpleError } = await supabase
      .from('organizaciones')
      .select('*')
      .eq('id', id)
      .single();
    if (simpleError) throw simpleError;
    return simpleData;
  }

  return data;
}

export async function createOrganizacion({
  nombre,
  nit,
  telefono,
  direccion,
  adminId,
  modoApertura = 'admin_masivo',
  emailContacto,
}) {
  const payload = {
    nombre,
    nit: nit || null,
    telefono: telefono || null,
    direccion: direccion || null,
    admin_id: adminId || null,
    modo_apertura_caja: modoApertura,
    email_contacto: emailContacto || null,
    estado: 'activa',
  };

  const { data, error } = await supabase
    .from('organizaciones')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  // Si se asignó un administrador, asociar su perfil con la organización
  if (adminId && data?.id) {
    await supabase
      .from('profiles')
      .update({ organizacion_id: data.id, modo_apertura_caja: modoApertura })
      .eq('id', adminId);
  }

  // Registrar auditoría
  await logAuditAction({
    organizacionId: data.id,
    modulo: 'organizaciones',
    accion: 'crear',
    registroId: data.id,
    datosPosteriores: data,
    motivo: 'Creación de nueva organización desde Zenda Manager',
  });

  return data;
}

export async function updateOrganizacion(id, updates) {
  const { data: previa } = await supabase.from('organizaciones').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('organizaciones')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Registrar auditoría
  await logAuditAction({
    organizacionId: id,
    modulo: 'organizaciones',
    accion: 'modificar',
    registroId: id,
    datosPrevios: previa,
    datosPosteriores: data,
    motivo: 'Actualización de datos generales de la organización',
  });

  return data;
}

export async function toggleOrganizacionEstado(id, nuevoEstado, motivo = '') {
  // 1. Intentar primero con RPC transaccional segura
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('manager_toggle_org_status', {
      p_organizacion_id: id,
      p_nuevo_estado: nuevoEstado,
      p_motivo: motivo,
    });
    if (!rpcError && rpcData) {
      return rpcData;
    }
  } catch {}

  // 2. Fallback directo con registro estricto de auditoría
  const { data: previa } = await supabase.from('organizaciones').select('*').eq('id', id).single();

  const payload = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  };

  if (nuevoEstado === 'suspendida') {
    payload.fecha_suspension = new Date().toISOString();
    payload.motivo_suspension = motivo;
  } else if (nuevoEstado === 'activa') {
    payload.fecha_suspension = null;
    payload.motivo_suspension = null;
  }

  const { data, error } = await supabase
    .from('organizaciones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Registrar auditoría obligatoria
  await logAuditAction({
    organizacionId: id,
    modulo: 'organizaciones',
    accion: nuevoEstado === 'suspendida' ? 'suspender' : 'activar',
    registroId: id,
    datosPrevios: { estado: previa?.estado, fecha_suspension: previa?.fecha_suspension },
    datosPosteriores: { estado: data.estado, fecha_suspension: data.fecha_suspension },
    motivo: motivo || `Cambio de estado a ${nuevoEstado}`,
    strict: true,
  });

  return data;
}

