"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Attaches click handlers to all <img> inside a prose container.
 * Returns the state needed to drive ImageViewer.
 */
export function useProseImageViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerState, setViewerState] = useState<{
    open: boolean;
    images: string[];
    index: number;
  }>({ open: false, images: [], index: 0 });

  const close = useCallback(() => {
    setViewerState((s) => ({ ...s, open: false }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;

      const img = target as HTMLImageElement;
      const src = img.src;
      if (!src) return;

      // Collect all images in the container
      const allImgs = Array.from(el.querySelectorAll("img"))
        .map((i) => i.src)
        .filter(Boolean);
      const idx = allImgs.indexOf(src);

      setViewerState({
        open: true,
        images: allImgs,
        index: idx >= 0 ? idx : 0,
      });
    };

    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  return { containerRef, viewerState, closeViewer: close };
}
