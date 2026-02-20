import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { Card } from '../game/Card';
import { emitArrangeHand } from '../../socket/socket';

const AUTO_CONFIRM_TIMEOUT = 15000; // 15 seconds

interface ArrangeHandModalProps {
  onClose: () => void;
}

export function ArrangeHandModal({ onClose }: ArrangeHandModalProps) {
  const myHand = useGameStore((state) => state.myHand);
  const [orderedCards, setOrderedCards] = useState(myHand.map(c => c.instanceId));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(AUTO_CONFIRM_TIMEOUT / 1000);
  const hasConfirmed = useRef(false);

  const handleCardClick = (index: number) => {
    if (selectedIndex === null) {
      // First card selected
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      // Clicked same card, deselect
      setSelectedIndex(null);
    } else {
      // Second card selected - swap them
      const newOrder = [...orderedCards];
      [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
      setOrderedCards(newOrder);
      setSelectedIndex(null);
    }
  };

  const handleConfirm = () => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;
    emitArrangeHand(orderedCards);
    onClose();
  };

  // Auto-confirm timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content max-w-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">🔀 Arrange Your Cards</h2>
        <p className="text-papyrus text-center mb-2">
          Someone is about to steal from you!
        </p>
        <p className="text-yellow-400 text-center text-sm mb-2">
          Tap two cards to swap their positions. Hide your good cards!
        </p>
        <p className={`text-center text-sm mb-4 ${timeLeft <= 3 ? 'text-red-400 font-bold animate-pulse' : 'text-egyptian-gold'}`}>
          ⏱️ Auto-confirm in {timeLeft}s
        </p>

        <div className="grid grid-cols-4 gap-2 mb-6 justify-items-center">
          {orderedCards.map((instanceId, index) => {
            const card = myHand.find(c => c.instanceId === instanceId);
            if (!card) return null;
            
            const isSelected = selectedIndex === index;
            
            return (
              <motion.div
                key={instanceId}
                className={`cursor-pointer rounded-lg ${isSelected ? 'ring-4 ring-egyptian-gold' : ''}`}
                onClick={() => handleCardClick(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isSelected ? { y: -10 } : { y: 0 }}
              >
                <Card card={card} size="small" />
                <p className="text-center text-xs text-papyrus mt-1">#{index + 1}</p>
              </motion.div>
            );
          })}
        </div>

        {selectedIndex !== null && (
          <p className="text-egyptian-gold text-center text-sm mb-4">
            Card #{selectedIndex + 1} selected. Tap another card to swap!
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={handleConfirm} className="btn btn-secondary flex-1">
            Keep Order
          </button>
          <button onClick={handleConfirm} className="btn btn-primary flex-1">
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
