---
icon: shield
scope: 모든 사용자 입력 렌더링
---

# XSS 방지

React JSX가 모든 사용자 입력을 **자동 이스케이프**합니다. `dangerouslySetInnerHTML`을 사용하지 않으며, 서버 측에서 **HTML 태그 스트리핑**과 **제어문자 제거**를 추가로 적용합니다.
