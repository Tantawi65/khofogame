import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { emitPlaceMummy } from '../../socket/socket';

interface PlaceMummyModalProps {
  deckSize: number;
  onClose: () => void;
}

const AUTO_CONFIRM_TIMEOUT = 5000; // 5 seconds

export function PlaceMummyModal({ deckSize, onClose }: PlaceMummyModalProps) {
  const [position, setPosition] = useState(Math.floor(deckSize / 2));
  const [timeLeft, setTimeLeft] = useState(AUTO_CONFIRM_TIMEOUT / 1000);
  const hasConfirmed = useRef(false);

  const handleConfirm = () => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;
    emitPlaceMummy(position);
    onClose();
  };

  // Auto-confirm timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const positionLabel = () => {
    if (position === 0) return 'Top (next draw!)';
    if (position === deckSize) return 'Bottom (last draw)';
    if (position <= deckSize * 0.25) return 'Near top (risky!)';
    if (position >= deckSize * 0.75) return 'Near bottom (safe)';
    return 'Middle';
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">💀 Hide the Mummy</h2>
        <p className="text-egyptian-gold text-center text-sm mb-2">
          Auto-confirm in {timeLeft}s
        </p>
        <p className="text-papyrus text-center mb-2">
          You defused the mummy! Now hide it back in the deck.
        </p>
        <p className="text-yellow-400 text-center text-sm mb-6">
          Only you know where it's placed!
        </p>

        {/* Visual deck representation */}
        <div className="relative mb-6">
          <div className="h-48 bg-nile-blue/30 rounded-lg border border-egyptian-gold/30 relative overflow-hidden">
            {/* Position indicator */}
            <motion.div
              className="absolute left-0 right-0 flex items-center justify-center"
              style={{ 
                top: `${(position / deckSize) * 100}%`,
                transform: 'translateY(-50%)',
              }}
              animate={{ x: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <div className="bg-mummy-red px-3 py-1 rounded-full flex items-center gap-2">
                <span>💀</span>
                <span className="text-white text-sm">Mummy Here</span>
              </div>
            </motion.div>

            {/* Top label */}
            <span className="absolute top-2 left-2 text-papyrus/60 text-xs">Top (drawn first)</span>
            
            {/* Bottom label */}
            <span className="absolute bottom-2 left-2 text-papyrus/60 text-xs">Bottom (drawn last)</span>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={deckSize}
            value={position}
            onChange={(e) => setPosition(parseInt(e.target.value))}
            className="w-full accent-egyptian-gold"
          />
          <div className="flex justify-between text-papyrus/60 text-sm">
            <span>Top (0)</span>
            <span className="text-egyptian-gold font-semibold">{positionLabel()}</span>
            <span>Bottom ({deckSize})</span>
          </div>
        </div>

        {/* Number input */}
        <div className="mb-6">
          <label className="text-papyrus text-sm">
            Position ({deckSize} cards in deck):
          </label>
          <input
            type="number"
            min={0}
            max={deckSize}
            value={position}
            onChange={(e) => setPosition(Math.min(deckSize, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full mt-1 text-center"
          />
        </div>

        <button onClick={handleConfirm} className="btn btn-primary w-full">
          Hide Mummy
        </button>
      </motion.div>
    </motion.div>
  );
}
