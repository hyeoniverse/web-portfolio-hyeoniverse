---
icon: key
scope: 환경변수, API 키
---

# 시크릿 관리

외부 서비스 API 키는 `site_settings` 의 `secrets` 행에 두고, RLS 로 서버(`service_role`)와 owner 만 읽게 막습니다. 값이 없으면 서버 환경변수로 물러섭니다. `SUPABASE_SERVICE_ROLE_KEY` 는 서버에서만 쓰고, 브라우저에 나가는 키는 `NEXT_PUBLIC_` 접두사가 붙은 것뿐입니다. 서비스 호출 기록에 남기는 오류 문장은 키를 가린 뒤 저장합니다.
