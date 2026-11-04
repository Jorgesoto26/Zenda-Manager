import { supabase } from '@/lib/supabase';

/**
 * Obtiene logs de ejecuciones de procesos administrativos y móviles en Supabase
 */
export async function getProcesosLogs({ limit = 50, tipo = 'todos' } = {}) {
  const resultados = [];

  // 1. Logs de auditoría de procesos de gestión (auditoria_admin)
  if (tipo === 'todos' || tipo === 'admin') {
    try {
      const { data: adminLogs, error: adminErr } = await supabase
        .from('auditoria_admin')
        .select(`
          *,
          soporte_user:soporte_usuarios(id, nombre, email, rol_soporte),
          organizacion:organizaciones(id, nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!adminErr && adminLogs) {
        adminLogs.forEach((l) => {
          resultados.push({
            id: `admin-${l.id}`,
            origen: 'Zenda Manager RPC / Edge',
            categoria: 'Administración',
            proceso: `${l.modulo?.toUpperCase()}: ${l.accion}`,
            autor: l.soporte_user?.nombre || l.soporte_user?.email || 'Sistema',
            organizacion: l.organizacion?.nombre || 'Global',
            detalles: {
              previo: l.datos_previos,
              posterior: l.datos_posteriores,
              motivo: l.motivo,
              ip: l.ip_address,
            },
            status: 'exitoso',
            timestamp: l.created_at,
          });
        });
      }
    } catch (e) {
      console.warn('Aviso leyendo auditoria_admin:', e);
    }
  }

  // 2. Logs de procesos transaccionales de caja (cash_movement_audit)
  if (tipo === 'todos' || tipo === 'movil') {
    try {
      const { data: movilLogs, error: movilErr } = await supabase
        .from('cash_movement_audit')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!movilErr && movilLogs) {
        movilLogs.forEach((m) => {
          resultados.push({
            id: `movil-${m.id}`,
            origen: 'Postgres RPC Transaccional',
            categoria: 'Operación Móvil',
            proceso: `Caja: ${m.action || m.tipo || 'Movimiento'}`,
            autor: m.user_id ? `Usuario (${m.user_id.substring(0, 8)})` : 'Trigger DB',
            organizacion: m.organizacion_id ? `Org ${m.organizacion_id.substring(0, 8)}` : 'Empresa',
            detalles: m,
            status: m.status || 'completado',
            timestamp: m.created_at || m.timestamp,
          });
        });
      }
    } catch (e) {
      console.warn('Aviso leyendo cash_movement_audit:', e);
    }
  }

  // Ordenar por fecha descendente
  resultados.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return resultados.slice(0, limit);
}

/**
 * Mide latencia y estado de salud de Supabase
 */
export async function testSupabaseHealth() {
  const start = performance.now();
  let status = 'healthy';
  let message = 'Conexión activa';
  let errorDetail = null;

  try {
    const { count, error } = await supabase
      .from('organizaciones')
      .select('*', { count: 'exact', head: true });

    if (error) {
      status = 'warning';
      message = error.message;
      errorDetail = error;
    }
  } catch (err) {
    status = 'down';
    message = err.message || 'Error de conexión';
    errorDetail = err;
  }

  const durationMs = Math.round(performance.now() - start);

  return {
    status,
    latencyMs: durationMs,
    message,
    error: errorDetail,
    timestamp: new Date().toISOString(),
  };
}

