import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Lock, Mail, User, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Do not create fake authentication per Phase 1 instructions
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Branding header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-wider text-white">
            REGISTER OPERATOR
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Create credentials for Vault cluster administration
          </p>
        </div>

        {/* Phase 1 Notice Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-300">
          <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300 block mb-0.5">Phase 1 UI Structure</span>
            User registration and identity management are not active in Phase 1. This form establishes the visual layout structure.
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Full Name / Handle
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Storage Admin"
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="admin@vault.internal"
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
                Desired Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled
              className="w-full py-2.5 px-4 bg-slate-800 text-slate-500 rounded-lg text-xs font-mono font-semibold cursor-not-allowed border border-slate-700/60 mt-2"
            >
              Create Account (Pending Phase 2)
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <Link to="/login" className="hover:text-cyan-400 transition-colors">
              Already registered? Sign in
            </Link>
            <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              Enter Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
