-- ============================================================
-- 문의 폼 첨부 버킷 — 비공개
-- ============================================================
--
-- 문의 폼은 이제 서버(/api/contact)가 공급자로 보낸다. 첨부 파일은 공급자에 싣지 않고,
-- 방문자 브라우저가 서버가 발급한 서명 URL(/api/contact/upload)로 이 버킷에 바로 올린다.
-- 메일 본문에는 서버가 만든 7일짜리 내려받기 링크(createSignedUrl)가 붙는다.
--
-- 비공개(public = false)로 둔다 — 공개 URL 이 없고, 서명 링크로만 내려받는다.
-- 정책(RLS)은 만들지 않는다. 서명 업로드 토큰과 service_role 은 정책을 보지 않으며,
-- 그 밖의 누구도 이 버킷을 읽거나 쓰지 못해야 한다.
-- 크기 상한은 버킷에서도 한 번 더 막는다(앱 설정 media.limits 와 별도, 25MB).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contact-attachments', 'contact-attachments', false, 26214400)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit;

-- ── 확인 ─────────────────────────────────────────────────────
--   SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'contact-attachments';
--   → public = false, file_size_limit = 26214400
