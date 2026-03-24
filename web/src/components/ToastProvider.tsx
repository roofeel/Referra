import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error';

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  closing: boolean;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const TOAST_DURATION_MS = 2600;
const TOAST_FADE_MS = 500;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function createToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  const markToastClosing = useCallback((toastId: string) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === toastId ? { ...toast, closing: true } : toast)),
    );
  }, []);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = createToastId();
      setToasts((prev) => [...prev, { id, message, type, closing: false }]);

      const closeTimeout = window.setTimeout(() => {
        markToastClosing(id);
      }, TOAST_DURATION_MS);

      const removeTimeout = window.setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS + TOAST_FADE_MS);

      timeoutsRef.current.push(closeTimeout, removeTimeout);
    },
    [markToastClosing, removeToast],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => showToast(message, 'success'),
      error: (message: string) => showToast(message, 'error'),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-message toast-message--${toast.type}${toast.closing ? ' toast-message--closing' : ''}`}
            role="status"
          >
            <span className="toast-message__icon" aria-hidden="true">
              {toast.type === 'success' ? '✓' : '!'}
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
