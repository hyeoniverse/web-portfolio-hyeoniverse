/** 오른쪽 삼각형 caret — 접기/펼치기 토글(부모가 회전) */
export default function CaretRightIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6z" />
    </svg>
  );
}
