import { motion } from 'framer-motion';
import { emitBlindStealSelect } from '../../socket/socket';

interface BlindStealModalProps {
  cardCount: number;
  onClose: () => void;
}

export function BlindStealModal({ cardCount, onClose }: BlindStealModalProps) {
  const handleSelect = (position: number) => {
    emitBlindStealSelect(position);
    onClose();
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
        <h2 className="modal-title">🥷 Steal a Card</h2>
        <p className="text-papyrus text-center mb-4">
          Choose a card to steal (you can't see what they are!)
        </p>

        <div className="flex justify-center gap-2 flex-wrap mb-6">
          {Array.from({ length: cardCount }).map((_, index) => (
            <motion.button
              key={index}
              className="relative"
              onClick={() => handleSelect(index)}
              initial={{ opacity: 0, rotateY: 180 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.1, y: -10 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-16 h-24 bg-gradient-to-br from-egyptian-gold to-sand rounded-lg shadow-lg flex items-center justify-center">
                <span className="text-nile-blue font-bold text-2xl">?</span>
              </div>
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-nile-blue text-papyrus text-xs px-2 py-1 rounded">
                {index + 1}
              </span>
            </motion.button>
          ))}
        </div>

        <p className="text-papyrus/60 text-center text-sm">
          The victim may have rearranged their cards!
        </p>
      </motion.div>
    </motion.div>
  );
}
