import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const SupportContext = createContext(null);

export function SupportProvider({ children }) {
  const [selectedOrgId, setSelectedOrgIdState] = useState(() => {
    return localStorage.getItem('zenda_support_active_org_id') || null;
  });
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(false);

  const fetchOrgDetails = useCallback(async (orgId) => {
    if (!orgId) {
      setSelectedOrg(null);
      return;
    }
    setLoadingOrg(true);
    try {
      const { data, error } = await supabase
        .from('organizaciones')
        .select(`
          *,
          admin:profiles!organizaciones_admin_id_fkey(
            id,
            nombre,
            apellido,
            email,
            telefono
          )
        `)
        .eq('id', orgId)
        .maybeSingle();

      if (!error && data) {
        setSelectedOrg(data);
      } else {
        // Fallback simple si la FK fkey tiene otro nombre
        const { data: simpleData } = await supabase
          .from('organizaciones')
          .select('*')
          .eq('id', orgId)
          .maybeSingle();
        setSelectedOrg(simpleData || null);
      }
    } catch (err) {
      console.warn('Error fetching selected organization:', err);
    } finally {
      setLoadingOrg(false);
    }
  }, []);

  const setSelectedOrgId = (id) => {
    if (id) {
      localStorage.setItem('zenda_support_active_org_id', id);
    } else {
      localStorage.removeItem('zenda_support_active_org_id');
    }
    setSelectedOrgIdState(id);
    fetchOrgDetails(id);
  };

  const clearSelectedOrg = () => {
    setSelectedOrgId(null);
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
    }
  }, [selectedOrgId, fetchOrgDetails]);

  const value = {
    selectedOrgId,
    selectedOrg,
    setSelectedOrgId,
    clearSelectedOrg,
    loadingOrg,
    isOrgSelected: Boolean(selectedOrgId),
    refreshSelectedOrg: () => fetchOrgDetails(selectedOrgId),
  };

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport debe ser usado dentro de un SupportProvider');
  }
  return context;
}

