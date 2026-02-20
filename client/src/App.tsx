import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { initializeSocket, disconnectSocket } from './socket/socket';
import { MainMenu } from './components/screens/MainMenu';
import { Lobby } from './components/screens/Lobby';
import { Room } from './components/screens/Room';
import { GameBoard } from './components/screens/GameBoard';
import { LandscapeOverlay } from './components/ui/LandscapeOverlay';
import { ToastContainer } from './components/ui/ToastContainer';
import { MummyEventOverlay } from './components/ui/MummyEventOverlay';
import { ModalRenderer } from './components/modals/ModalRenderer';

function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);

  useEffect(() => {
    initializeSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return <MainMenu />;
      case 'lobby':
        return <Lobby />;
      case 'room':
        return <Room />;
      case 'game':
        return <GameBoard />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <>
      <LandscapeOverlay />
      <div className="game-content flex flex-col min-h-screen min-h-[100dvh]">
        {renderScreen()}
      </div>
      <ToastContainer />
      <MummyEventOverlay />
      <ModalRenderer />
    </>
  );
}

export default App;
