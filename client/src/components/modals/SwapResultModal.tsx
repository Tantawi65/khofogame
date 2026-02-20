import { motion } from 'framer-motion';
import type { CardInstance } from '@shared/types';
import { Card } from '../game/Card';

interface SwapResultModalProps {
  gaveCard?: CardInstance;
  receivedCard?: CardInstance;
  otherPlayer?: string;
  onClose: () => void;
}

export function SwapResultModal({ gaveCard, receivedCard, otherPlayer, onClose }: SwapResultModalProps) {
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
        <h2 className="modal-title">🔄 Card Swap</h2>
        <p className="text-papyrus text-center mb-4">
          Exchange with <span className="text-egyptian-gold font-bold">{otherPlayer}</span>
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          {/* What you gave */}
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">You Gave</p>
            {gaveCard && <Card card={gaveCard} size="medium" disabled />}
          </div>

          {/* Arrow */}
          <motion.div
            className="text-4xl text-egyptian-gold"
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            ⇄
          </motion.div>

          {/* What you received */}
          <div className="text-center">
            <p className="text-green-400 text-sm mb-2">You Received</p>
            {receivedCard && <Card card={receivedCard} size="medium" disabled />}
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary w-full">
          OK
        </button>
      </motion.div>
    </motion.div>
  );
}
