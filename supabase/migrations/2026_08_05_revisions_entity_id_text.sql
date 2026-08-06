-- revisions.entity_id 를 uuid → text 로 변경.
--
-- revisions 는 posts/works 공용 리비전 히스토리 테이블이고 entity_id 는 그 대상의 id 다.
-- 그런데 "새 글"은 아직 저장 전이라 실제 uuid 가 없어서, 클라이언트가 "draft-new-post"
-- (works 는 "draft-new-work") 같은 sentinel 문자열을 entity_id 로 보낸다.
-- entity_id 가 uuid 타입이면 이 sentinel 이 `invalid input syntax for type uuid: "draft-new-post"`
-- 로 거부돼 새 글의 autosave(POST /api/revisions)·리비전 조회(GET)가 전부 500 →
-- **새 글은 자동저장이 아예 동작하지 않았다.** (기존 글은 진짜 uuid 라 정상)
--
-- entity_id 는 posts/works 어느 쪽에도 FK 로 걸려있지 않고(공용이라 걸 수 없음) 인덱스만 있다.
-- text 로 바꾸면 실제 uuid(문자열 비교)도 draft sentinel 도 모두 받는다. uuid→text 캐스팅은
-- 안전하고 인덱스는 자동 재생성된다. 이미 text 인 DB 에서 재실행해도 no-op.

ALTER TABLE revisions ALTER COLUMN entity_id TYPE text USING entity_id::text;

-- 마이그레이션 기록 (helper 가 있는 DB 에서만 — 옛 DB 는 이 함수 자체가 없을 수 있어 guard)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_migration_applied') THEN
    PERFORM log_migration_applied(
      '2026_08_05_revisions_entity_id_text',
      'revisions.entity_id uuid→text — id 없는 새 글의 draft sentinel("draft-new-post" 등)이 uuid 컬럼에 거부돼 새 글 autosave 가 전부 500 나던 문제 수정'
    );
  END IF;
END $$;
