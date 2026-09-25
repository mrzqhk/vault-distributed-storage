import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, Shield, Bot, LayoutDashboard, LogIn, UserPlus, Menu, X } from 'lucide-react';
import SystemStatusBadge from './SystemStatusBadge';

export default function Navbar({ onOpenAiModal }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-all">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono tracking-wider text-white">
                    VAULT
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/80">
                    Phase 1
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans hidden sm:block">
                  Distributed Storage Control Plane
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Real System Status Badge */}
            <SystemStatusBadge />

            {/* Nav Links */}
            <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive('/dashboard') || isActive('/')
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>

              <Link
                to="/login"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive('/login')
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>

              <Link
                to="/register"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive('/register')
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </nav>

            {/* VaultOps AI Button */}
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-all shadow-sm shadow-cyan-900/20 active:scale-95"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>VaultOps AI</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <SystemStatusBadge />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 border-t border-slate-800 flex flex-col gap-2">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              Dashboard
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              <LogIn className="w-4 h-4 text-slate-400" />
              Login (UI Shell)
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
            >
              <UserPlus className="w-4 h-4 text-slate-400" />
              Register (UI Shell)
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAiModal();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-cyan-950/40 border border-cyan-800 text-cyan-300"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              VaultOps AI
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
