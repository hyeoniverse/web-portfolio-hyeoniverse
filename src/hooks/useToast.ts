"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Toast {
  message: string;
  type: "error" | "success";
}

interface UseToastReturn {
  formToast: Toast | null;
  showFormToast: (message: string, type?: "error" | "success") => void;
}

/**
 * ContactDrawer 전용 form-scoped toast.
 * 글로벌 toast 는 `useToastStore` 를 사용 — 폼 컨테이너 내부에 anchor 된
 * 알림만 이 훅으로 관리한다.
 */
export function useToast(): UseToastReturn {
  const [formToast, setFormToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFormToast = useCallback(
    (message: string, type: "error" | "success" = "error") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFormToast({ message, type });
      timerRef.current = setTimeout(
        () => setFormToast(null),
        type === "success" ? 4000 : 3000,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { formToast, showFormToast };
}
