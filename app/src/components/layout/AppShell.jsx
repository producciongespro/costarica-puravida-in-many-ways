import React from 'react';
import { useGame } from '../../context/GameContext';
import TopHudBar from '../common/TopHudBar';
import GlobalModals from '../common/GlobalModals';

/**
 * Full-viewport App Shell:
 * - Fixed contextual TopHudBar header
 * - Flexible main game area with selective scroll (locked during Map & Minigames)
 * - Compact institutional MEP / GESPRO footer always visible
 */
export default function AppShell({ children }) {
  const { currentScreen } = useGame();

  const lockMainScroll =
    currentScreen === 'MapaCostaRica' || currentScreen === 'Minigame';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col text-white"
      style={{ height: '100dvh', backgroundColor: '#0b2239' }}
    >
      <TopHudBar />

      <main
        className={`relative flex-1 min-h-0 w-full ${
          lockMainScroll ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {children}
      </main>

      <footer
        className="h-8 shrink-0 w-full border-t border-sky-300/30 px-4 flex items-center justify-center text-[11px] sm:text-xs font-semibold tracking-wide select-none z-30"
        style={{ backgroundColor: '#0b2a47', color: '#e0f2fe' }}
      >
        <span>Ministerio de Educación Pública — GESPRO</span>
      </footer>

      <GlobalModals />
    </div>
  );
}
