"use client";

import Image from "next/image";
import { useThemedLogo } from "@/lib/useThemedLogo";

interface ThemedLogoImageProps {
  src: string;
  /** 로고가 놓인 배경 — 잉크를 그 배경의 본문 글자색으로 칠한다 */
  bg: "light" | "dark";
  width: number;
  alt: string;
  /** 설정에서 직접 고른 리컬러 색 — 있으면 테마보다 우선해 이 한 색으로 칠한다 */
  tint?: string;
  /** 반대 배경용 변형을 빌려 쓸 때 명암 뒤집기 — 테마 색으로 칠하면 필요 없다 */
  invert?: boolean;
  classNames: { image: string; invert: string; tinted: string };
}

/**
 * 브랜드 로고 이미지 한 장. 우선순위: 직접 고른 리컬러 색 → 테마 색(잉크·포인트) → 원래 이미지.
 * 테마 색으로 칠할 수 없는 로고(색이 많거나 배경이 칠해짐)는 원래 이미지를 그대로 쓴다.
 */
export default function ThemedLogoImage({ src, bg, width, alt, tint, invert = false, classNames }: ThemedLogoImageProps) {
  const themed = useThemedLogo(src, bg, !tint);

  if (tint) {
    // 숨긴 img 로 종횡비·폭을 잡고, 그 모양을 mask 로 tint 색 채움
    return (
      <span
        className={classNames.tinted}
        style={{ backgroundColor: tint, maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }}
        role="img"
        aria-label={alt}
      >
        <Image src={src} alt="" width={width} height={32} unoptimized />
      </span>
    );
  }
  if (themed) {
    return <Image src={themed} alt={alt} width={width} height={32} className={classNames.image} unoptimized />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={32}
      className={invert ? `${classNames.image} ${classNames.invert}` : classNames.image}
      unoptimized
    />
  );
}
