---
layer: Authentication
icon: lock
scope: 댓글 수정/삭제, 관리자
---

# 단일 경로 인증

익명 댓글의 수정/삭제는 **bcrypt**(salt round 10) 비밀번호 **한 경로로만** 인증합니다. 브라우저 UUID 기반 `commenter_hash` 로도 통과시키던 경로는 제거했습니다. 31비트 비암호 해시라 위변조가 가능했고, 아바타 표시를 위해 공개 응답에 포함되는 값이기 때문입니다. 관리자는 **Supabase Auth** 세션으로 인증합니다.
