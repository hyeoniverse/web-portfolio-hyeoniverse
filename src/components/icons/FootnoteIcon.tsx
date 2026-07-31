/** 각주 — 책 + 위첨자 1 */
export default function FootnoteIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
      <text x="9" y="15" fontSize="10" fill="currentColor" stroke="none" fontFamily="serif">1</text>
    </svg>
  );
}
