import { createClient } from '@supabase/supabase-js';

// En Netlify o entornos de producción, las variables provienen de import.meta.env.
// Se definen valores de respaldo por defecto para evitar pantalla en blanco si Netlify no tiene configurado el .env.
const DEFAULT_SUPABASE_URL = 'https://gwpwntdwogxzmtegaaom.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cHdudGR3b2d4em10ZWdhYW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NzAyMjAsImV4cCI6MjA2MDI0NjIyMH0.kN83W-jHuNS6GX7kYCaBxx-1k3X964rkhdKAGaza8G4';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info(
    '[Zenda Manager] Utilizando configuración de conexión de respaldo para Supabase. ' +
    'Para personalizarla en Netlify, añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Site Settings > Environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
