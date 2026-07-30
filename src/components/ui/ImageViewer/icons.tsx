/* ── ImageViewer Icons — lucide-react re-exports for backward compat ── */

import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  LayoutGrid,
  PanelLeft,
  GalleryThumbnails,
  Images,
  Play,
  Pause,
} from "@/components/icons";

export const ChevronLeftIcon = () => <ChevronLeft size={20} />;
export const ChevronRightIcon = () => <ChevronRight size={20} />;
export const ZoomInIcon = () => <ZoomIn size={18} />;
export const ZoomOutIcon = () => <ZoomOut size={18} />;
export const FullscreenIcon = () => <Maximize2 size={18} />;
export const ExitFullscreenIcon = () => <Minimize2 size={18} />;
/* 썸네일 모드별 아이콘 — 서로 확실히 구분되게 (hidden/strip/list/gallery) */
export const ThumbHiddenIcon = () => <Images size={18} />;
export const ThumbStripIcon = () => <GalleryThumbnails size={18} />;
export const ThumbListIcon = () => <PanelLeft size={18} />;
export const ThumbGalleryIcon = () => <LayoutGrid size={18} />;
export const PlayIcon = () => <Play size={18} />;
export const PauseIcon = () => <Pause size={18} />;
