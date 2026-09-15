import type { PlateEditor } from "platejs/react";
import type { TElement } from "platejs";

// 새 블록을 "현재 블록 자리"에 넣는다.
//
// 현재 블록이 빈 문단이면(+ 버튼이나 "/" 로 비워진 줄) 그 자리를 대체하고, 내용이 있으면 바로 다음에 넣는다.
// 현재 블록의 실제 path 를 쓰므로 중첩(컬럼·탭 패널) 안에서도 최상위로 튀지 않고 제자리에 들어간다.
//
// 예전엔 슬래시 메뉴가 `sel.anchor.path[0] + 1`(현재 선택의 최상위 블록 다음)에 넣었다. + 버튼은 먼저
// 빈 문단을 바로 아래에 만들고 그 자리에서 메뉴를 열기 때문에, 삽입형 명령이 그 빈 문단 "다음"에 들어가
// 빈 줄이 남고 요소가 한 칸 아래로 갔다. 중첩 블록은 컨테이너 밖으로 나갔다.
function isEmptyParagraph(e: PlateEditor, entry: [unknown, number[]] | undefined): entry is [unknown, number[]] {
  return (
    !!entry &&
    (entry[0] as { type?: string }).type === "p" &&
    ((e.api.string(entry[1]) ?? "") as string) === ""
  );
}

export function insertBlockHere(e: PlateEditor, node: TElement): void {
  const entry = e.api.block();
  if (!entry) {
    e.tf.insertNodes(node, { at: [e.children.length] });
    return;
  }
  const curPath = entry[1];
  const nextPath = [...curPath.slice(0, -1), curPath[curPath.length - 1] + 1];
  if (isEmptyParagraph(e, entry)) {
    e.tf.insertNodes(node, { at: curPath }); // 그 자리에 넣으면 빈 문단이 nextPath 로 밀린다
    e.tf.removeNodes({ at: nextPath }); //       밀린 빈 문단 제거 = 대체
  } else {
    e.tf.insertNodes(node, { at: nextPath });
  }
}

// 노드를 직접 만들어 "현재 블록 다음"에 넣는 라이브러리 삽입 함수(table·toc·equation)용.
// 그들은 노드를 반환하지 않아 insertBlockHere 로 감쌀 수 없다. 대신 삽입을 실행한 뒤, + 버튼이
// 만든 빈 문단이 앞에 그대로 남아 있으면 제거해 요소가 바로 그 자리(현재 블록 다음)에 오게 한다.
export function insertLibBlockHere(e: PlateEditor, insertFn: (editor: PlateEditor) => void): void {
  const before = e.api.block();
  const placeholderPath = isEmptyParagraph(e, before) ? before[1] : null;
  insertFn(e);
  if (!placeholderPath) return;
  try {
    const still = e.api.node(placeholderPath) as [unknown, number[]] | undefined;
    if (isEmptyParagraph(e, still)) e.tf.removeNodes({ at: placeholderPath });
  } catch {
    /* 삽입으로 path 가 바뀌었으면 그대로 둔다 */
  }
}
