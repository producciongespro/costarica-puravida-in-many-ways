import React from 'react';
import { AudioProvider } from './context/AudioContext';
import { GameProvider, useGame } from './context/GameContext';
import TopHudBar from './components/common/TopHudBar';
import GlobalModals from './components/common/GlobalModals';
import MainScreen from './components/screens/MainScreen';
import {
  NewGameWarningScreen,
  CharacterSelectScreen,
  SelecScreenDialogue,
  AdventureStartScreen
} from './components/screens/OnboardingScreens';
import CostaRicaMapScreen from './components/screens/CostaRicaMapScreen';
import {
  GlossaryScreen,
  OptionsScreen,
  CreditsScreen
} from './components/screens/SystemScreens';
import MinigameRunner from './components/minigames/MinigameRunner';
import { Wrench } from 'lucide-react';

function GameRouter() {
  const { currentScreen, setShowTeacherPanel } = useGame();

  const showTopHud =
    currentScreen === 'MapaCostaRica' || currentScreen === 'Minigame';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Main':
        return <MainScreen />;
      case 'NewGameWarning':
        return <NewGameWarningScreen />;
      case 'SelecGenero':
        return <CharacterSelectScreen />;
      case 'SelecScreen':
        return <SelecScreenDialogue />;
      case 'AdventureStart':
        return <AdventureStartScreen />;
      case 'MapaCostaRica':
        return <CostaRicaMapScreen />;
      case 'Glosario':
        return <GlossaryScreen />;
      case 'Opciones':
        return <OptionsScreen />;
      case 'Creditos':
        return <CreditsScreen />;
      case 'Minigame':
        return <MinigameRunner />;
      default:
        return <MainScreen />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#0b2239] to-emerald-950 flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Main 960x620-proportioned Responsive Educational Game Frame */}
      <div className="relative w-full max-w-[1060px] h-[94vh] max-h-[680px] min-h-[560px] bg-sky-950 rounded-3xl border-4 border-sky-300/40 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
        {showTopHud ? (
          <TopHudBar />
        ) : (
          /* Floating quick-access MEP Teacher / Explorer Mode button on menu screens */
          <button
            type="button"
            onClick={() => setShowTeacherPanel(true)}
            title="Open MEP Teacher / Explorer Mode"
            className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>MEP Mode</span>
          </button>
        )}

        <main className="relative flex-1 w-full overflow-hidden">
          {renderScreen()}
        </main>

        {/* Global Overlays: Pause Menu, Cancel Minigame, GameEnding Victory, Teacher/Debug Panel */}
        <GlobalModals />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <GameProvider>
        <GameRouter />
      </GameProvider>
    </AudioProvider>
  );
}
