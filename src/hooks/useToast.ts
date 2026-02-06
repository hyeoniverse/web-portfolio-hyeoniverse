"use client";

import { useState, useCallback } from "react";

interface Toast {
  message: string;
  type: "error" | "success";
}

interface UseToastReturn {
  toast: Toast | null;
  formToast: Toast | null;
  showToast: (message: string, type: "error" | "success") => void;
  showFormToast: (message: string, type?: "error" | "success") => void;
  clearToast: () => void;
  clearFormToast: () => void;
}

export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<Toast | null>(null);
  const [formToast, setFormToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const showFormToast = useCallback(
    (message: string, type: "error" | "success" = "error") => {
      setFormToast({ message, type });
      setTimeout(() => setFormToast(null), type === "success" ? 4000 : 3000);
    },
    []
  );

  const clearToast = useCallback(() => setToast(null), []);
  const clearFormToast = useCallback(() => setFormToast(null), []);

  return {
    toast,
    formToast,
    showToast,
    showFormToast,
    clearToast,
    clearFormToast,
  };
}
