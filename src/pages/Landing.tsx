import React, { useState } from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroSection } from '../components/landing/HeroSection';
import { LiveCryptoInspector } from '../components/landing/LiveCryptoInspector';
import { ArchitecturalBento } from '../components/landing/ArchitecturalBento';
import { InstitutionalRoi } from '../components/landing/InstitutionalRoi';
import { LandingFooter } from '../components/landing/LandingFooter';
import { HardwareArchitectureDrawer } from '../components/landing/HardwareArchitectureDrawer';

export const Landing: React.FC = () => {
  const [isHardwareDrawerOpen, setIsHardwareDrawerOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />

      <main style={{ flex: 1, paddingTop: 52 }}>
        <HeroSection
          onOpenHardwareDrawer={() => setIsHardwareDrawerOpen(true)}
        />

        <LiveCryptoInspector />

        <ArchitecturalBento />

        <InstitutionalRoi />
      </main>

      <LandingFooter
        onOpenHardwareDrawer={() => setIsHardwareDrawerOpen(true)}
      />

      <HardwareArchitectureDrawer
        isOpen={isHardwareDrawerOpen}
        onClose={() => setIsHardwareDrawerOpen(false)}
      />
    </div>
  );
};
