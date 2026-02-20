import { motion } from 'framer-motion';
import { CARD_DATABASE, type CardId } from '@shared/types';
import { emitSpellboundRequest } from '../../socket/socket';

interface CardTypeSelectModalProps {
  targetId?: string;
  onClose: () => void;
}

// Cards that can be requested via Spellbound
const REQUESTABLE_CARDS: CardId[] = [
  'sharp_eye', 'wait_a_sec', 'me_or_you', 'spellbound', 'criminal_mummy',
  'give_and_take', 'shuffle_it', 'king_ra_says_no', 'safe_travels',
  'take_a_lap', 'all_or_nothing', 'flip_the_table', 'this_is_on_you'
];

export function CardTypeSelectModal({ targetId, onClose }: CardTypeSelectModalProps) {
  const handleSelect = (cardId: CardId) => {
    if (targetId) {
      emitSpellboundRequest(targetId, cardId);
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
        className="modal-content max-h-[80vh] overflow-y-auto"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">🔮 Spellbound</h2>
        <p className="text-papyrus text-center mb-4">
          Ask for a specific card. If they don't have it, YOU draw!
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {REQUESTABLE_CARDS.map((cardId, index) => {
            const card = CARD_DATABASE[cardId];
            return (
              <motion.button
                key={cardId}
                className="p-3 rounded-lg bg-nile-blue/50 border border-egyptian-gold/30 hover:border-egyptian-gold hover:bg-nile-blue transition-all text-left"
                onClick={() => handleSelect(cardId)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <p className="text-papyrus text-sm font-semibold">{card.nameEn}</p>
                <p className="text-egyptian-gold text-xs" dir="rtl">{card.nameAr}</p>
              </motion.button>
            );
          })}
        </div>

        <button onClick={onClose} className="btn btn-secondary w-full">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
