interface Props {
  className?: string;
  description: string;
  keywords: string[];
}

export default function SkillDescription({
  className,
  description,
  keywords,
}: Props) {
  // 정규식 특수문자 이스케이프
  const escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights.length) return text;

    const regex = new RegExp(
      `(${highlights.map(escapeRegex).join("|")})`,
      "gi"
    );

    return text.split(regex).map((part, i) =>
      highlights.some((kw) => kw.toLowerCase() === part.toLowerCase()) ? (
        <span key={i} className="highlight-text">
          <span className="strong" key={i}>
            {part}
          </span>
        </span>
      ) : (
        part
      )
    );
  };

  return <p className={className}>{highlightText(description, keywords)}</p>;
}
