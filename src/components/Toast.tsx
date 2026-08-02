import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ToastMessage {
  id?: string;
  message: string;
  type?: "success" | "info" | "error";
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 min-w-0">
            {toast.type === "error" ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : toast.type === "info" ? (
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            <p className="text-xs sm:text-sm font-semibold truncate text-zinc-200">
              {toast.message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Закрыть уведомление"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
