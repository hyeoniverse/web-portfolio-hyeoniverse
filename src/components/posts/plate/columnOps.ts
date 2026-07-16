import {
  COLUMN_DEFAULT_PX,
  MIN_COLUMNS,
  MAX_COLUMNS,
  distributeInts,
  fitColumnsForInsert,
} from "./presets";

/* 선택된 열 하나를 기준으로 더하고 빼는 연산.
 *
 * 열 개수 stepper(setColumns)와는 동작이 다르다 — stepper 는 항상 **오른쪽 끝**에서 지우고
 * 지워지는 열의 내용을 마지막 남는 열로 **합친다**(@platejs/layout 의 축소 분기). 반면 여기는
 * 사용자가 지목한 열을 지우므로 내용이 정말 사라진다 → 호출부에서 확인 모달을 띄운다.
 *
 * 공통 제약: 열의 width(%) 합은 **정수 100** 이어야 한다. 소수가 섞이면 @platejs/layout
 * normalizer 가 수렴을 못 해 무한루프에 빠진다. 그래서 모든 연산 끝에 % 를 다시 채운다.
 * (px 블록에선 width 가 렌더에 안 쓰이지만 — flex: 0 0 <px> 가 이긴다 — normalizer 는 그래도 본다) */

type ColNode = { type?: string; text?: string; width?: string; widthPx?: number; children?: ColNode[] };

const nodeText = (n: ColNode | undefined): string => {
  if (!n) return "";
  if (typeof n.text === "string") return n.text;
  return (n.children ?? []).map(nodeText).join("");
};

/** 열에 지울 만한 내용이 있나. 텍스트만 보면 안 된다 — 이미지/구분선처럼 텍스트가 없는 블록도 내용이다.
 *  "빈 문단(p)만 있는 열"만 비었다고 본다. 애매하면 있다고 치는 쪽이 안전하다(지우기 전에 물어보므로). */
export function columnHasContent(col: ColNode | undefined): boolean {
  const kids = col?.children ?? [];
  if (kids.length === 0) return false;
  if (nodeText(col).trim() !== "") return true;
  return kids.some((k) => k?.type && k.type !== "p");
}

const pctOf = (w: string | undefined): number => {
  const n = parseFloat(String(w ?? "").replace("%", ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** 남은 열들의 width(%) 를 현재 비율대로 다시 채워 합 100 을 맞춘다.
 *  균등 리셋이 아니라 **비율 보존** — 사용자가 맞춰둔 폭 비율이 열 하나 지웠다고 날아가면 안 된다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function refillPercents(editor: any, groupPath: number[], cols: ColNode[]) {
  const weights = cols.map((c) => c.widthPx || pctOf(c.width) || 1);
  const pcts = distributeInts(100, weights);
  pcts.forEach((p, i) => editor.tf.setNodes({ width: `${p}%` }, { at: [...groupPath, i] }));
}

/** 선택된 열 **오른쪽**에 빈 열을 하나 끼운다. 상한(MAX_COLUMNS)이면 false.
 *  기존 열 폭은 그대로 두고 새 열만 기본 폭 — 블록 상한에 여유가 없을 때만 기존 열을 비례로 깎는다. */
export function insertColumnAfter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  groupPath: number[],
  afterIdx: number,
): boolean {
  const group = editor.api.node(groupPath)?.[0] as ColNode | undefined;
  const kids = group?.children ?? [];
  if (kids.length === 0 || kids.length >= MAX_COLUMNS) return false;

  const at = Math.min(kids.length, Math.max(0, afterIdx + 1));
  const curPx = kids.map((c) => c.widthPx || 0);
  const hasPx = curPx.some((w) => w > 0);
  const fit = hasPx ? fitColumnsForInsert(curPx, COLUMN_DEFAULT_PX) : null;

  const newCol: Record<string, unknown> = {
    type: "column",
    width: "50%", // 바로 아래에서 다시 채운다 — normalizer 가 보기 전에 합 100 이 되게
    children: [editor.api.create.block()],
  };
  if (fit) newCol.widthPx = fit.added;

  editor.tf.withoutNormalizing(() => {
    editor.tf.insertNodes(newCol, { at: [...groupPath, at] });
    // 자리를 내주느라 깎인 기존 열 반영. 삽입 위치 뒤의 열은 index 가 1 밀린다.
    // px 가 없던(유동) 열은 curPx 가 0 이라 깎이지도 않으므로 건너뛴다 — 여기서 px 를 주면 유동이 고정으로 바뀐다.
    if (fit) {
      fit.widths.forEach((w, i) => {
        if (curPx[i] > 0 && w !== curPx[i]) {
          editor.tf.setNodes({ widthPx: w }, { at: [...groupPath, i < at ? i : i + 1] });
        }
      });
    }
    const after = (editor.api.node(groupPath)?.[0] as ColNode | undefined)?.children ?? [];
    refillPercents(editor, groupPath, after);
  });
  return true;
}

/** 선택된 열을 통째로(내용까지) 지운다. 하한(MIN_COLUMNS)이면 false.
 *  살아남는 열의 widthPx 는 건드리지 않는다 — 지운 만큼 블록 총폭이 줄 뿐, 남은 열이 늘거나 줄지 않는다. */
export function removeColumnAt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  groupPath: number[],
  idx: number,
): boolean {
  const group = editor.api.node(groupPath)?.[0] as ColNode | undefined;
  const kids = group?.children ?? [];
  if (kids.length <= MIN_COLUMNS || idx < 0 || idx >= kids.length) return false;

  editor.tf.withoutNormalizing(() => {
    editor.tf.removeNodes({ at: [...groupPath, idx] });
    refillPercents(editor, groupPath, kids.filter((_, i) => i !== idx));
  });
  return true;
}
