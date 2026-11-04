// Supabase Edge Function: manager-create-admin
// Propósito: Creación oficial y segura de Administradores de Organización usando Supabase Auth Admin API (GoTrue)
// Seguridad: Valida JWT de Superadmin de Soporte Central y protege service_role exclusivamente en el servidor Deno
//
// AVISO ARQUITECTÓNICO:
// Esta función implementa un patrón compensatorio de dos fases (Two-Phase Compensatory Pattern), NO una transacción
// distribuida ACID. Debido a que el subsistema de autenticación (GoTrue REST API) y el motor relacional PostgreSQL
// operan como planos de datos desacoplados:
// 1. Fase 1: Se provisiona la identidad en GoTrue (auth.admin.createUser).
// 2. Fase 2: Se inserta el perfil de dominio en PostgreSQL (public.profiles).
// Si la Fase 2 falla, se dispara inmediatamente una acción de compensación (auth.admin.deleteUser).
// Si dicha acción compensatoria fallara por caída de red, la función registra un error fatal y entrega
// el UUID huérfano para auditoría y remediación manual.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido. Solo POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de servidor incompleta: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    // 1. Obtener y validar el token JWT del usuario que invoca la función
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED: Encabezado de autorización ausente o inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Cliente administrativo exclusivo del backend (service_role jamás expuesto al frontend)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Validar identidad del invocador a través de su token JWT
    const {
      data: { user: callerUser },
      error: callerError,
    } = await adminClient.auth.getUser(token);

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED: Token de sesión inválido o expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Verificar que el invocador sea un Superadmin activo en public.soporte_usuarios
    const { data: soporteUser, error: soporteError } = await adminClient
      .from('soporte_usuarios')
      .select('id, rol_soporte, activo')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (soporteError || !soporteUser || soporteUser.activo !== true || soporteUser.rol_soporte !== 'superadmin') {
      return new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED: Requiere rol superadmin activo en Soporte Central Zenda para crear administradores',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Parsear y validar cuerpo de la petición
    const body = await req.json();
    const {
      email,
      password,
      nombre,
      apellido = '',
      organizacionId,
      telefono = null,
      motivo = 'Creación por Edge Function oficial',
      dineroMaxCaja,
      dineroMaxVenta,
      dineroMaxGasto,
      maxCuotas,
      permiteBorrarVenta,
      permiteModificarPagos,
    } = body;

    if (!email || !password || !nombre || !organizacionId) {
      return new Response(
        JSON.stringify({ error: 'Campos obligatorios requeridos: email, password, nombre, organizacionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'El formato de correo electrónico es inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validar existencia y estado de la organización destino
    const { data: orgData, error: orgError } = await adminClient
      .from('organizaciones')
      .select('id, nombre, estado, admin_id')
      .eq('id', organizacionId)
      .maybeSingle();

    if (orgError || !orgData) {
      return new Response(
        JSON.stringify({ error: `La organización con ID ${organizacionId} no existe en el sistema` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orgData.estado === 'suspendida') {
      return new Response(
        JSON.stringify({ error: `No se pueden crear administradores para la organización "${orgData.nombre}" porque se encuentra suspendida` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. FASE 1: Crear el usuario en GoTrue usando la API oficial admin.createUser()
    const { data: newAuthData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        nombre: nombre.trim(),
        apellido: (apellido || '').trim(),
        telefono: telefono ? String(telefono).trim() : null,
        creado_por: callerUser.id,
      },
    });

    if (createAuthError || !newAuthData.user) {
      console.error('Error creando usuario en Auth:', createAuthError?.message);
      return new Response(
        JSON.stringify({ error: createAuthError?.message || 'Error creando usuario en Supabase Auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = newAuthData.user.id;

    // 7. FASE 2: Insertar perfil en public.profiles
    const profilePayload = {
      id: newUserId,
      nombre: nombre.trim(),
      apellido: (apellido || '').trim(),
      rol: 'admin',
      superior_id: null, // Administrador raíz de su organización
      organizacion_id: organizacionId,
      activo: true,
      dinero_max_caja: Number(dineroMaxCaja) > 0 ? Number(dineroMaxCaja) : 10000000,
      dinero_max_venta: Number(dineroMaxVenta) > 0 ? Number(dineroMaxVenta) : 5000000,
      dinero_max_gasto: Number(dineroMaxGasto) > 0 ? Number(dineroMaxGasto) : 2000000,
      max_cuotas: Number(maxCuotas) > 0 ? Number(maxCuotas) : 60,
      permite_borrar_venta: permiteBorrarVenta !== undefined ? Boolean(permiteBorrarVenta) : true,
      permite_modificar_pagos: permiteModificarPagos !== undefined ? Boolean(permiteModificarPagos) : true,
    };

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(profilePayload);

    // MECANISMO DE ROLLBACK COMPENSATORIO (Two-Phase Pattern)
    if (profileError) {
      console.error('CRITICAL: Error insertando perfil en public.profiles:', profileError.message);
      console.log(`Iniciando rollback compensatorio: eliminando usuario Auth ${newUserId}...`);
      
      try {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(newUserId);
        if (deleteError) {
          throw deleteError;
        }
        console.log(`Rollback compensatorio completado con éxito para usuario ${newUserId}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Error al crear perfil en base de datos (${profileError.message}). Se revirtió exitosamente la cuenta en Auth.`,
            compensation: 'auth_user_deleted',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (deleteErr: any) {
        // Falló tanto la creación del perfil como el rollback en Auth
        console.error('CRITICAL FATAL: Falló el rollback compensatorio deleteUser() en Auth. Usuario huérfano:', newUserId, deleteErr.message);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Fallo crítico: No se pudo crear el perfil (${profileError.message}) y el rollback automático en Auth falló (${deleteErr.message || 'error desconocido'}). Se requiere intervención manual en Auth para el usuario ${newUserId}.`,
            orphanUserId: newUserId,
            compensation: 'failed',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Actualizar admin_id en la organización si no tenía
    if (!orgData.admin_id) {
      await adminClient
        .from('organizaciones')
        .update({ admin_id: newUserId, updated_at: new Date().toISOString() })
        .eq('id', organizacionId);
    }

    // 9. Registrar auditoría administrativa inmutable
    try {
      await adminClient.from('auditoria_admin').insert({
        soporte_usuario_id: callerUser.id,
        organizacion_id: organizacionId,
        modulo: 'administradores',
        accion: 'crear',
        registro_id: newUserId,
        datos_posteriores: {
          user_id: newUserId,
          email: email.trim().toLowerCase(),
          nombre: nombre.trim(),
          apellido: (apellido || '').trim(),
          rol: 'admin',
          organizacion_id: organizacionId,
          organizacion_nombre: orgData.nombre,
          origen: 'supabase_edge_function',
        },
        motivo,
      });
    } catch (auditErr) {
      console.warn('Aviso: Falló registro de auditoría en Edge Function:', auditErr);
    }

    // 10. Respuesta sanitizada (sin credenciales, tokens ni datos sensibles)
    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        organizacion_id: organizacionId,
        organizacion_nombre: orgData.nombre,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error general en Edge Function manager-create-admin:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno del servidor en Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
