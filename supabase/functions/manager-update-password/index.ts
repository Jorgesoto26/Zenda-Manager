// Supabase Edge Function: manager-update-password
// Propósito: Actualización administrativa segura de contraseñas de usuarios por Soporte Central
// Seguridad: Requiere JWT de Superadmin activo en public.soporte_usuarios y utiliza Supabase Auth Admin API (GoTrue)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
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

    // 1. Validar token JWT del invocador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED: Encabezado de autorización ausente o inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. Validar identidad
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

    // 3. Verificar que sea Superadmin activo
    const { data: soporteUser, error: soporteError } = await adminClient
      .from('soporte_usuarios')
      .select('id, rol_soporte, activo')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (soporteError || !soporteUser || soporteUser.activo !== true || soporteUser.rol_soporte !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'FORBIDDEN: Solo un Superadministrador activo de Soporte Central puede cambiar contraseñas de usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parsear body
    const body = await req.json();
    const { userId, newPassword, motivo = 'Restablecimiento administrativo de contraseña desde Zenda Manager' } = body;

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Campos requeridos: userId y newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verificar que el usuario objetivo exista en public.profiles o auth.users
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id, nombre, apellido, rol, organizacion_id')
      .eq('id', userId)
      .maybeSingle();

    // 6. Actualizar contraseña mediante Supabase Auth Admin API
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error actualizando contraseña en GoTrue:', updateError.message);
      return new Response(
        JSON.stringify({ error: updateError.message || 'Error al actualizar contraseña en Supabase Auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Registrar auditoría si la tabla existe
    try {
      await adminClient.from('auditoria_admin').insert({
        soporte_user_id: callerUser.id,
        organizacion_id: targetProfile?.organizacion_id || null,
        modulo: 'usuarios',
        accion: 'cambio_password',
        registro_id: userId,
        datos_previos: { usuario_id: userId, rol: targetProfile?.rol || 'desconocido' },
        datos_posteriores: { usuario_id: userId, password_actualizada: true },
        motivo,
      });
    } catch (auditErr: any) {
      console.warn('Aviso: no se pudo registrar log de auditoría:', auditErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contraseña actualizada con éxito',
        userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error no controlado en manager-update-password:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Error interno del servidor en Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

