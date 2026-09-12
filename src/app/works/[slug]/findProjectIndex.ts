/** slug, id(UUID), 정적 number("01"…) 순으로 매칭. slug 우선. */
export function findProjectIndex(projects: { id: string; slug?: string; number: string }[], param: string) {
  const bySlug = projects.findIndex((p) => p.slug && p.slug === param);
  if (bySlug >= 0) return bySlug;
  const byId = projects.findIndex((p) => p.id === param);
  if (byId >= 0) return byId;
  const padded = param.padStart(2, "0");
  return projects.findIndex((p) => p.number === padded);
}
