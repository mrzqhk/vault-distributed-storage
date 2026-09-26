import React, { useState, useEffect, useRef } from 'react';
import { fetchObjects, uploadObject, deleteObject, getEndpointUrl } from '../services/api';

function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export default function ObjectsTable({ onObjectSelect }) {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const fileInputRef = useRef(null);

  const loadObjects = async () => {
    setLoading(true);
    const result = await fetchObjects();
    if (result.success) {
      setObjects(result.objects);
    } else {
      setObjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadObjects();
    const interval = setInterval(loadObjects, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', file.name);

    const result = await uploadObject(formData);
    setUploading(false);

    if (result.success) {
      await loadObjects();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setUploadError(result.error || 'Upload failed');
    }
  };

  const handleDelete = async (objectId, key) => {
    if (!confirm(`Delete object "${key || objectId}"?`)) return;
    const res = await deleteObject(objectId, key);
    if (res.success) {
      await loadObjects();
    }
  };

  const copyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <section id="objects" className="py-10 border-b border-[#1F1F1F]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-4 border-b border-[#181818]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#B7FF2A]">
            SEC 03 // DATA PLANE
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[#F1F0EA] mt-1">
            Objects <span className="text-[#858585] font-light">/ Object Store</span>
          </h2>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-[#B7FF2A] hover:bg-[#CBFF4D] text-[#090909] font-semibold rounded-xs transition-colors disabled:opacity-50"
          >
            {uploading ? 'WRITING REPLICAS...' : '+ UPLOAD OBJECT'}
          </button>

          <button
            onClick={loadObjects}
            disabled={loading}
            className="px-2.5 py-1.5 font-mono text-xs text-[#858585] hover:text-[#F1F0EA] border border-[#222] hover:border-[#333] rounded-xs transition-colors"
            title="Reload objects"
          >
            REFRESH
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-950/20 border border-red-900/50 text-red-400 font-mono text-xs rounded-xs flex items-center justify-between">
          <span>Upload failed: {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-[#858585] hover:text-white">✕</button>
        </div>
      )}

      {/* Table Canvas */}
      <div className="border border-[#1F1F1F] bg-[#0C0C0C] rounded-xs overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1F1F1F] text-[#858585] text-[10px] tracking-wider uppercase bg-[#0E0E0E]">
              <th className="py-3 px-4 font-medium">OBJECT</th>
              <th className="py-3 px-4 font-medium">SIZE</th>
              <th className="py-3 px-4 font-medium">VERSION</th>
              <th className="py-3 px-4 font-medium">REPLICAS</th>
              <th className="py-3 px-4 font-medium">CHECKSUM</th>
              <th className="py-3 px-4 font-medium">STATUS</th>
              <th className="py-3 px-4 font-medium text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#181818]">
            {loading && objects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#666666]">
                  QUERYING OBJECT STORE ON :8000...
                </td>
              </tr>
            ) : objects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="text-sm font-display text-[#F1F0EA] mb-1">
                    NO OBJECTS STORED
                  </div>
                  <div className="text-xs text-[#666666] font-mono max-w-md mx-auto">
                    Use the upload button above, or write directly with curl:
                  </div>
                  <div className="mt-3 inline-block bg-[#121212] border border-[#222222] px-3 py-1.5 rounded-xs text-[11px] text-[#B7FF2A]">
                    curl -X POST http://localhost:8000/api/v1/objects -F "file=@final-demo.txt"
                  </div>
                </td>
              </tr>
            ) : (
              objects.map((obj) => {
                const checksum = obj.checksum_sha256 || obj.checksum || '';
                const shortChecksum = checksum ? `${checksum.substring(0, 10)}...` : 'SHA-256';
                const replicaCount = obj.replica_count || obj.replicas?.length || obj.replication_factor || 3;
                const repFactor = obj.replication_factor || 3;
                const objectId = obj.object_id || obj.id;
                const downloadUrl = getEndpointUrl(`v1/objects/${encodeURIComponent(objectId)}`);

                return (
                  <tr 
                    key={objectId}
                    className="hover:bg-[#121212] transition-colors"
                  >
                    {/* Object Key */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#F1F0EA] font-medium tracking-tight">
                          {obj.key || objectId}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#555] truncate max-w-xs mt-0.5">
                        {objectId}
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 text-[#858585]">
                      {formatBytes(obj.size_bytes || obj.size)}
                    </td>

                    {/* Version */}
                    <td className="py-3 px-4 text-[#858585]">
                      v{obj.version || 1}
                    </td>

                    {/* Replicas */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[#F1F0EA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B7FF2A]" />
                        {replicaCount} / {repFactor}
                      </span>
                    </td>

                    {/* Checksum */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => copyHash(checksum)}
                        className="text-[#858585] hover:text-[#B7FF2A] transition-colors text-left group"
                        title={checksum ? `Click to copy: ${checksum}` : 'SHA-256 Checksum'}
                      >
                        <span className="border-b border-[#333] group-hover:border-[#B7FF2A]">
                          {copiedHash === checksum ? 'COPIED ✓' : shortChecksum}
                        </span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] uppercase font-mono tracking-wider bg-[#B7FF2A]/10 text-[#B7FF2A] border border-[#B7FF2A]/30">
                        {obj.status || 'ACTIVE'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={downloadUrl}
                          download={obj.key || 'vault-object'}
                          className="text-[#858585] hover:text-[#F1F0EA] transition-colors text-[11px]"
                          title="Download binary object from cluster"
                        >
                          FETCH
                        </a>
                        <span className="text-[#333]">•</span>
                        <button
                          onClick={() => handleDelete(objectId, obj.key)}
                          className="text-[#666666] hover:text-red-400 transition-colors text-[11px]"
                          title="Purge object and replicas"
                        >
                          PURGE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="p-3 border-t border-[#1F1F1F] bg-[#0E0E0E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px] text-[#666666]">
          <span>STORAGE ENGINE: REST MULTIPART / BINARY</span>
          <span>REPLICATION PROTOCOL: PARALLEL FAN-OUT WITH SHA-256 ATTESTATION</span>
        </div>
      </div>
    </section>
  );
}
