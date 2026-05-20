"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md bg-background border border-border shadow-2xl rounded-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className={`p-6 border-b border-border flex items-start gap-4 ${isDestructive ? "bg-red-500/10" : "bg-muted/30"}`}>
                <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-brand-orange/20 text-brand-orange"}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 mt-1">
                  <h2 className="text-xl font-bold text-foreground">{title}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {description}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors -mr-2 -mt-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Actions */}
              <div className="p-4 bg-muted/10 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all focus:ring-4 ${
                    isDestructive 
                      ? "bg-red-600 hover:bg-red-700 focus:ring-red-600/20" 
                      : "bg-brand-orange hover:bg-brand-orange/90 focus:ring-brand-orange/20"
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
