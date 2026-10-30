import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa el correo y la contraseña.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    const res = await signIn(email.trim(), password.trim());
    if (res.success) {
      navigate('/');
    } else {
      setErrorMsg(res.error?.message || 'Error al iniciar sesión.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/25 mb-4">
            Z
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Zenda Manager</h1>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma de Soporte Central & Administración
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/60 border border-blue-800/60 px-3 py-1.5 rounded-lg w-fit">
            <ShieldCheck className="h-4 w-4" />
            <span>Acceso Exclusivo Personal Autorizado</span>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-950/50 border border-red-800/80 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="soporte@zenda.com"
                  className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-2 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-600/30"
            >
              Iniciar Sesión en Manager
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500">
            Los administradores móviles deben acceder directamente desde la app móvil Zenda.
          </div>
        </div>
      </div>
    </div>
  );
}

