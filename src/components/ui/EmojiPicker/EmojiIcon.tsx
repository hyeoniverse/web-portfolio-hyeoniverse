"use client";

import { useEffect, useState } from "react";

/**
 * 이모지 값(native / img:url / icon:id)을 렌더링.
 *
 * `icon:` 형태만 SVG 목록이 필요한데, 그 목록이 101 KiB 다(아이콘 220여 개의 SVG 원문).
 * 예전에는 파일 맨 위에서 들여와서, 글 카드가 이모지 하나를 그리는 것만으로도 목록 전체가
 * 첫 화면에 실렸다. 실제로는 `icon:` 을 쓰는 글이 없어도 그랬다.
 *
 * 그래서 `icon:` 일 때만 목록을 받는다. 이모지와 이미지 주소는 예전처럼 곧바로 그린다.
 */
export function EmojiIcon({ value, size = 20 }: { value: string; size?: number }) {
  const iconId = value.startsWith("icon:") ? value.slice(5) : null;
  const [inner, setInner] = useState<string | null>(null);

  useEffect(() => {
    if (!iconId) return;
    let cancelled = false;
    import("../emojiData").then(({ SVG_ICONS, iconSvgInner }) => {
      if (cancelled) return;
      const ic = SVG_ICONS.find((i) => i.id === iconId);
      setInner(ic ? iconSvgInner(ic) : "");
    });
    return () => { cancelled = true; };
  }, [iconId]);

  if (value.startsWith("img:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value.slice(4)} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 2 }} />
    );
  }

  if (iconId) {
    /* 목록이 도착하기 전에는 자리만 잡아 둔다 — 나중에 그려지며 옆 글자가 밀리지 않게. */
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: inner ?? "" }} />
    );
  }

  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}
