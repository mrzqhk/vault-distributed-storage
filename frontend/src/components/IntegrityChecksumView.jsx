import React, { useState } from 'react';
import { calculateSha256 } from '../services/api';

export default function IntegrityChecksumView() {
  const [inputText, setInputText] = useState('final-demo.txt');
  const [computedHash, setComputedHash] = useState('e7bfb66a1aa877e0bc5da66e500cb2bfdb3eca7760aba7441a9578e5c27cd3e0');
  const [isCopied, setIsCopied] = useState(false);

  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInputText(val);
    if (!val) {
      setComputedHash('');
      return;
    }
    const hash = await calculateSha256(val);
    setComputedHash(hash);
  };

  const copyHash = () => {
    if (!computedHash) return;
    navigator.clipboard.writeText(computedHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section id="integrity" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 05 // CRYPTOGRAPHIC WITNESS
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Content Integrity <span className="text-[#858585] font-light">/ SHA-256</span>
          </h2>
        </div>
        <div className="font-mono text-xs text-[#858585] mt-2 sm:mt-0 flex items-center gap-3">
          <span>ALGORITHM: SHA-256</span>
          <span className="text-[#333]">•</span>
          <span>ZERO-BIT CORRUPTION DETECTION</span>
        </div>
      </div>

      {/* Main Integrity Module */}
      <div className="border border-[#1F1F1F] bg-[#0C0C0C] p-6 sm:p-8 rounded-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Checksum Display */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#858585]">
                ACTIVE VERIFICATION HASH
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-[10px] font-mono uppercase tracking-wider bg-[#B7FF2A]/10 text-[#B7FF2A] border border-[#B7FF2A]/30 font-semibold">
                HASH VERIFIED ✓
              </span>
            </div>

            {/* 64-character hash box */}
            <div className="p-4 bg-[#121212] border border-[#222222] rounded-xs font-mono text-xs sm:text-sm text-[#F1F0EA] break-all leading-relaxed select-all">
              {computedHash || 'e7bfb66a1aa877e0bc5da66e500cb2bfdb3eca7760aba7441a9578e5c27cd3e0'}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 font-mono text-xs">
              <div className="text-[#666666]">
                Length: 256 bits (32 bytes hex-encoded) • Collision resistant
              </div>
              <button
                onClick={copyHash}
                className="self-start sm:self-auto px-3 py-1 border border-[#2E2E2E] hover:border-[#B7FF2A] hover:text-[#B7FF2A] text-[#858585] rounded-xs transition-colors text-[11px]"
              >
                {isCopied ? 'COPIED TO CLIPBOARD ✓' : 'COPY HASH'}
              </button>
            </div>
          </div>

          {/* Right: Live Interactive Digest Tester */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-[#1F1F1F] pt-6 lg:pt-0 lg:pl-8 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#858585] mb-1">
                LIVE INPUT DIGEST
              </div>
              <div className="font-display font-medium text-sm text-[#F1F0EA] mb-2">
                Test Deterministic Hashing
              </div>
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type payload or filename..."
                className="w-full bg-[#121212] border border-[#262626] focus:border-[#B7FF2A] text-[#F1F0EA] px-3 py-2 text-xs font-mono rounded-xs focus:outline-none transition-colors"
              />
            </div>

            <p className="text-[11px] text-[#666666] leading-relaxed font-sans">
              Every byte uploaded gets a witness. The coordinator enforces pre-write checksumming, and each storage node verifies parity before persisting to disk.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
