import { motion } from 'framer-motion';
import { Card } from '../game/Card';
import type { CardInstance } from '@shared/types';

interface PeekCardsModalProps {
  cards: CardInstance[];
  onClose: () => void;
}

export function PeekCardsModal({ cards, onClose }: PeekCardsModalProps) {
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
        <h2 className="modal-title">👁️ Peek at the Deck</h2>
        <p className="text-papyrus text-center mb-4">
          Top {cards.length} cards (first card is on top)
        </p>

        <div className="flex justify-center gap-4 flex-wrap mb-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.instanceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              <Card card={card} size="large" />
              <span className="absolute -top-2 -left-2 bg-egyptian-gold text-nile-blue font-bold w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {index + 1}
              </span>
              {card.cardId === 'mummified' && (
                <span className="absolute -top-2 -right-2 text-2xl">💀</span>
              )}
            </motion.div>
          ))}
        </div>

        <button onClick={onClose} className="btn btn-primary w-full">
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}
