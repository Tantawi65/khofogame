import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export function ToastContainer() {
  const toasts = useGameStore((state) => state.toasts);
  const removeToast = useGameStore((state) => state.removeToast);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`toast toast-${toast.type} cursor-pointer`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
