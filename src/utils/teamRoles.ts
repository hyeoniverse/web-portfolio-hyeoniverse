/**
 * 팀원 역할 한 줄을 조각으로 나눈다 — "기획, 디자인" 과 "기획 · 디자인" 둘 다.
 *
 * 편집기는 쉼표로만 나눴는데, 가운뎃점으로 이어 적은 역할("1인 개발 · 기획 · …")은 칩 하나로 뭉쳐 눌려 보였다.
 * 공개 화면(WorkArticleTeam 의 splitRoles)과 달리 "/" 로는 나누지 않는다 — "CI/CD" 같은 이름이 쪼개진다.
 */
export function splitRoleList(role: string | null | undefined): string[] {
  return (role ?? "").split(/\s*[,·]\s*/).map((r) => r.trim()).filter(Boolean);
}

/**
 * 역할별 작업에서 빈 줄 · 빈 묶음을 뺀다. 역할 목록에 없는 묶음도 지우지 않는다 —
 * 공개 화면은 묶음 이름을 역할과 따로 보여 주고("품질 · 보안"), 예전엔 이런 묶음이 저장할 때마다 조용히 사라졌다.
 */
export function cleanContributions(map: Record<string, string[]> | null | undefined): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(map ?? {})
      .map(([k, lines]) => [k.trim(), (lines ?? []).map((l) => l.trim()).filter(Boolean)] as const)
      .filter(([k, lines]) => k && lines.length > 0),
  );
}

export interface GroupPair {
  ko?: string;
  en?: string;
}

/** 영문 · 숫자 낱말("CI/CD", "e2e") — 한글 묶음 이름에 섞인 것까지. 짝 찾기에 쓴다 */
function latinWords(s: string): string[] {
  return (s.match(/[A-Za-z0-9][A-Za-z0-9/+#.]*/g) ?? []).map((w) => w.toLowerCase());
}

/**
 * 역할별 작업의 KO 묶음과 EN 묶음을 한 줄씩 짝짓는다 — 묶음 이름이 언어마다 달라("백엔드" · "Backend", 순서도 제각각)
 * 편집 화면에서 두 열을 나란히 읽으려면 짝이 필요하다. 저장된 값에는 손대지 않고 보여 주는 순서만 정한다.
 *  1) 역할 목록의 같은 자리(role_ko[i] ↔ role_en[i])  2) 기본 역할 대응(presets)  3) 같은 영문 낱말("인프라 · CI/CD" ↔ "Infra · CI/CD")
 *  4) 그래도 남으면 남은 순서대로. 짝 없는 쪽은 한쪽만 있는 줄.
 */
export function pairContributionGroups(
  koKeys: string[],
  enKeys: string[],
  koRoles: string[],
  enRoles: string[],
  presets: { ko: readonly string[]; en: readonly string[] } = { ko: [], en: [] },
): GroupPair[] {
  const enLeft = new Set(enKeys);
  const partner = new Map<string, string>();
  const take = (ko: string, en: string | undefined) => {
    if (!en || !enLeft.has(en) || partner.has(ko)) return;
    partner.set(ko, en);
    enLeft.delete(en);
  };
  for (const k of koKeys) take(k, enRoles[koRoles.indexOf(k)]);
  for (const k of koKeys) take(k, presets.en[presets.ko.indexOf(k)]);
  for (const k of koKeys) {
    const words = latinWords(k);
    if (words.length === 0) continue;
    take(k, [...enLeft].find((e) => latinWords(e).some((w) => words.includes(w))));
  }
  const koAlone = koKeys.filter((k) => !partner.has(k));
  const enAlone = enKeys.filter((e) => enLeft.has(e));
  koAlone.forEach((k, i) => { if (enAlone[i]) partner.set(k, enAlone[i]); });
  const used = new Set(partner.values());
  return [
    ...koKeys.map((k) => ({ ko: k, en: partner.get(k) })),
    ...enKeys.filter((e) => !used.has(e)).map((e) => ({ en: e })),
  ];
}
