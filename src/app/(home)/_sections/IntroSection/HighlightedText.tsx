import styles from "./IntroSection.module.css";

/** {중괄호} 안의 텍스트를 하이라이트 span으로 변환 */
export default function HighlightedText({
  text,
  highlightClass = styles.highlight,
}: {
  text: string;
  highlightClass?: string;
}) {
  const parts = text.split(/(\{[^}]+\})/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") && part.endsWith("}") ? (
          <span key={i} className={highlightClass}>
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
