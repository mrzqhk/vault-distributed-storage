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
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
        {/* Navigation Bar */}
        <Navbar onOpenAiModal={() => setIsAiModalOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 text-xs text-slate-500 font-mono">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              VAULT Distributed Storage System &bull; Phase 1 Foundation
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>SQLite Metadata</span>
              <span>&bull;</span>
              <span>REST / API</span>
              <span>&bull;</span>
              <span>Replication W=2, R=1</span>
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
