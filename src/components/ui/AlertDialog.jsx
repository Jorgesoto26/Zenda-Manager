import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
            variant === 'destructive'
              ? 'bg-red-50 text-red-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {variant === 'destructive' ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <Info className="h-6 w-6" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {description}
        </p>

        <div className="flex w-full gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

