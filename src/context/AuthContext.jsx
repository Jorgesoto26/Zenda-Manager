import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [soporteUser, setSoporteUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verifica que el usuario pertenezca a la tabla soporte_usuarios
  const verifySupportUser = useCallback(async (user) => {
    if (!user) {
      setSoporteUser(null);
      return null;
    }

    try {
      // 1. Consultar tabla soporte_usuarios
      const { data, error } = await supabase
        .from('soporte_usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Error verificando soporte_usuarios:', error.message);
      }

      // Si no existe el registro en soporte_usuarios: Acceso estrictamente denegado
      if (!data) {
        console.warn('Usuario autenticado no existe en soporte_usuarios. Denegando acceso (Zero-Trust).');
        await supabase.auth.signOut();
        toast.error('Acceso denegado', {
          description: 'Esta plataforma es exclusiva para personal autorizado de Soporte Central Zenda.',
        });
        setSoporteUser(null);
        return null;
      }

      // Si la cuenta de soporte está desactivada: Acceso suspendido
      if (data.activo !== true) {
        console.warn('Cuenta de soporte suspendida:', user.email);
        await supabase.auth.signOut();
        toast.error('Cuenta inhabilitada', {
          description: 'Tu acceso a Soporte Central ha sido suspendido.',
        });
        setSoporteUser(null);
        return null;
      }

      // Usuario autorizado y activo
      setSoporteUser(data);
      return data;
    } catch (err) {
      console.error('Error in verifySupportUser:', err);
      setSoporteUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        await verifySupportUser(sess.user);
      }
      setLoading(false);
    });

    // 2. Suscribirse a cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await verifySupportUser(newSession.user);
      } else {
        setSoporteUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [verifySupportUser]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const supportProfile = await verifySupportUser(data.user);
      if (!supportProfile) {
        throw new Error('No tienes permisos para acceder al portal de Soporte Central.');
      }

      toast.success('Sesión iniciada', {
        description: `Bienvenido, ${supportProfile.nombre}`,
      });

      return { success: true };
    } catch (err) {
      toast.error('Error al iniciar sesión', {
        description: err.message || 'Credenciales incorrectas.',
      });
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setSoporteUser(null);
      toast.info('Sesión cerrada');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const value = {
    session,
    soporteUser,
    user: session?.user || null,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!session && !!soporteUser && soporteUser.activo === true,
    isSuperAdmin: soporteUser?.rol_soporte === 'superadmin',
    isTecnico: soporteUser?.rol_soporte === 'soporte_tecnico',
    isAuditor: soporteUser?.rol_soporte === 'auditor',
    rolSoporte: soporteUser?.rol_soporte || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

