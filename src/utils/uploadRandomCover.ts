import { presets } from "@/components/posts/CoverImagePicker/presets";
import { renderGradient } from "@/components/posts/CoverImagePicker/gradientUtils";

/**
 * 프리셋 중 랜덤으로 하나를 선택하여 Canvas 렌더링 → 업로드 → URL 반환.
 * 실패 시 null.
 */
export async function uploadRandomCover(): Promise<string | null> {
  try {
    const preset = presets[Math.floor(Math.random() * presets.length)];
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    renderGradient(ctx, 1200, 675, preset.config);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    const formData = new FormData();
    formData.append("file", new File([blob], `cover-${preset.id}.png`, { type: "image/png" }));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}
