import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function MainMenu() {
  const [playerName, setPlayerName] = useState('');
  const setScreen = useGameStore((state) => state.setScreen);
  const setPlayerNameInStore = useGameStore((state) => state.setPlayerName);
  const isConnected = useGameStore((state) => state.isConnected);

  const handlePlay = () => {
    if (!playerName.trim()) {
      useGameStore.getState().addToast('Please enter your name!', 'warning');
      return;
    }
    setPlayerNameInStore(playerName.trim());
    setScreen('lobby');
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/menu_background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black/60 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full"
      >
        {/* Logo */}
        <motion.img
          src="/ui_logo.png"
          alt="Mummy Card Game"
          className="w-48 h-48 mx-auto mb-6 object-contain"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        
        <h1 className="text-3xl font-bold text-center text-egyptian-gold mb-2">
          Mummy Card Game
        </h1>
        <h2 className="text-xl text-center text-papyrus mb-8" dir="rtl">
          هتتحنط هنا
        </h2>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-papyrus">
            {isConnected ? 'Connected to server' : 'Connecting...'}
          </span>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <label className="block text-papyrus mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full"
            maxLength={20}
            onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
          />
        </div>

        {/* Play button */}
        <motion.button
          className="btn btn-primary w-full text-xl"
          onClick={handlePlay}
          disabled={!isConnected}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Play Game
        </motion.button>
      </motion.div>
    </div>
  );
}
