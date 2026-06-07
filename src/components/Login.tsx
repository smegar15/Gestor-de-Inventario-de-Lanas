/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Sparkles, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  accounts: { username: string; name: string; role: 'admin' | 'staff'; passwordHash: string }[];
  onAddAccount: (username: string, name: string, role: 'admin' | 'staff', passwordHash: string) => boolean;
}

export default function Login({ onLogin, accounts, onAddAccount }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (isRegister) {
      if (!fullName) {
        setError('Por favor, indica tu nombre completo.');
        return;
      }
      const successReg = onAddAccount(username.toLowerCase().trim(), fullName.trim(), role, password);
      if (successReg) {
        setSuccess('¡Usuario registrado con éxito! Ya puedes iniciar sesión.');
        setIsRegister(false);
        setPassword('');
      } else {
        setError('El nombre de usuario ya está registrado.');
      }
    } else {
      const user = accounts.find(
        (acc) => acc.username === username.toLowerCase().trim() && acc.passwordHash === password
      );

      if (user) {
        onLogin({
          username: user.username,
          name: user.name,
          role: user.role,
        });
      } else {
        setError('Usuario o contraseña incorrectos. Pruebe con "admin" y contraseña "admin123".');
      }
    }
  };

  const loadDemoUser = (userType: 'admin' | 'staff') => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('maria');
      setPassword('maria123');
    }
    setError('');
  };

  return (
    <div id="login-screen" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4 font-sans selection:bg-amber-200">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 text-white relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12">
            <Sparkles size={200} />
          </div>
          
          <h1 id="brand-header" className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
            🧶 TejeStock
          </h1>
          <p className="text-orange-50/95 text-sm font-medium">
            Gestión inteligente de stock de lanas, hilados y mercería
          </p>
        </div>

        <div className="p-8">
          <div className="flex gap-4 mb-6 border-b border-gray-100 pb-1">
            <button
              id="tab-login"
              type="button"
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-all relative ${
                !isRegister ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Iniciar Sesión
              {!isRegister && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
              )}
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              className={`flex-1 pb-3 text-center font-semibold text-sm transition-all relative ${
                isRegister ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Registrar Empleado
              {isRegister && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
              )}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 text-green-700 text-xs rounded-xl flex items-center gap-2 border border-green-100"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. María López"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. admin"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-10 text-sm text-gray-800 transition"
                  required
                />
                <button
                  id="toggle-password-visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Rol de Acceso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="role-staff"
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`py-2 px-3 text-xs font-semibold border rounded-xl transition ${
                      role === 'staff'
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Encargado de Tienda (Staff)
                  </button>
                  <button
                    id="role-admin"
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 text-xs font-semibold border rounded-xl transition ${
                      role === 'admin'
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Administrador (Control Total)
                  </button>
                </div>
              </div>
            )}

            <button
              id="btn-submit"
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-orange-100 transition duration-150 text-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isRegister ? 'Registrar Cuenta' : 'Entrar al Sistema'}
            </button>
          </form>

          {!isRegister && (
            <div className="mt-8 border-t border-gray-100 pt-6">
              <span className="block text-center text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">
                Acceso Rápido de Demostración
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-demo-admin"
                  type="button"
                  onClick={() => loadDemoUser('admin')}
                  className="bg-orange-50/50 hover:bg-orange-50 text-orange-700 text-xs font-semibold py-2 px-3 rounded-xl transition border border-orange-100/30 text-center"
                >
                  Admin (admin)
                </button>
                <button
                  id="btn-demo-staff"
                  type="button"
                  onClick={() => loadDemoUser('staff')}
                  className="bg-amber-50/50 hover:bg-amber-50 text-amber-700 text-xs font-semibold py-2 px-3 rounded-xl transition border border-amber-100/20 text-center"
                >
                  Vendedor (maria)
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
