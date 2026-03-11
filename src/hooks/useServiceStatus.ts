"use client";

import { useState, useEffect } from "react";

interface ServiceStatus {
  translation: boolean;
  aiSummary: boolean;
}

export function useServiceStatus(): ServiceStatus & { loading: boolean } {
  const [status, setStatus] = useState<ServiceStatus>({ translation: true, aiSummary: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/service-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { ...status, loading };
}
