/** 고정(pin) 아이콘 — lucide Pin 기반, 바늘 길게(핀 꽂힌 느낌). height 만 주면 폭 자동 */
export default function PinIcon({ height, className }: { height?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 34"
      height={height}
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      <line x1="12" x2="12" y1="17" y2="32" />
    </svg>
  );
}
