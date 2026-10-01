import React, { useState } from 'react';
import { X, Plus, CheckSquare, DollarSign, Layers } from 'lucide-react';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { BlueprintNode, ClearanceLevel, TaskNodeData, BudgetNodeData } from '../../types';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
}

export const CreateNodeModal: React.FC<CreateNodeModalProps> = ({
  isOpen,
  onClose,
  defaultPosition,
}) => {
  const addNode = useBlueprintStore((state) => state.addNode);
  const activeClearance = useBlueprintStore((state) => state.activeClearance);
  const operators = useTeamStore((state) => state.operators);

  const [nodeType, setNodeType] = useState<'task' | 'budget'>('task');
  const [title, setTitle] = useState('');
  const [clearance, setClearance] = useState<ClearanceLevel>(activeClearance);
  const [visibilityScope, setVisibilityScope] = useState<'ALL' | 'ASSIGNED_ONLY' | 'MANAGERS_ONLY'>('ALL');
  const [priority, setPriority] = useState<TaskPriority>('HIGH');
  const [assignee, setAssignee] = useState(operators[0]?.alias || 'OPERATOR_00');
  const [slaHours, setSlaHours] = useState('24');
  const [checklistItems, setChecklistItems] = useState<string[]>(['İlk mimari analiz ve planlama']);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Budget node state
  const [allocatedAmountStr, setAllocatedAmountStr] = useState('50000');
  const [spentAmountStr, setSpentAmountStr] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [autoBlockExhausted, setAutoBlockExhausted] = useState(true);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems([...checklistItems, newChecklistText.trim()]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (idx: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const posX = defaultPosition?.x ?? (300 + Math.floor(Math.random() * 80));
    const posY = defaultPosition?.y ?? (200 + Math.floor(Math.random() * 80));

    let createdNode: BlueprintNode;

    if (nodeType === 'task') {
      const taskNode: TaskNodeData = {
        id: `n_task_${Date.now()}`,
        type: 'task',
        title: title.trim(),
        x: posX,
        y: posY,
        clearance,
        status: 'active',
        assignee,
        visibilityScope,
        priority,
        slaCountdownSeconds: (parseFloat(slaHours) || 24) * 3600,
        checklist: checklistItems.map((text, i) => ({
          id: `c_${i}_${Date.now()}`,
          text,
          completed: false,
        })),
      };
      createdNode = taskNode;
    } else {
      const budgetNode: BudgetNodeData = {
        id: `n_budget_${Date.now()}`,
        type: 'budget',
        title: title.trim(),
        x: posX,
        y: posY,
        clearance,
        visibilityScope,
        status: 'active',
        allocatedAmount: parseFloat(allocatedAmountStr) || 0,
        spentAmount: parseFloat(spentAmountStr) || 0,
        currency,
        autoBlockExhausted,
      };
      createdNode = budgetNode;
    }

    await addNode(createdNode);
    showToast(`Düğüm "${createdNode.title}" Blueprint tuvaline eklendi.`, 'success');
    setTitle('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 1000)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Layers size={18} color="var(--clr-accent)" />
            <div>
              <h3 className="type-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                Blueprint Düğümü Oluştur
              </h3>
              <span style={{ fontSize: '0.64rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                GÖREV VEYA BÜTÇE KAPIŞI DÜĞÜMÜ EKLE
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 'var(--sp-6)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
          }}
        >
          {/* Node Type Selector */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              DÜĞÜM TÜRÜ (NODE TYPE)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setNodeType('task');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: nodeType === 'task' ? '1px solid var(--clr-accent)' : '1px solid var(--border-subtle)',
                  background: nodeType === 'task' ? 'rgba(var(--accent-rgb, 59 130 246) / 0.15)' : 'var(--bg-secondary)',
                  color: nodeType === 'task' ? 'var(--clr-accent)' : 'var(--text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <CheckSquare size={16} />
                <span>GÖREV DÜĞÜMÜ (TASK)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setNodeType('budget');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: nodeType === 'budget' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  background: nodeType === 'budget' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                  color: nodeType === 'budget' ? '#10b981' : 'var(--text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <DollarSign size={16} />
                <span>BÜTÇE DÜĞÜMÜ (BUDGET GATE)</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              DÜĞÜM BAŞLIĞI
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={nodeType === 'task' ? 'Örn: Veritabanı Yedekleme & Felaket Kurtarma Testi' : 'Örn: Q3 GPU Altyapı Bütçe Havuzu'}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          {/* Clearance Level */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              GÜVENLİK SEVİYESİ (CLEARANCE)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-2)' }}>
              {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'] as ClearanceLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setClearance(lvl);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: clearance === lvl ? '1px solid var(--clr-accent)' : '1px solid var(--border-subtle)',
                    background: clearance === lvl ? 'rgba(var(--accent-rgb, 59 130 246) / 0.15)' : 'var(--bg-secondary)',
                    color: clearance === lvl ? 'var(--clr-accent)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {lvl.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Scope / Kimler Görebilir */}
          <div>
            <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              ERİŞİM KAPSAMI (KİMLER GÖREBİLİR?)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
              {[
                { id: 'ALL', label: '🌐 Tüm Ekip', desc: 'Yetkisi yeten tüm çalışanlar' },
                { id: 'ASSIGNED_ONLY', label: '🎯 Yalnızca Atanan', desc: 'Atanan kişi & yöneticiler' },
                { id: 'MANAGERS_ONLY', label: '🔒 Yöneticiler', desc: 'Sadece Lider ve Kurucu' },
              ].map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setVisibilityScope(scope.id as any);
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: visibilityScope === scope.id ? '1px solid var(--clr-accent)' : '1px solid var(--border-subtle)',
                    background: visibilityScope === scope.id ? 'rgba(var(--accent-rgb, 59 130 246) / 0.15)' : 'var(--bg-secondary)',
                    color: visibilityScope === scope.id ? 'var(--clr-accent)' : 'var(--text-muted)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{scope.label}</span>
                  <span style={{ fontSize: '0.58rem', opacity: 0.75 }}>{scope.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Task Fields */}
          {nodeType === 'task' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                    ÖNCELİK (PRIORITY)
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="LOW">Düşük (LOW)</option>
                    <option value="MEDIUM">Orta (MEDIUM)</option>
                    <option value="HIGH">Yüksek (HIGH)</option>
                    <option value="CRITICAL">Kritik (CRITICAL)</option>
                  </select>
                </div>

                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                    ATANAN OPERATÖR
                  </label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {operators.map((op) => (
                      <option key={op.id} value={op.alias}>
                        {op.alias} ({op.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                    SLA SÜRESİ (SAAT)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={slaHours}
                    onChange={(e) => setSlaHours(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div>
                <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                  KONTROL LİSTESİ (CHECKLIST)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {checklistItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <span>• {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--clr-negative)', cursor: 'pointer', padding: 2 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Yeni alt görev / kontrol maddesi..."
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleAddChecklistItem}
                    style={{ padding: '0 10px' }}
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Budget Node Fields */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-3)' }}>
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                    TAHSİS EDİLEN BÜTÇE (ALLOCATED AMOUNT)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={allocatedAmountStr}
                    onChange={(e) => setAllocatedAmountStr(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                    PARA BİRİMİ
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USDT">USDT ($)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
                  ŞU ANA KADAR HARCANAN (SPENT AMOUNT)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={spentAmountStr}
                  onChange={(e) => setSpentAmountStr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-moderate)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="autoblock"
                  checked={autoBlockExhausted}
                  onChange={(e) => setAutoBlockExhausted(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="autoblock" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Bütçe aşıldığında downstream düğümleri otomatik kilitle (Auto-Block)
                </label>
              </div>
            </div>
          )}

          {/* Submit */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 'var(--sp-3)',
              marginTop: 'var(--sp-2)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                TactileSoundEngine.playClick();
                onClose();
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!title.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              <span>Düğümü Oluştur & Mühürle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
