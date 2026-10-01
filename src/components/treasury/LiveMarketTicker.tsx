import React, { useEffect, useState, useRef, useCallback } from 'react';
import { marketDataService } from '../../services/market/MarketDataService';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { MarketPairSymbol, MarketTickData } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { showToast } from '../Toast';

const WATCHLIST_KEY = 'sov_market_watchlist_v1';
const SYSTEM_PAIRS: MarketPairSymbol[] = ['USD/TRY', 'EUR/TRY', 'EUR/USD', 'BTC/USDT', 'ETH/USDT', 'XAU/USD'];

interface CatalogItem {
  symbol: MarketPairSymbol;
  name: string;
  category: 'crypto' | 'forex';
  tag: string;
}

const CATALOG_PRESETS: CatalogItem[] = [
  // Top Cryptocurrencies
  { symbol: 'SOL/USDT', name: 'Solana Spot', category: 'crypto', tag: 'SOL' },
  { symbol: 'BNB/USDT', name: 'BNB Spot', category: 'crypto', tag: 'BNB' },
  { symbol: 'XRP/USDT', name: 'Ripple Spot', category: 'crypto', tag: 'XRP' },
  { symbol: 'AVAX/USDT', name: 'Avalanche Spot', category: 'crypto', tag: 'AVAX' },
  { symbol: 'DOGE/USDT', name: 'Dogecoin Spot', category: 'crypto', tag: 'DOGE' },
  { symbol: 'ADA/USDT', name: 'Cardano Spot', category: 'crypto', tag: 'ADA' },
  // Major Forex Pairs
  { symbol: 'GBP/TRY', name: 'İngiliz Sterlini / TL', category: 'forex', tag: 'GBP' },
  { symbol: 'GBP/USD', name: 'Sterlin / Dolar', category: 'forex', tag: 'GBP' },
  { symbol: 'USD/JPY', name: 'Dolar / Japon Yeni', category: 'forex', tag: 'JPY' },
  { symbol: 'USD/CHF', name: 'Dolar / İsviçre Frangı', category: 'forex', tag: 'CHF' },
];

const SUGGESTED_QUICK_PICKS = ['SOL/USDT', 'AVAX/USDT', 'GBP/TRY', 'USD/JPY', 'DOGE/USDT'];

