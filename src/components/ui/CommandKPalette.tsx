import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  LayoutDashboard,
  GitBranch,
  Kanban,
  Shield,
  Palette,
  Volume2,
  Lock,
  X,
  SlidersHorizontal,
  FileCode,
  DollarSign,
  Layers,
  Sparkles,
  Users,
  BookOpen,
  HardDrive,
  Share2,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../services/theme/ThemeContext';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { useDocsStore } from '../../stores/useDocsStore';
import { useIncidentStore } from '../../stores/useIncidentStore';
import type { CryptographicIncidentDeed } from '../../types/incident';
import { showToast } from '../Toast';

interface CommandItem {
  id: string;
  category: 'Views & Navigation' | 'DAG Nodes' | 'Vault Files' | 'Treasury Res' | 'Themes' | 'Audio Synthesis' | 'Emergency' | 'Corporate Docs';
  title: string;
  subtitle: string;
  badge?: string;
  icon: React.FC<any>;
  action: () => void;
}

export const CommandKPalette: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenSettingsDrawer?: () => void;
}> = ({ isOpen, onClose, onOpenSettingsDrawer }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { setTheme, presets } = useTheme();

  // Dynamic store access
  const nodes = useBlueprintStore((state) => state.nodes);
  const setSelectedNodeId = useBlueprintStore((state) => state.setSelectedNodeId);
  const setViewMode = useKanbanStore((state) => state.setViewMode);
  const manifests = useVaultStore((state) => state.manifests);
  const previewFile = useVaultStore((state) => state.previewFile);
  const openShareModal = useVaultStore((state) => state.openShareModal);
  const emitChaffBurst = useVaultStore((state) => state.emitChaffBurst);
  const docs = useDocsStore((state) => state.documents);
  const setActiveDocumentId = useDocsStore((state) => state.setActiveDocumentId);
  const openCockpit = useIncidentStore((state) => state.openCockpit);
  const incidents = useIncidentStore((state) => state.incidents);
  const acknowledgeIncident = useIncidentStore((state) => state.acknowledgeIncident);
  const triggerManualDrill = useIncidentStore((state) => state.triggerManualDrill);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'ACTIVE'),
    [incidents]
  );

  // Build command catalogue
  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // 1. Navigation & Views
      {
        id: 'open_left_nav',
        category: 'Views & Navigation',
        title: 'Open Navigation Drawer (Sol Menü)',
        subtitle: 'Slide out left-hand workspace navigation matrix and quick links',
        badge: 'MENU',
        icon: Menu,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          onClose();
          window.dispatchEvent(new CustomEvent('open-left-nav'));
        },
      },
      {
        id: 'view_kanban',
        category: 'Views & Navigation',
        title: 'Switch to Kanban Matrix View',
        subtitle: '5 fluid swimlanes with dependency unblocking & drag progression',
        badge: 'VIEW',
        icon: Kanban,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          setViewMode('kanban');
          navigate('/blueprint');
          onClose();
        },
      },
      {
        id: 'view_canvas',
        category: 'Views & Navigation',
        title: 'Switch to Blueprint DAG Canvas',
        subtitle: 'Spatial graph with kinetic Bezier curves & clearance enclaves',
        badge: 'VIEW',
        icon: GitBranch,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          setViewMode('canvas');
          navigate('/blueprint');
          onClose();
        },
      },
      {
        id: 'nav_treasury',
        category: 'Views & Navigation',
        title: 'Open Treasury & Cashflow Engine',
        subtitle: 'Multi-vault balance sheets and chained ledger proof',
        badge: 'ENGINE',
        icon: LayoutDashboard,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/dashboard');
          onClose();
        },
      },
      {
        id: 'nav_team',
        category: 'Views & Navigation',
        title: 'Open Founder Enclave & Team Governance Desk',
        subtitle: 'HR cockpit, operator activity matrix, and cryptographic invitation pipeline',
        badge: 'TEAM & HR',
        icon: Users,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/team');
          onClose();
        },
      },
      {
        id: 'nav_auth',
        category: 'Views & Navigation',
        title: 'Open Auth Vault Safe Door',
        subtitle: 'Titanium safe door, biometric simulation & rolling PINs',
        badge: 'AUTH',
        icon: Shield,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/auth');
          onClose();
        },
      },
      {
        id: 'nav_landing',
        category: 'Views & Navigation',
        title: 'Return to Institutional Portal',
        subtitle: 'Sovereign-OS architecture overview and ROI modeler',
        badge: 'PORTAL',
        icon: LayoutDashboard,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/');
          onClose();
        },
      },
      {
        id: 'open_settings_drawer',
        category: 'Views & Navigation',
        title: 'Open Settings & Ciphertext Inspector',
        subtitle: 'Inspect live client-side AES-GCM ciphertext in memory',
        badge: 'CONFIG',
        icon: SlidersHorizontal,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          onClose();
          if (onOpenSettingsDrawer) onOpenSettingsDrawer();
        },
      },
      {
        id: 'nav_docs',
        category: 'Views & Navigation',
        title: 'Open Corporate Notebook & Knowledge Wiki',
        subtitle: 'Zero-knowledge strategic documentation, Notion-style GFM editor, and clearance hierarchy',
        badge: 'DOCS',
        icon: BookOpen,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/docs');
          onClose();
        },
      },
      {
        id: 'nav_vault',
        category: 'Views & Navigation',
        title: 'Open Secure File Vault & Ingestion Cockpit',
        subtitle: 'Constant 4MB chunking, zero-knowledge ephemeral shares, and RAM previewer',
        badge: 'VAULT',
        icon: HardDrive,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/vault');
          onClose();
        },
      },
      {
        id: 'vault_ingest_prompt',
        category: 'Views & Navigation',
        title: 'Ingest Confidential File (Drag & Drop)',
        subtitle: 'Shred and envelope-encrypt arbitrary desktop files into 4MB constant blocks',
        badge: 'INGEST',
        icon: HardDrive,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/vault');
          onClose();
          showToast('Drop or select files in the ingestion zone to encrypt.', 'info');
        },
      },

      // 2. Blueprint DAG Nodes
      ...nodes.map((node) => ({
        id: `dag_node_${node.id}`,
        category: 'DAG Nodes' as const,
        title: node.title,
        subtitle: `Type: ${node.type.toUpperCase()} • Status: ${node.status.toUpperCase()} • Clearance: ${node.clearance}`,
        badge: node.clearance,
        icon: Layers,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          setSelectedNodeId(node.id);
          navigate('/blueprint');
          onClose();
          showToast(`Selected node "${node.title}"`, 'info');
        },
      })),

      // 3. Vault Manifests & Ephemeral Shares
      ...manifests.flatMap((m) => [
        {
          id: `vault_file_preview_${m.manifestId}`,
          category: 'Vault Files' as const,
          title: `RAM Preview: ${m.originalFileName}`,
          subtitle: `${(m.trueByteLength / 1024).toFixed(1)} KB • ${m.totalChunks} × 4MB Chunks • ${m.mimeType}`,
          badge: `L${m.clearanceLevel} PREVIEW`,
          icon: FileCode,
          action: () => {
            TactileSoundEngine.playMechanicalTransient();
            previewFile(m);
            onClose();
          },
        },
        {
          id: `vault_file_share_${m.manifestId}`,
          category: 'Vault Files' as const,
          title: `Generate Share Link: ${m.originalFileName}`,
          subtitle: `Zero-Knowledge ephemeral share link anchored in URL hash fragment`,
          badge: 'SHARE',
          icon: Share2,
          action: () => {
            TactileSoundEngine.playMechanicalTransient();
            openShareModal(m);
            navigate('/vault');
            onClose();
          },
        },
      ]),
      {
        id: 'chaff_burst_trigger',
        category: 'Vault Files',
        title: 'Dispatch Chaff Decoy Burst (+3 Blocks)',
        subtitle: 'Emit 3 synthetic 4MB CSPRNG noise blocks to disrupt size and timing analysis',
        badge: '+3 CHAFF',
        icon: Sparkles,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          emitChaffBurst(3);
          onClose();
        },
      },

      // 4. Treasury Reserves
      {
        id: 'treasury_commercial',
        category: 'Treasury Res',
        title: 'Commercial Bank Reserve',
        subtitle: '$5,120,000 USD • 75.7% Allocation • Tier-1 Institutional Escrow',
        badge: '$5.12M',
        icon: DollarSign,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/dashboard');
          onClose();
        },
      },
      {
        id: 'treasury_crypto',
        category: 'Treasury Res',
        title: 'Digital Asset Vault (USDT / BTC)',
        subtitle: '$1,205,000 USDT • 17.8% Allocation • Multi-Sig Smart Reserve',
        badge: '$1.20M',
        icon: DollarSign,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/dashboard');
          onClose();
        },
      },
      {
        id: 'treasury_forex',
        category: 'Treasury Res',
        title: 'Forex & Precious Metals (EUR / XAU)',
        subtitle: '€410,000 EUR ($440,000 USD) • Physical Zurich Gold Bars & Hedging',
        badge: '€410K',
        icon: DollarSign,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          navigate('/dashboard');
          onClose();
        },
      },

      // 5. Themes
      ...presets.map((p) => ({
        id: `theme_${p.id}`,
        category: 'Themes' as const,
        title: `Switch Theme → ${p.name}`,
        subtitle: `${p.subtitle} (Encrypted LocalStorage)`,
        badge: p.id.toUpperCase(),
        icon: Palette,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          setTheme(p.id);
          showToast(`Theme switched to ${p.name}`, 'info');
          onClose();
        },
      })),

      // 6. Audio Synthesis
      {
        id: 'audio_mechanical',
        category: 'Audio Synthesis',
        title: 'Trigger 480 Hz Mechanical Transient',
        subtitle: 'Crisp acoustic click for micro-interactions and tactile response',
        badge: '480 HZ',
        icon: Volume2,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          showToast('480 Hz Mechanical Transient emitted.', 'info');
        },
      },
      {
        id: 'audio_shimmer',
        category: 'Audio Synthesis',
        title: 'Trigger 1200 Hz -> 2400 Hz Unlock Shimmer',
        subtitle: 'Ascending sine shimmer for dependency resolution',
        badge: 'SHIMMER',
        icon: Sparkles,
        action: () => {
          TactileSoundEngine.playUnlockShimmer();
          showToast('Unlock Shimmer synthesized.', 'info');
        },
      },
      {
        id: 'audio_vault_lock',
        category: 'Audio Synthesis',
        title: 'Synthesize Vault Lock Descent',
        subtitle: '160 Hz -> 40 Hz dual sine descent',
        badge: 'ACOUSTIC',
        icon: Volume2,
        action: () => {
          TactileSoundEngine.playVaultLock();
          showToast('Vault lock descent emitted.', 'info');
        },
      },
      {
        id: 'audio_sub_bass',
        category: 'Audio Synthesis',
        title: 'Synthesize Ledger Seal Thud',
        subtitle: '65 Hz authoritative sub-bass pulse',
        badge: 'SUB-BASS',
        icon: Volume2,
        action: () => {
          TactileSoundEngine.playLedgerSealThud();
          showToast('Ledger seal thud emitted.', 'info');
        },
      },

      // 7. Emergency
      {
        id: 'open_emergency_cockpit',
        category: 'Emergency',
        title: 'Open Emergency Governance & Escalation Cockpit',
        subtitle: 'Cryptographic deed verification, signed webhooks, and routing rules',
        badge: 'COCKPIT',
        icon: ShieldAlert,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          onClose();
          openCockpit();
        },
      },
      {
        id: 'trigger_test_drill',
        category: 'Emergency',
        title: 'Trigger Threat Engine Test Egress Drill',
        subtitle: 'Simulate high-priority breach and test multi-channel egress dispatch',
        badge: 'DRILL',
        icon: AlertTriangle,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          triggerManualDrill('CRITICAL', 'SECURITY');
          showToast('Threat Engine drill initiated with signed deed.', 'warning');
          onClose();
        },
      },
      {
        id: 'duress_trigger',
        category: 'Emergency',
        title: 'Mount Decoy Workspace (Dynamic Duress Trigger)',
        subtitle: 'Deploy synthetic balance sheets and dispatch emergency decoy state',
        badge: 'DURESS',
        icon: Lock,
        action: () => {
          TactileSoundEngine.playVaultLock();
          navigate('/auth');
          showToast('Duress Protocol available at Vault Login.', 'warning');
          onClose();
        },
      },
      ...activeIncidents.filter((inc: CryptographicIncidentDeed) => !inc.isDuress).map((inc: CryptographicIncidentDeed) => ({
        id: `acknowledge_incident_${inc.id}`,
        category: 'Emergency' as const,
        title: `Acknowledge Active Incident: [${inc.code}]`,
        subtitle: `${inc.title} • Severity: ${inc.severity} • Sign audit ledger`,
        badge: inc.severity,
        icon: ShieldAlert,
        action: () => {
          TactileSoundEngine.playLedgerSealThud();
          acknowledgeIncident(inc.id, 'COMMAND_PALETTE_OPERATOR');
          showToast(`Deed ${inc.id.slice(0, 8)} acknowledged and committed to hash ledger.`, 'info');
          onClose();
        },
      })),

      // 8. Corporate Documents
      ...docs.map((doc) => ({
        id: `doc_${doc.id}`,
        category: 'Corporate Docs' as const,
        title: doc.title,
        subtitle: `Clearance: ${doc.clearance} • Status: ${doc.status.toUpperCase()}${doc.boundBlueprintNodeId ? ` • Bound DAG: ${doc.boundBlueprintNodeId}` : ''}`,
        badge: doc.isSealed ? 'SEALED' : doc.clearance,
        icon: BookOpen,
        action: () => {
          TactileSoundEngine.playMechanicalTransient();
          setActiveDocumentId(doc.id);
          navigate('/docs');
          onClose();
          showToast(`Opened document "${doc.title}"`, 'info');
        },
      })),
    ];

    return list;
  }, [
    nodes,
    manifests,
    presets,
    docs,
    navigate,
    onClose,
    onOpenSettingsDrawer,
    previewFile,
    openShareModal,
    emitChaffBurst,
    setSelectedNodeId,
    setTheme,
    setViewMode,
    setActiveDocumentId,
    activeIncidents,
    acknowledgeIncident,
    triggerManualDrill,
    openCockpit,
  ]);

  // Fuzzy filter
  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [allCommands, query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        TactileSoundEngine.playMechanicalTransient();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        TactileSoundEngine.playMechanicalTransient();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal Surface - Frosted Glass & Sub-pixel styling */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          background: 'rgba(12, 14, 18, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 24px rgba(78, 242, 210, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'enter-scale var(--dur-fast) var(--ease-out) both',
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-3)',
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'rgba(0, 0, 0, 0.35)',
          }}
        >
          <Search size={17} color="var(--clr-accent)" />
          <input
            autoFocus
            type="text"
            placeholder="Search DAG nodes, vault files, treasury, commands, or press arrow keys..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            {filtered.length} RESULTS
          </span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onClose}
            style={{ padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: 'var(--sp-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 'var(--sp-8)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              No matching commands, nodes, or files for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="interactive"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(78, 242, 210, 0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(78, 242, 210, 0.3)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(78, 242, 210, 0.15)' : 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-hairline)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} color={isSelected ? 'var(--clr-accent)' : 'var(--text-muted)'} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          color: isSelected ? 'var(--clr-accent)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--text-2xs)',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-hairline)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--sp-2) var(--sp-4)',
            borderTop: '1px solid var(--border-hairline)',
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>↑ ↓ NAVIGATE</span>
            <span>•</span>
            <span>ENTER SELECT</span>
            <span>•</span>
            <span>ESC CLOSE</span>
          </div>
          <span style={{ color: 'var(--clr-accent)', opacity: 0.8 }}>SOVEREIGN-OS COMMAND MATRIX</span>
        </div>
      </div>
    </div>
  );
};
