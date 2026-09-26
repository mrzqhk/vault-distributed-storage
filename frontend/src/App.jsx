import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VaultOpsAIModal from './components/VaultOpsAIModal';

export default function App() {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#090909] text-[#F1F0EA] flex flex-col font-sans selection:bg-[#B7FF2A] selection:text-black">
        {/* Editorial Navbar */}
        <Navbar onOpenAiModal={() => setIsAiModalOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer / System Signature */}
        <footer className="border-t border-[#1F1F1F] bg-[#090909] py-8 text-xs font-mono text-[#858585]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-baseline justify-between gap-4">
            <div>
              <div className="font-display font-bold text-sm tracking-tight text-[#F1F0EA]">
                VAULT
              </div>
              <div className="text-[11px] text-[#666666] mt-0.5">
                Fault-tolerant distributed object storage
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#858585]">
              <span>COORDINATOR <strong className="text-[#B7FF2A] font-normal">:8000</strong></span>
              <span className="text-[#333]">•</span>
              <span>NODES <strong className="text-[#F1F0EA] font-normal">3</strong></span>
              <span className="text-[#333]">•</span>
              <span>REPLICATION <strong className="text-[#F1F0EA] font-normal">N=3</strong></span>
              <span className="text-[#333]">•</span>
              <span className="text-[#F1F0EA]">SHA-256</span>
            </div>
          </div>
        </footer>

        {/* VaultOps AI Modal */}
        <VaultOpsAIModal 
          isOpen={isAiModalOpen} 
          onClose={() => setIsAiModalOpen(false)} 
        />
      </div>
    </BrowserRouter>
  );
}
