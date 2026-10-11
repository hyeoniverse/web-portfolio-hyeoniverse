/* 커밋 전 검사. 감시 테스트(styleRatchet)는 파일 목록을 받지 않고 한 번만 돈다 — 저장소 전체를 센다.
   0 이 된 규칙을 어기거나 숫자가 늘면 여기서 막힌다(docs/design-system.md 0-1) */
export default {
  "*.{ts,tsx}": "eslint",
  "*.{css,module.css}": "stylelint --allow-empty-input",
  "*.{ts,tsx,css}": () => "vitest run src/__tests__/styleRatchet.test.ts",
};
