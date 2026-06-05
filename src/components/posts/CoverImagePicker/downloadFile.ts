/** fetch → blob → 안전한 파일명으로 다운로드 트리거. 이미지/비디오 공통. */
export async function downloadFile(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    const ext = (blob.type.split("/")[1] || "png").replace(/[^a-z0-9]/g, "");
    const safe = name.trim().slice(0, 30).replace(/[^a-z0-9가-힣]+/gi, "_") || "cover";
    a.download = `${safe}-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch { /* swallow */ }
}
