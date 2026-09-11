// 이미지 크기 제한
const EMOJI_MIN = 16;
const EMOJI_MAX = 256;
const EMOJI_RECOMMENDED = 128;

export { EMOJI_MIN, EMOJI_MAX, EMOJI_RECOMMENDED };

/** 이미지를 쓸 수 없을 때 — 화면 문구는 부르는 쪽이 code 로 고른다(여기는 화면 언어를 모른다) */
export class EmojiImageError extends Error {
  constructor(readonly code: "tooSmall" | "resizeFailed" | "invalidImage") {
    super(code);
  }
}

export function resizeEmojiImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width < EMOJI_MIN || height < EMOJI_MIN) {
        reject(new EmojiImageError("tooSmall"));
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
          if (!blob) { reject(new EmojiImageError("resizeFailed")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".png"), { type: "image/png" }));
        }, "image/png");
      } else {
        resolve(file);
      }
    };
    img.onerror = () => reject(new EmojiImageError("invalidImage"));
    img.src = URL.createObjectURL(file);
  });
}
