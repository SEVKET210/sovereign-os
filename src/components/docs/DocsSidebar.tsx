import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Search,
  Shield,
  Lock,
  ChevronRight,
  ChevronDown,
  Trash2,
  ScrollText,
  FileCode,
  Layers,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { useDocsStore } from '../../stores/useDocsStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import type { ClearanceLevel, CorporateDocument } from '../../types';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export const DocsSidebar: React.FC = () => {
  const activeClearance = useDocsStore((state) => state.activeClearance);
  const setActiveClearance = useDocsStore((state) => state.setActiveClearance);
  const folders = useDocsStore((state) => state.folders);
  const documents = useDocsStore((state) => state.documents);
  const activeDocumentId = useDocsStore((state) => state.activeDocumentId);
  const setActiveDocumentId = useDocsStore((state) => state.setActiveDocumentId);
  const createDocument = useDocsStore((state) => state.createDocument);
  const createFolder = useDocsStore((state) => state.createFolder);
  const deleteDocument = useDocsStore((state) => state.deleteDocument);

  const { hasPermission, canAccessClearance } = usePermissionStore();
  const canEdit = hasPermission('docs:edit');
  const canDelete = hasPermission('docs:delete');

  const [search, setSearch] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleFolder = (folderId: string) => {
    TactileSoundEngine.playClick();
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleClearanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveClearance(e.target.value as ClearanceLevel);
  };

  const handleCreateNewDoc = (folderId: string | null = null) => {
    createDocument(folderId, 'Untitled Document', activeClearance);
  };

  const handleConfirmNewFolder = () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    createFolder(newFolderName.trim(), activeClearance);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const getDocIcon = (iconName: string) => {
    switch (iconName) {
      case 'ScrollText': return <ScrollText size={12} />;
      case 'FileCode': return <FileCode size={12} />;
      case 'Terminal': return <Terminal size={12} />;
      case 'TrendingUp': return <TrendingUp size={12} />;
      default: return <FileText size={12} />;
    }
  };

  const getStatusColor = (status: CorporateDocument['status']) => {
    switch (status) {
      case 'published': return '#10b981';
      case 'in-review': return '#f59e0b';
      case 'archived': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const renderDocumentItem = (doc: CorporateDocument) => {
    const isActive = activeDocumentId === doc.id;

    return (
      <div
        key={doc.id}
        onClick={() => setActiveDocumentId(doc.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          borderRadius: 'var(--radius-sm)',
          background: isActive ? 'var(--bg-surface)' : 'transparent',
          border: `1px solid ${isActive ? 'var(--border-moderate)' : 'transparent'}`,
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ color: isActive ? 'var(--clr-accent)' : 'var(--text-muted)' }}>
            {getDocIcon(doc.icon)}
          </span>
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {doc.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {/* Sealed Ledger Lock Tag */}
          {doc.isSealed && (
            <span title="Sealed to Treasury Hash Ledger" style={{ display: 'inline-flex' }}>
              <Lock size={10} style={{ color: '#fbbf24' }} />
            </span>
          )}

          {/* Publication status dot */}
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: getStatusColor(doc.status),
            }}
            title={`Status: ${doc.status}`}
          />

          {/* Delete document button */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteDocument(doc.id);
              }}
              title="Delete Document"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
                opacity: isActive ? 1 : 0.4,
              }}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        height: '100%',
        borderRight: '1px solid var(--border-hairline)',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: 48,
          minHeight: 48,
          paddingInline: 14,
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={14} style={{ color: 'var(--clr-accent)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
            }}
          >
            KNOWLEDGE WIKI
          </span>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => handleCreateNewDoc(null)}
              title="Create New Zero-Knowledge Document"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 7px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--clr-accent)',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={11} />
              <span>NEW</span>
            </button>
          </div>
        )}
      </div>

      {/* Clearance Hierarchy Switcher (Direct testing of spatial & metadata culling) */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-hairline)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Shield size={10} style={{ color: 'var(--clr-accent)' }} />
            <span>WIKI CLEARANCE</span>
          </span>
          <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
            CULLED
          </span>
        </div>

        <select
          value={activeClearance}
          onChange={handleClearanceChange}
          style={{
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            padding: '4px 6px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {canAccessClearance('LEVEL_1') && <option value="LEVEL_1">LEVEL 1 — Standard (Public Wiki)</option>}
          {canAccessClearance('LEVEL_2') && <option value="LEVEL_2">LEVEL 2 — Tactical (Runbooks)</option>}
          {canAccessClearance('LEVEL_3') && <option value="LEVEL_3">LEVEL 3 — Executive (Roadmaps)</option>}
          {canAccessClearance('LEVEL_4') && <option value="LEVEL_4">LEVEL 4 — Sovereign (Charters)</option>}
        </select>
      </div>

      {/* Search Input */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-hairline)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Search size={11} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter encrypted wiki..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Document Tree */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Folders List */}
        {folders.map((folder) => {
          const isCollapsed = !!collapsedFolders[folder.id];
          const folderDocs = filteredDocs.filter((d) => d.folderId === folder.id);

          return (
            <div key={folder.id} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Folder Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleFolder(folder.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {isCollapsed ? (
                    <Folder size={12} style={{ color: 'var(--clr-accent)' }} />
                  ) : (
                    <FolderOpen size={12} style={{ color: 'var(--clr-accent)' }} />
                  )}
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 600,
                    }}
                  >
                    {folder.name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      fontSize: '0.58rem',
                      color: 'var(--text-muted)',
                      background: 'var(--bg-secondary)',
                      padding: '1px 4px',
                      borderRadius: 2,
                    }}
                  >
                    {folderDocs.length}
                  </span>
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNewDoc(folder.id);
                      }}
                      title="Add page to this folder"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 1,
                        display: 'flex',
                      }}
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              </div>

              {/* Nested Documents */}
              {!isCollapsed && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingLeft: 14,
                    borderLeft: '1px dashed var(--border-hairline)',
                    marginLeft: 10,
                    marginTop: 2,
                  }}
                >
                  {folderDocs.map(renderDocumentItem)}
                </div>
              )}
            </div>
          );
        })}

        {/* Root Documents (No folder assigned) */}
        {filteredDocs.filter((d) => !d.folderId).length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                paddingLeft: 6,
                marginBottom: 2,
              }}
            >
              STANDALONE DOCUMENTS
            </div>
            {filteredDocs.filter((d) => !d.folderId).map(renderDocumentItem)}
          </div>
        )}

        {/* Add Folder Input */}
        {canEdit && (
          isCreatingFolder ? (
            <div style={{ padding: '6px 8px', display: 'flex', gap: 4 }}>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmNewFolder()}
                placeholder="Folder name..."
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleConfirmNewFolder}
                style={{
                  background: 'var(--clr-accent)',
                  border: 'none',
                  color: '#000',
                  padding: '3px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 8px',
                background: 'transparent',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                justifyContent: 'center',
              }}
            >
              <Plus size={11} />
              <span>ADD CORPORATE FOLDER</span>
            </button>
          )
        )}
      </div>
    </aside>
  );
};
