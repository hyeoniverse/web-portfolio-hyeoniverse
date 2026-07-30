import { SOCIAL_ICONS } from "@/data/socialIcons";

/** 소셜 브랜드 아이콘 — SOCIAL_ICONS 데이터의 path 를 렌더 (stroke/fill 자동 판별).
 *  size 미지정 시 CSS 로 크기 제어(className 전달). 없는 name 이면 null. */
export default function SocialBrandIcon({
  name,
  size,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const icon = SOCIAL_ICONS[name];
  if (!icon) return null;
  const dims = size != null ? { width: size, height: size } : {};
  return icon.stroke ? (
    <svg viewBox="0 0 24 24" {...dims} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={icon.path} />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" {...dims} className={className}>
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}
