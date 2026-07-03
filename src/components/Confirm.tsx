"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Options = { title?: string; message: string; confirmLabel?: string; danger?: boolean };
type Pending = Options & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((o: Options) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((o: Options) => {
    return new Promise<boolean>((resolve) => setPending({ ...o, resolve }));
  }, []);

  function close(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="rise w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {pending.title && <h2 className="font-display text-lg font-semibold text-zinc-50">{pending.title}</h2>}
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">{pending.message}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => close(false)}
                className="flex-1 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Annuler
              </button>
              <button
                onClick={() => close(true)}
                className={`btn-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 ${
                  pending.danger ? "bg-orange-500 hover:bg-orange-400" : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {pending.confirmLabel ?? "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>");
  return ctx;
}
