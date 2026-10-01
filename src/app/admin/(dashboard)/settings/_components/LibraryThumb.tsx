import Image from "next/image";

/* 라이브러리 미리보기 — 원본(AI 커버는 장당 수 MB)을 그대로 받으면 24장만으로 탭이 한참 걸렸다.
   next/image 가 허용하는 저장소·이미지 호스트(next.config remotePatterns)는 칸 크기 webp 로 줄여 받고,
   그 밖의 주소는 그대로 지연 로딩한다. 부모는 position: relative 여야 한다(fill). */
const OPTIMIZABLE = /^https:\/\/([a-z0-9-]+\.supabase\.co|images\.unsplash\.com|images\.pexels\.com|picsum\.photos)\//i;

export default function LibraryThumb({ src, sizes, alt = "", className }: { src: string; sizes: string; alt?: string; className?: string }) {
  if (!OPTIMIZABLE.test(src) || /\.svg(\?|$)/i.test(src)) {
    /* eslint-disable-next-line @next/next/no-img-element -- next/image 가 줄일 수 없는 주소(외부 호스트·SVG) */
    return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
  }
  return <Image src={src} alt={alt} className={className} fill sizes={sizes} quality={60} />;
}
