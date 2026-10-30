-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 03 - Auditoría Administrativa Central
-- Propósito: Tabla inmutable (Append-Only) y función de registro de auditoría
-- Seguridad: Sin permisos de UPDATE ni DELETE para garantizar integridad legal
-- =====================================================================

-- 1. Tabla de Auditoría Administrativa Central
CREATE TABLE IF NOT EXISTS public.auditoria_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soporte_usuario_id uuid REFERENCES public.soporte_usuarios(id) ON DELETE SET NULL,
  organizacion_id uuid REFERENCES public.organizaciones(id) ON DELETE SET NULL,
  modulo text NOT NULL,
  accion text NOT NULL,
  registro_id text,
  datos_previos jsonb,
  datos_posteriores jsonb,
  motivo text,
  ip_origen text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_admin_org ON public.auditoria_admin(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_admin_usuario ON public.auditoria_admin(soporte_usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_admin_fecha ON public.auditoria_admin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_admin_modulo ON public.auditoria_admin(modulo);

ALTER TABLE public.auditoria_admin ENABLE ROW LEVEL SECURITY;


-- 2. Políticas RLS: Append-Only (Solo SELECT e INSERT, jamás UPDATE ni DELETE)
DROP POLICY IF EXISTS "auditoria_select_soporte" ON public.auditoria_admin;
CREATE POLICY "auditoria_select_soporte" ON public.auditoria_admin
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());

DROP POLICY IF EXISTS "auditoria_insert_soporte" ON public.auditoria_admin;
CREATE POLICY "auditoria_insert_soporte" ON public.auditoria_admin
  FOR INSERT TO authenticated
  WITH CHECK (public.is_soporte_user());


-- 3. Trigger de Inmutabilidad Física (Append-Only Estricto)
-- Previene cualquier modificación o eliminación accidental o maliciosa, incluso con bypass parcial
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_tampering()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_IMMUTABLE: Los registros de auditoría administrativa son estrictamente inmutables y no pueden modificarse ni eliminarse';
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_admin_immutable ON public.auditoria_admin;
CREATE TRIGGER trg_auditoria_admin_immutable
  BEFORE UPDATE OR DELETE ON public.auditoria_admin
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_audit_tampering();


-- 4. RPC: manager_log_audit
CREATE OR REPLACE FUNCTION public.manager_log_audit(
  p_organizacion_id   uuid,
  p_modulo            text,
  p_accion            text,
  p_registro_id       text,
  p_datos_previos     jsonb DEFAULT NULL,
  p_datos_posteriores jsonb DEFAULT NULL,
  p_motivo            text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_user() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Requiere permisos de Soporte Central Zenda';
  END IF;

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
    p_modulo,
    p_accion,
    p_registro_id,
    p_datos_previos,
    p_datos_posteriores,
    p_motivo
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.manager_log_audit(uuid, text, text, text, jsonb, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_log_audit(uuid, text, text, text, jsonb, jsonb, text) TO authenticated;

