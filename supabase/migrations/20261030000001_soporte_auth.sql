-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 01 - Autenticación y Autorización de Soporte
-- Propósito: Crear esquema de Soporte Central (Zero-Trust), roles y helpers
-- Seguridad: SECURITY DEFINER con SET search_path explícito
-- =====================================================================

-- 1. Extender tabla de organizaciones con campos de ciclo de vida administrativo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizaciones' AND column_name='estado') THEN
    ALTER TABLE public.organizaciones ADD COLUMN estado text NOT NULL DEFAULT 'activa';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organizaciones_estado') THEN
    ALTER TABLE public.organizaciones ADD CONSTRAINT chk_organizaciones_estado CHECK (estado IN ('activa', 'suspendida', 'archivada'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizaciones' AND column_name='fecha_suspension') THEN
    ALTER TABLE public.organizaciones ADD COLUMN fecha_suspension timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizaciones' AND column_name='motivo_suspension') THEN
    ALTER TABLE public.organizaciones ADD COLUMN motivo_suspension text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizaciones' AND column_name='email_contacto') THEN
    ALTER TABLE public.organizaciones ADD COLUMN email_contacto text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizaciones' AND column_name='configuracion') THEN
    ALTER TABLE public.organizaciones ADD COLUMN configuracion jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;


-- 2. Tabla de usuarios de Soporte Central (independiente de profiles)
CREATE TABLE IF NOT EXISTS public.soporte_usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  rol_soporte text NOT NULL DEFAULT 'soporte_tecnico'
    CHECK (rol_soporte IN ('superadmin', 'soporte_tecnico', 'auditor')),
  activo boolean NOT NULL DEFAULT true,
  telefono text,
  creado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soporte_usuarios_email ON public.soporte_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_soporte_usuarios_rol ON public.soporte_usuarios(rol_soporte);
CREATE INDEX IF NOT EXISTS idx_soporte_usuarios_activo ON public.soporte_usuarios(activo);

ALTER TABLE public.soporte_usuarios ENABLE ROW LEVEL SECURITY;


-- 3. Funciones canónicas de validación de Soporte Central (con search_path seguro)
CREATE OR REPLACE FUNCTION public.is_soporte_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.soporte_usuarios
    WHERE id = auth.uid() AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_soporte_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.soporte_usuarios
    WHERE id = auth.uid() AND activo = true AND rol_soporte = 'superadmin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_soporte_user() FROM public;
GRANT EXECUTE ON FUNCTION public.is_soporte_user() TO authenticated;

REVOKE ALL ON FUNCTION public.is_soporte_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_soporte_superadmin() TO authenticated;


-- 4. Políticas RLS sobre soporte_usuarios (Sin recursión)
-- Lectura propia: el usuario autenticado solo puede leer su propio registro directamente
DROP POLICY IF EXISTS "soporte_usuarios_select_own" ON public.soporte_usuarios;
CREATE POLICY "soporte_usuarios_select_own" ON public.soporte_usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Gestión global: solo superadmin activo puede consultar y editar a otros operadores
DROP POLICY IF EXISTS "soporte_usuarios_superadmin_manage" ON public.soporte_usuarios;
CREATE POLICY "soporte_usuarios_superadmin_manage" ON public.soporte_usuarios
  FOR ALL TO authenticated
  USING (public.is_soporte_superadmin())
  WITH CHECK (public.is_soporte_superadmin());

