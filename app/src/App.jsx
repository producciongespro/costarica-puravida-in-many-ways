import React, { useState } from 'react';
import { AudioProvider } from './context/AudioContext';
import { GameProvider, useGame } from './context/GameContext';
import AppShell from './components/layout/AppShell';
import SplashScreen from './components/screens/SplashScreen';
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

function GameRouter() {
  const { currentScreen } = useGame();
  const [showSplash, setShowSplash] = useState(true);

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

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return <AppShell>{renderScreen()}</AppShell>;
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
