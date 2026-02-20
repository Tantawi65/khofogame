import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function MummyEventOverlay() {
  const mummyEvent = useGameStore((state) => state.mummyEvent);

  if (!mummyEvent) return null;

  const getEventStyle = () => {
    switch (mummyEvent.type) {
      case 'drawn':
        return {
          bg: 'from-amber-900/95 to-amber-950/95',
          icon: '⚠️',
          title: 'MUMMY DRAWN!',
          subtitle: `${mummyEvent.playerName} drew a mummy card!`,
          textColor: 'text-amber-300',
        };
      case 'defused':
        return {
          bg: 'from-green-900/95 to-green-950/95',
          icon: '🛡️',
          title: 'MUMMY DEFUSED!',
          subtitle: `${mummyEvent.playerName} defused the mummy!`,
          textColor: 'text-green-300',
        };
      case 'eliminated':
        return {
          bg: 'from-red-900/95 to-red-950/95',
          icon: '💀',
          title: 'MUMMIFIED!',
          subtitle: `${mummyEvent.playerName} has been eliminated!`,
          textColor: 'text-red-300',
        };
    }
  };

  const style = getEventStyle();

  return (
    <AnimatePresence>
      <motion.div
        key={`${mummyEvent.type}-${mummyEvent.playerName}`}
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`bg-gradient-to-b ${style.bg} px-12 py-8 rounded-2xl shadow-2xl border-2 border-egyptian-gold/50`}
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            transition: { type: 'spring', damping: 15 }
          }}
          exit={{ 
            scale: 0.8, 
            opacity: 0, 
            y: -50,
            transition: { duration: 0.3 }
          }}
        >
          <motion.div
            className="text-6xl text-center mb-4"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: mummyEvent.type === 'eliminated' ? [0, -5, 5, 0] : 0,
            }}
            transition={{ 
              duration: 0.5, 
              repeat: mummyEvent.type === 'eliminated' ? 2 : 0,
            }}
          >
            {style.icon}
          </motion.div>
          
          <motion.h2
            className={`text-4xl font-bold text-center ${style.textColor} mb-2`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {style.title}
          </motion.h2>
          
          <motion.p
            className="text-xl text-center text-papyrus/90"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {style.subtitle}
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
