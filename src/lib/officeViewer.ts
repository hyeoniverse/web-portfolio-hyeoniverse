/**
 * 오피스 문서(ppt·doc·xls) 미리보기 주소 — 마이크로소프트 뷰어(view.officeapps.live.com).
 *
 * 한동안 구글 뷰어(docs.google.com/gview)를 썼다. 마이크로소프트 뷰어가 한 파일에서 "Sorry, we
 * couldn't open this presentation" 카드만 띄운 적이 있어서였다. 그런데 구글 뷰어는 iframe 요청의
 * 40% 가량에 빈 응답(204)을 돌려준다(2026-09-21, 같은 주소 12번 중 5번). 그러면 틀이 비고, 크롬은
 * 그 이동을 "gview" 라는 파일 다운로드로 받아 "다운로드 실패" 를 띄운다. 같은 날 마이크로소프트 뷰어는
 * 응답 8번이 모두 200 이었고, 예전에 실패했다던 발표 자료(19장)를 포함해 매번 그렸다. 콘솔에 제 스크립트
 * 오류(appChrome is not defined)가 찍히지만 화면에는 지장이 없다. 슬라이드를 한 장씩 넘기는 화면이라
 * 갤러리와도 맞는다.
 *
 * 둘 다 파일을 자기 서버로 내려받아 그리므로 공개 주소여야 한다. 업로드한 파일은 공개 버킷에
 * 올라가니 그대로 쓸 수 있다.
 */
export function officeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

/**
 * 저장된 본문에 박혀 있는 구글 뷰어 주소를 지금의 뷰어로 바꾼다.
 * 파일 첨부 미리보기는 저장할 때 뷰어 주소를 HTML 에 굳혀 넣어서, 헬퍼를 바꿔도 예전 글은 그대로 남는다.
 */
export function migrateOfficeViewerUrls(html: string): string {
  return html.replace(
    /https:\/\/docs\.google\.com\/gview\?embedded=true(?:&amp;|&)url=([^"'&\s]+)/g,
    (_, encoded: string) => {
      try {
        return officeViewerUrl(decodeURIComponent(encoded));
      } catch {
        return officeViewerUrl(encoded);
      }
    },
  );
}

/**
 * 주소가 오피스 문서(발표·문서·표)를 가리키는지 — 작업물 갤러리는 이런 칸을 그림 대신 문서 뷰어로 보여 준다.
 * 옛 .ppt 는 브라우저에서 슬라이드 그림으로 바꿀 방법이 없어 파일째 올라가고, 예전에 파일째 올라간 .pptx 도 있다.
 */
export function isOfficeDocUrl(url: string): boolean {
  return /\.(pptx?|ppsx?|potx?|docx?|xlsx?)(?:[?#]|$)/i.test(url);
}

/** 문서 칸에 붙일 형식 이름 — 주소의 확장자(PPT·PPTX …) */
export function officeDocKind(url: string): string {
  return (/\.([a-z]+)(?:[?#]|$)/i.exec(url)?.[1] ?? "").toUpperCase();
}
