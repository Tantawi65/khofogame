import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../game/Card';
import { emitRearrangeTopCards } from '../../socket/socket';
import type { CardInstance } from '@shared/types';

interface FlipTableModalProps {
  cards: CardInstance[];
  onClose: () => void;
}

export function FlipTableModal({ cards, onClose }: FlipTableModalProps) {
  const [orderedCards, setOrderedCards] = useState(cards.map(c => c.instanceId));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const hasConfirmed = useRef(false);

  const handleCardClick = (index: number) => {
    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      // Swap cards
      const newOrder = [...orderedCards];
      [newOrder[selectedIndex], newOrder[index]] = [newOrder[index], newOrder[selectedIndex]];
      setOrderedCards(newOrder);
      setSelectedIndex(null);
    }
  };

  const handleConfirm = () => {
    if (hasConfirmed.current) return;
    hasConfirmed.current = true;
    emitRearrangeTopCards(orderedCards);
    onClose();
  };

  const getCardByInstanceId = (instanceId: string) => {
    return cards.find(c => c.instanceId === instanceId);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content max-w-3xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">🔄 Flip the Table</h2>
        <p className="text-papyrus text-center mb-2">
          Rearrange the top {cards.length} cards of the deck
        </p>
        <p className="text-yellow-400 text-center text-sm mb-4">
          Tap two cards to swap positions. Position 1 will be drawn first.
        </p>

        <div className="grid grid-cols-5 gap-2 mb-6 justify-items-center">
          {orderedCards.map((instanceId, index) => {
            const card = getCardByInstanceId(instanceId);
            if (!card) return null;
            
            const isMummy = card.cardId === 'mummified';
            const isSelected = selectedIndex === index;
            
            return (
              <motion.div
                key={instanceId}
                className={`relative cursor-pointer rounded-lg ${isSelected ? 'ring-4 ring-egyptian-gold' : ''}`}
                onClick={() => handleCardClick(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isSelected ? { y: -10 } : { y: 0 }}
              >
                <Card card={card} size="small" />
                <span className="absolute -top-2 -left-2 bg-egyptian-gold text-nile-blue font-bold w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {index + 1}
                </span>
                {isMummy && (
                  <span className="absolute -top-2 -right-2 text-xl">💀</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {selectedIndex !== null && (
          <p className="text-egyptian-gold text-center text-sm mb-4">
            Position #{selectedIndex + 1} selected. Tap another card to swap!
          </p>
        )}

        <p className="text-papyrus/60 text-center text-sm mb-4">
          💡 Tip: Push mummies to higher positions (drawn later)
        </p>

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
