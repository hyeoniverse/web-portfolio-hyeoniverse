import Image from "next/image";
import { Film } from "@/components/icons";

/* 라이브러리 미리보기 — 원본(AI 커버는 장당 수 MB)을 그대로 받으면 24장만으로 탭이 한참 걸렸다.
   next/image 가 허용하는 저장소·이미지 호스트(next.config remotePatterns)는 칸 크기 webp 로 줄여 받고,
   그 밖의 주소는 그대로 지연 로딩한다. 부모는 position: relative 여야 한다(fill).
   동영상 커버(기본 배경 mp4, Pexels 동영상)는 <video> 로 첫 장면만 받는다. <img> 로 그리면 크롬은 깨진 그림이 되고,
   사파리는 mp4 를 <img> 로도 재생해 HD 동영상(수십 MB)을 통째로 받느라 탭이 아주 느렸다. */
const OPTIMIZABLE = /^https:\/\/([a-z0-9-]+\.supabase\.co|images\.unsplash\.com|images\.pexels\.com|picsum\.photos)\//i;
const VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export const isVideoUrl = (src: string) => VIDEO.test(src) || /^https:\/\/videos\.pexels\.com\//i.test(src);

export default function LibraryThumb({ src, sizes, alt = "", className, badgeClassName }: { src: string; sizes: string; alt?: string; className?: string; badgeClassName?: string }) {
  if (isVideoUrl(src)) {
    return (
      <>
        {/* #t=0.1 — 사파리는 시작 시각을 주어야 첫 장면을 그린다. metadata 만 받아 첫 장면을 보이고 재생하지 않는다 */}
        <video src={`${src}#t=0.1`} className={className} muted playsInline preload="metadata" aria-label={alt || undefined} />
        <span className={badgeClassName} aria-hidden><Film size={12} /></span>
      </>
    );
  }
  if (!OPTIMIZABLE.test(src) || /\.svg(\?|$)/i.test(src)) {
    /* eslint-disable-next-line @next/next/no-img-element -- next/image 가 줄일 수 없는 주소(외부 호스트·SVG) */
    return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
  }
  return <Image src={src} alt={alt} className={className} fill sizes={sizes} quality={60} />;
}
