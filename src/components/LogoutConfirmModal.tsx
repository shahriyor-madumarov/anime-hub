import React from "react";
import { LogOut, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoggingOut) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.25 }}
            className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isLoggingOut}
              className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Выход из аккаунта</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Подтвердите ваше действие</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 font-medium">
              Вы действительно хотите выйти из аккаунта?
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 font-bold text-xs sm:text-sm border border-zinc-800 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoggingOut}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Выход...</span>
                  </>
                ) : (
                  <span>Выйти</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
