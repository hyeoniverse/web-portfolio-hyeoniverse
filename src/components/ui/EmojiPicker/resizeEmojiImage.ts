// 이미지 크기 제한
const EMOJI_MIN = 16;
const EMOJI_MAX = 256;
const EMOJI_RECOMMENDED = 128;

export { EMOJI_MIN, EMOJI_MAX, EMOJI_RECOMMENDED };

export function resizeEmojiImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width < EMOJI_MIN || height < EMOJI_MIN) {
        reject(new Error(`최소 ${EMOJI_MIN}×${EMOJI_MIN}px`));
        return;
      }
      if (width > EMOJI_MAX || height > EMOJI_MAX) {
        const scale = EMOJI_RECOMMENDED / Math.max(width, height);
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("리사이즈 실패")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" }));
        }, "image/png");
      } else {
        resolve(file);
      }
    };
    img.onerror = () => reject(new Error("잘못된 이미지"));
    img.src = URL.createObjectURL(file);
  });
}
