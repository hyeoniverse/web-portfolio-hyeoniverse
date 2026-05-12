/**
 * 브라우저에서 단일 파일을 즉시 다운로드 (Blob URL + anchor click + revoke).
 * 보통 admin export 등에서 사용.
 */
export function downloadBlob(content: BlobPart, fileName: string, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 여러 파일을 순차 다운로드 — 브라우저가 동시 다운로드 prompt 를 묶지 않도록 사이에 100ms gap.
 */
export async function downloadFiles(
  files: { fileName: string; content: BlobPart }[],
  type = "text/markdown",
): Promise<void> {
  for (const file of files) {
    downloadBlob(file.content, file.fileName, type);
    await new Promise((r) => setTimeout(r, 100));
  }
}
