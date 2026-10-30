import { supabase } from '@/lib/supabase';

export async function getDiagnosticoCajas({ organizacionId = null } = {}) {
  try {
    let query = supabase
      .from('cajas')
      .select(`
        id,
        estado,
        saldo_inicial,
        saldo_final,
        fecha_apertura,
        fecha_cierre,
        usuario:profiles(
          id,
          nombre,
          apellido,
          rol,
          email,
          organizacion:organizaciones(id, nombre)
        )
      `)
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    const now = new Date();
    // Identificar cajas abiertas con más de 24 horas (alerta operativa)
    const cajasConAlerta = (data || []).map((caja) => {
      const apertura = new Date(caja.fecha_apertura);
      const horasAbierta = Math.round((now - apertura) / (1000 * 60 * 60));
      return {
        ...caja,
        horasAbierta,
        requiereAtencion: horasAbierta >= 24,
      };
    });

    return cajasConAlerta;
  } catch (err) {
    console.warn('Error en getDiagnosticoCajas:', err);
    return [];
  }
}

export async function getDiagnosticoEvidencias() {
  try {
    const { data, error } = await supabase
      .from('multimedia_evidencias')
      .select('estado_sync, count')
      .select('*', { count: 'exact' });

    if (error) return { total: 0, sincronizadas: 0, pendientes: 0 };

    const total = data?.length || 0;
    const sincronizadas = (data || []).filter((e) => e.estado_sync === 'sincronizado').length;
    const pendientes = total - sincronizadas;

    return { total, sincronizadas, pendientes };
  } catch {
    return { total: 0, sincronizadas: 0, pendientes: 0 };
  }
}

