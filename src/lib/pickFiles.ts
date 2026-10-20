/**
 * 파일 고르기 창을 열고, 고른 파일을 onPick 으로 넘긴다.
 *
 * 문서에 붙이지 않은 <input type="file"> 을 만들어 click() 만 하면 사파리에서 고른 파일이 오지 않을 때가 있다 —
 * 창이 떠 있는 동안 아무도 잡고 있지 않은 input 이 정리되어 change 가 오지 않고, 오류도 없이 아무 일도 안 일어난다.
 * 그래서 보이지 않게 body 에 붙여 두고, 고르거나(change) 취소하면(cancel) 뗀다.
 * click() 은 단추 누름 안에서 바로 불러야 한다 — await 뒤에 부르면 브라우저가 창을 막는다.
 */
export function pickFiles(
  { accept, multiple = false }: { accept: string; multiple?: boolean },
  onPick: (files: File[]) => void,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.hidden = true;
  const cleanup = () => input.remove();
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    cleanup();
    if (files.length > 0) onPick(files);
  }, { once: true });
  /* 취소 — cancel 이 없는 옛 브라우저에서는 input 이 남지만 보이지 않고, 다음에 고를 때 새로 만든다 */
  input.addEventListener("cancel", cleanup, { once: true });
  document.body.appendChild(input);
  input.click();
}
