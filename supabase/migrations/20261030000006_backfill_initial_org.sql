-- =====================================================================
-- ZENDA MANAGER: MIGRACIÓN 06 - Reconciliación de Datos Históricos
-- Propósito: Backfill seguro de la organización inicial para datos existentes
-- AVISO: Script preparado para ejecución manual aprobada. NO ejecutar automáticamente.
-- Reversibilidad: Condicional (solo válida inmediatamente tras el backfill antes de nuevas transacciones).
-- =====================================================================

-- CONSULTA DE DIAGNÓSTICO PREVIO (Ejecutar antes de aplicar para verificar estado):
/*
SELECT id, nombre, apellido, rol, superior_id, organizacion_id 
FROM public.profiles 
ORDER BY superior_id NULLS FIRST;

SELECT COUNT(*) AS total_orgs FROM public.organizaciones;
*/

DO $$
DECLARE
  v_root_admins_count       integer;
  v_root_admin_id           uuid;
  v_admin_nombre            text;
  v_matching_orgs_count     integer;
  v_org_id                  uuid;
  v_conflicting_profiles    integer;
  v_profiles_count          integer;
  v_updated_count           integer;
  v_orphan_invoices         integer;
  v_orphan_cajas            integer;
BEGIN
  -- 1. VERIFICACIÓN PREVIA: Unicidad del Administrador Raíz
  SELECT COUNT(*) INTO v_root_admins_count
  FROM public.profiles
  WHERE rol = 'admin' AND superior_id IS NULL;

  IF v_root_admins_count = 0 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: No existe ningún administrador raíz (rol=admin y superior_id=NULL). No se puede determinar la titularidad de la organización inicial.';
  END IF;

  IF v_root_admins_count > 1 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Se encontraron % administradores raíz (rol=admin y superior_id=NULL). Ambigüedad detectada: resuelva manualmente la jerarquía antes del backfill.', v_root_admins_count;
  END IF;

  SELECT id, nombre INTO v_root_admin_id, v_admin_nombre
  FROM public.profiles
  WHERE rol = 'admin' AND superior_id IS NULL;

  RAISE NOTICE 'Administrador raíz único verificado: % (UUID: %)', v_admin_nombre, v_root_admin_id;

  -- 2. VERIFICACIÓN PREVIA: Ambigüedad en la Organización
  SELECT COUNT(*) INTO v_matching_orgs_count
  FROM public.organizaciones
  WHERE admin_id = v_root_admin_id OR nombre = 'Zenda Principal';

  IF v_matching_orgs_count > 1 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Se encontraron % organizaciones coincidentes por admin_id o nombre "Zenda Principal". Ambigüedad detectada.', v_matching_orgs_count;
  END IF;

  IF v_matching_orgs_count = 1 THEN
    SELECT id INTO v_org_id
    FROM public.organizaciones
    WHERE admin_id = v_root_admin_id OR nombre = 'Zenda Principal'
    LIMIT 1;
    RAISE NOTICE 'Organización existente identificada sin ambigüedad: %', v_org_id;
  ELSE
    INSERT INTO public.organizaciones (
      nombre,
      nit,
      telefono,
      direccion,
      admin_id,
      estado,
      modo_apertura_caja
    ) VALUES (
      'Zenda Principal',
      '900000000-1',
      '+57 300 000 0000',
      'Sede Central',
      v_root_admin_id,
      'activa',
      'admin_masivo'
    )
    RETURNING id INTO v_org_id;
    RAISE NOTICE 'Organización inicial creada exitosamente: %', v_org_id;
  END IF;

  -- 3. VERIFICACIÓN PREVIA: Perfiles con Asociaciones Previas Conflictivas
  SELECT COUNT(*) INTO v_conflicting_profiles
  FROM public.profiles
  WHERE (id = v_root_admin_id OR superior_id = v_root_admin_id)
    AND organizacion_id IS NOT NULL
    AND organizacion_id <> v_org_id;

  IF v_conflicting_profiles > 0 THEN
    RAISE EXCEPTION 'PRECHECK_FAILED: Se detectaron % perfiles en el árbol con asignación previa a una organización distinta. No se reasignarán perfiles existentes para evitar corrupción histórica.', v_conflicting_profiles;
  END IF;

  -- 4. ASOCIACIÓN SEGURA (Solo perfiles huérfanos con organizacion_id IS NULL)
  UPDATE public.profiles
  SET organizacion_id = v_org_id,
      updated_at = now()
  WHERE (id = v_root_admin_id OR superior_id = v_root_admin_id)
    AND organizacion_id IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Perfiles asociados exitosamente: %', v_updated_count;

  -- 5. VERIFICACIÓN POSTERIOR DE INTEGRIDAD FINANCIERA (Detección de Huérfanos)
  SELECT COUNT(*) INTO v_orphan_invoices
  FROM public.invoice i
  JOIN public.profiles p ON p.id = i.usuario_id
  WHERE p.organizacion_id IS NULL;

  IF v_orphan_invoices > 0 THEN
    RAISE WARNING 'ALERTA DE DATOS: Existen % facturas históricas cuyos usuarios creadores no quedaron asociados a ninguna organización', v_orphan_invoices;
  ELSE
    RAISE NOTICE 'Verificación financiera: 0 facturas huérfanas detectadas.';
  END IF;

  SELECT COUNT(*) INTO v_orphan_cajas
  FROM public.cajas c
  JOIN public.profiles p ON p.id = c.usuario_id
  WHERE p.organizacion_id IS NULL;

  IF v_orphan_cajas > 0 THEN
    RAISE WARNING 'ALERTA DE DATOS: Existen % cajas históricas cuyos usuarios no quedaron asociados a ninguna organización', v_orphan_cajas;
  ELSE
    RAISE NOTICE 'Verificación de cajas: 0 cajas huérfanas detectadas.';
  END IF;

  RAISE NOTICE 'Reconciliación completada con éxito. Todos los perfiles y operaciones históricas quedaron asegurados.';
END $$;

-- CONSULTA DE DIAGNÓSTICO POSTERIOR:
/*
SELECT p.id, p.nombre, p.rol, p.superior_id, o.id AS org_id, o.nombre AS org_nombre, o.estado
FROM public.profiles p
JOIN public.organizaciones o ON o.id = p.organizacion_id;
*/

/*
-- =====================================================================
-- INSTRUCCIONES DE REVERSIÓN (ROLLBACK) MANUAL
-- IMPORTANTE: Solo ejecutar inmediatamente si el backfill presentó alguna anomalía.
-- No ejecutar si ya se generaron nuevas operaciones bajo esta organización.
-- =====================================================================
DO $$
DECLARE
  v_root_admin_id uuid;
  v_org_id        uuid;
BEGIN
  -- Buscar organización raíz
  SELECT id, admin_id INTO v_org_id, v_root_admin_id
  FROM public.organizaciones
  WHERE nombre = 'Zenda Principal'
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- Desvincular perfiles asignados
    UPDATE public.profiles
    SET organizacion_id = NULL
    WHERE organizacion_id = v_org_id;

    -- Eliminar organización inicial
    DELETE FROM public.organizaciones WHERE id = v_org_id;
    RAISE NOTICE 'Reversión completada: perfiles desvinculados y organización % eliminada', v_org_id;
  ELSE
    RAISE NOTICE 'No se encontró la organización "Zenda Principal" para revertir';
  END IF;
END $$;
*/

