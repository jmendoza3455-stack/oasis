"use client";

import { useSyncExternalStore } from "react";

const EVENT = "oasis-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Valor crudo de localStorage, seguro para SSR (en el servidor devuelve `undefined`). */
export function useStored(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined,
  );
}

export function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // almacenamiento bloqueado: la decisión vale solo para esta vista
  }
  window.dispatchEvent(new Event(EVENT));
}
