/** 프리셋 이름 검사 — 저장이 안 될 때 사유를 그대로 보여 주려고 이유를 돌려준다.
 *  대소문자·앞뒤 공백만 다른 이름도 같은 이름으로 본다("ruby" 와 "Ruby" 가 나란히 있으면 헷갈린다). */
export type PresetNameProblem =
  | { kind: "empty" }
  | { kind: "builtIn"; name: string }
  | { kind: "saved"; name: string };

export function presetNameProblem(
  input: string,
  builtIn: readonly { name: string }[],
  saved: readonly { name: string }[],
): PresetNameProblem | null {
  const key = input.trim().toLocaleLowerCase();
  if (!key) return { kind: "empty" };
  const same = (p: { name: string }) => p.name.trim().toLocaleLowerCase() === key;
  const b = builtIn.find(same);
  if (b) return { kind: "builtIn", name: b.name };
  const s = saved.find(same);
  if (s) return { kind: "saved", name: s.name };
  return null;
}
