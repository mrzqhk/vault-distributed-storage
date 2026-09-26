import React from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Editorial Heading */}
        <div className="border-b border-[#1F1F1F] pb-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            AUTHENTICATION // OPERATOR ACCESS
          </span>
          <h1 className="font-display font-medium text-3xl text-[#F1F0EA] tracking-tight mt-1">
            Access Vault
          </h1>
          <p className="mt-1 text-xs font-mono text-[#858585]">
            Distributed storage infrastructure control plane
          </p>
        </div>

        {/* Notice */}
        <div className="border border-[#1F1F1F] bg-[#0E0E0E] p-4 text-xs font-mono text-[#858585] rounded-xs">
          <span className="text-[#B7FF2A] block mb-1">LOCAL CLUSTER ACCESS:</span>
          Authentication is not required for local development. Full read/write storage endpoints are accessible without auth headers.
        </div>

        {/* Form Container */}
        <div className="border border-[#1F1F1F] bg-[#0C0C0C] p-6 rounded-xs">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#858585] mb-1.5">
                Operator Identifier
              </label>
              <input
                type="email"
                placeholder="operator@vault.internal"
                defaultValue="admin@vault.internal"
                disabled
                className="w-full px-3 py-2 bg-[#121212] border border-[#222] rounded-xs text-xs font-mono text-[#F1F0EA] opacity-75 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#858585] mb-1.5">
                Cluster Secret Token
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                defaultValue="vault-local-token"
                disabled
                className="w-full px-3 py-2 bg-[#121212] border border-[#222] rounded-xs text-xs font-mono text-[#F1F0EA] opacity-75 cursor-not-allowed focus:outline-none"
              />
            </div>

            <Link
              to="/dashboard"
              className="w-full py-2.5 px-4 bg-[#B7FF2A] hover:bg-[#CBFF4D] text-[#090909] font-mono text-xs uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>CONTINUE TO DASHBOARD</span>
              <span>→</span>
            </Link>
          </form>

          <div className="mt-4 pt-4 border-t border-[#181818] flex items-center justify-between font-mono text-[10px] text-[#666666]">
            <span>COORDINATOR: :8000</span>
            <Link to="/register" className="hover:text-[#F1F0EA]">REGISTER (SHELL)</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
