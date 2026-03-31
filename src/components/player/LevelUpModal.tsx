'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  show: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpModal({ show, level, onClose }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-center p-8"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-8xl mb-4"
            >
              ⭐
            </motion.div>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-yellow-400 text-2xl font-bold mb-2"
            >
              LEVEL UP!
            </motion.p>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white text-5xl font-black"
            >
              Lv. {level}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-slate-400 text-sm mt-4"
            >
              タップして続ける
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
