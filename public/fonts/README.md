# public/fonts

여기에 폰트 파일(.woff2 / .woff / .ttf / .otf)을 넣고 커밋하면
`pnpm fonts:scan`(또는 build 시 prebuild)이 스캔해 `src/config/localFonts.generated.ts` 매니페스트를 생성합니다.
생성된 폰트는 파일명 기반 이름으로 FontPicker(제목·본문·코드·로고·에디터) 전체에 노출되고 @font-face 로 렌더됩니다.

- 파일명이 곧 표시 이름입니다 (예: `Partial-Sans.woff2` → "Partial Sans").
- 관리자 UI 업로드 폰트는 Supabase Storage 로 가고, 이 폴더 스캔과 합쳐집니다.
