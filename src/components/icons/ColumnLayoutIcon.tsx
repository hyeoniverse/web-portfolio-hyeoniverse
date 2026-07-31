/** 컬럼 레이아웃 — cols(2/3/4)에 따라 세로 막대 개수 렌더 */
export default function ColumnLayoutIcon({ cols, size = 14, className }: { cols: number; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden="true">
      {cols === 2 && <><rect x="1" y="2" width="6" height="12" rx="1" /><rect x="9" y="2" width="6" height="12" rx="1" /></>}
      {cols === 3 && <><rect x="0.5" y="2" width="4" height="12" rx="1" /><rect x="6" y="2" width="4" height="12" rx="1" /><rect x="11.5" y="2" width="4" height="12" rx="1" /></>}
      {cols === 4 && <><rect x="0.5" y="2" width="3" height="12" rx="0.5" /><rect x="4.5" y="2" width="3" height="12" rx="0.5" /><rect x="8.5" y="2" width="3" height="12" rx="0.5" /><rect x="12.5" y="2" width="3" height="12" rx="0.5" /></>}
    </svg>
  );
}
