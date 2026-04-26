/* ── ImageViewer Icons — lucide-react re-exports for backward compat ── */

import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  LayoutGrid,
  List,
  Play,
  Pause,
} from "lucide-react";

export const ChevronLeftIcon = () => <ChevronLeft size={20} />;
export const ChevronRightIcon = () => <ChevronRight size={20} />;
export const ZoomInIcon = () => <ZoomIn size={18} />;
export const ZoomOutIcon = () => <ZoomOut size={18} />;
export const FullscreenIcon = () => <Maximize2 size={18} />;
export const ExitFullscreenIcon = () => <Minimize2 size={18} />;
export const ThumbStripIcon = () => <LayoutGrid size={18} />;
export const ThumbListIcon = () => <List size={18} />;
export const PlayIcon = () => <Play size={18} />;
export const PauseIcon = () => <Pause size={18} />;
