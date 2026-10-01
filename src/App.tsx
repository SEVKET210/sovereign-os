import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './services/theme/ThemeContext';
import { LanguageProvider } from './services/i18n/LanguageContext';
import { Navbar } from './components/Navbar';
import { LeftNavDrawer } from './components/LeftNavDrawer';
import { LeftRailSidebar } from './components/navigation/LeftRailSidebar';
import { LiveMarketTicker } from './components/treasury/LiveMarketTicker';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { CommandKPalette } from './components/ui/CommandKPalette';
import { TacticalStatusBar } from './components/ui/TacticalStatusBar';
import { ToastContainer } from './components/Toast';
import { Landing } from './pages/Landing';
import { AuthVault } from './pages/AuthVault';
import { TreasuryDashboard } from './pages/TreasuryDashboard';
import { BlueprintStudio } from './pages/BlueprintStudio';
import { Settings } from './pages/Settings';
import { SecureVaultPanel } from './components/vault/SecureVaultPanel';
import { ByoAiConfigModal } from './components/ai/ByoAiConfigModal';
import { useAiStore } from './stores/useAiStore';
import { WebCaptureShield } from './components/security/WebCaptureShield';
import { ForensicWatermark } from './components/security/ForensicWatermark';
import { FounderEnclave } from './components/team/FounderEnclave';
import { CommsEnclave } from './pages/CommsEnclave';
import { DocsWorkspace } from './pages/DocsWorkspace';
import { SecureShareReceiver } from './pages/SecureShareReceiver';
import { EmergencyIncidentBanner } from './components/security/EmergencyIncidentBanner';
import { EmergencyGovernanceCockpit } from './components/security/EmergencyGovernanceCockpit';
import { RoleAlertBanner } from './components/ui/RoleAlertBanner';
import { PermissionMatrixModal } from './components/auth/PermissionMatrixModal';
import { DuressOnboardingModal } from './components/auth/DuressOnboardingModal';
import { useIncidentStore } from './stores/useIncidentStore';
import { useThemeStore } from './store/themeStore';

// ── CSS Shell Variables injected into :root ────────────────
const SHELL_VARS = `
  :root {
    --shell-header: 56px;
    --shell-ticker: 34px;
    --shell-footer: 28px;
    --shell-chrome: calc(var(--shell-header) + var(--shell-ticker) + var(--shell-footer));
  }

  @keyframes slide-in-left {
    from {
      transform: translate3d(-100%, 0, 0);
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

// ── Auth Guard ────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = sessionStorage.getItem('sovereign-session');
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppContent() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isThemeDrawerOpen = useThemeStore((state) => state.isDrawerOpen);
  const closeThemeDrawer = useThemeStore((state) => state.closeDrawer);
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(false);
  const [isCommandKOpen, setIsCommandKOpen] = useState(false);
  const { initializeAiStore } = useAiStore();
  const location = useLocation();

  useEffect(() => {
    initializeAiStore().catch(() => {});
    useIncidentStore.getState().initialize().catch(() => {});
  }, [initializeAiStore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandKOpen((prev) => !prev);
      }
    };
    const handleOpenCmdK = () => setIsCommandKOpen(true);
    const handleOpenLeftNav = () => setIsLeftNavOpen(true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-k', handleOpenCmdK);
    window.addEventListener('open-left-nav', handleOpenLeftNav);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-k', handleOpenCmdK);
      window.removeEventListener('open-left-nav', handleOpenLeftNav);
    };
  }, []);

  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth';
  const isShare = location.pathname === '/vault/share';

  // ── Ephemeral Share Route: Full-viewport zero-knowledge decryption gateway
  if (isShare) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          background: 'var(--bg-primary)',
          overflowX: 'hidden',
        }}
      >
        <SecureShareReceiver />
        <ToastContainer />
      </div>
    );
  }

  // ── Auth Route: Full-viewport, zero chrome ───────────────
  if (isAuth) {
    return (
      <div
        style={{
          width: '100%',
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
        <AuthVault />
        <ToastContainer />
        <WebCaptureShield />
      </div>
    );
  }

  // ── Landing Route ────────────────────────────────────────
  if (isLanding) {
    return (
      <>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </>
    );
  }

  // ── Workspace Routes: Strict vertical flex shell ──────────
  const session = typeof window !== 'undefined' ? sessionStorage.getItem('sovereign-session') : null;
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      {/* 56px fixed-height Navigation Bar */}
      <Navbar onOpenSettings={() => setIsDrawerOpen(true)} />

      {/* 34px Live Market Ticker Rail — document flow, no fixed positioning */}
      <LiveMarketTicker />

      {/* Role Alert Banner (Only displays for non-Founder roles: Intern, Employee, Auditor) */}
      <RoleAlertBanner />

      {/* Autonomous Sentinel Emergency Incident Banner (Document-flow, non-colliding) */}
      <EmergencyIncidentBanner />

      {/* Workspace Body: Left Hover-Expandable Rail + Main Content Area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hover-expandable Left Rail Sidebar (58px collapsed with icons only -> 240px on hover) */}
        <LeftRailSidebar onOpenSettingsDrawer={() => setIsDrawerOpen(true)} />

        {/* flex-1 Scrollable Content Area */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingBottom: 'var(--shell-footer)',
            minHeight: 0,
          }}
        >
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <TreasuryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blueprint"
            element={
              <ProtectedRoute>
                <BlueprintStudio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <SecureVaultPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/vault/share" element={<SecureShareReceiver />} />
          <Route path="/vault/share/:shareId/:shareKeyHex" element={<SecureShareReceiver />} />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <FounderEnclave />
              </ProtectedRoute>
            }
          />
          <Route
            path="/comms"
            element={
              <ProtectedRoute>
                <CommsEnclave />
              </ProtectedRoute>
            }
          />
          <Route
            path="/docs"
            element={
              <ProtectedRoute>
                <DocsWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>

      {/* Global Workspace Overlays */}
      <LeftNavDrawer
        isOpen={isLeftNavOpen}
        onClose={() => setIsLeftNavOpen(false)}
        onOpenSettingsDrawer={() => setIsDrawerOpen(true)}
      />
      <SettingsDrawer
        isOpen={isDrawerOpen || isThemeDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          closeThemeDrawer();
        }}
      />
      <ByoAiConfigModal />
      <EmergencyGovernanceCockpit />
      <PermissionMatrixModal />
      <CommandKPalette
        isOpen={isCommandKOpen}
        onClose={() => setIsCommandKOpen(false)}
        onOpenSettingsDrawer={() => setIsDrawerOpen(true)}
      />
      <WebCaptureShield />
      <ForensicWatermark />
      <DuressOnboardingModal />
      <TacticalStatusBar onOpenCommandK={() => setIsCommandKOpen(true)} />
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <style>{SHELL_VARS}</style>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
