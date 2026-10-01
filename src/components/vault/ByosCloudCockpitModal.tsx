/* ============================================================
   SOVEREIGN-OS — BYOS Cloud Provider Configuration Cockpit
   Multi-cloud adapter control room for AWS S3, Cloudflare R2, MinIO,
   Google Drive, WebDAV, and VDS Local storage.
   Enforces client-side AES-256-GCM credential sealing via Master KEK
   and interactive non-destructive latency verification drills.
   ============================================================ */

import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Cloud,
  Lock,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  Radio,
} from 'lucide-react';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type {
  StorageEndpoint,
  CloudProviderConfig,
  CloudProviderCredentials,
} from '../../types';

export const ByosCloudCockpitModal: React.FC = () => {
  const {
    isCockpitOpen,
    closeCockpitModal,
    cloudConfig,
    cloudTelemetry,
    isTestingCloud,
    lastDrillResult,
    activeCredentialsMasked,
    setCloudConfig,
    saveCloudCredentials,
    testCloudConnection,
    setStorageEndpoint,
  } = useVaultStore();

  const [selectedProvider, setSelectedProvider] = useState<StorageEndpoint>(cloudConfig.provider);
  const [endpointUrl, setEndpointUrl] = useState(cloudConfig.endpointUrl);
  const [bucketName, setBucketName] = useState(cloudConfig.bucketName);
  const [region, setRegion] = useState(cloudConfig.region);

  // Editable credentials
  const [accessKeyId, setAccessKeyId] = useState(activeCredentialsMasked.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = useState(activeCredentialsMasked.secretAccessKey || '');
  const [sessionToken, setSessionToken] = useState(activeCredentialsMasked.sessionToken || '');
  const [googleDriveToken, setGoogleDriveToken] = useState(activeCredentialsMasked.googleDriveAccessToken || '');
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState(activeCredentialsMasked.googleDriveFolderId || '');
  const [webdavUsername, setWebdavUsername] = useState(activeCredentialsMasked.webdavUsername || '');
  const [webdavPassword, setWebdavPassword] = useState(activeCredentialsMasked.webdavPassword || '');

  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize fields when modal opens or cloudConfig changes
  useEffect(() => {
    if (isCockpitOpen) {
      setSelectedProvider(cloudConfig.provider);
      setEndpointUrl(cloudConfig.endpointUrl);
      setBucketName(cloudConfig.bucketName);
      setRegion(cloudConfig.region);
      setAccessKeyId(activeCredentialsMasked.accessKeyId || '');
      setSecretAccessKey(activeCredentialsMasked.secretAccessKey || '');
      setSessionToken(activeCredentialsMasked.sessionToken || '');
      setGoogleDriveToken(activeCredentialsMasked.googleDriveAccessToken || '');
      setGoogleDriveFolderId(activeCredentialsMasked.googleDriveFolderId || '');
      setWebdavUsername(activeCredentialsMasked.webdavUsername || '');
      setWebdavPassword(activeCredentialsMasked.webdavPassword || '');
    }
  }, [isCockpitOpen, cloudConfig, activeCredentialsMasked]);

  // Handle provider switch in the picker
  const handleSelectProvider = (prov: StorageEndpoint) => {
    TactileSoundEngine.playClick();
    setSelectedProvider(prov);

    // Apply defaults if switching to a different provider
    if (prov === 'AWS_S3') {
      setEndpointUrl('https://s3.us-east-1.amazonaws.com');
      setBucketName(bucketName || 'sovereign-vault-enclave');
      setRegion('us-east-1');
    } else if (prov === 'CLOUDFLARE_R2') {
      setEndpointUrl('https://<account_id>.r2.cloudflarestorage.com');
      setBucketName(bucketName || 'enterprise-enclave-vault-01');
      setRegion('auto');
    } else if (prov === 'MINIO') {
      setEndpointUrl('http://localhost:9000');
      setBucketName(bucketName || 'sovereign-minio-enclave');
      setRegion('us-east-1');
    } else if (prov === 'GOOGLE_DRIVE') {
      setEndpointUrl('https://www.googleapis.com/drive/v3');
      setBucketName('Sovereign-OS Enclave Folder');
      setRegion('global');
    } else if (prov === 'WEBDAV') {
      setEndpointUrl('https://dav.sovereign-vault.corp/remote.php/webdav');
      setBucketName('vault_chunks');
      setRegion('global');
    } else {
      setEndpointUrl('local://indexeddb/chunk_storage');
      setBucketName('vds_local_enclave');
      setRegion('localhost');
    }
  };

  const handleSaveAndApply = async () => {
    TactileSoundEngine.playClick();
    setIsSaving(true);

    const updatedConfig: CloudProviderConfig = {
      ...cloudConfig,
      provider: selectedProvider,
      endpointUrl,
      bucketName,
      region,
      enabled: true,
    };

    const creds: CloudProviderCredentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      sessionToken: sessionToken.trim() || undefined,
      googleDriveAccessToken: googleDriveToken.trim() || undefined,
      googleDriveFolderId: googleDriveFolderId.trim() || undefined,
      webdavUsername: webdavUsername.trim() || undefined,
      webdavPassword: webdavPassword.trim() || undefined,
    };

    setCloudConfig(updatedConfig);
    setStorageEndpoint(selectedProvider);

    if (selectedProvider !== 'VDS_LOCAL') {
      await saveCloudCredentials(creds);
    }

    setIsSaving(false);
    showToast(`${selectedProvider.replace('_', ' ')} configured as active storage provider.`, 'success');
  };

  const handleRunLatencyDrill = async () => {
    TactileSoundEngine.playClick();
    const testCfg: CloudProviderConfig = {
      ...cloudConfig,
      provider: selectedProvider,
      endpointUrl,
      bucketName,
      region,
      enabled: true,
    };

    const testCreds: CloudProviderCredentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      sessionToken: sessionToken.trim() || undefined,
      googleDriveAccessToken: googleDriveToken.trim() || undefined,
      googleDriveFolderId: googleDriveFolderId.trim() || undefined,
      webdavUsername: webdavUsername.trim() || undefined,
      webdavPassword: webdavPassword.trim() || undefined,
    };

    await testCloudConnection(testCfg, testCreds);
  };

  if (!isCockpitOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: 'var(--sp-4)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCockpitModal();
      }}
    >
      <div
        className="anim-scale-in"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── Modal Header ───────────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--clr-accent-alpha, rgba(239, 68, 68, 0.15))',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={15} color="var(--clr-accent)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>
                  BYOS Cloud Provider Configuration Cockpit
                </h2>
                <span
                  className="label-mono"
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--clr-positive)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '1px 6px',
                    borderRadius: 2,
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  SIGV4 &amp; DIRECT EGRESS
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Client-Side Authenticated Cloud Egress with Master KEK Sealed Credentials
              </p>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              TactileSoundEngine.playClick();
              closeCockpitModal();
            }}
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-6)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-5)',
          }}
        >
          {/* Provider Selector Strip */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 8 }}>
              Target Storage Architecture
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(
                [
                  { id: 'VDS_LOCAL', label: 'Local VDS Enclave', desc: 'IndexedDB volatile 4MB vault' },
                  { id: 'AWS_S3', label: 'Amazon Web Services S3', desc: 'SigV4 direct client PUT/GET' },
                  { id: 'CLOUDFLARE_R2', label: 'Cloudflare R2', desc: 'Zero egress fee S3 bucket' },
                  { id: 'MINIO', label: 'Self-Hosted MinIO', desc: 'On-premise enterprise cluster' },
                  { id: 'GOOGLE_DRIVE', label: 'Google Drive', desc: 'OAuth direct multipart API' },
                  { id: 'WEBDAV', label: 'Standard WebDAV', desc: 'HTTP Basic/Bearer storage' },
                ] as const
              ).map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleSelectProvider(prov.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-surface)' : 'var(--bg-primary)',
                      border: `1px solid ${isSelected ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {prov.label}
                      </span>
                      {isSelected && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--clr-accent)',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {prov.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Invariant Notice */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(78, 242, 210, 0.04)',
              border: '1px solid rgba(78, 242, 210, 0.18)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="var(--clr-accent)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Zero-Knowledge Invariant:</strong> Credentials entered below are sealed with your Master
              KEK using authenticated <strong>AES-256-GCM</strong> directly in client IndexedDB. Bulk 4MB binary
              payloads are signed in-browser via Web Crypto and stream directly to your bucket without proxying.
            </span>
          </div>

          {/* Configuration Fields for Selected Provider */}
          {selectedProvider !== 'VDS_LOCAL' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {/* Endpoint & Region */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-3)' }}>
                <div>
                  <label className="label-overline">Endpoint URL</label>
                  <input
                    type="text"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://s3.us-east-1.amazonaws.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label className="label-overline">Target Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="us-east-1 / auto"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Bucket / Folder Name */}
              <div>
                <label className="label-overline">
                  {selectedProvider === 'GOOGLE_DRIVE' ? 'Google Drive Target Folder ID (Optional)' : 'Bucket / Container Name'}
                </label>
                <input
                  type="text"
                  value={selectedProvider === 'GOOGLE_DRIVE' ? googleDriveFolderId : bucketName}
                  onChange={(e) =>
                    selectedProvider === 'GOOGLE_DRIVE'
                      ? setGoogleDriveFolderId(e.target.value)
                      : setBucketName(e.target.value)
                  }
                  placeholder={
                    selectedProvider === 'GOOGLE_DRIVE'
                      ? 'e.g. 1a2b3c4d5e6f7g8h (Leave empty for Root)'
                      : 'e.g. enterprise-vault-chunks-01'
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-moderate)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* S3 / R2 / MinIO Credentials */}
              {(selectedProvider === 'AWS_S3' ||
                selectedProvider === 'CLOUDFLARE_R2' ||
                selectedProvider === 'MINIO') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                    <div>
                      <label className="label-overline">Access Key ID</label>
                      <input
                        type="text"
                        value={accessKeyId}
                        onChange={(e) => setAccessKeyId(e.target.value)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-moderate)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="label-overline">Secret Access Key</label>
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.62rem',
                          }}
                        >
                          {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                          {showSecret ? 'Mask' : 'Reveal'}
                        </button>
                      </div>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={secretAccessKey}
                        onChange={(e) => setSecretAccessKey(e.target.value)}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-moderate)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-xs)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-overline">Session Token (Optional / STS)</label>
                    <input
                      type="password"
                      value={sessionToken}
                      onChange={(e) => setSessionToken(e.target.value)}
                      placeholder="Optional temporary session token"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-moderate)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Google Drive Credentials */}
              {selectedProvider === 'GOOGLE_DRIVE' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="label-overline">Scoped OAuth Access Token (Bearer)</label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.62rem',
                      }}
                    >
                      {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showSecret ? 'Mask' : 'Reveal'}
                    </button>
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={googleDriveToken}
                    onChange={(e) => setGoogleDriveToken(e.target.value)}
                    placeholder="ya29.a0AfH6SM..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Requires <code>https://www.googleapis.com/auth/drive.file</code> scope for non-invasive file access.
                  </div>
                </div>
              )}

              {/* WebDAV Credentials */}
              {selectedProvider === 'WEBDAV' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                  <div>
                    <label className="label-overline">WebDAV Username</label>
                    <input
                      type="text"
                      value={webdavUsername}
                      onChange={(e) => setWebdavUsername(e.target.value)}
                      placeholder="sovereign_operator"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-moderate)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label className="label-overline">WebDAV Password / Token</label>
                    <input
                      type="password"
                      value={webdavPassword}
                      onChange={(e) => setWebdavPassword(e.target.value)}
                      placeholder="App-specific password"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-moderate)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 'var(--sp-6)',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center',
              }}
            >
              <HardDrive size={32} color="var(--clr-positive)" style={{ margin: '0 auto var(--sp-2)' }} />
              <h3 className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
                Air-Gapped Client IndexedDB Vault
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 460, margin: '8px auto 0' }}>
                Encrypted constant 4MB fragments reside strictly within the browser volatile storage sandbox.
                Zero remote telemetry, zero cloud egress, and zero external network dependencies.
              </p>
            </div>
          )}

          {/* Telemetry Status Strip & Latency Drill Result */}
          <div
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio
                  size={14}
                  color={
                    cloudConfig.status === 'CONNECTED'
                      ? 'var(--clr-positive)'
                      : cloudConfig.status === 'ERROR'
                      ? 'var(--clr-accent)'
                      : 'var(--text-muted)'
                  }
                />
                <span className="label-mono" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  PROVIDER STATUS: {cloudConfig.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                <span>
                  ROUNDTRIP LATENCY:{' '}
                  <strong style={{ color: 'var(--clr-accent)' }}>
                    {cloudConfig.lastLatencyMs ? `${cloudConfig.lastLatencyMs} ms` : '—'}
                  </strong>
                </span>
                <span>
                  SYNCED BLOCKS:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{cloudTelemetry.synchronizedBlockCount}</strong>
                </span>
              </div>
            </div>

            {lastDrillResult && (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: lastDrillResult.success ? 'var(--clr-positive)' : 'var(--clr-accent)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: lastDrillResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${lastDrillResult.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}
              >
                {lastDrillResult.message}
              </div>
            )}
          </div>
        </div>

        {/* ── Modal Footer ───────────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRunLatencyDrill}
            disabled={isTestingCloud}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Zap size={13} className={isTestingCloud ? 'anim-spin' : ''} color="var(--clr-accent)" />
            {isTestingCloud ? 'Executing Probe...' : 'Test Connection & Latency Drill'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                TactileSoundEngine.playClick();
                closeCockpitModal();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveAndApply}
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Lock size={13} />
              {isSaving ? 'Sealing...' : 'Seal & Apply Cloud Adapter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
