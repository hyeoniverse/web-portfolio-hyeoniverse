/**
 * Parses **bold markers** in text and wraps them in <span className="highlighted-text">.
 * Uses the global .highlighted-text utility class from _utilities.css.
 */
export function renderHighlight(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="highlighted-text">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
