/* ============================================================
   SOVEREIGN-OS — Live Market Data Service (Real-Time)
   Fetches live spot prices from public, auth-free APIs:
   - Binance: BTC/USDT, ETH/USDT (crypto)
   - Frankfurter: USD/EUR/TRY fiat rates
   Polling every 30s with localStorage fallback cache.
   Brownian motion runs at 1.8s between real updates for
   smooth interpolation feel.
   ============================================================ */

import type { MarketPairSymbol, MarketTickData, ConsolidatedRunwayValuation } from '../../types';

interface PairConfig {
  symbol: MarketPairSymbol;
  label: string;
  basePrice: number;
  decimals: number;
  prefix?: string;
}

const DEFAULT_PAIRS: PairConfig[] = [
  { symbol: 'USD/TRY', label: 'USD/TRY', basePrice: 48.60, decimals: 4, prefix: '₺' },
  { symbol: 'EUR/TRY', label: 'EUR/TRY', basePrice: 56.40, decimals: 4, prefix: '₺' },
  { symbol: 'EUR/USD', label: 'EUR/USD', basePrice: 1.1605, decimals: 4, prefix: '$' },
  { symbol: 'BTC/USDT', label: 'BTC/USDT', basePrice: 77250.0, decimals: 2, prefix: '$' },
  { symbol: 'ETH/USDT' as const, label: 'ETH/USDT', basePrice: 2505.0, decimals: 2, prefix: '$' },
  { symbol: 'XAU/USD' as const, label: 'Gold (XAU)', basePrice: 4355.0, decimals: 2, prefix: '$' },
];

const CACHE_KEY = 'sov_market_cache_v1';
const LIVE_POLL_INTERVAL_MS = 30_000; // 30 seconds

export type MarketSubscriber = (ticks: Record<MarketPairSymbol, MarketTickData>) => void;

