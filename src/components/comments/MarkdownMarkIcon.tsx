/* CommonMark 공식 마크다운 마크 (github/markdown-mark, CC0).
   lucide 에 마크다운 아이콘이 없어서 직접 인라인. 댓글 도움말 버튼 전용 —
   `?` 보다 "여기 마크다운 쓸 수 있음" 이 한눈에 읽힌다 (GitHub 이 쓰는 것과 같은 글리프).

   원본 stroke-width 는 10 인데, 208 폭을 16px 로 줄이면 0.77px 라
   옆의 lucide 아이콘(24 기준 2 → 16 에서 1.33px)보다 눈에 띄게 얇아진다.
   12 로 올려 광학 보정 — 그래야 같은 굵기로 읽힌다. */

interface Props {
  /** 아이콘 폭(px). 높이는 208:128 비율로 따라간다. */
  size?: number;
}

export default function MarkdownMarkIcon({ size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={(size * 128) / 208}
      viewBox="0 0 208 128"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="5"
        y="5"
        width="198"
        height="118"
        ry="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
      />
      <path
        fill="currentColor"
        d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z"
      />
    </svg>
  );
}
