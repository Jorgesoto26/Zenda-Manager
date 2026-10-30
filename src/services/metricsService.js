import { supabase } from '@/lib/supabase';

export async function getDashboardMetrics(orgId = null) {
  // 1. Intentar primero con RPC si está desplegada en Supabase
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('manager_get_dashboard_metrics', {
      p_organizacion_id: orgId || null,
    });
    if (!rpcError && rpcData) {
      return rpcData;
    }
  } catch {
    // Si la RPC aún no está creada, ejecutar fallback seguro
  }

  // 2. Fallback mediante consultas directas respetando reglas multiempresa y estados financieros
  try {
    // Organizaciones
    let orgsQuery = supabase.from('organizaciones').select('id, estado');
    if (orgId) {
      orgsQuery = orgsQuery.eq('id', orgId);
    }
    const { data: orgsData } = await orgsQuery;
    const orgs = orgsData || [];
    const orgs_total = orgs.length;
    const orgs_activas = orgs.filter((o) => (o.estado || 'activa') === 'activa').length;
    const orgs_suspendidas = orgs.filter((o) => o.estado === 'suspendida').length;

    // Administradores y Vendedores
    let profQuery = supabase.from('profiles').select('id, rol, organizacion_id');
    if (orgId) {
      profQuery = profQuery.eq('organizacion_id', orgId);
    }
    const { data: profData } = await profQuery;
    const profiles = profData || [];
    const total_admins = profiles.filter((p) => p.rol === 'admin').length;
    const total_vendedores = profiles.filter((p) => p.rol === 'vendedor').length;
    const orgUserIds = profiles.map((p) => p.id);

    // Si se especificó orgId pero no tiene usuarios, las métricas financieras son 0
    if (orgId && orgUserIds.length === 0) {
      return {
        orgs_total,
        orgs_activas,
        orgs_suspendidas,
        total_admins: 0,
        total_vendedores: 0,
        total_clientes: 0,
        cajas_abiertas: 0,
        cartera_total: 0,
        saldo_vencido: 0,
      };
    }

    // Clientes (asociados a vendedores de la organización)
    let clientsQuery = supabase.from('clients').select('id', { count: 'exact', head: true });
    if (orgId) {
      clientsQuery = clientsQuery.in('vendedor_id', orgUserIds);
    }
    const { count: total_clientes } = await clientsQuery;

    // Cajas abiertas
    let cajasQuery = supabase
      .from('cajas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'abierta');
    if (orgId) {
      cajasQuery = cajasQuery.in('usuario_id', orgUserIds);
    }
    const { count: cajas_abiertas } = await cajasQuery;

    // Cartera total (excluye canceladas y castigadas)
    let invQuery = supabase
      .from('invoice')
      .select('saldo, status, castigado')
      .eq('castigado', false)
      .gt('saldo', 0)
      .not('status', 'in', '("cancel","cancelada")');
    if (orgId) {
      invQuery = invQuery.in('usuario_id', orgUserIds);
    }
    const { data: invData } = await invQuery;
    const cartera_total = (invData || []).reduce((acc, curr) => acc + (Number(curr.saldo) || 0), 0);

    // Saldo vencido (excluye facturas canceladas y castigadas)
    const today = new Date().toISOString().split('T')[0];
    let cuotasQuery = supabase
      .from('cuotas')
      .select('monto, monto_pagado, invoice:invoice!inner(id, castigado, status, saldo, usuario_id)')
      .in('estado', ['pendiente', 'parcial'])
      .lt('fecha_vencimiento', today)
      .eq('invoice.castigado', false)
      .gt('invoice.saldo', 0)
      .not('invoice.status', 'in', '("cancel","cancelada")');

    if (orgId) {
      cuotasQuery = cuotasQuery.in('invoice.usuario_id', orgUserIds);
    }

    const { data: cuotasData, error: cuotasErr } = await cuotasQuery;
    let saldo_vencido = 0;
    if (!cuotasErr && cuotasData) {
      saldo_vencido = cuotasData.reduce(
        (acc, curr) => acc + (Number(curr.monto) - (Number(curr.monto_pagado) || 0)),
        0
      );
    }

    return {
      orgs_total,
      orgs_activas,
      orgs_suspendidas,
      total_admins,
      total_vendedores,
      total_clientes: total_clientes || 0,
      cajas_abiertas: cajas_abiertas || 0,
      cartera_total,
      saldo_vencido: Math.max(0, saldo_vencido),
    };
  } catch (error) {
    console.error('Error calculando métricas de dashboard:', error);
    return {
      orgs_total: 0,
      orgs_activas: 0,
      orgs_suspendidas: 0,
      total_admins: 0,
      total_vendedores: 0,
      total_clientes: 0,
      cajas_abiertas: 0,
      cartera_total: 0,
      saldo_vencido: 0,
    };
  }
}

export async function getRecentActivity(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('cash_movements')
      .select(`
        id,
        tipo,
        monto,
        descripcion,
        fecha,
        caja:cajas(
          id,
          usuario:profiles(
            id,
            nombre,
            apellido,
            rol,
            organizacion:organizaciones(id, nombre)
          )
        )
      `)
      .order('fecha', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Error obteniendo actividad reciente:', error);
    return [];
  }
}

