import { SVG_ICONS } from "../emojiData";

/** 이모지 값(native / img:url / icon:id)을 렌더링 */
export function EmojiIcon({ value, size = 20 }: { value: string; size?: number }) {
  if (value.startsWith("img:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value.slice(4)} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 2 }} />
    );
  }
  if (value.startsWith("icon:")) {
    const ic = SVG_ICONS.find((i) => i.id === value.slice(5));
    if (ic) {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={ic.path} />
        </svg>
      );
    }
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{value}</span>;
}
