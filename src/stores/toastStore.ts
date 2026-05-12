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
  /** hover 시작 — 자동 dismiss 타이머 일시 정지 */
  pauseToast: (id: string) => void;
  /** hover 종료 — 남은 시간만큼 다시 타이머 시작 */
  resumeToast: (id: string) => void;
  clearToasts: () => void;
}

// 타이머 + 남은 시간 추적용 — store 외부에 보관 (hover pause/resume 시 정확한 잔여 시간 계산)
interface TimerInfo {
  timer: ReturnType<typeof setTimeout> | null;
  startedAt: number;
  remaining: number;
}
const timers = new Map<string, TimerInfo>();

const startTimer = (id: string, ms: number, dismiss: (id: string) => void) => {
  const timer = setTimeout(() => dismiss(id), ms);
  timers.set(id, { timer, startedAt: Date.now(), remaining: ms });
};

const clearTimer = (id: string) => {
  const info = timers.get(id);
  if (info) {
    if (info.timer) clearTimeout(info.timer);
    timers.delete(id);
  }
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message, variant = "info", duration = 2400) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant, duration }] }));
    if (duration > 0) {
      startTimer(id, duration, get().dismissToast);
    }
    return id;
  },

  dismissToast: (id) => {
    clearTimer(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  pauseToast: (id) => {
    const info = timers.get(id);
    if (!info || !info.timer) return;
    clearTimeout(info.timer);
    const elapsed = Date.now() - info.startedAt;
    info.remaining = Math.max(0, info.remaining - elapsed);
    // timer 만 비우고 remaining 은 유지 (resume 에서 사용)
    timers.set(id, { ...info, timer: null });
  },

  resumeToast: (id) => {
    const info = timers.get(id);
    if (!info || info.remaining <= 0) return;
    const dismiss = get().dismissToast;
    const timer = setTimeout(() => dismiss(id), info.remaining);
    timers.set(id, { timer, startedAt: Date.now(), remaining: info.remaining });
  },

  clearToasts: () => {
    timers.forEach((info) => {
      if (info.timer) clearTimeout(info.timer);
    });
    timers.clear();
    set({ toasts: [] });
  },
}));

/** 함수 호출 단축형 — provider 없이 어디서든 호출 가능 */
export function showToast(message: string, variant: ToastVariant = "info", duration?: number): string {
  return useToastStore.getState().showToast(message, variant, duration);
}
