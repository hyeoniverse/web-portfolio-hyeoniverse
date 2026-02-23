"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    fetch("/api/visits", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
