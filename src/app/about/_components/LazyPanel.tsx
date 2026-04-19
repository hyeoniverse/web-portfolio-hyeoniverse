"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface LazyPanelProps {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
}

export default function LazyPanel({ children, fallback, rootMargin = "200%" }: LazyPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  if (visible) return <>{children}</>;
  return <div ref={ref}>{fallback}</div>;
}
