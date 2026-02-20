import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CARD_DATABASE, type CardId } from '@shared/types';
import { useGameStore } from '../../store/gameStore';
import { emitKingRaResponse } from '../../socket/socket';

interface KingRaPromptModalProps {
  playerId?: string;
  cardPlayed?: CardId;
  timeout: number;
  onClose: () => void;
}

export function KingRaPromptModal({ playerId, cardPlayed, timeout, onClose }: KingRaPromptModalProps) {
  const [timeLeft, setTimeLeft] = useState(timeout);
  const gameState = useGameStore((state) => state.gameState);
  const myHand = useGameStore((state) => state.myHand);
  const hasResponded = useRef(false);
  const isMounted = useRef(true);
  
  const hasKingRa = myHand.some(c => c.cardId === 'king_ra_says_no');
  console.log('KingRaPromptModal render - myHand:', myHand.map(c => c.cardId), 'hasKingRa:', hasKingRa);
  const playerName = gameState?.players.find(p => p.id === playerId)?.name ?? 'A player';
  const cardDef = cardPlayed ? CARD_DATABASE[cardPlayed] : null;

  // Track mount state
  useEffect(() => {
    isMounted.current = true;
    hasResponded.current = false; // Reset on mount
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) {
        clearInterval(interval);
        return;
      }
      
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          // Auto-decline on timeout
          if (!hasResponded.current && isMounted.current) {
            hasResponded.current = true;
            emitKingRaResponse(false);
            onClose();
          }
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onClose]);

  const handleResponse = (useKingRa: boolean) => {
    console.log('King Ra handleResponse called:', { useKingRa, hasResponded: hasResponded.current, hasKingRa });
    if (hasResponded.current) {
      console.log('Already responded, ignoring');
      return;
    }
    hasResponded.current = true;
    console.log('Emitting kingRaResponse:', useKingRa);
    emitKingRaResponse(useKingRa);
    onClose();
  };

  const progressPercent = (timeLeft / timeout) * 100;

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
        <h2 className="modal-title">👑 King Ra Says NO?</h2>
        
        <motion.div
          className="text-center mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          <p className="text-papyrus">
            <span className="text-egyptian-gold font-bold">{playerName}</span> played:
          </p>
          <p className="text-2xl font-bold text-mummy-red mt-2">
            {cardDef?.nameEn}
          </p>
          <p className="text-xl text-egyptian-gold" dir="rtl">
            {cardDef?.nameAr}
          </p>
        </motion.div>

        {/* Timer */}
        <div className="king-ra-timer mb-6">
          <motion.div
            className="king-ra-timer-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-center text-papyrus/80 mb-4">
          {hasKingRa 
            ? 'Do you want to cancel this action?'
            : "You don't have King Ra Says NO!"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => handleResponse(false)}
            className="btn btn-secondary flex-1"
          >
            Let it happen
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={!hasKingRa}
            className="btn btn-danger flex-1"
          >
            👑 CANCEL IT!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
