-- 작업물 갤러리의 장마다 음성(슬라이드 음성)
--
-- 갤러리는 그림 주소 목록(gallery text[])만 들고 있었다. 장마다 대본과 음성 파일을 붙이려고
-- 그림 주소를 열쇠로 한 jsonb 를 더한다 — 차례를 바꾸거나 한 장을 지워도 음성이 다른 장으로 밀리지 않는다.
--
--   { "<그림 주소>": { "script": "읽을 대본", "audio": "음성 파일 주소",
--                    "audioSource": "tts" | "recorded", "audioScript": "음성을 만든 대본" } }
--
-- 대본은 PPTX 를 올리면 발표자 노트로 채워지고, 음성은 편집 화면에서 TTS 로 만들거나 녹음을 올린다.
-- 음성 파일이 없는 장은 읽는 사람의 브라우저가 대본을 읽는다.
--
-- 이 칸이 없어도 작업물 저장은 된다(API 가 칸이 없다는 오류를 받으면 이 칸만 빼고 다시 저장한다).
-- 음성을 저장하려면 이 파일을 적용해야 한다.

alter table public.works
  add column if not exists gallery_notes jsonb not null default '{}'::jsonb;

comment on column public.works.gallery_notes is
  '갤러리 장마다의 음성 — 그림 주소 → { script, audio, audioSource, audioScript }';
