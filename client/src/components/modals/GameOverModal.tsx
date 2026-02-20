import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { emitLeaveRoom } from '../../socket/socket';

interface GameOverModalProps {
  winnerId?: string;
  winnerName?: string;
  onClose: () => void;
}

export function GameOverModal({ winnerId, winnerName, onClose }: GameOverModalProps) {
  const playerId = useGameStore((state) => state.playerId);
  const reset = useGameStore((state) => state.reset);
  
  const isWinner = winnerId === playerId;

  const handleLeave = () => {
    emitLeaveRoom();
    reset();
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
        className="modal-content text-center"
        initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        transition={{ type: 'spring', duration: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        {isWinner ? (
          <>
            <motion.div
              className="text-8xl mb-4"
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
              🏆
            </motion.div>
            <h2 className="text-4xl font-bold text-egyptian-gold mb-4">
              YOU WIN!
            </h2>
            <p className="text-2xl text-papyrus mb-2" dir="rtl">
              مبروك! انت الفائز
            </p>
            <motion.p
              className="text-green-400 text-xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              You survived the mummies!
            </motion.p>
          </>
        ) : (
          <>
            <motion.div
              className="text-8xl mb-4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              👑
            </motion.div>
            <h2 className="text-4xl font-bold text-egyptian-gold mb-4">
              GAME OVER
            </h2>
            <p className="text-papyrus text-xl mb-2">
              <span className="text-egyptian-gold font-bold">{winnerName}</span> wins!
            </p>
            <p className="text-mummy-red text-lg">
              Better luck next time!
            </p>
          </>
        )}

        <motion.div
          className="mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <button onClick={handleLeave} className="btn btn-primary text-xl px-10">
            Back to Menu
          </button>
        </motion.div>

        {/* Confetti effect for winner */}
        {isWinner && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#d4a843', '#8b4513', '#f5f5dc', '#1a3a5c'][i % 4],
                  left: `${Math.random() * 100}%`,
                }}
                initial={{ y: -20, opacity: 1 }}
                animate={{ 
                  y: '100vh',
                  rotate: Math.random() * 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
