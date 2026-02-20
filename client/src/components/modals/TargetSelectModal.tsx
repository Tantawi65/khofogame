import { motion } from 'framer-motion';
import type { Player } from '@shared/types';

interface TargetSelectModalProps {
  players: Player[];
  onClose: () => void;
}

export function TargetSelectModal({ players, onClose }: TargetSelectModalProps) {
  const handleSelect = (playerId: string) => {
    // Call the callback set by GameBoard
    // The callback returns true if we should NOT close (e.g., opening another modal)
    const callback = (window as any).__targetSelectCallback;
    if (callback) {
      const keepOpen = callback(playerId);
      if (keepOpen) return; // Don't close if another modal is being opened
    }
    onClose();
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">🎯 Select Target</h2>
        <p className="text-papyrus text-center mb-4">Choose an opponent</p>

        <div className="space-y-2 mb-6">
          {players.map((player, index) => (
            <motion.button
              key={player.id}
              className="w-full p-3 rounded-lg bg-nile-blue/50 border border-egyptian-gold/30 hover:border-egyptian-gold hover:bg-nile-blue transition-all flex items-center justify-between"
              onClick={() => handleSelect(player.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="player-avatar w-10 h-10">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-papyrus font-semibold">{player.name}</span>
              </div>
              <span className="text-egyptian-gold">{player.cardCount} cards</span>
            </motion.button>
          ))}
        </div>

        <button onClick={onClose} className="btn btn-secondary w-full">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