export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private pairs: PairConfig[] = [...DEFAULT_PAIRS];
  private ticks: Record<MarketPairSymbol, MarketTickData>;
  private openingPrices: Record<MarketPairSymbol, number>;
  private subscribers: Set<MarketSubscriber> = new Set();
  private liveIntervalId: number | null = null;
  private isRunning: boolean = false;

  /** True when the last real API fetch succeeded */
  public isLive: boolean = false;

  private constructor() {
    this.ticks = {} as Record<MarketPairSymbol, MarketTickData>;
    this.openingPrices = {} as Record<MarketPairSymbol, number>;

    // Load any custom pairs from localStorage
    if (typeof window !== 'undefined') {
      try {
        const customConfigsRaw = localStorage.getItem('sov_custom_market_configs_v1');
        if (customConfigsRaw) {
          const customConfigs: PairConfig[] = JSON.parse(customConfigsRaw);
          for (const cfg of customConfigs) {
            if (!this.pairs.some((p) => p.symbol === cfg.symbol)) {
              this.pairs.push(cfg);
            }
          }
        }
      } catch {}
    }

    // Seed from localStorage cache first for instant render
    const cached = this.loadCache();
    const now = Date.now();

    for (const pair of this.pairs) {
      const cachedPrice = cached[pair.symbol] ?? pair.basePrice;
      this.openingPrices[pair.symbol] = cachedPrice;
      this.ticks[pair.symbol] = {
        symbol: pair.symbol,
        label: pair.label,
        price: cachedPrice,
        change24h: 0.0,
        tickDirection: 'neutral',
        formattedPrice: this.formatPrice(cachedPrice, pair.decimals, pair.prefix),
        lastTickTimestamp: now,
      };
    }

    this.startStreaming();
  }

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  // ── LocalStorage Cache ────────────────────────────────────
  private loadCache(): Partial<Record<MarketPairSymbol, number>> {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveCache(): void {
    try {
      const prices: Partial<Record<MarketPairSymbol, number>> = {};
      for (const sym of Object.keys(this.ticks) as MarketPairSymbol[]) {
        prices[sym] = this.ticks[sym].price;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(prices));
    } catch {
      // Storage quota exceeded — ignore
    }
  }

  // ── Price Formatting ───────────────────────────────────────
  private formatPrice(price: number, decimals: number, prefix?: string): string {
    const formatted = price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return prefix ? `${prefix}${formatted}` : formatted;
  }

  // ── Multi-Tier Sub-Fetchers ────────────────────────────────

  /**
   * Fetches real-time fiat exchange rates using open.er-api.com with Frankfurter fallback.
   */
  private async fetchFiatRates(): Promise<Partial<Record<MarketPairSymbol, number>>> {
    const rates: Partial<Record<MarketPairSymbol, number>> = {};

    // 1. Primary: open.er-api.com (CORS enabled, highly available, real-time)
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const usdTry = data.rates?.TRY;
        const eurRate = data.rates?.EUR; // 1 USD = eurRate EUR
        if (typeof usdTry === 'number' && usdTry > 0) {
          rates['USD/TRY'] = usdTry;
          if (typeof eurRate === 'number' && eurRate > 0) {
            rates['EUR/TRY'] = usdTry / eurRate;
            rates['EUR/USD'] = 1 / eurRate;
          }
          return rates;
        }
      }
    } catch {
      // Try next provider
    }

    // 2. Secondary: Frankfurter API
    try {
      const [fxRes, fxEurRes] = await Promise.all([
        fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,TRY', { signal: AbortSignal.timeout(5000) }),
        fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,TRY', { signal: AbortSignal.timeout(5000) }),
      ]);
      const fxData = fxRes.ok ? await fxRes.json() : null;
      const fxEurData = fxEurRes.ok ? await fxEurRes.json() : null;

      if (fxData?.rates?.TRY) rates['USD/TRY'] = fxData.rates.TRY;
      if (fxData?.rates?.EUR) rates['EUR/USD'] = 1 / fxData.rates.EUR;
      if (fxEurData?.rates?.TRY) rates['EUR/TRY'] = fxEurData.rates.TRY;

      if (Object.keys(rates).length > 0) return rates;
    } catch {
      // Try next fallback
    }

    // 3. Tertiary: ExchangeRate-API free tier
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const usdTry = data.rates?.TRY;
        const eurRate = data.rates?.EUR;
        if (typeof usdTry === 'number') rates['USD/TRY'] = usdTry;
        if (typeof eurRate === 'number' && eurRate > 0) {
          rates['EUR/TRY'] = usdTry / eurRate;
          rates['EUR/USD'] = 1 / eurRate;
        }
      }
    } catch {
      // Silent ignore
    }

    return rates;
  }

  /**
   * Fetches real-time crypto spot prices using Coinbase API with CoinGecko and Binance fallbacks.
   */
  private async fetchCryptoRates(): Promise<Partial<Record<MarketPairSymbol, number>>> {
    const rates: Partial<Record<MarketPairSymbol, number>> = {};

    // 1. Primary: Coinbase spot public API (unrestricted globally, CORS-enabled)
    try {
      const [btcRes, ethRes] = await Promise.all([
        fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { signal: AbortSignal.timeout(6000) }),
        fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', { signal: AbortSignal.timeout(6000) }),
      ]);

      if (btcRes.ok) {
        const btc = await btcRes.json();
        const p = parseFloat(btc.data?.amount);
        if (!isNaN(p) && p > 0) rates['BTC/USDT'] = p;
      }
      if (ethRes.ok) {
        const eth = await ethRes.json();
        const p = parseFloat(eth.data?.amount);
        if (!isNaN(p) && p > 0) rates['ETH/USDT'] = p;
      }

      if (rates['BTC/USDT'] && rates['ETH/USDT']) return rates;
    } catch {
      // Try next provider
    }

    // 2. Secondary: CoinGecko
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd',
        { signal: AbortSignal.timeout(5000) }
      );
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        if (cgData.bitcoin?.usd) rates['BTC/USDT'] = cgData.bitcoin.usd;
        if (cgData.ethereum?.usd) rates['ETH/USDT'] = cgData.ethereum.usd;
        if (rates['BTC/USDT'] && rates['ETH/USDT']) return rates;
      }
    } catch {
      // Try next provider
    }

    // 3. Tertiary: Binance public endpoints
    try {
      const binanceRes = await fetch(
        'https://data-api.binance.vision/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%5D',
        { signal: AbortSignal.timeout(5000) }
      );
      if (binanceRes.ok) {
        const data: Array<{ symbol: string; price: string }> = await binanceRes.json();
        for (const item of data) {
          const p = parseFloat(item.price);
          if (item.symbol === 'BTCUSDT' && !isNaN(p)) rates['BTC/USDT'] = p;
          if (item.symbol === 'ETHUSDT' && !isNaN(p)) rates['ETH/USDT'] = p;
        }
      }
    } catch {
      // Silent ignore
    }

    return rates;
  }

  /**
   * Fetches real-time physical gold spot price (XAU/USD) via LBMA 1:1 backed PAX Gold.
   */
  private async fetchGoldRate(): Promise<number | null> {
    // 1. Primary: CoinGecko PAX Gold (1 PAXG = 1 fine troy ounce LBMA gold)
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd', {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = data['pax-gold']?.usd;
        if (typeof price === 'number' && price > 0) return price;
      }
    } catch {
      // Try next provider
    }

    // 2. Secondary: Binance PAXG/USDT
    try {
      const res = await fetch('https://data-api.binance.vision/api/v3/ticker/price?symbol=PAXGUSDT', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.price);
        if (!isNaN(price) && price > 0) return price;
      }
    } catch {
      // Try next provider
    }

    return null;
  }

  // ── Real API Fetch ─────────────────────────────────────────
  public async fetchLiveData(): Promise<void> {
    try {
      const [fiatResult, cryptoResult, goldResult] = await Promise.allSettled([
        this.fetchFiatRates(),
        this.fetchCryptoRates(),
        this.fetchGoldRate(),
      ]);

      const updates: Partial<Record<MarketPairSymbol, number>> = {};

      if (fiatResult.status === 'fulfilled' && fiatResult.value) {
        Object.assign(updates, fiatResult.value);
      }
      if (cryptoResult.status === 'fulfilled' && cryptoResult.value) {
        Object.assign(updates, cryptoResult.value);
      }
      if (goldResult.status === 'fulfilled' && goldResult.value !== null) {
        updates['XAU/USD'] = goldResult.value;
      }

      // Discover prices for custom registered pairs
      for (const pair of this.pairs) {
        if (!DEFAULT_PAIRS.some((dp) => dp.symbol === pair.symbol)) {
          try {
            const price = await this.discoverLivePrice(pair.symbol);
            if (price && price > 0) {
              updates[pair.symbol] = price;
            }
          } catch {}
        }
      }

      const hasRealUpdates = Object.keys(updates).length > 0;
      if (hasRealUpdates) {
        const now = Date.now();
        for (const [sym, newPrice] of Object.entries(updates) as [MarketPairSymbol, number][]) {
          const current = this.ticks[sym];
          const cfg = this.pairs.find((p) => p.symbol === sym);
          if (!current || !cfg || typeof newPrice !== 'number' || isNaN(newPrice)) continue;

          const tickDirection: 'up' | 'down' | 'neutral' =
            newPrice > current.price ? 'up' : newPrice < current.price ? 'down' : 'neutral';
          const openPrice = this.openingPrices[sym] || cfg.basePrice;
          const change24h = Number((((newPrice - openPrice) / openPrice) * 100).toFixed(2));

          this.ticks[sym] = {
            ...current,
            price: Number(newPrice.toFixed(cfg.decimals)),
            change24h,
            tickDirection,
            formattedPrice: this.formatPrice(newPrice, cfg.decimals, cfg.prefix),
            lastTickTimestamp: now,
          };
        }

        this.isLive = true;
        this.saveCache();
        this.notifySubscribers();
      }
    } catch {
      // Network failure — silently remain on last cached/Brownian prices
    }
  }

  // ── Streaming Start / Stop ────────────────────────────────
  public startStreaming(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Immediate real fetch on boot
    void this.fetchLiveData();

    if (typeof window !== 'undefined') {
      // Real API poll every 30s strictly from authenticated live market endpoints
      this.liveIntervalId = window.setInterval(() => {
        void this.fetchLiveData();
      }, LIVE_POLL_INTERVAL_MS);
    }
  }

  public stopStreaming(): void {
    if (this.liveIntervalId !== null) {
      clearInterval(this.liveIntervalId);
      this.liveIntervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Preserved for backward interface compatibility.
   * Real prices are never mutated with random noise; delegates to real fetch.
   */
  public stepBrownianMotion(_forcedSymbol?: MarketPairSymbol): void {
    void this.fetchLiveData();
  }

  public subscribe(callback: MarketSubscriber): () => void {
    this.subscribers.add(callback);
    callback({ ...this.ticks });
    return () => { this.subscribers.delete(callback); };
  }

  private notifySubscribers(): void {
    const snapshot = { ...this.ticks };
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  public getTicks(): Record<MarketPairSymbol, MarketTickData> {
    return { ...this.ticks };
  }

  public getTick(symbol: MarketPairSymbol): MarketTickData | undefined {
    return this.ticks[symbol];
  }

  public getPairs(): PairConfig[] {
    return this.pairs;
  }

  /**
   * Attempts live price discovery for any crypto or forex pair.
   */
  public async discoverLivePrice(sym: string): Promise<number | null> {
    const parts = sym.split('/');
    if (parts.length !== 2) return null;
    const base = parts[0].toUpperCase().trim();
    const quote = parts[1].toUpperCase().trim();

    // 1. Try Coinbase Spot (e.g. SOL-USD, AVAX-USD, BNB-USD, DOGE-USD)
    try {
      const q = quote === 'USDT' || quote === 'USD' ? 'USD' : quote;
      const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-${q}/spot`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const p = parseFloat(json.data?.amount);
        if (!isNaN(p) && p > 0) {
          if (quote === 'TRY' && this.ticks['USD/TRY']?.price) {
            return p * this.ticks['USD/TRY'].price;
          }
          return p;
        }
      }
    } catch {}

    // 2. Try Binance Vision Gateway
    try {
      const bSymbol = `${base}${quote === 'USD' ? 'USDT' : quote}`;
      const res = await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${bSymbol}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const p = parseFloat(json.price);
        if (!isNaN(p) && p > 0) return p;
      }
    } catch {}

    // 3. Try open.er-api for foreign exchange / currencies
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.rates && typeof json.rates[quote] === 'number') {
          return json.rates[quote];
        }
      }
    } catch {}

    return null;
  }

  /**
   * Registers a new or custom trading pair and immediately attempts to fetch its live rate.
   */
  public async registerCustomPair(
    symbol: MarketPairSymbol,
    label?: string,
    initialPrice?: number,
    prefix?: string
  ): Promise<MarketTickData> {
    const sym = symbol.toUpperCase().trim() as MarketPairSymbol;
    const defaultPrefix = sym.includes('TRY') ? '₺' : '$';
    const pairPrefix = prefix || defaultPrefix;

    let price = initialPrice ?? 0;
    if (!price || price <= 0) {
      const discovered = await this.discoverLivePrice(sym);
      price = discovered && discovered > 0 ? discovered : (sym.includes('TRY') ? 50.0 : 10.0);
    }

    const decimals = price < 1 ? 4 : price < 100 ? 3 : 2;

    const existingIdx = this.pairs.findIndex((p) => p.symbol === sym);
    const newConfig: PairConfig = {
      symbol: sym,
      label: label || sym,
      basePrice: price,
      decimals,
      prefix: pairPrefix,
    };

    if (existingIdx >= 0) {
      this.pairs[existingIdx] = newConfig;
    } else {
      this.pairs.push(newConfig);
    }

    // Persist custom pairs config
    if (typeof window !== 'undefined') {
      try {
        const customConfigs = this.pairs.filter((p) => !DEFAULT_PAIRS.some((dp) => dp.symbol === p.symbol));
        localStorage.setItem('sov_custom_market_configs_v1', JSON.stringify(customConfigs));
      } catch {}
    }

    this.openingPrices[sym] = price;
    this.ticks[sym] = {
      symbol: sym,
      label: label || sym,
      price,
      change24h: 0.0,
      tickDirection: 'neutral',
      formattedPrice: this.formatPrice(price, decimals, pairPrefix),
      lastTickTimestamp: Date.now(),
    };

    this.saveCache();
    this.notifySubscribers();
    return this.ticks[sym];
  }

  /**
   * Unregisters a custom pair from tracking.
   */
  public unregisterCustomPair(symbol: MarketPairSymbol): void {
    this.pairs = this.pairs.filter((p) => p.symbol !== symbol);
    delete this.ticks[symbol];
    delete this.openingPrices[symbol];

    if (typeof window !== 'undefined') {
      try {
        const customConfigs = this.pairs.filter((p) => !DEFAULT_PAIRS.some((dp) => dp.symbol === p.symbol));
        localStorage.setItem('sov_custom_market_configs_v1', JSON.stringify(customConfigs));
      } catch {}
    }

    this.saveCache();
    this.notifySubscribers();
  }

  /**
   * Computes consolidated runway valuation given multi-currency reserves
   */
  public calculateConsolidatedRunway(
    balances: {
      usdBalance?: number;
      eurBalance?: number;
      btcBalance?: number;
      tryBalance?: number;
    } = {},
    dailyBurnUSD: number = 2850
  ): ConsolidatedRunwayValuation {
    const eurUsd = this.ticks['EUR/USD']?.price || 1.16;
    const btcUsd = this.ticks['BTC/USDT']?.price || 77250.0;
    const usdTry = this.ticks['USD/TRY']?.price || 48.60;

    const usd = balances.usdBalance ?? 5155000;
    const eur = balances.eurBalance ?? 410000;
    const btc = balances.btcBalance ?? 19.3;
    const tryBal = balances.tryBalance ?? 2500000;

    const eurInUSD = eur * eurUsd;
    const btcInUSD = btc * btcUsd;
    const tryInUSD = tryBal / (usdTry > 0 ? usdTry : 33.85);

    const totalLiquidityUSD = usd + eurInUSD + btcInUSD + tryInUSD;
    const monthlyBurn = dailyBurnUSD * 30.4167;
    const currentRunwayMonths = monthlyBurn > 0 ? Number((totalLiquidityUSD / monthlyBurn).toFixed(1)) : 0;

    return {
      baseLiquidityUSD: Math.round(totalLiquidityUSD),
      currentRunwayMonths,
      burnRatePerDayUSD: dailyBurnUSD,
      eurUsdRate: eurUsd,
      btcUsdRate: btcUsd,
      updatedAt: Date.now(),
    };
  }
}

export const marketDataService = MarketDataService.getInstance();
