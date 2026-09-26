import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { checkBackendHealth } from '../services/api';

export default function Navbar({ onOpenAiModal }) {
  const location = useLocation();
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const checkStatus = async () => {
    const res = await checkBackendHealth();
    setBackendStatus(res.success ? 'online' : 'offline');
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 12000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090909]/95 backdrop-blur-md border-b border-[#1F1F1F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand Signature */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-baseline gap-2.5 group">
              <span className="font-display font-bold text-lg tracking-tight text-[#F1F0EA] group-hover:text-[#B7FF2A] transition-colors">
                VAULT
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#858585] border-l border-[#262626] pl-2.5 hidden sm:inline">
                DISTRIBUTED STORAGE
              </span>
            </Link>

            {/* In-page Anchor Navigation (Editorial Style) */}
            <nav className="hidden lg:flex items-center gap-6 font-mono text-[11px] tracking-wider text-[#858585]">
              <button 
                onClick={() => scrollToSection('overview')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / OVERVIEW
              </button>
              <button 
                onClick={() => scrollToSection('topology')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / TOPOLOGY
              </button>
              <button 
                onClick={() => scrollToSection('objects')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / OBJECTS
              </button>
              <button 
                onClick={() => scrollToSection('nodes')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / NODES
              </button>
              <button 
                onClick={() => scrollToSection('integrity')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / INTEGRITY
              </button>
              <button 
                onClick={() => scrollToSection('events')}
                className="hover:text-[#F1F0EA] transition-colors focus:outline-none uppercase"
              >
                / EVENTS
              </button>
            </nav>
          </div>

          {/* Right Status & Meta */}
          <div className="flex items-center gap-4">
            
            {/* System Operational Indicator */}
            <div 
              onClick={checkStatus}
              className="flex items-center gap-2 px-2.5 py-1 border border-[#222222] bg-[#0E0E0E] rounded-xs cursor-pointer hover:border-[#333333] transition-colors"
              title="Coordinator health check"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' 
                  ? 'bg-[#B7FF2A] shadow-[0_0_8px_rgba(183,255,42,0.6)]' 
                  : backendStatus === 'checking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-[#555555]'
              }`} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#858585]">
                {backendStatus === 'online' ? (
                  <span className="text-[#F1F0EA]">SYSTEM OPERATIONAL</span>
                ) : backendStatus === 'checking' ? (
                  <span>CONNECTING...</span>
                ) : (
                  <span>LOCAL STANDBY</span>
                )}
              </span>
            </div>

            {/* Architecture Spec Pill */}
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#858585] border-l border-[#1F1F1F] pl-4">
              <span>N=3</span>
              <span className="text-[#333]">•</span>
              <span>SHA-256</span>
              <span className="text-[#333]">•</span>
              <span className="text-[#B7FF2A]/80">:8000</span>
            </div>

            {/* VaultOps AI modal trigger */}
            {onOpenAiModal && (
              <button
                onClick={onOpenAiModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider border border-[#2A2A2A] hover:border-[#B7FF2A]/50 hover:text-[#B7FF2A] text-[#858585] transition-all rounded-xs"
              >
                <span>AI_OPS</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 border border-[#222] text-[#858585] hover:text-[#F1F0EA] rounded-xs"
              aria-label="Toggle Navigation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#1F1F1F] font-mono text-xs flex flex-col gap-2">
            <button 
              onClick={() => { scrollToSection('overview'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / OVERVIEW
            </button>
            <button 
              onClick={() => { scrollToSection('topology'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / TOPOLOGY
            </button>
            <button 
              onClick={() => { scrollToSection('objects'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / OBJECTS
            </button>
            <button 
              onClick={() => { scrollToSection('nodes'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / NODES
            </button>
            <button 
              onClick={() => { scrollToSection('integrity'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / INTEGRITY
            </button>
            <button 
              onClick={() => { scrollToSection('events'); setMobileMenuOpen(false); }}
              className="text-left py-1 text-[#858585] hover:text-[#F1F0EA]"
            >
              / EVENTS
            </button>
            {onOpenAiModal && (
              <button 
                onClick={() => { onOpenAiModal(); setMobileMenuOpen(false); }}
                className="text-left py-1 text-[#B7FF2A]"
              >
                / OPEN VAULTOPS AI
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
