/* ── ImageViewer Icons ── */

export const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
export const ChevronLeftIcon = () => <Icon d="M15 18L9 12L15 6" size={20} />;
export const ChevronRightIcon = () => <Icon d="M9 18L15 12L9 6" size={20} />;
export const ZoomInIcon = () => <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6" />;
export const ZoomOutIcon = () => <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M8 11h6" />;
export const FullscreenIcon = () => <Icon d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />;
export const ExitFullscreenIcon = () => <Icon d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />;
export const ThumbStripIcon = () => <Icon d="M3 3h18v18H3zM3 15h18M7 15v6M11 15v6M15 15v6" />;
export const ThumbListIcon = () => <Icon d="M3 3h18v18H3zM15 3v18M15 9h6M15 15h6" />;
export const PlayIcon = () => <Icon d="M5 3l14 9-14 9V3z" />;
export const PauseIcon = () => <Icon d="M6 4h4v16H6zM14 4h4v16h-4z" />;
