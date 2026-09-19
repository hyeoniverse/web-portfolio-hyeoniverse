/**
 * 편집기가 저장해 둔 초안·리비전을 지금 폼에 되돌린다.
 *
 * 저장할 때 없던 칸은 불러올 때도 없다 — 폼에 칸이 나중에 늘면(작업물의 핀 여부처럼) 그 전에
 * 저장된 초안에는 그 칸이 아예 없다. 저장본을 그대로 폼에 넣으면 그 칸이 값 있음 → 값 없음 으로
 * 바뀌어, React 가 controlled 입력을 uncontrolled 로 바꿨다고 경고하고 그때부터 그 칸이 화면과
 * 따로 논다.
 *
 * 빠진 칸은 지금 값을 그대로 둔다. 타입 기본값으로 되돌리면 저장본이 말한 적 없는 것을 되돌리는
 * 셈이라, 예전 초안을 복원했을 뿐인데 켜 둔 핀이 꺼지는 식으로 저장된 내용이 바뀐다.
 */
export function restoreSavedForm<T extends object>(current: T, saved: Partial<T>): T {
  return { ...current, ...saved };
}
