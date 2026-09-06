import { oklchToRgbRaw, OKLCH_C_MAX } from "./colorMath";

/**
 * 밝기×채도 판의 픽셀을 채운다.
 *
 * 가로는 밝기 0→100, 세로는 위가 채도 최대이고 아래가 0 이다. 화면에 실제로 낼 수 있는
 * 색이면 그 색을 칠하고, 낼 수 없는 색이면 회색 빗금을 그어 "여기는 안 된다" 를 보여 준다.
 *
 * 화면 요소를 만지지 않고 바이트 배열만 채우므로 브라우저 없이 확인할 수 있다.
 */
export function fillLcPad(data: Uint8ClampedArray, width: number, height: number, hue: number) {
  for (let y = 0; y < height; y++) {
    const c = (1 - y / (height - 1)) * OKLCH_C_MAX;
    for (let x = 0; x < width; x++) {
      const l = (x / (width - 1)) * 100;
      const rgb = oklchToRgbRaw({ l, c, h: hue });
      const inGamut = rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
      const i = (y * width + x) * 4;
      if (inGamut) {
        data[i] = Math.round(rgb.r * 255);
        data[i + 1] = Math.round(rgb.g * 255);
        data[i + 2] = Math.round(rgb.b * 255);
      } else {
        // 4픽셀 단위 대각선 빗금 — 낼 수 없는 색 영역 표시
        const stripe = (((x + y) >> 2) & 1) === 0 ? 96 : 124;
        data[i] = stripe;
        data[i + 1] = stripe;
        data[i + 2] = stripe;
      }
      data[i + 3] = 255;
    }
  }
}
