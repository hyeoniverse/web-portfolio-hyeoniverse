-- 작업물 랜딩 페이지 데이터
--
-- 작업물 상세를 랜딩으로 그릴 때의 내용 — 머리 한 줄(eyebrow), 첫 번호 앞의 장면들(hero), 번호 · 제목 · 설명이 붙은 섹션들.
-- 섹션 안의 항목은 랜딩 부품(그림 · 영상 한 장, 흐르는 띠, 넘기는 장면, 구르는 휴대폰, 숫자)과 짝이다(src/lib/workLanding.ts).
--
--   { "eyebrow": { "ko": "...", "en": "..." },
--     "hero": [ { "kind": "frame", "at": "bleed", "src": "...", "alt": { "ko": "...", "en": "..." } } ],
--     "sections": [ { "id": "s1", "title": { "ko", "en" }, "body": { "ko", "en" }, "items": [ ... ] } ] }
--
-- 비어 있으면(NULL) 저장소의 기본 데이터(src/data/workLandings/<slug>.json), 그것도 없으면 카드 정보(표지 · 설명 · 갤러리)로
-- 만든 기본 랜딩을 그린다. 이 칸이 없어도 사이트는 동작한다(읽는 쪽이 없는 값으로 다룬다).

ALTER TABLE public.works ADD COLUMN IF NOT EXISTS landing jsonb;
