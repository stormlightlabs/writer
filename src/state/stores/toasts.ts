import * as logger from "@tauri-apps/plugin-log";
import { create } from "zustand";
export type ToastType = "success" | "error" | "info" | "warn";

export type Toast = { id: string; type: ToastType; message: string; duration?: number };

type ToastStore = {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = DEFAULT_DURATION) => {
    const id = generateId();
    const toast: Toast = { id, type, message, duration };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

export function showToast(type: ToastType, message: string, duration: number = DEFAULT_DURATION): string {
  return useToastStore.getState().addToast(type, message, duration);
}

export function showSuccessToast(message: string, duration?: number): string {
  logger.debug(message);
  return showToast("success", message, duration);
}

export function showErrorToast(message: string, duration?: number): string {
  logger.error(message);
  return showToast("error", message, duration);
}

export function showInfoToast(message: string, duration?: number): string {
  logger.info(message);
  return showToast("info", message, duration);
}

export function showWarnToast(message: string, duration?: number): string {
  logger.warn(message);
  return showToast("warn", message, duration);
}

export const dismissToast = (id: string): void => useToastStore.getState().removeToast(id);
