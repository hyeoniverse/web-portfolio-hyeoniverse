-- ════════════════════════════════════════════════════════════════════════
-- 태그 설명(tagDescriptions) 기본값 재설정
--   태그는 posts.tags(text[]) 에 자유 입력되고, 표시 이름·설명은
--   site_settings.config.tagDescriptions 맵(canonical tag → { ko, en, description }) 으로 관리됨.
--   (카테고리와 동일 패턴 — 별도 tags 테이블 없음)
--
--   site.config.ts 의 tagDescriptions 기본 세트를 대폭 확장(프론트/백/DevOps/CS/실천/커리어)했으므로,
--   DB 에 남아있던 tagDescriptions 오버라이드를 제거해 config 시드(새 기본값)가 그대로 적용되게 한다.
--   getSiteConfig 는 config 시드에 DB delta 를 deep-merge 하므로, 오버라이드만 지우면 기본값이 노출됨.
--
--   ⚠️ 수동 실행 전용. tagDescriptions 를 admin 에서 커스텀 편집한 값이 있으면 config 기본값으로 되돌아감.
--      posts.tags / posts.tag_notes(글별 태그 노트)는 건드리지 않음.
-- ════════════════════════════════════════════════════════════════════════

-- [0] 현재 사용 중인 태그 분포 — 어떤 태그가 실제로 쓰이는지 확인(설명 커버리지 점검용)
SELECT tag, COUNT(*) AS posts
FROM posts, unnest(tags) AS tag
WHERE deleted_at IS NULL
GROUP BY tag
ORDER BY posts DESC, tag;

-- [1] site_settings 의 tagDescriptions 오버라이드 제거 → config 시드(새 기본 태그 세트)가 그대로 적용.
--     delta 래퍼/비래퍼 두 위치 모두 안전 제거 ( #- 는 없는 경로면 무시 ).
UPDATE site_settings
SET config = (config #- '{delta,tagDescriptions}') #- '{tagDescriptions}',
    updated_at = now()
WHERE id = 'default';

-- [2] 확인 — 아래가 비어(또는 null) 있어야 config 시드가 노출됨
SELECT config #> '{delta,tagDescriptions}' AS delta_override,
       config #> '{tagDescriptions}'       AS root_override
FROM site_settings
WHERE id = 'default';
