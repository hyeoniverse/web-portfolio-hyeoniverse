// 글로벌 toast 스토어 — 어디서든 showToast(...) 로 비차단 피드백 표시
import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  /** 자동 dismiss 까지 ms — 기본 2400ms */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  /** message + 옵션으로 toast 추가 — id 반환 (수동 dismiss 용) */
  showToast: (message: string, variant?: ToastVariant, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message, variant = "info", duration = 2400) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }));
    if (duration > 0) {
      setTimeout(() => get().dismissToast(id), duration);
    }
    return id;
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}));

/** 함수 호출 단축형 — provider 없이 어디서든 호출 가능 */
export function showToast(message: string, variant: ToastVariant = "info", duration?: number): string {
  return useToastStore.getState().showToast(message, variant, duration);
}
