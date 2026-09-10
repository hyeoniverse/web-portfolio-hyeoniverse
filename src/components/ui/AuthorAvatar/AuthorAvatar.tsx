import { getImageProps } from "next/image";
import { EmojiIcon } from "@/components/ui/EmojiPicker/EmojiIcon";

/**
 * 저자 아바타 — 이미지 URL · 이모지 · 아이콘을 한 자리에서 그린다.
 *
 * `Author.avatar` 에는 원래 이미지 URL 만 들어갔다. 프리셋·이모지를 고를 수 있게 되면서
 * EmojiPicker 가 돌려주는 값(`img:URL` · `icon:ID` · 네이티브 이모지)도 같은 필드에 들어온다.
 * 기존 데이터(평문 URL)와 새 값이 섞이므로 판별을 한 곳에 모은다 —
 * 호출부마다 나눠 쓰면 어딘가는 이모지를 URL 로 알고 깨진 이미지를 그린다.
 *
 * 값이 없으면 이름 첫 글자로 대체한다.
 */
export function isImageAvatar(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:");
}

/**
 * 아바타 이미지를 이미지 최적화 경로로 받는 주소(src·srcSet).
 *
 * 아바타는 16~20px 인데 사이트 소유자의 기본값(`/images/profile_pic.webp`)은 원본 그대로 252KB 다.
 * 글 목록에서는 카드마다 이 원본을 받았다. 최적화 경로로 받으면 32px AVIF 가 약 0.5KB 다.
 *
 * 사이트 안의 로컬 경로만 바꾼다. 원격 주소는 next.config 의 remotePatterns 에 있는 호스트여야
 * 최적화 경로가 받아 주고, 아니면 400 이라 아바타가 깨진다. 그 목록을 여기 한 번 더 적으면 두
 * 곳이 어긋나므로 원격은 그대로 둔다. 너비는 getImageProps 가 설정(imageSizes)에서 고른다.
 */
export function avatarImage(value: string, size: number): { src: string; srcSet?: string } {
  if (!value.startsWith("/") || value.startsWith("//")) return { src: value };
  const { props } = getImageProps({ src: value, alt: "", width: size, height: size });
  return { src: props.src, srcSet: props.srcSet };
}

export default function AuthorAvatar({
  value, name, size = 20, className, imgClassName, initialClassName,
}: {
  value: string | null | undefined;
  /** 값이 없을 때 쓸 이름 — 첫 글자를 대문자로 보여준다. */
  name?: string | null;
  size?: number;
  className?: string;
  /** 이미지로 그릴 때의 클래스 — 기존 원형 마스크 등을 그대로 쓰기 위한 것. */
  imgClassName?: string;
  initialClassName?: string;
}) {
  const v = value ?? "";

  if (isImageAvatar(v)) {
    const img = avatarImage(v, size);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={img.src} srcSet={img.srcSet} alt="" className={imgClassName ?? className} />
    );
  }

  if (v) {
    return (
      <span className={className} aria-hidden>
        <EmojiIcon value={v} size={size} />
      </span>
    );
  }

  return (
    <span className={initialClassName ?? className} aria-hidden>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
