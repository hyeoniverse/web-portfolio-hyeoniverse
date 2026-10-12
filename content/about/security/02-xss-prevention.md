---
icon: shield
scope: 댓글 · 본문 HTML 렌더링
---

# XSS 방지

React JSX 는 텍스트를 **자동 이스케이프**합니다. HTML 을 그대로 넣는 곳은 `dangerouslySetInnerHTML` 을 쓰는 몇 곳뿐이고, 입력한 사람에 따라 다르게 다룹니다. 누구나 쓰는 댓글은 마크다운을 변환한 뒤 **DOMPurify** 로 허용 목록 밖의 태그 · 속성을 지우고, 서버에서도 HTML 태그와 제어문자를 걷어 냅니다. 글 · 작업물 본문은 로그인한 저자만 쓰는 신뢰 콘텐츠로 보고 편집기가 만든 HTML 을 그대로 그립니다.
