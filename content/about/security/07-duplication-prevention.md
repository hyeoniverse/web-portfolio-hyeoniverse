---
icon: fingerprint
scope: 좋아요, 방문자 통계
---

# 중복 방지

좋아요·방문자 통계에 **IP 기반 UNIQUE 제약조건**을 적용합니다. `UNIQUE(target_type, target_id, ip)` 하나로 모든 엔티티의 중복을 DB 레벨에서 차단합니다.
