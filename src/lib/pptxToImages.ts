/**
 * PPTX 를 슬라이드마다 그림으로 — 브라우저에서 그린다.
 *
 * 갤러리는 그림을 한 장씩 넘겨 보는 곳이라 발표 자료도 그림이어야 한다(pdfToImages 와 같은 이유).
 * 파일을 그대로 올리면 갤러리가 그 주소를 그림으로 그리려다 깨진다.
 *
 * 순서는 둘이다. @aiden0z/pptx-renderer 가 슬라이드를 HTML/SVG 로 그리고, modern-screenshot 이
 * 그 화면을 JPEG 로 굳힌다. 서버에서 변환하려면 오피스 프로그램이 있어야 하는데 배포 환경에는 없고,
 * 바깥 변환 서비스는 파일을 남의 서버로 보내야 한다.
 *
 * 슬라이드에 쓴 글꼴이 이 컴퓨터에 없으면 비슷한 글꼴로 바뀐다(파일에 글꼴을 넣어 저장했으면 그대로 나온다).
 * 옛 형식(.ppt)은 브라우저에서 읽을 방법이 없다 — PPTX 나 PDF 로 저장해서 올려야 한다.
 */

/** 한 장을 그릴 최대 가로 폭(px) — pdfToImages 와 같다 */
const MAX_WIDTH = 1600;
/** JPEG 품질 — pdfToImages 와 같다 */
const QUALITY = 0.82;
/* 차트는 그린 뒤 한동안 움직인다(ECharts 등장 효과). 그 사이에 찍으면 막대가 덜 자란 채 굳는다 */
const CHART_SETTLE_MS = 1200;

export type PptxRenderProgress = { done: number; total: number };

/** 변환한 한 장 — 슬라이드 그림과, 그 장의 발표자 노트(슬라이드 음성의 기본 대본) */
export type DeckPage = { file: File; notes?: string };

const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** 파일이 PPTX 인지 — 확장자와 MIME 둘 다 본다(끌어 놓으면 MIME 이 비는 브라우저가 있다) */
export function isPptxFile(file: File): boolean {
  return file.type === PPTX_MIME || /\.pptx$/i.test(file.name);
}

/** 옛 파워포인트 형식(.ppt)인지 — 읽을 수 없으니 받지 않고 이유를 알린다 */
export function isLegacyPptFile(file: File): boolean {
  return file.type === "application/vnd.ms-powerpoint" || /\.(ppt|pps|pot)$/i.test(file.name);
}

/**
 * PPTX 한 개 → 슬라이드 수만큼의 JPEG 파일과 장마다의 발표자 노트.
 * onProgress 는 한 장을 끝낼 때마다 부른다.
 */
export async function pptxToImages(
  file: File,
  onProgress?: (p: PptxRenderProgress) => void,
): Promise<DeckPage[]> {
  /* 라이브러리는 필요할 때만 받는다 — 차트 엔진까지 딸려 와서 편집 화면 첫 로딩에 얹을 수 없다 */
  const [{ parseZip, buildPresentation, renderSlide, RECOMMENDED_ZIP_LIMITS }, { domToBlob }, { default: JSZip }, notesLib] = await Promise.all([
    import("@aiden0z/pptx-renderer"),
    import("modern-screenshot"),
    import("jszip"),
    import("./pptxNotes"),
  ]);

  const buffer = await file.arrayBuffer();
  const files = await parseZip(buffer, RECOMMENDED_ZIP_LIMITS);
  /* 발표자 노트는 렌더러가 읽지 않는다 — 압축을 한 번 더 열어 노트 파일만 꺼낸다 */
  const zip = await JSZip.loadAsync(buffer).catch(() => null);
  const notesOf = async (slide: { slidePath: string; rels: ReadonlyMap<string, { type: string; target: string }> }) => {
    const path = zip ? notesLib.notesPathOf(slide.slidePath, slide.rels) : null;
    const xml = path ? await zip?.file(path)?.async("string") : null;
    return xml ? notesLib.notesTextFromXml(xml) : "";
  };
  const pres = buildPresentation(files);
  const total = pres.slides.length;
  const scale = Math.min(MAX_WIDTH / pres.width, 2);
  const base = file.name.replace(/\.pptx$/i, "");
  const out: DeckPage[] = [];

  /* 그릴 자리 — 화면 밖에 둔다. 찍는 쪽은 요소를 복제해 그리므로 보이지 않아도 되지만,
     글자 줄바꿈·크기를 재려면 문서 안에 붙어 있어야 한다.
     바탕은 흰색으로 깐다 — 투명한 슬라이드가 JPEG 에서 검게 깔리지 않게. 찍는 쪽의 바탕색 설정을
     쓰면 슬라이드 자체의 바탕(짙은 표지 등)까지 흰색으로 덮이므로 감싼 틀에 칠한다 */
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = `position:fixed;left:-100000px;top:0;width:${pres.width}px;height:${pres.height}px;overflow:hidden;pointer-events:none;background:#fff;`;
  document.body.appendChild(stage);
  const mediaUrlCache = new Map<string, string>();

  try {
    for (let n = 0; n < total; n++) {
      const handle = renderSlide(pres, pres.slides[n], { mediaUrlCache, pdfjs: false });
      try {
        stage.replaceChildren(handle.element);
        /* 표는 파워포인트에서 글이 늘면 아래로 자란다. 파일에 적힌 표 틀 높이가 그보다 작으면
           (행 높이를 0 으로 적는 도구가 있다) 렌더러는 틀에서 잘라 버린다 — 틀 밖으로 흘러도 두게 한다 */
        for (const table of handle.element.querySelectorAll("table")) {
          if (table.parentElement) table.parentElement.style.overflow = "visible";
        }
        await handle.ready;
        /* 글꼴이 다 내려와야 줄바꿈이 제자리를 잡는다 */
        await document.fonts.ready;
        if (handle.element.querySelector("canvas")) await new Promise((r) => setTimeout(r, CHART_SETTLE_MS));

        const blob = await domToBlob(stage, {
          width: pres.width,
          height: pres.height,
          scale,
          type: "image/jpeg",
          quality: QUALITY,
        });
        if (!blob) continue;
        const pad = String(n + 1).padStart(String(total).length, "0");
        const notes = await notesOf(pres.slides[n]).catch(() => "");
        out.push({ file: new File([blob], `${base}-${pad}.jpg`, { type: "image/jpeg" }), notes: notes || undefined });
      } finally {
        handle.dispose();
      }
      onProgress?.({ done: n + 1, total });
    }
  } finally {
    stage.remove();
    for (const url of mediaUrlCache.values()) URL.revokeObjectURL(url);
  }

  return out;
}
