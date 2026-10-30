-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 05 - Métricas de Plataforma y Multiempresa
-- Propósito: Cálculo exacto de métricas administrativas y financieras
-- Seguridad: Exclusión estricta de créditos cancelados y castigados
-- =====================================================================

CREATE OR REPLACE FUNCTION public.manager_get_dashboard_metrics(
  p_organizacion_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_orgs_total        bigint := 0;
  v_orgs_activas      bigint := 0;
  v_orgs_suspendidas  bigint := 0;
  v_total_admins      bigint := 0;
  v_total_vendedores  bigint := 0;
  v_total_clientes    bigint := 0;
  v_cajas_abiertas    bigint := 0;
  v_cartera_total     numeric := 0;
  v_saldo_vencido     numeric := 0;
BEGIN
  -- 1. Validar explícitamente sesión y pertenencia a Soporte Central
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Sesión no autenticada';
  END IF;

  IF NOT public.is_soporte_user() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Requiere permisos de Soporte Central Zenda';
  END IF;

  -- 1.1 Si se solicita una organización específica, validar su existencia en servidor
  IF p_organizacion_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.organizaciones WHERE id = p_organizacion_id) THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND: La organización especificada % no existe', p_organizacion_id;
  END IF;

  -- 2. Métricas de organizaciones
  IF p_organizacion_id IS NULL THEN
    SELECT COUNT(*) INTO v_orgs_total FROM public.organizaciones;
    SELECT COUNT(*) INTO v_orgs_activas FROM public.organizaciones WHERE estado = 'activa';
    SELECT COUNT(*) INTO v_orgs_suspendidas FROM public.organizaciones WHERE estado = 'suspendida';
  ELSE
    SELECT COUNT(*) INTO v_orgs_total FROM public.organizaciones WHERE id = p_organizacion_id;
    SELECT COUNT(*) INTO v_orgs_activas FROM public.organizaciones WHERE id = p_organizacion_id AND estado = 'activa';
    SELECT COUNT(*) INTO v_orgs_suspendidas FROM public.organizaciones WHERE id = p_organizacion_id AND estado = 'suspendida';
  END IF;

  -- 3. Métricas de administradores y vendedores
  SELECT
    COUNT(*) FILTER (WHERE rol = 'admin'),
    COUNT(*) FILTER (WHERE rol = 'vendedor')
  INTO v_total_admins, v_total_vendedores
  FROM public.profiles
  WHERE (p_organizacion_id IS NULL OR organizacion_id = p_organizacion_id);

  -- 4. Métricas de clientes
  -- Clientes asociados a vendedores de la organización
  SELECT COUNT(*) INTO v_total_clientes
  FROM public.clients cl
  WHERE (
    p_organizacion_id IS NULL 
    OR cl.vendedor_id IN (
      SELECT id FROM public.profiles WHERE organizacion_id = p_organizacion_id
    )
  );

  -- 5. Cajas abiertas
  SELECT COUNT(*) INTO v_cajas_abiertas
  FROM public.cajas c
  WHERE c.estado = 'abierta'
    AND (
      p_organizacion_id IS NULL 
      OR c.usuario_id IN (
        SELECT id FROM public.profiles WHERE organizacion_id = p_organizacion_id
      )
    );

  -- 6. Cartera activa total
  -- Excluye estrictamente facturas castigadas y canceladas
  SELECT COALESCE(SUM(i.saldo), 0) INTO v_cartera_total
  FROM public.invoice i
  WHERE i.saldo > 0
    AND i.castigado = false
    AND COALESCE(i.status, '') NOT IN ('cancel', 'cancelada')
    AND (
      p_organizacion_id IS NULL 
      OR i.usuario_id IN (
        SELECT id FROM public.profiles WHERE organizacion_id = p_organizacion_id
      )
    );

  -- 7. Saldo vencido
  -- Cuotas vencidas de facturas vigentes con saldo
  SELECT COALESCE(SUM(cu.monto - COALESCE(cu.monto_pagado, 0)), 0) INTO v_saldo_vencido
  FROM public.cuotas cu
  JOIN public.invoice i ON i.id = cu.invoice_id
  WHERE cu.estado IN ('pendiente', 'parcial')
    AND cu.fecha_vencimiento < CURRENT_DATE
    AND i.saldo > 0
    AND i.castigado = false
    AND COALESCE(i.status, '') NOT IN ('cancel', 'cancelada')
    AND (
      p_organizacion_id IS NULL 
      OR i.usuario_id IN (
        SELECT id FROM public.profiles WHERE organizacion_id = p_organizacion_id
      )
    );

  RETURN jsonb_build_object(
    'orgs_total', v_orgs_total,
    'orgs_activas', v_orgs_activas,
    'orgs_suspendidas', v_orgs_suspendidas,
    'total_admins', v_total_admins,
    'total_vendedores', v_total_vendedores,
    'total_clientes', v_total_clientes,
    'cajas_abiertas', v_cajas_abiertas,
    'cartera_total', v_cartera_total,
    'saldo_vencido', v_saldo_vencido
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manager_get_dashboard_metrics(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.manager_get_dashboard_metrics(uuid) TO authenticated;

