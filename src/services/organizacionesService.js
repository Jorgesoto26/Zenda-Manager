import { supabase } from '@/lib/supabase';
import { logAuditAction } from './auditoriaService';

export async function getOrganizaciones() {
  // Intentar consultar con relación foránea directa
  const { data, error } = await supabase
    .from('organizaciones')
    .select(`
      *,
      admin:profiles!organizaciones_admin_id_fkey(
        id,
        nombre,
        apellido,
        activo
      )
    `)
    .order('created_at', { ascending: false });

  // Si la consulta directa funcionó y trajo los admins asociados
  if (!error && data) {
    return data;
  }

  // Fallback robusto: consultar organizaciones y enriquecer con perfiles
  const { data: orgsData, error: orgsError } = await supabase
    .from('organizaciones')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgsError) throw orgsError;

  // Enriquecer organizaciones que tengan admin_id
  const adminIds = [...new Set((orgsData || []).map((o) => o.admin_id).filter(Boolean))];
  if (adminIds.length > 0) {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, activo')
        .in('id', adminIds);
      const adminMap = new Map((admins || []).map((a) => [a.id, a]));
      return (orgsData || []).map((o) => ({
        ...o,
        admin: o.admin_id ? (adminMap.get(o.admin_id) || null) : null,
      }));
    } catch (enrichErr) {
      console.warn('Aviso enriqueciendo administradores:', enrichErr);
    }
  }

  return orgsData || [];
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
        activo
      )
    `)
    .eq('id', id)
    .single();

  if (!error && data) {
    return data;
  }

  const { data: simpleData, error: simpleError } = await supabase
    .from('organizaciones')
    .select('*')
    .eq('id', id)
    .single();
  if (simpleError) throw simpleError;

  if (simpleData?.admin_id) {
    try {
      const { data: adminData } = await supabase
        .from('profiles')
        .select('id, nombre, apellido, activo')
        .eq('id', simpleData.admin_id)
        .maybeSingle();
      if (adminData) {
        simpleData.admin = adminData;
      }
    } catch {}
  }

  return simpleData;
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

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('violates')) {
      throw new Error(
        'Permisos insuficientes (RLS): La base de datos rechazó la creación de la organización. ' +
        'Asegúrate de que: 1) Tu usuario tenga rol "superadmin" y activo = true en la tabla public.soporte_usuarios. ' +
        '2) Se haya ejecutado la migración "20261030000002_soporte_rls_domain.sql" que otorga permisos a is_soporte_superadmin().',
        { cause: error }
      );
    }
    throw error;
  }

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

  // Si se actualizó admin_id y el perfil no tenía organización asignada, vincularlo
  if (updates.admin_id && updates.admin_id !== previa?.admin_id) {
    const { data: adminPerfil } = await supabase
      .from('profiles')
      .select('organizacion_id')
      .eq('id', updates.admin_id)
      .maybeSingle();

    if (adminPerfil && !adminPerfil.organizacion_id) {
      await supabase
        .from('profiles')
        .update({ organizacion_id: id, updated_at: new Date().toISOString() })
        .eq('id', updates.admin_id);
    }
  }

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

export async function assignAdminToOrganizacion({
  organizacionId,
  adminId,
  motivo = 'Asignación de administrador a organización',
}) {
  if (!organizacionId) throw new Error('ID de organización es requerido');
  if (!adminId) throw new Error('Debe seleccionar un administrador');

  // 1. Obtener la organización
  const { data: orgPrevia, error: orgErr } = await supabase
    .from('organizaciones')
    .select('*')
    .eq('id', organizacionId)
    .single();
  if (orgErr || !orgPrevia) throw new Error('No se encontró la organización especificada');

  // 2. Obtener el perfil del administrador
  const { data: adminPerfil, error: admErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', adminId)
    .single();
  if (admErr || !adminPerfil) throw new Error('No se encontró el perfil de administrador seleccionado');

  // 3. Validar restricción de transferencia organizacional
  if (adminPerfil.organizacion_id && adminPerfil.organizacion_id !== organizacionId) {
    throw new Error(
      `El administrador "${adminPerfil.nombre} ${adminPerfil.apellido || ''}".trim() ya pertenece a otra organización. ` +
      `Por integridad y trazabilidad histórica contable, no está permitido transferir perfiles asignados entre organizaciones.`
    );
  }

  // 4. Actualizar admin_id en la organización
  const { data: orgData, error: updateOrgErr } = await supabase
    .from('organizaciones')
    .update({
      admin_id: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizacionId)
    .select()
    .single();

  if (updateOrgErr) throw updateOrgErr;

  // 5. Si el perfil tenía organizacion_id = null, asociarlo ahora a esta organización
  if (!adminPerfil.organizacion_id) {
    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        organizacion_id: organizacionId,
        modo_apertura_caja: orgPrevia.modo_apertura_caja || 'admin_masivo',
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminId);

    if (profErr) {
      console.warn('Aviso: no se pudo actualizar organizacion_id en el perfil del admin:', profErr.message);
    }
  }

  // 6. Registrar evento en auditoría administrativa
  await logAuditAction({
    organizacionId,
    modulo: 'organizaciones',
    accion: 'asignar_admin',
    registroId: organizacionId,
    datosPrevios: { admin_id: orgPrevia.admin_id },
    datosPosteriores: {
      admin_id: adminId,
      admin_nombre: `${adminPerfil.nombre} ${adminPerfil.apellido || ''}`.trim(),
    },
    motivo,
  });

  return orgData;
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

