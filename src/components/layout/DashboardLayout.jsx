import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SupportBanner } from './SupportBanner';

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <SupportBanner />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