function loadWatchlist(): MarketPairSymbol[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (raw) {
      const parsed: MarketPairSymbol[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return ['USD/TRY', 'EUR/TRY', 'EUR/USD', 'BTC/USDT', 'XAU/USD'];
}

function saveWatchlist(list: MarketPairSymbol[]) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export const LiveMarketTicker: React.FC = () => {
  const [ticks, setTicks] = useState<Record<MarketPairSymbol, MarketTickData>>(
    marketDataService.getTicks()
  );
  const [flashStates, setFlashStates] = useState<Record<string, 'up' | 'down' | null>>({});
  const [isLive, setIsLive] = useState(marketDataService.isLive);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchlist, setWatchlist] = useState<MarketPairSymbol[]>(loadWatchlist);
  const [showWatchlistMenu, setShowWatchlistMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'pairs' | 'catalog' | 'add'>('pairs');
  const [availablePairs, setAvailablePairs] = useState<MarketPairSymbol[]>(() =>
    marketDataService.getPairs().map((p) => p.symbol)
  );
  const [customInput, setCustomInput] = useState('');
  const [isSubmittingPair, setIsSubmittingPair] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'crypto' | 'forex'>('all');

  const prevPricesRef = useRef<Record<string, number>>({});
  const watchlistMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    TactileSoundEngine.playMechanicalTransient();
    try {
      await marketDataService.fetchLiveData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Close watchlist dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (watchlistMenuRef.current && !watchlistMenuRef.current.contains(e.target as Node)) {
        setShowWatchlistMenu(false);
      }
    };
    if (showWatchlistMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showWatchlistMenu]);

  // Autofocus input when switching to add tab
  useEffect(() => {
    if (showWatchlistMenu && activeTab === 'add') {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [showWatchlistMenu, activeTab]);

  useEffect(() => {
    const unsubscribe = marketDataService.subscribe((newTicks) => {
      const newFlashes: Record<string, 'up' | 'down' | null> = {};
      let hasChange = false;

      Object.entries(newTicks).forEach(([sym, tick]) => {
        const prevPrice = prevPricesRef.current[sym];
        if (prevPrice !== undefined && prevPrice !== tick.price) {
          newFlashes[sym] = tick.price > prevPrice ? 'up' : 'down';
          hasChange = true;
        }
        prevPricesRef.current[sym] = tick.price;
      });

      setTicks(newTicks);
      setIsLive(marketDataService.isLive);
      setAvailablePairs(marketDataService.getPairs().map((p) => p.symbol));

      if (hasChange) {
        setFlashStates((prev) => ({ ...prev, ...newFlashes }));
        const timer = setTimeout(() => setFlashStates({}), 800);
        return () => clearTimeout(timer);
      }
    });

    return () => { unsubscribe(); };
  }, []);

  const togglePair = useCallback((sym: MarketPairSymbol) => {
    TactileSoundEngine.playClick();
    setWatchlist((prev) => {
      const willRemove = prev.includes(sym);
      if (willRemove && prev.length <= 1) {
        showToast('En az bir parite gösterilmelidir.', 'warning');
        return prev;
      }
      const next = willRemove
        ? prev.filter((s) => s !== sym)
        : [...prev, sym];
      saveWatchlist(next);
      showToast(`${sym} paritesi ${willRemove ? 'gizlendi' : 'göstergeye eklendi'}.`, 'info');
      return next;
    });
  }, []);

  const handleAddPair = async (sym: string, label?: string) => {
    let cleanSym = sym.trim().toUpperCase();
    if (!cleanSym) {
      showToast('Lütfen bir sembol girin (örn: SOL/USDT)', 'warning');
      return;
    }

    // Auto-format symbols without slash (e.g. SOLUSDT -> SOL/USDT, USDTRY -> USD/TRY)
    cleanSym = cleanSym.replace(/[-_ ]/g, '/');
    if (!cleanSym.includes('/')) {
      if (cleanSym.endsWith('USDT')) {
        cleanSym = `${cleanSym.slice(0, -4)}/USDT`;
      } else if (cleanSym.endsWith('USD')) {
        cleanSym = `${cleanSym.slice(0, -3)}/USD`;
      } else if (cleanSym.endsWith('TRY')) {
        cleanSym = `${cleanSym.slice(0, -3)}/TRY`;
      } else if (cleanSym.endsWith('EUR')) {
        cleanSym = `${cleanSym.slice(0, -3)}/EUR`;
      } else {
        cleanSym = `${cleanSym}/USDT`;
      }
    }

    const symbol = cleanSym as MarketPairSymbol;

    // Check if already in watchlist
    if (watchlist.includes(symbol)) {
      showToast(`${symbol} zaten gösterge bandınızda aktif.`, 'info');
      setActiveTab('pairs');
      return;
    }

    setIsSubmittingPair(true);
    TactileSoundEngine.playMechanicalTransient();

    try {
      const tick = await marketDataService.registerCustomPair(symbol, label || symbol);
      
      setAvailablePairs(marketDataService.getPairs().map((p) => p.symbol));
      setWatchlist((prev) => {
        const next = prev.includes(symbol) ? prev : [...prev, symbol];
        saveWatchlist(next);
        return next;
      });

      setCustomInput('');
      setActiveTab('pairs');
      showToast(`${symbol} canlı takibe eklendi: ${tick.formattedPrice}`, 'success');
    } catch {
      showToast(`${symbol} eklenirken bir sorun oluştu.`, 'error');
    } finally {
      setIsSubmittingPair(false);
    }
  };

  const handleRemoveCustomPair = (e: React.MouseEvent, sym: MarketPairSymbol) => {
    e.stopPropagation();
    TactileSoundEngine.playMechanicalTransient();

    marketDataService.unregisterCustomPair(sym);
    setAvailablePairs(marketDataService.getPairs().map((p) => p.symbol));
    setWatchlist((prev) => {
      const next = prev.filter((s) => s !== sym);
      saveWatchlist(next);
      return next;
    });

    showToast(`${sym} paritesi silindi.`, 'info');
  };

  const visibleTicks = watchlist
    .map((sym) => ticks[sym])
    .filter(Boolean) as MarketTickData[];

  const filteredCatalog = CATALOG_PRESETS.filter((item) => {
    if (catalogFilter === 'crypto') return item.category === 'crypto';
    if (catalogFilter === 'forex') return item.category === 'forex';
    return true;
  });

  return (
    <div
      style={{
        height: 'var(--shell-ticker)',
        minHeight: 'var(--shell-ticker)',
        maxHeight: 'var(--shell-ticker)',
        flexShrink: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: '12px',
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-hairline)',
        userSelect: 'none',
        overflow: 'visible',
        position: 'relative',
        zIndex: 95,
      }}
    >
      {/* Left: Label + live indicator + refresh button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {/* Connectivity indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: isLive ? 'var(--clr-positive)' : 'var(--clr-caution)',
          }}
          title={isLive ? 'Anlık canlı piyasa verileri aktif (Coinbase, Binance, OpenER)' : 'Önbellek verisi — yeniden bağlanılıyor…'}
        >
          {isLive ? <Wifi size={11} /> : <WifiOff size={11} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isLive && (
            <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'var(--clr-positive)', opacity: 0.6,
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: 'var(--clr-positive)', display: 'inline-flex' }} />
            </span>
          )}
          <Activity size={11} color="var(--clr-accent)" />
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.08em', color: isLive ? 'var(--clr-positive)' : 'var(--text-secondary)' }}>
            {isLive ? 'LIVE' : 'CACHE'}
          </span>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Canlı piyasa verilerini anlık yenile"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: isRefreshing ? 'wait' : 'pointer',
            padding: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
            opacity: isRefreshing ? 0.5 : 1,
            transition: 'color 0.15s ease, opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <RefreshCw
            size={10}
            style={{
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      {/* Center: Scrollable ticker pairs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInline: 10, overflowX: 'auto', flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.68rem' }}>
        {visibleTicks.map((tick) => {
          const flash = flashStates[tick.symbol];
          const isUp = tick.change24h >= 0;

          return (
            <button
              key={tick.symbol}
              onClick={() => {
                TactileSoundEngine.playClick();
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(`${tick.symbol}: ${tick.formattedPrice}`);
                }
                showToast(`${tick.symbol}: ${tick.formattedPrice} kopyalandı.`, 'info');
              }}
              title={`${tick.label}: ${tick.formattedPrice} (Kopyalamak için tıklayın)`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 7px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                background: flash === 'up'
                  ? 'rgba(16,185,129,0.15)'
                  : flash === 'down'
                  ? 'rgba(244,63,94,0.15)'
                  : 'rgba(var(--bg-surface-raw, 30 41 59) / 0.4)',
                borderColor: flash === 'up'
                  ? 'rgba(16,185,129,0.4)'
                  : flash === 'down'
                  ? 'rgba(244,63,94,0.4)'
                  : 'var(--border-subtle)',
                boxShadow: flash === 'up'
                  ? '0 0 8px rgba(16,185,129,0.25)'
                  : flash === 'down'
                  ? '0 0 8px rgba(244,63,94,0.25)'
                  : 'none',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{tick.symbol}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {tick.formattedPrice}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', color: isUp ? '#34d399' : '#f87171', fontSize: '0.62rem' }}>
                {isUp ? <TrendingUp size={9} style={{ marginRight: 2 }} /> : <TrendingDown size={9} style={{ marginRight: 2 }} />}
                {isUp ? '+' : ''}{tick.change24h}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Watchlist manager */}
      <div style={{ position: 'relative', flexShrink: 0 }} ref={watchlistMenuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            TactileSoundEngine.playClick();
            setShowWatchlistMenu((s) => !s);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 9px',
            borderRadius: 'var(--radius-sm)',
            background: showWatchlistMenu ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.04)',
            border: `1px solid ${showWatchlistMenu ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
            cursor: 'pointer',
            fontSize: '0.64rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: showWatchlistMenu ? 'var(--clr-accent)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          title="Pariteleri Yönet ve Yeni Parite Ekle / Manage Pairs"
          onMouseEnter={(e) => {
            if (!showWatchlistMenu) {
              e.currentTarget.style.borderColor = 'var(--border-moderate)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showWatchlistMenu) {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <Plus size={11} />
          <span>PAIRS</span>
        </button>

        {showWatchlistMenu && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.06)',
              zIndex: 1000,
              width: 320,
              maxWidth: '90vw',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: 'enter-up 0.15s ease-out both',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingInline: 2,
                paddingBottom: 6,
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              <span
                style={{
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Sparkles size={11} color="var(--clr-accent)" />
                GÖSTERGE PARİTELERİ ({watchlist.length}/{availablePairs.length})
              </span>
              <button
                onClick={() => setShowWatchlistMenu(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  padding: 2,
                  borderRadius: 3,
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Segmented Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: 2,
                gap: 2,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => setActiveTab('pairs')}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'pairs' ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === 'pairs' ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                Paritelerim ({availablePairs.length})
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'catalog' ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === 'catalog' ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                Katalog
              </button>
              <button
                onClick={() => setActiveTab('add')}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'add' ? 'var(--clr-accent)' : 'transparent',
                  color: activeTab === 'add' ? '#060B18' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                + Özel Ekle
              </button>
            </div>

            {/* TAB 1: PARİTELERİM */}
            {activeTab === 'pairs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, paddingRight: 2 }}>
                  {availablePairs.map((sym) => {
                    const active = watchlist.includes(sym);
                    const tick = ticks[sym];
                    const isUp = tick ? tick.change24h >= 0 : true;
                    const isCustom = !SYSTEM_PAIRS.includes(sym);

                    return (
                      <div
                        key={sym}
                        onClick={() => togglePair(sym)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: active ? 'rgba(var(--bg-surface-raw, 30 41 59) / 0.6)' : 'transparent',
                          border: `1px solid ${active ? 'var(--border-moderate)' : 'transparent'}`,
                          cursor: 'pointer',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: `1px solid ${active ? 'var(--clr-accent)' : 'var(--border-moderate)'}`,
                              background: active ? 'var(--clr-accent)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {active && <Check size={10} color="#060B18" strokeWidth={3} />}
                          </div>
                          <span style={{ fontWeight: active ? 600 : 400 }}>{sym}</span>
                          {isCustom && (
                            <span
                              style={{
                                fontSize: '0.52rem',
                                padding: '1px 4px',
                                borderRadius: 3,
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                fontWeight: 700,
                              }}
                            >
                              ÖZEL
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {tick && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 500 }}>
                                {tick.formattedPrice}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.60rem',
                                  color: isUp ? 'var(--clr-positive)' : 'var(--clr-negative)',
                                }}
                              >
                                {isUp ? '+' : ''}{tick.change24h}%
                              </span>
                            </div>
                          )}

                          {isCustom && (
                            <button
                              onClick={(e) => handleRemoveCustomPair(e, sym)}
                              title="Bu özel pariteyi sil"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--clr-negative)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Add link at bottom */}
                <button
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    marginTop: 4,
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-subtle)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--clr-accent)',
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(var(--clr-accent-raw, 250 204 21) / 0.08)';
                    e.currentTarget.style.borderColor = 'var(--clr-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <Plus size={11} />
                  <span>Hazır Katalogdan veya Özel Parite Ekle</span>
                </button>
              </div>
            )}

            {/* TAB 2: HAZIR KATALOG */}
            {activeTab === 'catalog' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Category filters */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['all', 'crypto', 'forex'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCatalogFilter(cat)}
                      style={{
                        padding: '2px 7px',
                        fontSize: '0.58rem',
                        fontFamily: 'var(--font-mono)',
                        borderRadius: 3,
                        border: `1px solid ${catalogFilter === cat ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                        background: catalogFilter === cat ? 'rgba(var(--clr-accent-raw, 250 204 21) / 0.15)' : 'transparent',
                        color: catalogFilter === cat ? 'var(--clr-accent)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: catalogFilter === cat ? 700 : 500,
                      }}
                    >
                      {cat === 'all' ? 'Tümü' : cat === 'crypto' ? 'Kripto' : 'Döviz / FX'}
                    </button>
                  ))}
                </div>

                {/* Catalog items list */}
                <div style={{ maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                  {filteredCatalog.map((item) => {
                    const isAdded = availablePairs.includes(item.symbol);

                    return (
                      <div
                        key={item.symbol}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.symbol}</span>
                          <span style={{ fontSize: '0.56rem', color: 'var(--text-muted)' }}>{item.name}</span>
                        </div>

                        {isAdded ? (
                          <span
                            style={{
                              fontSize: '0.58rem',
                              color: 'var(--clr-positive)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontWeight: 600,
                            }}
                          >
                            <Check size={10} /> Ekli
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddPair(item.symbol, item.name)}
                            disabled={isSubmittingPair}
                            style={{
                              background: 'var(--clr-accent)',
                              color: '#060B18',
                              border: 'none',
                              borderRadius: 3,
                              padding: '2px 8px',
                              fontSize: '0.60rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              cursor: isSubmittingPair ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              transition: 'opacity 0.15s ease',
                              opacity: isSubmittingPair ? 0.6 : 1,
                            }}
                          >
                            <Plus size={10} strokeWidth={3} /> Ekle
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 2 }}>
                  Farklı bir çift için <span style={{ color: 'var(--clr-accent)', cursor: 'pointer' }} onClick={() => setActiveTab('add')}>Özel Ekle</span> sekmesini kullanabilirsiniz.
                </div>
              </div>
            )}

            {/* TAB 3: ÖZEL PARİTE EKLE */}
            {activeTab === 'add' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    PARİTE SEMBOLÜ (Örn: SOL/USDT, AVAX/USDT, GBP/TRY):
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddPair(customInput);
                        }}
                        placeholder="Örn: SOL/USDT"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-moderate)',
                          background: 'rgba(0, 0, 0, 0.4)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleAddPair(customInput)}
                      disabled={isSubmittingPair || !customInput.trim()}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--clr-accent)',
                        color: '#060B18',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.64rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        cursor: isSubmittingPair || !customInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingPair || !customInput.trim() ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isSubmittingPair ? <RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={11} strokeWidth={3} />}
                      <span>{isSubmittingPair ? 'Bağlanıyor...' : 'Ekle'}</span>
                    </button>
                  </div>
                </div>

                {/* Fast picks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.56rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Hızlı Öneriler:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {SUGGESTED_QUICK_PICKS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleAddPair(preset)}
                        disabled={isSubmittingPair}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontSize: '0.58rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--clr-accent)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Discovery Note */}
                <div
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(var(--clr-accent-raw, 250 204 21) / 0.06)',
                    border: '1px solid rgba(var(--clr-accent-raw, 250 204 21) / 0.2)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                  }}
                >
                  <Sparkles size={12} color="var(--clr-accent)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: '0.56rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    Coinbase, Binance ve Açık Döviz ağlarından anlık canlı spot fiyat otomatik taranır ve bandınıza eklenir.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

