"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import CloseIcon from "@/components/ui/CloseIcon";
import Tooltip from "@/components/ui/Tooltip";
import { Switch } from "@/components/ui/Switch";
import {
  ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon,
  FullscreenIcon, ExitFullscreenIcon, ThumbStripIcon, ThumbListIcon,
  PlayIcon, PauseIcon,
} from "./icons";
import {
  SWIPE_THRESHOLD, DISMISS_THRESHOLD, IDLE_MS,
  MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, AUTOPLAY_INTERVALS, SLIDE_OFFSET,
} from "./constants";
import styles from "./ImageViewer.module.css";

type ThumbMode = "hidden" | "strip" | "list";

interface ImageViewerProps {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  title?: string;
}

export default function ImageViewer({ images, index, open, onClose, title }: ImageViewerProps) {
  const { stop: lenisStop, start: lenisStart } = useLenis();

  const [current, setCurrent] = useState(index);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thumbMode, setThumbMode] = useState<ThumbMode>(images.length > 1 ? "strip" : "hidden");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoInterval, setAutoInterval] = useState<(typeof AUTOPLAY_INTERVALS)[number]>(4000);
  const [autoLoop, setAutoLoop] = useState(true);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [hoveredInterval, setHoveredInterval] = useState<(typeof AUTOPLAY_INTERVALS)[number] | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [closing, setClosing] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbListRef = useRef<HTMLDivElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSettingsRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState(1);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
  }, [closing]);

  // Delay actual close until exit animation finishes
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onClose(), 1700);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  const hasMultiple = images.length > 1;
  const isZoomed = zoom > 1;

  useEffect(() => setMounted(true), []);

  // Sync on open
  useEffect(() => {
    if (open) {
      setCurrent(index);
      setLoading(true);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setControlsVisible(true);
    }
  }, [open, index]);

  // Scroll lock (position: fixed to prevent background scroll)
  useEffect(() => {
    if (!open) return;
    lenisStop();
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
      const top = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (top) window.scrollTo(0, parseInt(top, 10) * -1);
      lenisStart();
    };
  }, [open, lenisStop, lenisStart]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard — handlePrev/handleNext는 아래에서 정의되므로 ref로 참조
  const prevRef = useRef(() => {});
  const nextRef = useRef(() => {});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      showControls();
      switch (e.key) {
        case "Escape":
          if (isFullscreen) document.exitFullscreen?.();
          else handleClose();
          break;
        case "ArrowLeft": prevRef.current(); break;
        case "ArrowRight": nextRef.current(); break;
        case "+": case "=": zoomIn(); break;
        case "-": zoomOut(); break;
        case "0": resetZoom(); break;
        case "f": toggleFullscreen(); break;
        case "t": cycleThumbMode(); break;
        case "p": toggleAutoPlay(); break;
        case "?": setShowShortcuts((v) => !v); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, current, images.length, isFullscreen, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload adjacent
  useEffect(() => {
    if (!open || images.length <= 1) return;
    [(current + 1) % images.length, (current - 1 + images.length) % images.length]
      .forEach((i) => { const img = new Image(); img.src = images[i]; });
  }, [open, current, images]);

  // Fullscreen auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (isFullscreen) {
      idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_MS);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!open || !isFullscreen) return;
    idleTimer.current = setTimeout(() => setControlsVisible(false), IDLE_MS);
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [open, isFullscreen, current]);

  // Autoplay
  useEffect(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!autoPlay || !open || !hasMultiple) return;
    autoPlayRef.current = setInterval(() => {
      setCurrent((c) => {
        const isLast = c >= images.length - 1;
        if (isLast && !autoLoop) {
          setAutoPlay(false);
          return c;
        }
        setDirection(1);
        return isLast ? 0 : c + 1;
      });
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setLoading(true);
    }, autoInterval);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [autoPlay, open, hasMultiple, images.length, autoInterval, autoLoop]);

  const stopAutoPlay = useCallback(() => setAutoPlay(false), []);
  const toggleAutoPlay = useCallback(() => setAutoPlay((v) => !v), []);

  // Scroll active thumb into view
  useEffect(() => {
    if (thumbMode === "hidden") return;
    const container = thumbListRef.current;
    if (!container) return;
    const active = container.querySelector(`[data-idx="${current}"]`) as HTMLElement;
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [current, thumbMode]);

  /* ── Navigation ── */
  const goTo = useCallback((idx: number) => {
    stopAutoPlay();
    setCurrent((prev) => {
      if (prev === idx) return prev;
      setLoading(true);
      return idx;
    });
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [stopAutoPlay]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    goTo(current > 0 ? current - 1 : images.length - 1);
  }, [current, images.length, goTo]);
  prevRef.current = handlePrev;

  const handleNext = useCallback(() => {
    setDirection(1);
    goTo(current < images.length - 1 ? current + 1 : 0);
  }, [current, images.length, goTo]);
  nextRef.current = handleNext;

  /* ── Zoom ── */
  const zoomIn = useCallback(() => {
    stopAutoPlay();
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, [stopAutoPlay]);

  const zoomOut = useCallback(() => {
    stopAutoPlay();
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, [stopAutoPlay]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Zoom level direct input
  const startZoomEdit = useCallback(() => {
    setZoomInput(String(Math.round(zoom * 100)));
    setEditingZoom(true);
    requestAnimationFrame(() => zoomInputRef.current?.select());
  }, [zoom]);

  const commitZoomEdit = useCallback(() => {
    setEditingZoom(false);
    const val = parseInt(zoomInput, 10);
    if (isNaN(val)) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, val / 100));
    setZoom(clamped);
    if (clamped === 1) setPanOffset({ x: 0, y: 0 });
  }, [zoomInput]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double-click zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isZoomed) {
      resetZoom();
    } else {
      setZoom(2);
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setPanOffset({ x: -px * rect.width, y: -py * rect.height });
    }
  }, [isZoomed, resetZoom]);

  // Drag to pan (when zoomed)
  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    panStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
  }, [isZoomed, panOffset]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPanOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
  }, []);

  const handlePanEnd = useCallback(() => { panStart.current = null; }, []);

  /* ── Touch: swipe nav + drag dismiss ── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    showControls();
    if (isZoomed) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, [isZoomed, showControls]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || isZoomed) return;
    const t = e.touches[0];
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dy) > Math.abs(t.clientX - touchStart.current.x) && dy > 0) {
      setDragY(dy);
      setIsDragging(true);
    }
  }, [isZoomed]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const elapsed = Date.now() - touchStart.current.time;

    if (isDragging && dragY > DISMISS_THRESHOLD) {
      handleClose();
    } else if (!isDragging && Math.abs(dx) > SWIPE_THRESHOLD && elapsed < 400) {
      if (dx > 0) handlePrev(); else handleNext();
    }
    touchStart.current = null;
    setDragY(0);
    setIsDragging(false);
  }, [isDragging, dragY, handlePrev, handleNext, handleClose]);

  /* ── Fullscreen ── */
  const toggleFullscreen = useCallback(() => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  }, []);

  /* ── Thumbnail mode ── */
  const cycleThumbMode = useCallback(() => {
    setThumbMode((m) => {
      if (m === "hidden") return "strip";
      if (m === "strip") return "list";
      return "hidden";
    });
  }, []);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoreMenu]);

  // Close autoplay popover on outside click
  useEffect(() => {
    if (!showAutoSettings) return;
    const handler = (e: MouseEvent) => {
      if (autoSettingsRef.current && !autoSettingsRef.current.contains(e.target as Node)) {
        setShowAutoSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAutoSettings]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setDragY(0);
      setIsDragging(false);
      setThumbMode(images.length > 1 ? "strip" : "hidden");
      setShowShortcuts(false);
      setEditingZoom(false);
      setAutoPlay(false);
      setShowAutoSettings(false);
      setShowMoreMenu(false);
      setClosing(false);
      if (document.fullscreenElement) document.exitFullscreen?.();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const hideControls = isFullscreen && !controlsVisible;
  const dismissOpacity = isDragging ? Math.max(0.2, 1 - dragY / 300) : 1;
  const zoomPct = Math.round(zoom * 100);
  const fileName = images[current]?.split("/").pop()?.split("?")[0] ?? "";

  /* ── Action buttons ── */
  const ActionBtn = ({ onClick, label, children, className }: { onClick: () => void; label: string; children: React.ReactNode; className?: string }) => (
    <Tooltip content={label} placement="bottom">
      <button type="button" className={`${styles.actionBtn} ${className ?? ""}`} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label}>
        {children}
      </button>
    </Tooltip>
  );

  return createPortal(
    <AnimatePresence>
      {/* ── Blur overlay (sibling, exits last) ── */}
      {open && (
        <motion.div
          key="overlay"
          className={styles.overlayBg}
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : isDragging ? dismissOpacity : 1 }}
          exit={{ opacity: 0 }}
          transition={closing ? { duration: 0.30, delay: 1.30 } : isDragging ? { duration: 0 } : { duration: 0.15 }}
        />
      )}
      {/* ── Viewer container ── */}
      {open && (
        <motion.div
          key="viewer"
          ref={viewerRef}
          className={`${styles.viewer} ${thumbMode === "list" ? styles.hasListPanel : ""} ${isFullscreen ? styles.fullscreen : ""}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          onMouseMove={isFullscreen ? showControls : undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ── Top toolbar ── */}
          <div className={`${styles.toolbar} ${hideControls ? styles.controlsHidden : ""}`}>
            <motion.div
              className={styles.toolbarLeft}
              initial={{ opacity: 0, y: -10 }}
              animate={closing ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
              transition={closing ? { duration: 0.10, delay: 0.46 } : { duration: 0.2, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {hasMultiple && (
                <span className={styles.counter}>{current + 1}<span className={styles.counterSep}>/</span>{images.length}</span>
              )}
              <span className={styles.toolbarCollapsible}>
                <ActionBtn onClick={() => setShowShortcuts((v) => !v)} label="Shortcuts  ?">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </ActionBtn>
              </span>
              {(title || fileName) && (
                <span className={styles.viewerTitle}>
                  {title && <span className={styles.viewerTitleMain}>{title}</span>}
                  {title && fileName && <span className={styles.viewerTitleSep}>/</span>}
                  {fileName && <span className={styles.viewerTitleFile}>{fileName}</span>}
                </span>
              )}
            </motion.div>
            <div className={styles.toolbarRight}>
              {/* ── Zoom controls ── */}
              <motion.span
                className={styles.toolbarCollapsible}
                initial={{ opacity: 0, y: -10 }}
                animate={closing ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
                transition={closing ? { duration: 0.10, delay: 0.34 } : { duration: 0.2, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ActionBtn onClick={zoomOut} label="Zoom out  −"><ZoomOutIcon /></ActionBtn>
                {editingZoom ? (
                  <input
                    ref={zoomInputRef}
                    className={styles.zoomInput}
                    type="text"
                    inputMode="numeric"
                    value={zoomInput}
                    onChange={(e) => setZoomInput(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitZoomEdit}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") commitZoomEdit();
                      if (e.key === "Escape") setEditingZoom(false);
                      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const step = e.shiftKey ? 10 : 1;
                        const delta = e.key === "ArrowUp" ? step : -step;
                        setZoomInput((v) => {
                          const next = Math.min(MAX_ZOOM * 100, Math.max(MIN_ZOOM * 100, (parseInt(v, 10) || 100) + delta));
                          return String(next);
                        });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Tooltip content={<>Click to edit · 0 to reset<br />↑↓ ±1% · Shift ±10%</>} placement="bottom">
                    <button type="button" className={styles.zoomLevel} onClick={(e) => { e.stopPropagation(); startZoomEdit(); }}>
                      {zoomPct}%
                    </button>
                  </Tooltip>
                )}
                <ActionBtn onClick={zoomIn} label="Zoom in  +"><ZoomInIcon /></ActionBtn>
                <span className={styles.toolbarDivider} />
              </motion.span>
              {/* ── Main actions ── */}
              <motion.span
                style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
                initial={{ opacity: 0, y: -10 }}
                animate={closing ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
                transition={closing ? { duration: 0.10, delay: 0.22 } : { duration: 0.2, delay: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ActionBtn onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen  F" : "Fullscreen  F"}>
                  {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                </ActionBtn>
                {hasMultiple && (
                  <>
                    <span ref={autoSettingsRef} style={{ position: "relative" }}>
                      <ActionBtn onClick={toggleAutoPlay} label={autoPlay ? "Pause  P" : "Autoplay  P"}>
                        {autoPlay ? <PauseIcon /> : <PlayIcon />}
                      </ActionBtn>
                      <span className={styles.toolbarCollapsible}>
                        <Tooltip content="Autoplay settings" placement="bottom">
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={(e) => { e.stopPropagation(); setShowAutoSettings((v) => !v); }}
                            aria-label="Autoplay settings"
                          >
                            <motion.svg
                              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                              animate={{ rotate: showAutoSettings ? 180 : 0 }}
                              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                              <path d="M2 4L6 8L10 4" />
                            </motion.svg>
                          </button>
                        </Tooltip>
                      </span>
                      <AnimatePresence>
                        {showAutoSettings && (
                          <motion.div
                            className={styles.autoplayPopover}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={styles.autoplaySection}>
                              <span className={styles.autoplayLabel}>Interval</span>
                              <div className={styles.intervalTrack} onMouseLeave={() => setHoveredInterval(null)}>
                                <motion.div
                                  className={styles.intervalIndicator}
                                  layoutId="interval-indicator"
                                  style={{
                                    left: `${(AUTOPLAY_INTERVALS.indexOf(hoveredInterval ?? autoInterval) / AUTOPLAY_INTERVALS.length) * 100}%`,
                                    width: `${100 / AUTOPLAY_INTERVALS.length}%`,
                                  }}
                                  transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                                />
                                {AUTOPLAY_INTERVALS.map((ms) => (
                                  <button
                                    key={ms}
                                    type="button"
                                    className={`${styles.intervalBtn} ${(hoveredInterval ?? autoInterval) === ms ? styles.intervalBtnActive : ""}`}
                                    onClick={() => setAutoInterval(ms)}
                                    onMouseEnter={() => setHoveredInterval(ms)}
                                  >
                                    {ms / 1000}s
                                  </button>
                                ))}
                              </div>
                              <div className={styles.loopRow}>
                                <span className={styles.loopLabel}>Loop</span>
                                <Switch
                                  checked={autoLoop}
                                  onCheckedChange={setAutoLoop}
                                  variant="accent"
                                  className={styles.loopSwitch}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </span>
                    <ActionBtn onClick={cycleThumbMode} label="Thumbnails  T">
                      {thumbMode === "list" ? <ThumbListIcon /> : <ThumbStripIcon />}
                    </ActionBtn>
                  </>
                )}
              </motion.span>
              {/* ── End actions ── */}
              <motion.span
                style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
                initial={{ opacity: 0, y: -10 }}
                animate={closing ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
                transition={closing ? { duration: 0.10, delay: 0.10 } : { duration: 0.2, delay: 0.54, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <span className={styles.toolbarDivider} />
                {/* ── More menu (mobile only) ── */}
                <span ref={moreMenuRef} className={styles.moreMenuWrap}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.moreBtn}`}
                    onClick={(e) => { e.stopPropagation(); setShowMoreMenu((v) => !v); }}
                    aria-label="More options"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {showMoreMenu && (
                      <motion.div
                        className={styles.moreMenu}
                        initial={{ opacity: 0, scale: 0.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.3 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.6 }}
                        style={{ transformOrigin: "top right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button type="button" className={styles.moreMenuItem} onClick={() => { zoomOut(); }}>
                          <ZoomOutIcon /><span>Zoom out</span>
                        </button>
                        <button type="button" className={styles.moreMenuItem} onClick={() => { zoomIn(); }}>
                          <ZoomInIcon /><span>Zoom in</span>
                        </button>
                        <button type="button" className={styles.moreMenuItem} onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 3 3 7.5 7.5 7.5"/></svg>
                          <span>Reset zoom</span>
                        </button>
                        {hasMultiple && (
                          <>
                            <div className={styles.moreMenuDivider} />
                            <div className={styles.moreMenuSection}>
                              <span className={styles.autoplayLabel}>Interval</span>
                              <div className={styles.intervalTrack}>
                                <motion.div
                                  className={styles.intervalIndicator}
                                  layoutId="interval-indicator-mobile"
                                  style={{
                                    left: `${(AUTOPLAY_INTERVALS.indexOf(autoInterval) / AUTOPLAY_INTERVALS.length) * 100}%`,
                                    width: `${100 / AUTOPLAY_INTERVALS.length}%`,
                                  }}
                                  transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                                />
                                {AUTOPLAY_INTERVALS.map((ms) => (
                                  <button
                                    key={ms}
                                    type="button"
                                    className={`${styles.intervalBtn} ${autoInterval === ms ? styles.intervalBtnActive : ""}`}
                                    onClick={() => setAutoInterval(ms)}
                                  >
                                    {ms / 1000}s
                                  </button>
                                ))}
                              </div>
                              <div className={styles.loopRow}>
                                <span className={styles.loopLabel}>Loop</span>
                                <Switch
                                  checked={autoLoop}
                                  onCheckedChange={setAutoLoop}
                                  variant="accent"
                                  className={styles.loopSwitch}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
                <Tooltip content="Close  Esc" placement="bottom">
                  <button type="button" className={`${styles.actionBtn} ${styles.closeBtnAction}`} onClick={(e) => { e.stopPropagation(); handleClose(); }} aria-label="Close" data-close-trigger>
                    <CloseIcon />
                  </button>
                </Tooltip>
              </motion.span>
            </div>
          </div>

          {/* ── Image area ── */}
          <div className={styles.imageArea}>
            {/* ── Nav arrows ── */}
            {hasMultiple && (
              <motion.div
                className={`${styles.navArrows} ${hideControls ? styles.controlsHidden : ""}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: closing ? 0 : 1 }}
                transition={closing ? { duration: 0.12, delay: 0 } : { duration: 0.2, delay: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className={`${styles.navZone} ${styles.navZonePrev}`}>
                  <Tooltip content="Previous  ←" placement="right">
                    <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Previous">
                      <ChevronLeftIcon />
                    </button>
                  </Tooltip>
                </div>
                <div className={`${styles.navZone} ${styles.navZoneNext}`}>
                  <Tooltip content="Next  →" placement="left">
                    <button type="button" className={`${styles.navBtn} ${styles.navBtnNext}`} onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Next">
                      <ChevronRightIcon />
                    </button>
                  </Tooltip>
                </div>
              </motion.div>
            )}
            <motion.div
              style={{ width: "100%", height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={closing ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
              transition={closing ? { duration: 0.28, delay: 0.94 } : { duration: 0.3, delay: 0.72, ease: [0.25, 0.1, 0.25, 1] }}
            >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={current}
                ref={wrapRef}
                className={`${styles.imageWrap} ${isZoomed ? styles.imageWrapZoomed : ""}`}
                custom={direction}
                initial="enter"
                animate="center"
                exit="exit"
                variants={{
                  enter: (dir: number) => ({ opacity: 0, x: -dir * SLIDE_OFFSET }),
                  center: { opacity: 1, x: 0 },
                  exit: (dir: number) => ({ opacity: 0, x: dir * SLIDE_OFFSET }),
                }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
                onWheel={handleWheel}
              >
                {loading && (
                  <div className={styles.loader}><div className={styles.loaderSpinner} /></div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={images[current]}
                  alt=""
                  className={`${styles.image} ${loading ? styles.imageLoading : ""}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                    cursor: isZoomed ? "grab" : "zoom-in",
                  }}
                  onDoubleClick={handleDoubleClick}
                  onPointerDown={handlePanStart}
                  onPointerMove={handlePanMove}
                  onPointerUp={handlePanEnd}
                  onPointerCancel={handlePanEnd}
                  onLoad={() => setLoading(false)}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
            </motion.div>

            {/* ── Shortcuts overlay ── */}
            <AnimatePresence>
              {showShortcuts && (
                <motion.div
                  className={styles.shortcutsOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => { e.stopPropagation(); setShowShortcuts(false); }}
                >
                  <div className={styles.shortcutsPanel} onClick={(e) => e.stopPropagation()}>
                    <h3 className={styles.shortcutsTitle}>Keyboard Shortcuts</h3>
                    <div className={styles.shortcutsDivider} />
                    <ul className={styles.shortcutsList}>
                      <li className={styles.shortcutsSection}>Navigation</li>
                      <li className={styles.shortcutsItem}><kbd>←</kbd><span>Previous</span></li>
                      <li className={styles.shortcutsItem}><kbd>→</kbd><span>Next</span></li>
                      <li className={styles.shortcutsDivider} />
                      <li className={styles.shortcutsSection}>Zoom</li>
                      <li className={styles.shortcutsItem}><kbd>+</kbd><span>Zoom in</span></li>
                      <li className={styles.shortcutsItem}><kbd>−</kbd><span>Zoom out</span></li>
                      <li className={styles.shortcutsItem}><kbd>0</kbd><span>Reset zoom</span></li>
                      <li className={styles.shortcutsDivider} />
                      <li className={styles.shortcutsSection}>View</li>
                      <li className={styles.shortcutsItem}><kbd>F</kbd><span>Fullscreen</span></li>
                      <li className={styles.shortcutsItem}><kbd>P</kbd><span>Autoplay</span></li>
                      <li className={styles.shortcutsItem}><kbd>T</kbd><span>Thumbnails</span></li>
                      <li className={styles.shortcutsDivider} />
                      <li className={styles.shortcutsItem}><kbd>?</kbd><span>Shortcuts</span></li>
                      <li className={styles.shortcutsItem}><kbd>Esc</kbd><span>Close</span></li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Thumbnail strip (bottom) ── */}
          <AnimatePresence>
            {hasMultiple && thumbMode === "strip" && (
              <motion.div
                key="strip"
                className={styles.thumbStrip}
                initial={{ height: 0 }}
                animate={closing ? { height: 0 } : { height: 120 }}
                exit={{ height: 0 }}
                transition={closing ? { duration: 0.12, delay: 0.80 } : { duration: 0.25, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <motion.div
                  className={styles.thumbStripRow}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: closing ? 0 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={closing ? { duration: 0.12, delay: 0.68 } : { duration: 0.2, delay: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <button type="button" className={`${styles.navBtn} ${styles.stripNavBtn}`} onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Previous">
                    <ChevronLeftIcon />
                  </button>
                  <div
                    className={styles.thumbStripInner}
                    ref={thumbListRef}
                    onWheel={(e) => {
                      e.stopPropagation();
                      if (thumbListRef.current) {
                        thumbListRef.current.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    {images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        data-idx={i}
                        className={`${styles.thumbItem} ${i === current ? styles.thumbItemActive : ""}`}
                        onClick={(e) => { e.stopPropagation(); goTo(i); }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className={styles.thumbImg} draggable={false} />
                        {i === current && (
                          <motion.span
                            className={styles.thumbIndicator}
                            layoutId={closing ? undefined : "thumb-strip-indicator"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: closing ? 0 : 1 }}
                            transition={closing ? { duration: 0.10, delay: 0.56 } : { type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <button type="button" className={`${styles.navBtn} ${styles.stripNavBtn}`} onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Next">
                    <ChevronRightIcon />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Thumbnail list (sidebar) ── */}
          <AnimatePresence>
            {hasMultiple && thumbMode === "list" && (
              <motion.div
                key="list"
                className={styles.thumbList}
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0 0 0)" }}
                exit={{ clipPath: "inset(0 100% 0 0)", transition: { duration: 0.18, delay: 0.30 } }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.thumbListInner} ref={thumbListRef} onWheel={(e) => e.stopPropagation()}>
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      data-idx={i}
                      className={`${styles.thumbListItem} ${i === current ? styles.thumbListItemActive : ""}`}
                      onClick={() => goTo(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className={styles.thumbListImg} draggable={false} />
                      <span className={styles.thumbListLabel}>{i + 1}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
