import { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from './AudioEngine';

interface UseAudioReturn {
  enabled: boolean;
  toggle: () => void;
  click: () => void;
  success: () => void;
  error: () => void;
  ambient: () => void;
  cryptoOp: () => void;
  nodeConnect: () => void;
  nav: () => void;
  analyser: AnalyserNode | null;
}

export function useAudio(): UseAudioReturn {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('sovereign-audio');
    return stored !== null ? stored === 'true' : true;
  });

  const initializedRef = useRef(false);

  // Init on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!initializedRef.current) {
        audioEngine.init();
        audioEngine.setEnabled(enabled);
        initializedRef.current = true;
      }
    };
    window.addEventListener('pointerdown', handleInteraction, { once: true });
    return () => window.removeEventListener('pointerdown', handleInteraction);
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('sovereign-audio', String(next));
    audioEngine.setEnabled(next);
  }, [enabled]);

  return {
    enabled,
    toggle,
    click:       () => audioEngine.playClick(),
    success:     () => audioEngine.playSuccess(),
    error:       () => audioEngine.playError(),
    ambient:     () => audioEngine.playAmbient(),
    cryptoOp:    () => audioEngine.playCryptoOp(),
    nodeConnect: () => audioEngine.playNodeConnect(),
    nav:         () => audioEngine.playNav(),
    analyser:    audioEngine.getAnalyser(),
  };
}
