export const getCurrentSection = (
  sections: string[],
  offset = 200
): string | null => {
  const scrollPosition = window.scrollY + offset;

  for (let i = sections.length - 1; i >= 0; i--) {
    const element = document.getElementById(sections[i]);
    if (element && element.offsetTop <= scrollPosition) {
      return sections[i];
    }
  }
  return null;
};
