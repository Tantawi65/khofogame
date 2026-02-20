import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../game/Card';
import { emitBurnCard } from '../../socket/socket';
import type { CardInstance } from '@shared/types';
import { useGameStore } from '../../store/gameStore';

interface ViewHandModalProps {
  cards: CardInstance[];
  targetId?: string;
  onClose: () => void;
}

export function ViewHandModal({ cards, targetId, onClose }: ViewHandModalProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const gameState = useGameStore((state) => state.gameState);
  const targetName = gameState?.players.find(p => p.id === targetId)?.name ?? 'Opponent';

  const handleBurn = () => {
    if (selectedCard) {
      emitBurnCard(selectedCard);
      onClose();
    }
  };

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
        <h2 className="modal-title">👁️ {targetName}'s Hand</h2>
        <p className="text-papyrus text-center mb-2">
          Select one card to BURN (discard)
        </p>
        <p className="text-mummy-red text-center text-sm mb-4">
          🔥 The chosen card will be destroyed!
        </p>

        <div className="flex justify-center gap-3 flex-wrap mb-6">
          {cards.map((card, index) => (
            <motion.div
              key={card.instanceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedCard(card.instanceId)}
            >
              <Card
                card={card}
                size="medium"
                selected={selectedCard === card.instanceId}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleBurn}
            disabled={!selectedCard}
            className="btn btn-danger flex-1"
          >
            🔥 Burn Card
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
