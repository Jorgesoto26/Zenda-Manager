-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 02 - Políticas RLS para Soporte en Dominio
-- Propósito: Otorgar acceso de lectura y auditoría a personal de Soporte Central
-- Compatibilidad: No altera las políticas de zendapp ni public.is_admin()
-- =====================================================================

-- 1. Organizaciones
DROP POLICY IF EXISTS "organizaciones_select_soporte" ON public.organizaciones;
CREATE POLICY "organizaciones_select_soporte" ON public.organizaciones
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());

DROP POLICY IF EXISTS "organizaciones_modify_soporte_superadmin" ON public.organizaciones;
CREATE POLICY "organizaciones_modify_soporte_superadmin" ON public.organizaciones
  FOR ALL TO authenticated
  USING (public.is_soporte_superadmin())
  WITH CHECK (public.is_soporte_superadmin());


-- 2. Profiles (Lectura para soporte; mutación restringida a RPCs)
DROP POLICY IF EXISTS "profiles_select_soporte" ON public.profiles;
CREATE POLICY "profiles_select_soporte" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 3. Conceptos de Gastos/Ingresos
DROP POLICY IF EXISTS "concepts_select_soporte" ON public.concepts;
CREATE POLICY "concepts_select_soporte" ON public.concepts
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());

DROP POLICY IF EXISTS "concepts_modify_soporte_superadmin" ON public.concepts;
CREATE POLICY "concepts_modify_soporte_superadmin" ON public.concepts
  FOR ALL TO authenticated
  USING (public.is_soporte_superadmin())
  WITH CHECK (public.is_soporte_superadmin());


-- 4. Clientes (Lectura para soporte)
DROP POLICY IF EXISTS "clients_select_soporte" ON public.clients;
CREATE POLICY "clients_select_soporte" ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 5. Facturación y Ventas (Lectura para soporte)
DROP POLICY IF EXISTS "invoice_select_soporte" ON public.invoice;
CREATE POLICY "invoice_select_soporte" ON public.invoice
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 6. Cuotas (Lectura para soporte)
DROP POLICY IF EXISTS "cuotas_select_soporte" ON public.cuotas;
CREATE POLICY "cuotas_select_soporte" ON public.cuotas
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 7. Pagos y Abonos (Lectura para soporte)
DROP POLICY IF EXISTS "payments_select_soporte" ON public.payments;
CREATE POLICY "payments_select_soporte" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 8. Cajas (Lectura para soporte)
DROP POLICY IF EXISTS "cajas_select_soporte" ON public.cajas;
CREATE POLICY "cajas_select_soporte" ON public.cajas
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 9. Movimientos de Caja (Lectura para soporte)
DROP POLICY IF EXISTS "cash_movements_select_soporte" ON public.cash_movements;
CREATE POLICY "cash_movements_select_soporte" ON public.cash_movements
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 10. Evidencias Multimedia (Lectura para soporte)
DROP POLICY IF EXISTS "multimedia_select_soporte" ON public.multimedia_evidencias;
CREATE POLICY "multimedia_select_soporte" ON public.multimedia_evidencias
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 11. Auditoría de Movimientos Móviles (Lectura para soporte)
DROP POLICY IF EXISTS "cash_movement_audit_select_soporte" ON public.cash_movement_audit;
CREATE POLICY "cash_movement_audit_select_soporte" ON public.cash_movement_audit
  FOR SELECT TO authenticated
  USING (public.is_soporte_user());


-- 12. Regla de Integridad: Impedir transferencia de perfiles entre organizaciones
-- Protege la pertenencia histórica de facturas, cuotas y cajas (independientemente de si el perfil está activo o inactivo).
-- La única vía para incorporar a una persona en otra organización es crear un perfil nuevo.
CREATE OR REPLACE FUNCTION public.trg_prevent_profile_org_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.organizacion_id IS NOT NULL 
     AND NEW.organizacion_id IS DISTINCT FROM OLD.organizacion_id THEN
    RAISE EXCEPTION 'ORG_TRANSFER_FORBIDDEN: No está permitido transferir perfiles entre organizaciones (independientemente de su estado activo o inactivo) para proteger la trazabilidad histórica de facturas y cajas. Para incorporar a este usuario en otra organización, cree un perfil nuevo.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_org_transfer ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_org_transfer
  BEFORE UPDATE OF organizacion_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prevent_profile_org_transfer();

