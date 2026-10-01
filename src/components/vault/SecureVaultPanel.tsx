/* ============================================================
   SOVEREIGN-OS — Secure File Vault Dashboard (BYOS Architecture)
   Top status ribbon, constant 4MB chunking drag-and-drop ingestion zone,
   live cryptographic telemetry, high-density inventory table,
   zero-knowledge ephemeral share generator, and diskless RAM preview.
   ============================================================ */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  UploadCloud,
  FileCode,
  HardDrive,
  Eye,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  Server,
  FileCheck,
  Share2,
  Search,
  Cloud,
  Sliders,
} from 'lucide-react';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { showToast } from '../Toast';
import { RamFilePreviewModal } from './RamFilePreviewModal';
import { SecureShareModal } from './SecureShareModal';
import { ByosCloudCockpitModal } from './ByosCloudCockpitModal';
import type { ClearanceLevel, StorageEndpoint } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getMimeBadge(mime: string, name: string) {
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return { label: 'PDF', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
  }
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|svg|webp)$/i.test(name)) {
    return { label: 'IMG', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
  }
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('archive') || /\.(zip|tar|gz|7z)$/i.test(name)) {
    return { label: 'ARCHIVE', bg: 'rgba(234, 179, 8, 0.12)', color: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
  }
  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    /\.(ts|tsx|js|jsx|py|rs|go|json|sql)$/i.test(name)
  ) {
    return { label: 'CODE', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
  }
  if (mime.startsWith('text/') || /\.(txt|md|csv)$/i.test(name)) {
    return { label: 'DOC', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
  }
  return { label: 'BIN', bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' };
}

export const SecureVaultPanel: React.FC = () => {
  const {
    manifests,
    activeClearance,
    storageEndpoint,
    ingestionProgress,
    chaffMetrics,
    isLoading,
    cloudTelemetry,
    openCockpitModal,
    loadVault,
    setClearance,
    setStorageEndpoint,
    ingestFile,
    previewFile,
    openShareModal,
    deleteFile,
    emitChaffBurst,
    toggleBackgroundChaff,
  } = useVaultStore();

  const { hasPermission } = usePermissionStore();
  const canUpload = hasPermission('vault:upload');
  const canDelete = hasPermission('vault:delete');
  const canViewClassified = hasPermission('vault:view_classified');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedClearanceForUpload, setSelectedClearanceForUpload] = useState<number>(1);
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) {
      showToast('Yetki Yetersiz: Dosya yüklemek için en az Çalışan yetkisi gereklidir.', 'warning');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await ingestFile(file, selectedClearanceForUpload);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) {
      showToast('Yetki Yetersiz: Dosya yüklemek için en az Çalışan yetkisi gereklidir.', 'warning');
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await ingestFile(file, selectedClearanceForUpload);
    }
  };

  // Filtered manifests based on search
  const filteredManifests = useMemo(() => {
    if (!searchFilter.trim()) return manifests;
    const q = searchFilter.toLowerCase();
    return manifests.filter(
      (m) =>
        m.originalFileName.toLowerCase().includes(q) ||
        m.mimeType.toLowerCase().includes(q) ||
        `level-${m.clearanceLevel}`.includes(q)
    );
  }, [manifests, searchFilter]);

  return (
    <div
      style={{
        padding: 'var(--sp-8)',
        maxWidth: 1240,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-6)',
      }}
    >
      {/* ── Top Header Ribbon & Telemetry ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: 'var(--sp-6)',
          flexWrap: 'wrap',
          gap: 'var(--sp-4)',
        }}
      >
        <div>
          <span className="label-overline">ZERO-KNOWLEDGE BYOS ENCLAVE</span>
          <h1 className="type-title" style={{ fontSize: 'var(--text-xl)', marginTop: 'var(--sp-1)' }}>
            RAM-Only File Vault &amp; Fixed 4MB Chunking
          </h1>
        </div>

        {/* Global Controls & Status Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {/* Active Cloud Provider & Sync Telemetry Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--text-2xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Cloud size={13} color="var(--clr-accent)" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {storageEndpoint.replace('_', ' ')}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {cloudTelemetry.synchronizedBlockCount} BLOCKS
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ color: 'var(--clr-positive)', fontVariantNumeric: 'tabular-nums' }}>
              {formatBytes(cloudTelemetry.totalRemoteBytes)}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                padding: '1px 5px',
                borderRadius: 2,
                background:
                  cloudTelemetry.syncState === 'SYNCING'
                    ? 'rgba(234, 179, 8, 0.15)'
                    : cloudTelemetry.syncState === 'BUFFERED_OFFLINE'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(16, 185, 129, 0.12)',
                color:
                  cloudTelemetry.syncState === 'SYNCING'
                    ? 'var(--clr-caution, #eab308)'
                    : cloudTelemetry.syncState === 'BUFFERED_OFFLINE'
                    ? 'var(--clr-accent, #ef4444)'
                    : 'var(--clr-positive, #10b981)',
                border: '1px solid currentColor',
              }}
            >
              {cloudTelemetry.syncState === 'SYNCING'
                ? `SYNCING (${cloudTelemetry.pendingQueueCount})`
                : cloudTelemetry.syncState === 'BUFFERED_OFFLINE'
                ? `OFFLINE (${cloudTelemetry.pendingQueueCount})`
                : 'SYNC IDLE'}
            </span>
          </div>

          {/* BYOS Cockpit Configuration Launcher */}
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => openCockpitModal()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', fontSize: 'var(--text-2xs)' }}
            title="Open BYOS Cloud Provider Configuration Cockpit"
          >
            <Sliders size={12} color="var(--clr-accent)" />
            <span>BYOS Cockpit</span>
          </button>

          {/* Storage Endpoint Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: 'var(--text-2xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Server size={12} color="var(--clr-accent)" />
            <span style={{ color: 'var(--text-muted)' }}>TARGET:</span>
            <select
              value={storageEndpoint}
              onChange={(e) => setStorageEndpoint(e.target.value as StorageEndpoint)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xs)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="VDS_LOCAL" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                VDS Local Enclave
              </option>
              <option value="AWS_S3" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                AWS S3 (SigV4)
              </option>
              <option value="CLOUDFLARE_R2" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                Cloudflare R2 (Zero Egress)
              </option>
              <option value="MINIO" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                Self-Hosted MinIO
              </option>
              <option value="GOOGLE_DRIVE" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                Google Drive Vault
              </option>
              <option value="WEBDAV" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                Self-Hosted WebDAV
              </option>
            </select>
          </div>

          {/* Spatial Clearance Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'] as ClearanceLevel[]).map((level, i) => (
              <button
                key={level}
                onClick={() => setClearance(level)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 2,
                  background: activeClearance === level ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${activeClearance === level ? 'var(--border-moderate)' : 'transparent'}`,
                  color: activeClearance === level ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                L{i + 1}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => loadVault()}
            style={{ padding: '5px 8px' }}
            title="Reload vault manifests"
          >
            <RefreshCw size={12} className={isLoading ? 'anim-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Status Metric Cards ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--sp-4)',
        }}
      >
        {/* Card 1: Quantum Block Size */}
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>FIXED BLOCK QUANTUM</span>
            <Layers size={12} color="var(--clr-accent)" />
          </div>
          <div style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 6 }}>
            4,194,304 B <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>(4 MB)</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
            24-Byte Nonce • CSPRNG noise defeats size fingerprinting
          </div>
        </div>

        {/* Card 2: Total Manifests */}
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>ENCRYPTED FILES VISIBLE</span>
            <HardDrive size={12} color="var(--clr-positive)" />
          </div>
          <div style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 6 }}>
            {manifests.length} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>FILES</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Spatial culling active at clearance {activeClearance}
          </div>
        </div>

        {/* Card 3: Chaff Counter-Intelligence */}
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--text-muted)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>CHAFF DEFENSE RATIO</span>
            <Sparkles size={12} color="var(--clr-caution)" />
          </div>
          <div style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 6 }}>
            {chaffMetrics.authenticChunks} / {chaffMetrics.chaffChunks}{' '}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>AUTHENTIC:CHAFF</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => emitChaffBurst(3)}
              style={{ fontSize: '0.62rem', padding: '2px 6px' }}
            >
              +3 Decoy Burst
            </button>
            <button
              className={`btn btn-xs ${chaffMetrics.isChaffing ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleBackgroundChaff}
              style={{ fontSize: '0.62rem', padding: '2px 6px' }}
            >
              {chaffMetrics.isChaffing ? 'Chaffing Active' : 'Auto Chaff'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Drag & Drop Ingestion Zone ───────────────────────────── */}
      <div
        onDragOver={canUpload ? handleDragOver : undefined}
        onDragLeave={canUpload ? handleDragLeave : undefined}
        onDrop={canUpload ? handleDrop : undefined}
        onClick={() => {
          if (!canUpload) {
            showToast('Yetki Yetersiz: Dosya yüklemek için en az Çalışan (L2) yetkisi gereklidir.', 'warning');
            return;
          }
          fileInputRef.current?.click();
        }}
        style={{
          padding: 'var(--sp-8) var(--sp-6)',
          borderRadius: 'var(--radius-lg)',
          background: !canUpload ? 'rgba(107, 114, 128, 0.04)' : dragOver ? 'rgba(78, 242, 210, 0.05)' : 'var(--bg-secondary)',
          border: `1.5px dashed ${!canUpload ? 'var(--border-hairline)' : dragOver ? 'var(--clr-accent)' : 'var(--border-moderate)'}`,
          cursor: canUpload ? 'pointer' : 'not-allowed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--sp-3)',
          transition: 'all var(--dur-fast) var(--ease-out)',
          boxShadow: dragOver ? '0 0 24px rgba(78, 242, 210, 0.15)' : 'none',
        }}
      >
        <input ref={fileInputRef} type="file" onChange={handleFileInputChange} style={{ display: 'none' }} disabled={!canUpload} />
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: canUpload ? 'var(--bg-surface)' : 'var(--bg-secondary)',
            border: `1px solid ${canUpload ? 'var(--border-subtle)' : 'var(--border-hairline)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {canUpload ? (
            <UploadCloud size={22} color="var(--clr-accent)" />
          ) : (
            <Lock size={22} color="var(--text-muted)" />
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          {canUpload ? (
            <>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                Drag confidential files to shred &amp; envelope-encrypt into 4MB blocks
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Accepts PDF contracts, high-res imagery, ZIP archives &amp; source code • 24-byte nonce AES-256-GCM • Zero
                disk writes
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
                🔒 KASAYA YÜKLEME YETKİNİZ YOK
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Stajyer rolü dosya yükleme yetkisine sahip değildir. En az Çalışan (L2) yetkisi gereklidir.
              </div>
            </>
          )}
        </div>

        {/* Upload Clearance Selector */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 'var(--sp-2)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>CLASSIFICATION TIER:</span>
          {[1, 2, 3, 4].map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedClearanceForUpload(tier)}
              style={{
                padding: '2px 8px',
                borderRadius: 2,
                background: selectedClearanceForUpload === tier ? 'var(--bg-primary)' : 'transparent',
                border: `1px solid ${selectedClearanceForUpload === tier ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                color: selectedClearanceForUpload === tier ? 'var(--clr-accent)' : 'var(--text-muted)',
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              Level-{tier}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Ingestion Telemetry Strip ─────────────────────── */}
      {ingestionProgress && (
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--clr-accent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
            animation: 'enter-up 0.2s ease-out both',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={13} className="anim-spin" color="var(--clr-accent)" />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ingestionProgress.fileName}</span>
              <span style={{ color: 'var(--text-muted)' }}>({formatBytes(ingestionProgress.totalBytes)})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {ingestionProgress.paddingBytes > 0 && (
                <span style={{ color: 'var(--clr-caution)', fontSize: '0.64rem' }}>
                  PADDING: +{formatBytes(ingestionProgress.paddingBytes)} CSPRNG NOISE
                </span>
              )}
              <span style={{ color: 'var(--clr-accent)', textTransform: 'uppercase', fontWeight: 600 }}>
                {ingestionProgress.status} ({ingestionProgress.processedChunks}/{ingestionProgress.totalChunks} BLOCKS)
              </span>
              {ingestionProgress.elapsedMs > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.64rem' }}>
                  {ingestionProgress.elapsedMs}ms
                </span>
              )}
            </div>
          </div>

          {/* Multi-segment Progress Bar */}
          <div
            style={{
              width: '100%',
              height: 5,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(ingestionProgress.processedChunks / ingestionProgress.totalChunks) * 100}%`,
                background: 'linear-gradient(90deg, var(--clr-accent) 0%, #3b82f6 100%)',
                transition: 'width 150ms ease-out',
              }}
            />
          </div>

          {/* Fragment Breakdown with Content-Addressed Hashes */}
          {ingestionProgress.chunks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 90, overflowY: 'auto' }}>
              {ingestionProgress.chunks.map((ch) => (
                <div
                  key={ch.sequence}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 2,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <FileCheck size={10} color="var(--clr-positive)" />
                  <span>#{ch.sequence}</span>
                  <span style={{ color: 'var(--clr-accent)' }}>{ch.hash.substring(0, 14)}...bin</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── High-Density File Inventory Table ───────────────────── */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--sp-3)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} color="var(--clr-accent)" />
            <span>BLIND STORAGE INVENTORY ({filteredManifests.length} OF {manifests.length} RECORDS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search filter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 6px',
              }}
            >
              <Search size={11} color="var(--text-muted)" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter files..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  width: 130,
                }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)' }}>AES-256-GCM BYOS</span>
          </div>
        </div>

        {filteredManifests.length === 0 ? (
          <div
            style={{
              padding: 'var(--sp-12)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {manifests.length === 0
              ? `No zero-knowledge files in storage for clearance level ${activeClearance}. Drag and drop files above to ingest.`
              : `No files matched filter "${searchFilter}".`}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '10px 14px' }}>DOCUMENT NAME</th>
                  <th style={{ padding: '10px 14px' }}>TYPE</th>
                  <th style={{ padding: '10px 14px' }}>UNPADDED SIZE</th>
                  <th style={{ padding: '10px 14px' }}>CHUNKS (4MB)</th>
                  <th style={{ padding: '10px 14px' }}>CLEARANCE</th>
                  <th style={{ padding: '10px 14px' }}>SEAL DATE</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredManifests.map((man) => {
                  const badge = getMimeBadge(man.mimeType, man.originalFileName);
                  const isClassified = man.clearanceLevel >= 3;
                  const displayName = (isClassified && !canViewClassified)
                    ? '[GİZLİ DOSYA — KISITLI ERİŞİM]'
                    : man.originalFileName;

                  return (
                    <tr
                      key={man.manifestId}
                      style={{
                        borderBottom: '1px solid var(--border-hairline)',
                        transition: 'background var(--dur-fast) var(--ease-out)',
                        opacity: (isClassified && !canViewClassified) ? 0.6 : 1,
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(isClassified && !canViewClassified) ? (
                            <Lock size={13} color="var(--text-muted)" />
                          ) : (
                            <FileCode size={13} color="var(--clr-accent)" />
                          )}
                          <span style={{ color: (isClassified && !canViewClassified) ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: (isClassified && !canViewClassified) ? 'italic' : 'normal' }}>
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 2,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            fontSize: '0.62rem',
                            fontWeight: 600,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          color: 'var(--text-secondary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatBytes(man.trueByteLength)}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--clr-accent)' }}>
                        {man.totalChunks} × 4MB
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 2,
                            background: 'var(--clr-accent-alpha)',
                            color: 'var(--clr-accent)',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                          }}
                        >
                          LEVEL-{man.clearanceLevel}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                        {new Date(man.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => previewFile(man)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem' }}
                            title="Reconstitute file in volatile RAM"
                          >
                            <Eye size={11} />
                            <span>Preview</span>
                          </button>

                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => openShareModal(man)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem' }}
                            title="Generate zero-knowledge ephemeral share link"
                          >
                            <Share2 size={11} />
                            <span>Share</span>
                          </button>

                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              if (!canDelete) {
                                showToast('Yetki Yetersiz: Dosya silmek için Yönetici (L4) yetkisi gereklidir.', 'error');
                                return;
                              }
                              deleteFile(man.manifestId);
                            }}
                            disabled={!canDelete}
                            style={{
                              color: canDelete ? 'var(--clr-negative)' : 'var(--text-muted)',
                              padding: 4,
                              opacity: canDelete ? 1 : 0.4,
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                            }}
                            title={canDelete ? 'Wipe fragments from vault' : 'Silme yetkisi yok (Yönetici gerekli)'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diskless RAM Previewer Modal */}
      <RamFilePreviewModal />

      {/* Zero-Knowledge Ephemeral Share Modal */}
      <SecureShareModal />

      {/* BYOS Cloud Provider Configuration Cockpit */}
      <ByosCloudCockpitModal />
    </div>
  );
};
