-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 04 - RPCs Administrativas Centrales
-- Propósito: Operaciones atómicas y seguras del lado servidor
-- Seguridad: SECURITY DEFINER con SET search_path = public, auth, pg_temp
-- =====================================================================

-- 1. RPC: manager_create_admin [OBSOLETA / DEPRECATED]
-- AVISO DE ARQUITECTURA: Esta RPC se conserva únicamente por compatibilidad de esquemas anteriores.
-- El frontend de Zenda Manager utiliza EXCLUSIVAMENTE la Supabase Edge Function oficial 'manager-create-admin'
-- a través de Supabase Auth Admin API (GoTrue). No debe ser consumida directamente desde la interfaz web.
CREATE OR REPLACE FUNCTION public.manager_create_admin(
  p_email           text,
  p_password        text,
  p_nombre          text,
  p_apellido        text DEFAULT '',
  p_organizacion_id uuid DEFAULT NULL,
  p_telefono        text DEFAULT NULL,
  p_motivo          text DEFAULT 'Creación de administrador por Soporte Central'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_new_id        uuid;
  v_encrypted_pw  text;
  v_now           timestamptz;
  v_org_nombre    text;
BEGIN
  -- 1.1 Verificar permisos estrictos de Superadministrador de Soporte Central
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_superadmin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Solo los Superadministradores de Soporte Central pueden crear administradores';
  END IF;

  -- 1.2 Validar existencia y estado de la organización
  IF p_organizacion_id IS NULL THEN
    RAISE EXCEPTION 'ORG_REQUIRED: Debe especificar la organización a la que pertenecerá el administrador';
  END IF;

  SELECT nombre INTO v_org_nombre
  FROM public.organizaciones
  WHERE id = p_organizacion_id;

  IF v_org_nombre IS NULL THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND: La organización % no existe', p_organizacion_id;
  END IF;

  -- 1.3 Validar que el correo no esté registrado previamente
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS: Ya existe una cuenta registrada con el correo %', p_email;
  END IF;

  IF EXISTS (SELECT 1 FROM public.soporte_usuarios WHERE email = p_email) THEN
    RAISE EXCEPTION 'EMAIL_IN_SUPPORT: El correo % pertenece al personal de Soporte Central', p_email;
  END IF;

  v_new_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));
  v_now := now();

  -- 1.4 Insertar en auth.users cumpliendo todas las restricciones de GoTrue
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_new_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    v_now,
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object(
      'sub', v_new_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false,
      'nombre', p_nombre,
      'apellido', COALESCE(p_apellido, '')
    )::jsonb,
    v_now,
    v_now,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    false
  );

  -- 1.5 Insertar identidad en auth.identities
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_new_id::text,
    v_new_id,
    json_build_object(
      'sub', v_new_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    )::jsonb,
    'email',
    v_now,
    v_now,
    v_now
  );

  -- 1.6 Insertar en public.profiles con rol admin y superior_id NULL
  INSERT INTO public.profiles (
    id,
    nombre,
    apellido,
    rol,
    superior_id,
    organizacion_id,
    activo,
    telefono,
    dinero_max_caja,
    dinero_max_venta,
    dinero_max_gasto,
    max_cuotas,
    permite_borrar_venta,
    permite_modificar_pagos
  ) VALUES (
    v_new_id,
    p_nombre,
    COALESCE(p_apellido, ''),
    'admin',
    NULL, -- Es administrador raíz de su organización, no tiene superior
    p_organizacion_id,
    true,
    p_telefono,
    10000000,
    5000000,
    2000000,
    60,
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    rol = 'admin',
    superior_id = NULL,
    organizacion_id = EXCLUDED.organizacion_id,
    activo = true,
    telefono = EXCLUDED.telefono,
    updated_at = v_now;

  -- 1.7 Si la organización no tenía admin_id asignado, asignarlo
  UPDATE public.organizaciones
  SET admin_id = v_new_id,
      updated_at = v_now
  WHERE id = p_organizacion_id AND admin_id IS NULL;

  -- 1.8 Registrar auditoría atómica
  INSERT INTO public.auditoria_admin (
    soporte_usuario_id,
    organizacion_id,
    modulo,
    accion,
    registro_id,
    datos_posteriores,
    motivo
  ) VALUES (
    auth.uid(),
    p_organizacion_id,
    'administradores',
    'crear',
    v_new_id::text,
    json_build_object(
      'user_id', v_new_id,
      'email', p_email,
      'nombre', p_nombre,
      'apellido', p_apellido,
      'rol', 'admin',
      'organizacion_id', p_organizacion_id,
      'organizacion_nombre', v_org_nombre
    )::jsonb,
    p_motivo
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_new_id,
    'email', p_email,
    'organizacion_id', p_organizacion_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manager_create_admin(text, text, text, text, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_create_admin(text, text, text, text, uuid, text, text) TO authenticated;


-- 2. RPC: manager_toggle_org_status
-- Modifica el estado de una organización y audita de forma atómica
CREATE OR REPLACE FUNCTION public.manager_toggle_org_status(
  p_organizacion_id uuid,
  p_nuevo_estado    text,
  p_motivo          text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_estado_previo text;
  v_nombre        text;
  v_now           timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_superadmin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Solo superadministradores pueden alterar el estado de organizaciones';
  END IF;

  IF p_nuevo_estado NOT IN ('activa', 'suspendida', 'archivada') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Estado no válido. Permitidos: activa, suspendida, archivada';
  END IF;

  SELECT estado, nombre INTO v_estado_previo, v_nombre
  FROM public.organizaciones
  WHERE id = p_organizacion_id;

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND: La organización no existe';
  END IF;

  v_now := now();

  IF p_nuevo_estado = 'suspendida' THEN
    UPDATE public.organizaciones
    SET estado = 'suspendida',
        fecha_suspension = v_now,
        motivo_suspension = p_motivo,
        updated_at = v_now
    WHERE id = p_organizacion_id;
  ELSE
    UPDATE public.organizaciones
    SET estado = p_nuevo_estado,
        fecha_suspension = NULL,
        motivo_suspension = NULL,
        updated_at = v_now
    WHERE id = p_organizacion_id;
  END IF;

  -- Auditoría atómica
  INSERT INTO public.auditoria_admin (
    soporte_usuario_id,
    organizacion_id,
    modulo,
    accion,
    registro_id,
    datos_previos,
    datos_posteriores,
    motivo
  ) VALUES (
    auth.uid(),
    p_organizacion_id,
    'organizaciones',
    CASE WHEN p_nuevo_estado = 'suspendida' THEN 'suspender' ELSE 'activar' END,
    p_organizacion_id::text,
    json_build_object('estado', v_estado_previo)::jsonb,
    json_build_object('estado', p_nuevo_estado, 'fecha_suspension', v_now)::jsonb,
    p_motivo
  );

  RETURN jsonb_build_object(
    'success', true,
    'organizacion_id', p_organizacion_id,
    'nuevo_estado', p_nuevo_estado
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manager_toggle_org_status(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_toggle_org_status(uuid, text, text) TO authenticated;


-- 3. RPC: manager_manage_support_user
-- Gestiona usuarios de soporte previniendo auto-degradación
CREATE OR REPLACE FUNCTION public.manager_manage_support_user(
  p_usuario_id uuid,
  p_nuevo_rol  text,
  p_activo     boolean,
  p_motivo     text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rol_previo text;
  v_activo_previo boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_superadmin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Requiere rol superadmin';
  END IF;

  -- Prevención de auto-inhabilitación o auto-degradación del propio superadmin
  IF p_usuario_id = auth.uid() THEN
    IF p_activo = false THEN
      RAISE EXCEPTION 'SELF_DEACTIVATION_FORBIDDEN: No puedes inhabilitar tu propia cuenta';
    END IF;
    IF p_nuevo_rol <> 'superadmin' THEN
      RAISE EXCEPTION 'SELF_DEMOTION_FORBIDDEN: No puedes removerte el rol superadmin';
    END IF;
  END IF;

  SELECT rol_soporte, activo INTO v_rol_previo, v_activo_previo
  FROM public.soporte_usuarios
  WHERE id = p_usuario_id;

  IF v_rol_previo IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: Usuario de soporte no encontrado';
  END IF;

  UPDATE public.soporte_usuarios
  SET rol_soporte = p_nuevo_rol,
      activo = p_activo,
      updated_at = now()
  WHERE id = p_usuario_id;

  INSERT INTO public.auditoria_admin (
    soporte_usuario_id,
    modulo,
    accion,
    registro_id,
    datos_previos,
    datos_posteriores,
    motivo
  ) VALUES (
    auth.uid(),
    'soporte_usuarios',
    'modificar_rol_o_estado',
    p_usuario_id::text,
    json_build_object('rol_soporte', v_rol_previo, 'activo', v_activo_previo)::jsonb,
    json_build_object('rol_soporte', p_nuevo_rol, 'activo', p_activo)::jsonb,
    p_motivo
  );

  RETURN jsonb_build_object('success', true, 'usuario_id', p_usuario_id);
END;
$$;

REVOKE ALL ON FUNCTION public.manager_manage_support_user(uuid, text, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_manage_support_user(uuid, text, boolean, text) TO authenticated;


-- 4. RPC: manager_get_administradores
-- Retorna lista de administradores resolviendo su correo real desde auth.users de forma segura
CREATE OR REPLACE FUNCTION public.manager_get_administradores(
  p_organizacion_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id                  uuid,
  nombre              text,
  apellido            text,
  email               text,
  rol                 text,
  superior_id         uuid,
  organizacion_id     uuid,
  organizacion_nombre text,
  organizacion_estado text,
  activo              boolean,
  telefono            text,
  created_at          timestamptz,
  updated_at          timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_user() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Requiere permisos de Soporte Central';
  END IF;

  IF p_organizacion_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organizaciones WHERE id = p_organizacion_id) THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND: La organización especificada % no existe', p_organizacion_id;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.apellido,
    COALESCE(au.email, '')::text AS email,
    p.rol,
    p.superior_id,
    p.organizacion_id,
    o.nombre AS organizacion_nombre,
    o.estado AS organizacion_estado,
    p.activo,
    p.telefono,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.organizaciones o ON o.id = p.organizacion_id
  WHERE p.rol = 'admin'
    AND (p_organizacion_id IS NULL OR p.organizacion_id = p_organizacion_id)
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.manager_get_administradores(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_get_administradores(uuid) TO authenticated;

