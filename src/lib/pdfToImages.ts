/**
 * PDF 를 쪽마다 그림으로 — 브라우저에서 그린다.
 *
 * 슬라이드를 한 장씩 넘겨 보려면 그림이어야 한다. 남의 뷰어에 iframe 으로 끼워 넣는 방식은
 * 한 장씩 넘기는 모양을 만들 수 없고(구글 뷰어는 이어 붙인 문서), 파일을 그쪽 서버로 보내야 하며
 * 열릴지도 그쪽 사정에 달렸다. 여기서 그리면 우리 갤러리에 그대로 얹히고 외부로 나가지 않는다.
 *
 * PPTX 는 이 길로 못 온다 — 브라우저가 읽을 수 있는 건 PDF 뿐이라, 발표 자료는 PDF 로 내보내야 한다.
 */

/** 한 쪽을 그릴 최대 가로 폭(px) — 갤러리 한 장이 화면에서 차지하는 폭의 두 배쯤 */
const MAX_WIDTH = 1600;
/** JPEG 품질 — 글자가 많은 슬라이드에서 0.82 아래로 내리면 획이 뭉갠다 */
const QUALITY = 0.82;

export type PdfRenderProgress = { done: number; total: number };

/** 파일이 PDF 인지 — 확장자와 MIME 둘 다 본다(끌어 놓으면 MIME 이 비는 브라우저가 있다) */
export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/**
 * PDF 한 개 → 쪽 수만큼의 JPEG 파일.
 * onProgress 는 한 쪽을 끝낼 때마다 부른다(쪽이 많으면 몇 초씩 걸린다).
 */
export async function pdfToImages(
  file: File,
  onProgress?: (p: PdfRenderProgress) => void,
): Promise<File[]> {
  /* 라이브러리는 필요할 때만 받는다 — 1MB 가 넘어 편집 화면 첫 로딩에 얹을 이유가 없다 */
  const pdfjs = await import("pdfjs-dist");
  /* 워커 파일은 번들러가 스스로 찾아 내보내게 둔다 — public 에 복사해 두면 라이브러리를 올릴 때마다
     손으로 맞춰야 하고, 그 1MB 짜리 파일이 저장소에도 들어온다 */
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = await file.arrayBuffer();
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  const base = file.name.replace(/\.pdf$/i, "");
  const out: File[] = [];

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const raw = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_WIDTH / raw.width, 2);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas 2d context unavailable");
      /* 슬라이드 배경이 투명이면 JPEG 에서 검게 깔린다 — 흰 바탕을 먼저 칠한다 */
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) continue;

      const pad = String(n).padStart(String(doc.numPages).length, "0");
      out.push(new File([blob], `${base}-${pad}.jpg`, { type: "image/jpeg" }));
      onProgress?.({ done: n, total: doc.numPages });
    }
  } finally {
    /* 워커와 문서 자원을 놓아 준다 — 쪽을 많이 그린 뒤라 남겨 두면 메모리가 붙잡힌다 */
    await doc.cleanup();
    await task.destroy();
  }

  return out;
}
