import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  Sliders,
  History,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Database,
  Terminal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Organizaciones',
    path: '/organizaciones',
    icon: Building2,
  },
  {
    label: 'Administradores',
    path: '/administradores',
    icon: ShieldCheck,
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    icon: Users,
  },
  {
    label: 'Explorador Datos',
    path: '/explorador',
    icon: Database,
  },
  {
    label: 'Parametrización',
    path: '/parametrizacion',
    icon: Sliders,
  },
  {
    label: 'Auditoría',
    path: '/auditoria',
    icon: History,
  },
  {
    label: 'Logs de Supabase',
    path: '/logs',
    icon: Terminal,
  },
  {
    label: 'Soporte Técnico',
    path: '/soporte',
    icon: LifeBuoy,
  },
];

export function Sidebar() {
  const { soporteUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
          Z
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-white tracking-tight">Zenda Manager</span>
          <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">
            Soporte Central
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Módulos de Control
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-transform group-hover:scale-110',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-200" />}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2.5 rounded-xl bg-slate-800/50 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
            {soporteUser?.nombre?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {soporteUser?.nombre || 'Operador'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{soporteUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 px-1 flex justify-between items-center text-[10px] text-slate-500">
          <span>Versión 1.0.0</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-slate-800 text-slate-300 border-slate-700">
            {soporteUser?.rol_soporte || 'soporte'}
          </Badge>
        </div>
      </div>
    </aside>
  );
}

