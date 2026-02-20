import { motion } from 'framer-motion';
import { Card } from '../game/Card';
import { useGameStore } from '../../store/gameStore';
import type { CardInstance } from '@shared/types';

interface DuelResultModalProps {
  challenger?: { playerId: string; card: CardInstance };
  opponent?: { playerId: string; card: CardInstance };
  winnerId?: string;
  onClose: () => void;
}

export function DuelResultModal({ challenger, opponent, winnerId, onClose }: DuelResultModalProps) {
  const gameState = useGameStore((state) => state.gameState);
  const playerId = useGameStore((state) => state.playerId);
  
  const challengerName = gameState?.players.find(p => p.id === challenger?.playerId)?.name ?? 'Challenger';
  const opponentName = gameState?.players.find(p => p.id === opponent?.playerId)?.name ?? 'Opponent';
  const winnerName = gameState?.players.find(p => p.id === winnerId)?.name ?? 'Winner';
  const isWinner = winnerId === playerId;

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
        <h2 className="modal-title">⚔️ Duel Result</h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Challenger */}
          <motion.div
            className="text-center"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-papyrus mb-2">{challengerName}</p>
            {challenger?.card && (
              <Card card={challenger.card} size="large" />
            )}
            {winnerId === challenger?.playerId && (
              <motion.p
                className="text-green-400 font-bold mt-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                🏆 WINNER!
              </motion.p>
            )}
          </motion.div>

          {/* VS */}
          <motion.div
            className="text-4xl font-bold text-egyptian-gold"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: 2, duration: 0.3 }}
          >
            VS
          </motion.div>

          {/* Opponent */}
          <motion.div
            className="text-center"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-papyrus mb-2">{opponentName}</p>
            {opponent?.card && (
              <Card card={opponent.card} size="large" />
            )}
            {winnerId === opponent?.playerId && (
              <motion.p
                className="text-green-400 font-bold mt-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                🏆 WINNER!
              </motion.p>
            )}
          </motion.div>
        </div>

        <motion.p
          className={`text-center text-xl font-bold mb-4 ${isWinner ? 'text-green-400' : 'text-mummy-red'}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isWinner ? "🎉 You won the duel!" : `${winnerName} won the duel!`}
        </motion.p>

        <button onClick={onClose} className="btn btn-primary w-full">
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
}
