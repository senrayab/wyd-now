"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Feedback.module.css";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const api = useContext(FeedbackContext);
  if (!api) throw new Error("FeedbackProvider 가 필요해요.");
  return api;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toastMessage, setToastMessage] = useState<{ id: number; text: string } | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const toast = useCallback((text: string) => setToastMessage({ id: Date.now(), text }), []);
  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    [],
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!dialog) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close(ok: boolean) {
    dialog?.resolve(ok);
    setDialog(null);
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      {toastMessage && (
        <div key={toastMessage.id} className={styles.toast} role="status">
          {toastMessage.text}
        </div>
      )}
      {dialog && (
        <div className={styles.backdrop} onClick={() => close(false)}>
          <div
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title">{dialog.title}</h2>
            {dialog.message && <p>{dialog.message}</p>}
            <div className={styles.actions}>
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                취소
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn ${dialog.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
