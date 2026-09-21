/**
 * PPTX 발표자 노트 — 슬라이드 음성의 기본 대본.
 *
 * 노트는 슬라이드마다 따로 든 파일(ppt/notesSlides/notesSlideN.xml)이고, 슬라이드의 관계 목록에
 * ".../notesSlide" 관계로 이어져 있다. 파일 번호가 슬라이드 번호와 같다는 보장은 없어서 관계를 따라간다.
 * 노트 파일 안에는 슬라이드 그림 자리·쪽 번호 자리도 있다 — 본문 자리(ph type="body")의 글만 읽는다.
 */

const NOTES_REL = /\/notesSlide$/;

/** 관계 target("../notesSlides/notesSlide3.xml")을 슬라이드 경로 기준의 전체 경로로 */
export function resolvePartPath(fromPart: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const base = fromPart.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") base.pop();
    else if (seg !== ".") base.push(seg);
  }
  return base.join("/");
}

/** 슬라이드의 관계 목록에서 노트 파일 경로 — 없으면 null */
export function notesPathOf(slidePath: string, rels: ReadonlyMap<string, { type: string; target: string }>): string | null {
  for (const rel of rels.values()) {
    if (NOTES_REL.test(rel.type)) return resolvePartPath(slidePath, rel.target);
  }
  return null;
}

/** 노트 XML → 글. 문단은 줄바꿈으로 잇고, 앞뒤 빈 줄은 뗀다 */
export function notesTextFromXml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const shapes = Array.from(doc.getElementsByTagNameNS(P, "sp"));
  const body = shapes.find((sp) => {
    const ph = sp.getElementsByTagNameNS(P, "ph")[0];
    return ph?.getAttribute("type") === "body";
  });
  if (!body) return "";
  const paragraphs = Array.from(body.getElementsByTagNameNS(A, "p")).map((p) =>
    Array.from(p.getElementsByTagNameNS(A, "t")).map((t) => t.textContent ?? "").join(""),
  );
  return paragraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
