import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/context/AuthContext';
import { SupportProvider } from '@/context/SupportContext';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Organizaciones from '@/pages/Organizaciones';
import OrganizacionDetalle from '@/pages/OrganizacionDetalle';
import Administradores from '@/pages/Administradores';
import Usuarios from '@/pages/Usuarios';
import Parametrizacion from '@/pages/Parametrizacion';
import Auditoria from '@/pages/Auditoria';
import SoporteTecnico from '@/pages/SoporteTecnico';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SupportProvider>
          <Toaster richColors position="top-right" closeButton />
          <Routes>
            {/* Ruta pública de acceso */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas de Zenda Manager */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/organizaciones" element={<Organizaciones />} />
                <Route path="/organizaciones/:id" element={<OrganizacionDetalle />} />
                <Route path="/administradores" element={<Administradores />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/parametrizacion" element={<Parametrizacion />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/soporte" element={<SoporteTecnico />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SupportProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
